#!/bin/bash

# Virgil Diagnostic Tool
# Comprehensive troubleshooting and diagnostics for startup issues

set -uo pipefail  # Don't use -e as we want to continue on errors

# Configuration
readonly SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
readonly PROJECT_ROOT="$SCRIPT_DIR"
readonly LOG_DIR="$PROJECT_ROOT/logs"
readonly PID_DIR="$PROJECT_ROOT/.pids"
readonly DIAG_FILE="$PROJECT_ROOT/virgil-diagnostics-$(date +%Y%m%d-%H%M%S).txt"

# Colors
if [[ -t 1 ]] && [[ "$(tput colors 2>/dev/null || echo 0)" -ge 8 ]]; then
    readonly RED='\033[0;31m'
    readonly GREEN='\033[0;32m'
    readonly YELLOW='\033[1;33m'
    readonly BLUE='\033[0;34m'
    readonly MAGENTA='\033[0;35m'
    readonly CYAN='\033[0;36m'
    readonly NC='\033[0m'
else
    readonly RED='' GREEN='' YELLOW='' BLUE='' MAGENTA='' CYAN='' NC=''
fi

# Logging functions
log_info() { echo -e "${BLUE}ℹ${NC}  $*" | tee -a "$DIAG_FILE"; }
log_success() { echo -e "${GREEN}✅${NC} $*" | tee -a "$DIAG_FILE"; }
log_warning() { echo -e "${YELLOW}⚠️${NC}  $*" | tee -a "$DIAG_FILE"; }
log_error() { echo -e "${RED}❌${NC} $*" | tee -a "$DIAG_FILE"; }
log_section() { 
    echo | tee -a "$DIAG_FILE"
    echo -e "${CYAN}════════════════════════════════════════════════════════${NC}" | tee -a "$DIAG_FILE"
    echo -e "${CYAN}  $*${NC}" | tee -a "$DIAG_FILE"
    echo -e "${CYAN}════════════════════════════════════════════════════════${NC}" | tee -a "$DIAG_FILE"
}

# Initialize diagnostics file
init_diagnostics() {
    cat > "$DIAG_FILE" <<EOF
Virgil Diagnostics Report
Generated: $(date)
Platform: $(uname -s)
User: $(whoami)
Directory: $PROJECT_ROOT

EOF
}

# Check recent errors in log files
check_log_errors() {
    log_section "Recent Log Errors"
    
    if [[ -d "$LOG_DIR" ]]; then
        for logfile in "$LOG_DIR"/*.log; do
            if [[ -f "$logfile" ]]; then
                local basename=$(basename "$logfile")
                echo -e "\n${YELLOW}=== $basename ===${NC}" | tee -a "$DIAG_FILE"
                
                # Check for common error patterns
                local error_count=$(grep -ciE "(error|failed|exception|crash|fatal)" "$logfile" 2>/dev/null || echo 0)
                
                if [[ $error_count -gt 0 ]]; then
                    log_warning "Found $error_count error(s) in $basename"
                    echo "Last 10 error lines:" | tee -a "$DIAG_FILE"
                    grep -iE "(error|failed|exception|crash|fatal)" "$logfile" | tail -10 | tee -a "$DIAG_FILE"
                else
                    log_success "No errors found in $basename"
                fi
                
                # Show last few lines
                echo -e "\nLast 5 lines of $basename:" | tee -a "$DIAG_FILE"
                tail -5 "$logfile" 2>/dev/null | tee -a "$DIAG_FILE" || echo "  (empty or missing)" | tee -a "$DIAG_FILE"
            fi
        done
    else
        log_info "No log directory found"
    fi
}

# Check process status
check_processes() {
    log_section "Process Status"
    
    # Check saved PIDs
    if [[ -d "$PID_DIR" ]]; then
        for pidfile in "$PID_DIR"/*.json; do
            if [[ -f "$pidfile" ]]; then
                local name=$(basename "$pidfile" .json)
                local pid=$(jq -r '.pid' "$pidfile" 2>/dev/null || echo "")
                local port=$(jq -r '.port' "$pidfile" 2>/dev/null || echo "")
                
                echo -e "\n${YELLOW}$name server:${NC}" | tee -a "$DIAG_FILE"
                echo "  PID: $pid" | tee -a "$DIAG_FILE"
                echo "  Port: $port" | tee -a "$DIAG_FILE"
                
                if [[ -n "$pid" ]]; then
                    if kill -0 "$pid" 2>/dev/null; then
                        log_success "Process $pid is running"
                        ps -p "$pid" -o pid,ppid,state,command | tee -a "$DIAG_FILE"
                    else
                        log_error "Process $pid is not running (stale PID file)"
                    fi
                fi
            fi
        done
    else
        log_info "No PID directory found"
    fi
    
    # Check for node processes
    echo -e "\n${YELLOW}All Node.js processes:${NC}" | tee -a "$DIAG_FILE"
    ps aux | grep -E "(node|npm|vite|nodemon)" | grep -v grep | tee -a "$DIAG_FILE" || echo "  None found" | tee -a "$DIAG_FILE"
}

# Check port status
check_ports_detailed() {
    log_section "Port Analysis"
    
    local ports=(3000 5002)
    
    for port in "${ports[@]}"; do
        echo -e "\n${YELLOW}Port $port:${NC}" | tee -a "$DIAG_FILE"
        
        # Multiple methods to check port
        local in_use=false
        
        # Method 1: lsof
        if command -v lsof >/dev/null 2>&1; then
            if lsof -i ":$port" 2>/dev/null | grep -q LISTEN; then
                in_use=true
                echo "  lsof: Port is in use" | tee -a "$DIAG_FILE"
                lsof -i ":$port" | grep LISTEN | tee -a "$DIAG_FILE"
            else
                echo "  lsof: Port is free" | tee -a "$DIAG_FILE"
            fi
        fi
        
        # Method 2: netstat
        if command -v netstat >/dev/null 2>&1; then
            if netstat -an 2>/dev/null | grep -q "[:.]$port .*LISTEN"; then
                in_use=true
                echo "  netstat: Port is in use" | tee -a "$DIAG_FILE"
                netstat -an | grep "[:.]$port .*LISTEN" | head -5 | tee -a "$DIAG_FILE"
            else
                echo "  netstat: Port is free" | tee -a "$DIAG_FILE"
            fi
        fi
        
        # Method 3: nc (netcat)
        if command -v nc >/dev/null 2>&1; then
            if nc -z localhost "$port" 2>/dev/null; then
                in_use=true
                echo "  nc: Port is responding" | tee -a "$DIAG_FILE"
            else
                echo "  nc: Port is not responding" | tee -a "$DIAG_FILE"
            fi
        fi
        
        # Method 4: curl test
        if curl -sf "http://localhost:$port" --max-time 2 >/dev/null 2>&1; then
            echo "  HTTP: Server is responding" | tee -a "$DIAG_FILE"
        else
            echo "  HTTP: No HTTP response" | tee -a "$DIAG_FILE"
        fi
        
        if $in_use; then
            log_warning "Port $port appears to be in use"
        else
            log_success "Port $port appears to be free"
        fi
    done
}

# Check npm and node issues
check_npm_issues() {
    log_section "Node.js and npm Diagnostics"
    
    # Node version and path
    echo -e "\n${YELLOW}Node.js:${NC}" | tee -a "$DIAG_FILE"
    if command -v node >/dev/null 2>&1; then
        echo "  Version: $(node -v)" | tee -a "$DIAG_FILE"
        echo "  Path: $(which node)" | tee -a "$DIAG_FILE"
        echo "  Process versions:" | tee -a "$DIAG_FILE"
        node -p "process.versions" 2>&1 | tee -a "$DIAG_FILE"
    else
        log_error "Node.js not found in PATH"
    fi
    
    # npm version and config
    echo -e "\n${YELLOW}npm:${NC}" | tee -a "$DIAG_FILE"
    if command -v npm >/dev/null 2>&1; then
        echo "  Version: $(npm -v)" | tee -a "$DIAG_FILE"
        echo "  Path: $(which npm)" | tee -a "$DIAG_FILE"
        echo "  Global prefix: $(npm config get prefix)" | tee -a "$DIAG_FILE"
        echo "  Registry: $(npm config get registry)" | tee -a "$DIAG_FILE"
    else
        log_error "npm not found in PATH"
    fi
    
    # Check for common npm issues
    echo -e "\n${YELLOW}npm cache status:${NC}" | tee -a "$DIAG_FILE"
    npm cache verify 2>&1 | tee -a "$DIAG_FILE" || log_warning "npm cache verification failed"
    
    # Check package.json scripts
    echo -e "\n${YELLOW}Package scripts:${NC}" | tee -a "$DIAG_FILE"
    if [[ -f "$PROJECT_ROOT/package.json" ]]; then
        echo "Frontend scripts:" | tee -a "$DIAG_FILE"
        jq -r '.scripts | to_entries[] | "  \(.key): \(.value)"' "$PROJECT_ROOT/package.json" 2>/dev/null | tee -a "$DIAG_FILE" || cat "$PROJECT_ROOT/package.json" | grep -A 10 '"scripts"' | tee -a "$DIAG_FILE"
    fi
    
    if [[ -f "$PROJECT_ROOT/server/package.json" ]]; then
        echo -e "\nBackend scripts:" | tee -a "$DIAG_FILE"
        jq -r '.scripts | to_entries[] | "  \(.key): \(.value)"' "$PROJECT_ROOT/server/package.json" 2>/dev/null | tee -a "$DIAG_FILE" || cat "$PROJECT_ROOT/server/package.json" | grep -A 5 '"scripts"' | tee -a "$DIAG_FILE"
    fi
}

# Check environment issues
check_env_issues() {
    log_section "Environment Configuration"
    
    # PATH
    echo -e "\n${YELLOW}PATH:${NC}" | tee -a "$DIAG_FILE"
    echo "$PATH" | tr ':' '\n' | grep -E "(node|npm)" | tee -a "$DIAG_FILE" || echo "  No node/npm directories in PATH" | tee -a "$DIAG_FILE"
    
    # Environment variables
    echo -e "\n${YELLOW}Relevant environment variables:${NC}" | tee -a "$DIAG_FILE"
    env | grep -E "(NODE|NPM|PORT)" | sort | tee -a "$DIAG_FILE" || echo "  None found" | tee -a "$DIAG_FILE"
    
    # .env file analysis
    if [[ -f "$PROJECT_ROOT/.env" ]]; then
        echo -e "\n${YELLOW}.env file:${NC}" | tee -a "$DIAG_FILE"
        echo "  Size: $(wc -c < "$PROJECT_ROOT/.env") bytes" | tee -a "$DIAG_FILE"
        echo "  Lines: $(wc -l < "$PROJECT_ROOT/.env")" | tee -a "$DIAG_FILE"
        echo "  Variables set:" | tee -a "$DIAG_FILE"
        grep -E "^[A-Z_]+=" "$PROJECT_ROOT/.env" | cut -d'=' -f1 | sed 's/^/    /' | tee -a "$DIAG_FILE"
    else
        log_error ".env file not found"
    fi
}

# Check file system issues
check_filesystem() {
    log_section "File System Analysis"
    
    # Disk space
    echo -e "\n${YELLOW}Disk space:${NC}" | tee -a "$DIAG_FILE"
    df -h "$PROJECT_ROOT" | tee -a "$DIAG_FILE"
    
    # Directory permissions
    echo -e "\n${YELLOW}Directory permissions:${NC}" | tee -a "$DIAG_FILE"
    ls -la "$PROJECT_ROOT" | grep -E "^d" | head -10 | tee -a "$DIAG_FILE"
    
    # Large files
    echo -e "\n${YELLOW}Large files (>10MB):${NC}" | tee -a "$DIAG_FILE"
    find "$PROJECT_ROOT" -type f -size +10M -not -path "*/node_modules/*" -not -path "*/.git/*" 2>/dev/null | head -10 | tee -a "$DIAG_FILE" || echo "  None found" | tee -a "$DIAG_FILE"
    
    # Check for locked files
    echo -e "\n${YELLOW}Recently modified files:${NC}" | tee -a "$DIAG_FILE"
    find "$PROJECT_ROOT" -type f -mmin -5 -not -path "*/node_modules/*" -not -path "*/.git/*" 2>/dev/null | head -10 | tee -a "$DIAG_FILE" || echo "  None found" | tee -a "$DIAG_FILE"
}

# Network diagnostics
check_network() {
    log_section "Network Diagnostics"
    
    # Check localhost resolution
    echo -e "\n${YELLOW}Localhost resolution:${NC}" | tee -a "$DIAG_FILE"
    getent hosts localhost 2>/dev/null | tee -a "$DIAG_FILE" || host localhost 2>/dev/null | tee -a "$DIAG_FILE" || echo "  Could not resolve localhost" | tee -a "$DIAG_FILE"
    
    # Check if we can connect to common ports
    echo -e "\n${YELLOW}Port connectivity:${NC}" | tee -a "$DIAG_FILE"
    for port in 3000 5002; do
        timeout 2 bash -c "echo >/dev/tcp/localhost/$port" 2>/dev/null && echo "  Port $port: Can connect" | tee -a "$DIAG_FILE" || echo "  Port $port: Cannot connect" | tee -a "$DIAG_FILE"
    done
    
    # Firewall status (if available)
    echo -e "\n${YELLOW}Firewall status:${NC}" | tee -a "$DIAG_FILE"
    if [[ "$(uname -s)" == "Darwin" ]]; then
        # macOS
        sudo pfctl -s info 2>/dev/null | head -5 | tee -a "$DIAG_FILE" || echo "  Could not check firewall (needs sudo)" | tee -a "$DIAG_FILE"
    elif command -v ufw >/dev/null 2>&1; then
        # Ubuntu/Debian
        sudo ufw status 2>/dev/null | tee -a "$DIAG_FILE" || echo "  Could not check firewall (needs sudo)" | tee -a "$DIAG_FILE"
    else
        echo "  Firewall check not available" | tee -a "$DIAG_FILE"
    fi
}

# Generate recommendations
generate_recommendations() {
    log_section "Recommendations"
    
    echo "Based on the diagnostics, here are some recommendations:" | tee -a "$DIAG_FILE"
    echo | tee -a "$DIAG_FILE"
    
    # Check if ports are in use
    if lsof -i :3000 -sTCP:LISTEN >/dev/null 2>&1 || lsof -i :5002 -sTCP:LISTEN >/dev/null 2>&1; then
        echo "1. Ports are in use. Try:" | tee -a "$DIAG_FILE"
        echo "   ./cleanup-ports.sh" | tee -a "$DIAG_FILE"
        echo | tee -a "$DIAG_FILE"
    fi
    
    # Check if node_modules exists
    if [[ ! -d "$PROJECT_ROOT/node_modules" ]] || [[ ! -d "$PROJECT_ROOT/server/node_modules" ]]; then
        echo "2. Dependencies are missing. Run:" | tee -a "$DIAG_FILE"
        echo "   npm install && cd server && npm install && cd .." | tee -a "$DIAG_FILE"
        echo | tee -a "$DIAG_FILE"
    fi
    
    # Check if .env exists
    if [[ ! -f "$PROJECT_ROOT/.env" ]]; then
        echo "3. Environment file is missing. Run:" | tee -a "$DIAG_FILE"
        echo "   cp .env.example .env" | tee -a "$DIAG_FILE"
        echo "   Then edit .env with your configuration" | tee -a "$DIAG_FILE"
        echo | tee -a "$DIAG_FILE"
    fi
    
    # Check for log errors
    if [[ -d "$LOG_DIR" ]]; then
        local total_errors=0
        for logfile in "$LOG_DIR"/*.log; do
            if [[ -f "$logfile" ]]; then
                local errors=$(grep -ciE "(error|failed|exception)" "$logfile" 2>/dev/null || echo 0)
                total_errors=$((total_errors + errors))
            fi
        done
        
        if [[ $total_errors -gt 0 ]]; then
            echo "4. Found $total_errors errors in log files. Check:" | tee -a "$DIAG_FILE"
            echo "   tail -f logs/*.log" | tee -a "$DIAG_FILE"
            echo | tee -a "$DIAG_FILE"
        fi
    fi
    
    echo "5. For a clean start, try:" | tee -a "$DIAG_FILE"
    echo "   ./cleanup-ports.sh" | tee -a "$DIAG_FILE"
    echo "   rm -rf logs .pids" | tee -a "$DIAG_FILE"
    echo "   ./start-dev.sh" | tee -a "$DIAG_FILE"
}

# Main function
main() {
    echo -e "${CYAN}╔════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${CYAN}║              Virgil Diagnostic Tool                        ║${NC}"
    echo -e "${CYAN}╚════════════════════════════════════════════════════════════╝${NC}"
    
    log_info "Generating diagnostics report: $DIAG_FILE"
    
    # Initialize diagnostics file
    init_diagnostics
    
    # Run all diagnostics
    check_processes
    check_ports_detailed
    check_log_errors
    check_npm_issues
    check_env_issues
    check_filesystem
    check_network
    
    # Generate recommendations
    generate_recommendations
    
    # Summary
    log_section "Summary"
    log_success "Diagnostics complete!"
    echo | tee -a "$DIAG_FILE"
    echo "Full report saved to: $DIAG_FILE" | tee -a "$DIAG_FILE"
    echo | tee -a "$DIAG_FILE"
    echo "You can share this report when asking for help." | tee -a "$DIAG_FILE"
    echo "Remove sensitive information before sharing!" | tee -a "$DIAG_FILE"
}

# Run main function
main "$@"