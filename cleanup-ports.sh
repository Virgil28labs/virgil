#!/bin/bash

# Virgil Port Cleanup Utility
# Safely cleans up processes using Virgil's default ports

set -euo pipefail

# Configuration
readonly FRONTEND_PORT="${FRONTEND_PORT:-3000}"
readonly BACKEND_PORT="${BACKEND_PORT:-5002}"
readonly PID_DIR=".pids"

# Colors for output
if [[ -t 1 ]] && [[ "$(tput colors 2>/dev/null || echo 0)" -ge 8 ]]; then
    readonly RED='\033[0;31m'
    readonly GREEN='\033[0;32m'
    readonly YELLOW='\033[1;33m'
    readonly BLUE='\033[0;34m'
    readonly NC='\033[0m'
else
    readonly RED='' GREEN='' YELLOW='' BLUE='' NC=''
fi

# Logging functions
log_info() { echo -e "${BLUE}ℹ${NC}  $*"; }
log_success() { echo -e "${GREEN}✅${NC} $*"; }
log_warning() { echo -e "${YELLOW}⚠️${NC}  $*"; }
log_error() { echo -e "${RED}❌${NC} $*"; }

# Platform detection
detect_platform() {
    case "$OSTYPE" in
        darwin*) echo "macos" ;;
        linux*) echo "linux" ;;
        *) echo "unknown" ;;
    esac
}

readonly PLATFORM=$(detect_platform)

# Get process using a port
get_port_process() {
    local port="$1"
    
    if command -v lsof >/dev/null 2>&1; then
        lsof -i ":$port" -sTCP:LISTEN -t 2>/dev/null | head -1
    elif command -v ss >/dev/null 2>&1; then
        ss -tlnp 2>/dev/null | grep ":$port " | awk '{print $NF}' | grep -o '[0-9]\+' | head -1
    else
        echo ""
    fi
}

# Check if process is a node process
is_node_process() {
    local pid="$1"
    ps -p "$pid" -o command= 2>/dev/null | grep -q -E "(node|npm|vite|nodemon)" || false
}

# Get process info
get_process_info() {
    local pid="$1"
    ps -p "$pid" -o pid,ppid,user,command 2>/dev/null || echo "Process $pid not found"
}

# Kill process safely
kill_process_safely() {
    local pid="$1"
    local port="$2"
    
    log_info "Checking process $pid on port $port..."
    
    # Show process details
    echo "Process details:"
    get_process_info "$pid" | sed 's/^/  /'
    echo
    
    # Safety check - only kill node-related processes
    if ! is_node_process "$pid"; then
        log_warning "Process $pid is not a Node.js process. Skipping for safety."
        return 1
    fi
    
    # Confirm with user
    read -p "Kill this process? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        log_info "Skipping process $pid"
        return 1
    fi
    
    # Try graceful termination first
    log_info "Sending SIGTERM to process $pid..."
    kill -TERM "$pid" 2>/dev/null || {
        log_warning "Process $pid not found"
        return 1
    }
    
    # Wait for process to terminate
    local count=0
    while kill -0 "$pid" 2>/dev/null && [ $count -lt 5 ]; do
        sleep 1
        ((count++))
    done
    
    # Force kill if still running
    if kill -0 "$pid" 2>/dev/null; then
        log_warning "Process didn't terminate gracefully, forcing..."
        kill -9 "$pid" 2>/dev/null || true
    fi
    
    log_success "Process $pid terminated"
    return 0
}

# Clean up PID files
cleanup_pid_files() {
    if [[ -d "$PID_DIR" ]]; then
        log_info "Cleaning up PID files..."
        local cleaned=0
        
        for pidfile in "$PID_DIR"/*.json; do
            if [[ -f "$pidfile" ]]; then
                local pid=$(jq -r '.pid' "$pidfile" 2>/dev/null || echo "")
                if [[ -n "$pid" ]] && ! kill -0 "$pid" 2>/dev/null; then
                    rm -f "$pidfile"
                    ((cleaned++))
                fi
            fi
        done
        
        if [[ $cleaned -gt 0 ]]; then
            log_success "Cleaned up $cleaned stale PID files"
        fi
    fi
}

# Main cleanup function
main() {
    echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"
    echo -e "${BLUE}        Virgil Port Cleanup Utility                    ${NC}"
    echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"
    echo
    
    local found_processes=false
    
    # Check frontend port
    log_info "Checking port $FRONTEND_PORT (frontend)..."
    local frontend_pid=$(get_port_process "$FRONTEND_PORT")
    if [[ -n "$frontend_pid" ]]; then
        found_processes=true
        echo
        log_warning "Found process on frontend port $FRONTEND_PORT"
        kill_process_safely "$frontend_pid" "$FRONTEND_PORT" || true
        echo
    else
        log_success "Port $FRONTEND_PORT is free"
    fi
    
    # Check backend port
    log_info "Checking port $BACKEND_PORT (backend)..."
    local backend_pid=$(get_port_process "$BACKEND_PORT")
    if [[ -n "$backend_pid" ]]; then
        found_processes=true
        echo
        log_warning "Found process on backend port $BACKEND_PORT"
        kill_process_safely "$backend_pid" "$BACKEND_PORT" || true
        echo
    else
        log_success "Port $BACKEND_PORT is free"
    fi
    
    # Clean up PID files
    cleanup_pid_files
    
    echo
    if $found_processes; then
        log_success "Port cleanup completed"
    else
        log_success "All ports are already free"
    fi
    
    # Final check
    echo
    log_info "Final port status:"
    
    local all_clear=true
    if get_port_process "$FRONTEND_PORT" >/dev/null 2>&1; then
        log_warning "Port $FRONTEND_PORT is still in use"
        all_clear=false
    else
        log_success "Port $FRONTEND_PORT is free"
    fi
    
    if get_port_process "$BACKEND_PORT" >/dev/null 2>&1; then
        log_warning "Port $BACKEND_PORT is still in use"
        all_clear=false
    else
        log_success "Port $BACKEND_PORT is free"
    fi
    
    echo
    if $all_clear; then
        log_success "All ports are clear. You can now start Virgil!"
        echo
        echo "Run: ./start-dev.sh"
    else
        log_warning "Some ports are still in use. You may need to manually kill the processes."
        echo
        echo "Try running with sudo if processes are owned by root:"
        echo "  sudo $0"
    fi
}

# Run main function
main "$@"