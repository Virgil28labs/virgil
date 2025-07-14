#!/bin/bash

# Virgil Development Environment - Unified Robust Startup Script
# This script provides reliable process management, cross-platform compatibility,
# and comprehensive error handling for starting both frontend and backend servers.

set -euo pipefail  # Exit on error, undefined variables, pipe failures

# ============================================================================
# Configuration and Constants
# ============================================================================

readonly SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
readonly PROJECT_ROOT="$SCRIPT_DIR"
readonly LOG_DIR="$PROJECT_ROOT/logs"
readonly PID_DIR="$PROJECT_ROOT/.pids"
readonly FRONTEND_PORT="${FRONTEND_PORT:-3000}"
readonly BACKEND_PORT="${BACKEND_PORT:-5002}"
readonly HEALTH_CHECK_TIMEOUT="${HEALTH_CHECK_TIMEOUT:-30}"
readonly STARTUP_TIMEOUT="${STARTUP_TIMEOUT:-60}"

# Colors for output (with fallback for non-color terminals)
if [[ -t 1 ]] && [[ "$(tput colors 2>/dev/null || echo 0)" -ge 8 ]]; then
    readonly RED='\033[0;31m'
    readonly GREEN='\033[0;32m'
    readonly YELLOW='\033[1;33m'
    readonly BLUE='\033[0;34m'
    readonly MAGENTA='\033[0;35m'
    readonly CYAN='\033[0;36m'
    readonly NC='\033[0m' # No Color
else
    readonly RED='' GREEN='' YELLOW='' BLUE='' MAGENTA='' CYAN='' NC=''
fi

# ============================================================================
# Utility Functions
# ============================================================================

# Enhanced logging with timestamps
log() {
    local level="$1"
    shift
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo -e "${timestamp} [${level}] $*" | tee -a "$LOG_DIR/startup.log"
}

log_info() { echo -e "${BLUE}ℹ${NC}  $*" && log "INFO" "$*"; }
log_success() { echo -e "${GREEN}✅${NC} $*" && log "SUCCESS" "$*"; }
log_warning() { echo -e "${YELLOW}⚠️${NC}  $*" && log "WARNING" "$*"; }
log_error() { echo -e "${RED}❌${NC} $*" && log "ERROR" "$*"; }

# Progress indicator
show_progress() {
    local pid=$1
    local message="$2"
    local timeout=${3:-30}
    local elapsed=0
    
    echo -n "$message"
    while kill -0 "$pid" 2>/dev/null && [ $elapsed -lt $timeout ]; do
        echo -n "."
        sleep 1
        ((elapsed++))
    done
    echo
    
    if [ $elapsed -ge $timeout ]; then
        return 1
    fi
    return 0
}

# ============================================================================
# Platform Detection and Compatibility
# ============================================================================

detect_platform() {
    case "$OSTYPE" in
        darwin*) echo "macos" ;;
        linux*) echo "linux" ;;
        msys*|cygwin*|mingw*) echo "windows" ;;
        *) echo "unknown" ;;
    esac
}

readonly PLATFORM=$(detect_platform)

# ============================================================================
# Process Management
# ============================================================================

# Create necessary directories
setup_directories() {
    mkdir -p "$LOG_DIR" "$PID_DIR"
    
    # Clear old logs if they're too large (>10MB)
    for log in "$LOG_DIR"/*.log; do
        if [[ -f "$log" ]] && [[ $(stat -f%z "$log" 2>/dev/null || stat -c%s "$log" 2>/dev/null || echo 0) -gt 10485760 ]]; then
            mv "$log" "$log.old"
            log_info "Rotated large log file: $(basename "$log")"
        fi
    done
}

# Save process information
save_process_info() {
    local name="$1"
    local pid="$2"
    local port="$3"
    
    cat > "$PID_DIR/${name}.json" <<EOF
{
    "pid": $pid,
    "port": $port,
    "started": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
    "command": "$(ps -p $pid -o command= 2>/dev/null || echo "unknown")"
}
EOF
}

# Check if a process is running
is_process_running() {
    local pid="$1"
    kill -0 "$pid" 2>/dev/null
}

# Get all child processes of a PID (cross-platform)
get_process_tree() {
    local pid="$1"
    
    if command -v pstree >/dev/null 2>&1; then
        pstree -p "$pid" 2>/dev/null | grep -o '([0-9]\+)' | grep -o '[0-9]\+' || echo "$pid"
    elif [[ "$PLATFORM" == "macos" ]]; then
        # macOS: Use ps to get process tree
        local pids="$pid"
        local children=$(ps -o pid,ppid | awk -v pid="$pid" '$2==pid {print $1}')
        while [[ -n "$children" ]]; do
            pids="$pids $children"
            local new_children=""
            for child in $children; do
                new_children="$new_children $(ps -o pid,ppid | awk -v pid="$child" '$2==pid {print $1}')"
            done
            children="$new_children"
        done
        echo $pids
    else
        # Linux fallback: Use /proc
        local pids="$pid"
        local children=$(find /proc -maxdepth 1 -name "[0-9]*" -exec grep -l "PPid:[[:space:]]*$pid" {}/status \; 2>/dev/null | grep -o '[0-9]\+')
        while [[ -n "$children" ]]; do
            pids="$pids $children"
            local new_children=""
            for child in $children; do
                new_children="$new_children $(find /proc -maxdepth 1 -name "[0-9]*" -exec grep -l "PPid:[[:space:]]*$child" {}/status \; 2>/dev/null | grep -o '[0-9]\+')"
            done
            children="$new_children"
        done
        echo $pids
    fi
}

# Kill process tree gracefully
kill_process_tree() {
    local pid="$1"
    local signal="${2:-TERM}"
    local name="${3:-Process}"
    
    if ! is_process_running "$pid"; then
        return 0
    fi
    
    local pids=$(get_process_tree "$pid")
    log_info "Stopping $name (PIDs: $pids)"
    
    # Send signal to all processes
    for p in $pids; do
        kill -"$signal" "$p" 2>/dev/null || true
    done
    
    # Wait for graceful shutdown (max 5 seconds)
    local count=0
    while [ $count -lt 5 ]; do
        local still_running=false
        for p in $pids; do
            if is_process_running "$p"; then
                still_running=true
                break
            fi
        done
        
        if ! $still_running; then
            log_success "$name stopped gracefully"
            return 0
        fi
        
        sleep 1
        ((count++))
    done
    
    # Force kill if still running
    log_warning "$name did not stop gracefully, forcing..."
    for p in $pids; do
        kill -9 "$p" 2>/dev/null || true
    done
    
    sleep 1
    log_success "$name stopped (forced)"
}

# ============================================================================
# Port Management
# ============================================================================

# Cross-platform port check
check_port() {
    local port="$1"
    
    # Try lsof first (most reliable)
    if command -v lsof >/dev/null 2>&1; then
        if lsof -i ":$port" -sTCP:LISTEN >/dev/null 2>&1; then
            return 0  # Port is in use
        fi
    fi
    
    # Try ss (modern Linux)
    if command -v ss >/dev/null 2>&1; then
        if ss -tln | grep -q ":$port "; then
            return 0  # Port is in use
        fi
    fi
    
    # Try netstat (legacy but widely available)
    if command -v netstat >/dev/null 2>&1; then
        if [[ "$PLATFORM" == "macos" ]]; then
            if netstat -an | grep -q "\\.$port .*LISTEN"; then
                return 0  # Port is in use
            fi
        else
            if netstat -tln 2>/dev/null | grep -q ":$port "; then
                return 0  # Port is in use
            fi
        fi
    fi
    
    # Try nc (netcat) as last resort
    if command -v nc >/dev/null 2>&1; then
        if nc -z localhost "$port" 2>/dev/null; then
            return 0  # Port is in use
        fi
    fi
    
    return 1  # Port is free
}

# Get process using a port
get_port_process() {
    local port="$1"
    
    if command -v lsof >/dev/null 2>&1; then
        lsof -i ":$port" -sTCP:LISTEN -t 2>/dev/null | head -1
    elif command -v ss >/dev/null 2>&1; then
        ss -tlnp 2>/dev/null | grep ":$port " | awk '{print $NF}' | grep -o '[0-9]\+' | head -1
    elif [[ "$PLATFORM" == "macos" ]] && command -v netstat >/dev/null 2>&1; then
        # macOS netstat doesn't show PIDs without sudo
        echo ""
    else
        echo ""
    fi
}

# Show what's using a port
show_port_usage() {
    local port="$1"
    local pid=$(get_port_process "$port")
    
    if [[ -n "$pid" ]]; then
        local cmd=$(ps -p "$pid" -o command= 2>/dev/null || echo "unknown")
        log_info "Port $port is used by PID $pid: $cmd"
    else
        log_info "Port $port is in use but couldn't identify the process"
        
        # Try to show listening sockets
        if command -v lsof >/dev/null 2>&1; then
            lsof -i ":$port" 2>/dev/null | grep LISTEN || true
        elif command -v ss >/dev/null 2>&1; then
            ss -tln | grep ":$port " || true
        fi
    fi
}

# ============================================================================
# Environment Validation
# ============================================================================

check_requirements() {
    log_info "Checking system requirements..."
    
    # Check Node.js
    if ! command -v node >/dev/null 2>&1; then
        log_error "Node.js is not installed. Please install Node.js 18 or higher."
        return 1
    fi
    
    local node_version=$(node -v | grep -o '[0-9]\+' | head -1)
    if [[ $node_version -lt 18 ]]; then
        log_warning "Node.js version is $node_version. Version 18 or higher is recommended."
    else
        log_success "Node.js $(node -v) detected"
    fi
    
    # Check npm
    if ! command -v npm >/dev/null 2>&1; then
        log_error "npm is not installed. Please install npm."
        return 1
    fi
    log_success "npm $(npm -v) detected"
    
    # Check required files
    if [[ ! -f "$PROJECT_ROOT/package.json" ]]; then
        log_error "package.json not found. Please run this script from the project root."
        return 1
    fi
    
    if [[ ! -f "$PROJECT_ROOT/.env" ]]; then
        if [[ -f "$PROJECT_ROOT/.env.example" ]]; then
            log_warning ".env file not found. Creating from .env.example..."
            cp "$PROJECT_ROOT/.env.example" "$PROJECT_ROOT/.env"
            log_info "Please edit .env with your configuration"
        else
            log_error ".env file not found and no .env.example available"
            return 1
        fi
    fi
    
    # Validate .env contents
    if [[ -f "$PROJECT_ROOT/.env" ]]; then
        local missing_vars=()
        
        # Check for critical environment variables
        for var in "VITE_SUPABASE_URL" "VITE_SUPABASE_ANON_KEY"; do
            if ! grep -q "^${var}=" "$PROJECT_ROOT/.env"; then
                missing_vars+=("$var")
            fi
        done
        
        if [[ ${#missing_vars[@]} -gt 0 ]]; then
            log_warning "Missing environment variables: ${missing_vars[*]}"
            log_info "Please add these to your .env file"
        fi
    fi
    
    log_success "Environment validation completed"
    return 0
}

# ============================================================================
# Dependency Management
# ============================================================================

install_dependencies() {
    # Check frontend dependencies
    if [[ ! -d "$PROJECT_ROOT/node_modules" ]] || [[ "$PROJECT_ROOT/package.json" -nt "$PROJECT_ROOT/node_modules" ]]; then
        log_info "Installing frontend dependencies..."
        (cd "$PROJECT_ROOT" && npm install) || {
            log_error "Failed to install frontend dependencies"
            return 1
        }
        log_success "Frontend dependencies installed"
    fi
    
    # Check backend dependencies
    if [[ ! -d "$PROJECT_ROOT/server/node_modules" ]] || [[ "$PROJECT_ROOT/server/package.json" -nt "$PROJECT_ROOT/server/node_modules" ]]; then
        log_info "Installing backend dependencies..."
        (cd "$PROJECT_ROOT/server" && npm install) || {
            log_error "Failed to install backend dependencies"
            return 1
        }
        log_success "Backend dependencies installed"
    fi
    
    return 0
}

# ============================================================================
# Server Management
# ============================================================================

start_backend_server() {
    log_info "Starting backend server on port $BACKEND_PORT..."
    
    # Start the backend server with proper output redirection
    (
        cd "$PROJECT_ROOT/server"
        # Use exec to replace the subshell with the actual process
        exec npm run dev > "$LOG_DIR/backend.log" 2>&1
    ) &
    
    local backend_pid=$!
    
    # Wait for the actual node process to start
    sleep 2
    
    # Find the actual node process (child of npm)
    local actual_pid=""
    local attempts=0
    while [[ -z "$actual_pid" ]] && [[ $attempts -lt 5 ]]; do
        # Get child processes of npm
        local children=$(get_process_tree "$backend_pid" | grep -v "^$backend_pid$" | tail -1)
        if [[ -n "$children" ]]; then
            actual_pid="$children"
        else
            sleep 1
            ((attempts++))
        fi
    done
    
    if [[ -z "$actual_pid" ]]; then
        log_warning "Could not find actual backend process, using npm PID"
        actual_pid="$backend_pid"
    fi
    
    # Verify the process is running
    if ! is_process_running "$actual_pid"; then
        log_error "Backend server failed to start"
        tail -20 "$LOG_DIR/backend.log" 2>/dev/null
        return 1
    fi
    
    save_process_info "backend" "$actual_pid" "$BACKEND_PORT"
    
    # Wait for health check
    log_info "Waiting for backend server to be ready..."
    local count=0
    while [ $count -lt $HEALTH_CHECK_TIMEOUT ]; do
        if curl -sf "http://localhost:$BACKEND_PORT/api/v1/health" >/dev/null 2>&1; then
            log_success "Backend server is ready!"
            echo "$actual_pid"
            return 0
        fi
        
        # Check if process died
        if ! is_process_running "$actual_pid"; then
            log_error "Backend server died during startup"
            tail -20 "$LOG_DIR/backend.log" 2>/dev/null
            return 1
        fi
        
        sleep 1
        ((count++))
        
        # Show progress every 5 seconds
        if [[ $((count % 5)) -eq 0 ]]; then
            echo -n "."
        fi
    done
    
    log_error "Backend server failed to respond within $HEALTH_CHECK_TIMEOUT seconds"
    tail -20 "$LOG_DIR/backend.log" 2>/dev/null
    return 1
}

start_frontend_server() {
    log_info "Starting frontend server on port $FRONTEND_PORT..."
    
    # Start the frontend server
    (
        cd "$PROJECT_ROOT"
        # Use exec to replace the subshell with the actual process
        exec npm run dev > "$LOG_DIR/frontend.log" 2>&1
    ) &
    
    local frontend_pid=$!
    
    # Wait for the actual vite process to start
    sleep 2
    
    # Find the actual vite/node process
    local actual_pid=""
    local attempts=0
    while [[ -z "$actual_pid" ]] && [[ $attempts -lt 5 ]]; do
        local children=$(get_process_tree "$frontend_pid" | grep -v "^$frontend_pid$" | tail -1)
        if [[ -n "$children" ]]; then
            actual_pid="$children"
        else
            sleep 1
            ((attempts++))
        fi
    done
    
    if [[ -z "$actual_pid" ]]; then
        log_warning "Could not find actual frontend process, using npm PID"
        actual_pid="$frontend_pid"
    fi
    
    # Verify the process is running
    if ! is_process_running "$actual_pid"; then
        log_error "Frontend server failed to start"
        tail -20 "$LOG_DIR/frontend.log" 2>/dev/null
        return 1
    fi
    
    save_process_info "frontend" "$actual_pid" "$FRONTEND_PORT"
    
    # Wait for frontend to be ready
    log_info "Waiting for frontend server to be ready..."
    local count=0
    while [ $count -lt $STARTUP_TIMEOUT ]; do
        # Check if Vite is responding
        if curl -sf "http://localhost:$FRONTEND_PORT" >/dev/null 2>&1; then
            log_success "Frontend server is ready!"
            echo "$actual_pid"
            return 0
        fi
        
        # Check for Vite's ready message in logs
        if grep -q "ready in" "$LOG_DIR/frontend.log" 2>/dev/null; then
            log_success "Frontend server is ready!"
            echo "$actual_pid"
            return 0
        fi
        
        # Check if process died
        if ! is_process_running "$actual_pid"; then
            log_error "Frontend server died during startup"
            tail -20 "$LOG_DIR/frontend.log" 2>/dev/null
            return 1
        fi
        
        sleep 1
        ((count++))
        
        # Show progress every 5 seconds
        if [[ $((count % 5)) -eq 0 ]]; then
            echo -n "."
        fi
    done
    
    log_error "Frontend server failed to start within $STARTUP_TIMEOUT seconds"
    tail -20 "$LOG_DIR/frontend.log" 2>/dev/null
    return 1
}

# ============================================================================
# Process Monitoring
# ============================================================================

monitor_servers() {
    local backend_pid="$1"
    local frontend_pid="$2"
    
    log_info "Monitoring servers... Press Ctrl+C to stop"
    
    while true; do
        # Check backend
        if ! is_process_running "$backend_pid"; then
            log_error "Backend server crashed!"
            tail -20 "$LOG_DIR/backend.log" 2>/dev/null
            return 1
        fi
        
        # Check frontend
        if ! is_process_running "$frontend_pid"; then
            log_error "Frontend server crashed!"
            tail -20 "$LOG_DIR/frontend.log" 2>/dev/null
            return 1
        fi
        
        # Check health endpoint periodically
        if ! curl -sf "http://localhost:$BACKEND_PORT/api/v1/health" >/dev/null 2>&1; then
            log_warning "Backend health check failed"
        fi
        
        sleep 5
    done
}

# ============================================================================
# Cleanup Functions
# ============================================================================

cleanup_all() {
    log_info "Cleaning up..."
    
    # Stop frontend
    if [[ -f "$PID_DIR/frontend.json" ]]; then
        local frontend_pid=$(jq -r '.pid' "$PID_DIR/frontend.json" 2>/dev/null)
        if [[ -n "$frontend_pid" ]]; then
            kill_process_tree "$frontend_pid" "TERM" "Frontend server"
        fi
        rm -f "$PID_DIR/frontend.json"
    fi
    
    # Stop backend
    if [[ -f "$PID_DIR/backend.json" ]]; then
        local backend_pid=$(jq -r '.pid' "$PID_DIR/backend.json" 2>/dev/null)
        if [[ -n "$backend_pid" ]]; then
            kill_process_tree "$backend_pid" "TERM" "Backend server"
        fi
        rm -f "$PID_DIR/backend.json"
    fi
    
    # Clean up any orphaned processes on our ports
    for port in $FRONTEND_PORT $BACKEND_PORT; do
        local pid=$(get_port_process "$port")
        if [[ -n "$pid" ]]; then
            log_warning "Found orphaned process on port $port"
            # Only kill if it's a node process (safety check)
            if ps -p "$pid" -o command= 2>/dev/null | grep -q node; then
                kill_process_tree "$pid" "TERM" "Orphaned process on port $port"
            else
                log_warning "Not killing non-node process on port $port"
            fi
        fi
    done
    
    log_success "Cleanup completed"
}

# ============================================================================
# Signal Handlers
# ============================================================================

handle_interrupt() {
    echo # New line after ^C
    log_info "Interrupt received, shutting down gracefully..."
    cleanup_all
    exit 0
}

handle_error() {
    local exit_code=$?
    log_error "An error occurred (exit code: $exit_code)"
    cleanup_all
    exit $exit_code
}

# Set up signal handlers
trap handle_interrupt INT TERM
trap handle_error ERR

# ============================================================================
# Main Execution
# ============================================================================

main() {
    echo -e "${CYAN}╔════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${CYAN}║        🚀 Virgil Development Environment Launcher 🚀        ║${NC}"
    echo -e "${CYAN}╚════════════════════════════════════════════════════════════╝${NC}"
    echo
    
    # Setup
    setup_directories
    
    # Validation
    check_requirements || exit 1
    
    # Check ports
    if check_port "$BACKEND_PORT"; then
        log_error "Port $BACKEND_PORT (backend) is already in use"
        show_port_usage "$BACKEND_PORT"
        echo
        echo "Options:"
        echo "  1. Stop the existing process"
        echo "  2. Use a different port: BACKEND_PORT=5003 $0"
        echo "  3. Run: ./cleanup-ports.sh to safely clean up"
        exit 1
    fi
    
    if check_port "$FRONTEND_PORT"; then
        log_error "Port $FRONTEND_PORT (frontend) is already in use"
        show_port_usage "$FRONTEND_PORT"
        echo
        echo "Options:"
        echo "  1. Stop the existing process"
        echo "  2. Use a different port: FRONTEND_PORT=3001 $0"
        echo "  3. Run: ./cleanup-ports.sh to safely clean up"
        exit 1
    fi
    
    # Install dependencies
    install_dependencies || exit 1
    
    # Start servers
    backend_pid=$(start_backend_server) || {
        cleanup_all
        exit 1
    }
    
    frontend_pid=$(start_frontend_server) || {
        cleanup_all
        exit 1
    }
    
    # Success banner
    echo
    echo -e "${GREEN}╔════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║          ✨ Virgil is ready for development! ✨            ║${NC}"
    echo -e "${GREEN}╚════════════════════════════════════════════════════════════╝${NC}"
    echo
    echo -e "${BLUE}📋 Server Status:${NC}"
    echo -e "   Backend API:  ${GREEN}http://localhost:$BACKEND_PORT/api/v1${NC}"
    echo -e "   Frontend App: ${GREEN}http://localhost:$FRONTEND_PORT${NC}"
    echo
    echo -e "${BLUE}📁 Log Files:${NC}"
    echo -e "   Backend:  $LOG_DIR/backend.log"
    echo -e "   Frontend: $LOG_DIR/frontend.log"
    echo -e "   Startup:  $LOG_DIR/startup.log"
    echo
    echo -e "${BLUE}💡 Useful Commands:${NC}"
    echo -e "   View backend logs:  ${CYAN}tail -f $LOG_DIR/backend.log${NC}"
    echo -e "   View frontend logs: ${CYAN}tail -f $LOG_DIR/frontend.log${NC}"
    echo -e "   Check port usage:   ${CYAN}./check-ports.sh${NC}"
    echo -e "   Clean up stuck processes: ${CYAN}./cleanup-ports.sh${NC}"
    echo
    echo -e "${YELLOW}Press Ctrl+C to stop all servers${NC}"
    echo
    
    # Monitor servers
    monitor_servers "$backend_pid" "$frontend_pid"
}

# Run main function
main "$@"