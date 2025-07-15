#!/bin/bash

# Virgil Port Cleanup Utility
# Quickly cleans up processes using Virgil's default ports
# Usage: ./cleanup-ports.sh [--interactive]

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

# Simple platform check - we only need lsof which works on both macOS and Linux

# Get process using a port
get_port_process() {
    lsof -i ":$1" -sTCP:LISTEN -t 2>/dev/null | head -1
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

# Parse command line arguments
INTERACTIVE=false
for arg in "$@"; do
    case $arg in
        --interactive|-i)
            INTERACTIVE=true
            shift
            ;;
    esac
done

# Kill process safely
kill_process_safely() {
    local pid="$1"
    local port="$2"
    
    # Safety check - only kill node-related processes
    if ! is_node_process "$pid"; then
        log_warning "Process $pid is not a Node.js process. Skipping."
        return 1
    fi
    
    # Interactive mode - show details and confirm
    if $INTERACTIVE; then
        log_info "Process on port $port:"
        get_process_info "$pid" | sed 's/^/  /'
        echo
        
        read -p "Kill this process? (y/N) " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            log_info "Skipping process $pid"
            return 1
        fi
    fi
    
    # Try graceful termination first
    kill -TERM "$pid" 2>/dev/null || {
        log_warning "Process $pid not found"
        return 1
    }
    
    # Wait for process to terminate (max 1 second)
    local count=0
    while kill -0 "$pid" 2>/dev/null && [ $count -lt 10 ]; do
        sleep 0.1
        ((count++))
    done
    
    # Force kill if still running
    if kill -0 "$pid" 2>/dev/null; then
        kill -9 "$pid" 2>/dev/null || true
    fi
    
    log_success "Stopped process on port $port (PID: $pid)"
    return 0
}

# Clean up PID files
cleanup_pid_files() {
    if [[ -d "$PID_DIR" ]]; then
        rm -rf "$PID_DIR"
        log_info "Cleaned up PID files"
    fi
}

# Main cleanup function
main() {
    echo -e "${BLUE}🛑 Virgil Port Cleanup${NC}"
    if $INTERACTIVE; then
        echo "   Running in interactive mode"
    fi
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
        log_success "All ports are clear!"
    else
        log_error "Failed to clear some ports"
        if ! $INTERACTIVE; then
            echo "Try: $0 --interactive"
        fi
    fi
}

# Run main function
main "$@"