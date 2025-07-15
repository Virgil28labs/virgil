#!/bin/bash

# Virgil Development Environment - Simple Startup Script
set -euo pipefail

# Configuration
readonly PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
readonly LOG_DIR="$PROJECT_ROOT/logs"
readonly PID_DIR="$PROJECT_ROOT/.pids"
readonly FRONTEND_PORT="${FRONTEND_PORT:-3000}"
readonly BACKEND_PORT="${BACKEND_PORT:-5002}"

# Colors (if terminal supports them)
if [[ -t 1 ]]; then
    readonly GREEN='\033[0;32m'
    readonly RED='\033[0;31m'
    readonly YELLOW='\033[1;33m'
    readonly BLUE='\033[0;34m'
    readonly NC='\033[0m'
else
    readonly GREEN='' RED='' YELLOW='' BLUE='' NC=''
fi

# Simple logging
log_info() { echo -e "${BLUE}ℹ${NC}  $*"; }
log_success() { echo -e "${GREEN}✅${NC} $*"; }
log_error() { echo -e "${RED}❌${NC} $*"; }
log_warning() { echo -e "${YELLOW}⚠️${NC}  $*"; }

# Setup directories
setup_directories() {
    mkdir -p "$LOG_DIR" "$PID_DIR"
    # Clear startup log
    > "$LOG_DIR/startup.log"
}

# Pre-startup cleanup
pre_cleanup() {
    log_info "Cleaning up any existing processes..."
    
    # Kill any processes on our ports
    for port in $BACKEND_PORT $FRONTEND_PORT; do
        local pids=$(lsof -ti ":$port" 2>/dev/null || true)
        if [[ -n "$pids" ]]; then
            echo "$pids" | xargs kill -9 2>/dev/null || true
            log_info "Cleaned up process on port $port"
        fi
    done
    
    # Clean up stale PID files
    rm -rf "$PID_DIR"
    mkdir -p "$PID_DIR"
}

# Check if port is in use
check_port() {
    lsof -i ":$1" -sTCP:LISTEN >/dev/null 2>&1
}

# Get PID using port
get_port_pid() {
    lsof -i ":$1" -sTCP:LISTEN -t 2>/dev/null | head -1
}


# Wait for server to be ready
wait_for_server() {
    local url=$1
    local port=$2
    local timeout=100  # 10 seconds in 100ms intervals
    local count=0
    
    # Give server a moment to start binding to port
    sleep 0.5
    
    while [ $count -lt $timeout ]; do
        if curl -sf "$url" >/dev/null 2>&1; then
            # Add extra delay for backend to fully initialize all routes
            if [[ "$port" == "$BACKEND_PORT" ]]; then
                sleep 1.0  # Increased from 0.5s to 1s for better stability
                # Set environment flag to signal backend is ready
                export VITE_BACKEND_READY=true
            fi
            return 0
        fi
        
        sleep 0.1
        ((count++))
        
        # Progress indicator every 0.5s
        [[ $((count % 5)) -eq 0 ]] && echo -n "."
    done
    
    return 1
}

# Start backend server
start_backend() {
    log_info "Starting backend server..."
    (cd "$PROJECT_ROOT/server" && npm run dev > "$LOG_DIR/backend.log" 2>&1) &
    echo -n "   Waiting for backend"
    if wait_for_server "http://localhost:$BACKEND_PORT/api/v1/health" "$BACKEND_PORT"; then
        echo " ✓"
        return 0
    else
        echo " ✗"
        log_error "Backend failed to start"
        tail -10 "$LOG_DIR/backend.log" 2>/dev/null
        return 1
    fi
}

# Start frontend server
start_frontend() {
    log_info "Starting frontend server..."
    (cd "$PROJECT_ROOT" && npm run dev > "$LOG_DIR/frontend.log" 2>&1) &
    echo -n "   Waiting for frontend"
    if wait_for_server "http://localhost:$FRONTEND_PORT" "$FRONTEND_PORT"; then
        echo " ✓"
        return 0
    else
        echo " ✗"
        log_error "Frontend failed to start"
        tail -10 "$LOG_DIR/frontend.log" 2>/dev/null
        return 1
    fi
}

# Stop all servers
cleanup() {
    log_info "Stopping servers..."
    
    # Get all PIDs using our ports in parallel
    local pids=()
    for port in $BACKEND_PORT $FRONTEND_PORT; do
        local pid=$(lsof -i ":$port" -sTCP:LISTEN -t 2>/dev/null | head -1)
        [[ -n "$pid" ]] && pids+=($pid)
    done
    
    # Send SIGTERM to all processes at once
    if [[ ${#pids[@]} -gt 0 ]]; then
        kill -TERM "${pids[@]}" 2>/dev/null || true
    fi
    
    # Wait up to 2 seconds for ports to clear (checking every 100ms)
    local count=0
    while [[ $count -lt 20 ]]; do
        if ! lsof -i ":$BACKEND_PORT,:$FRONTEND_PORT" -sTCP:LISTEN >/dev/null 2>&1; then
            break
        fi
        sleep 0.1
        ((count++))
    done
    
    # Force kill any remaining processes
    for port in $BACKEND_PORT $FRONTEND_PORT; do
        local pid=$(lsof -i ":$port" -sTCP:LISTEN -t 2>/dev/null | head -1)
        if [[ -n "$pid" ]]; then
            kill -9 "$pid" 2>/dev/null || true
            log_warning "Force killed process on port $port"
        fi
    done
    
    # Clean up PID directory
    rm -rf "$PID_DIR"
    
    log_success "Cleanup completed"
}

# Handle Ctrl+C
handle_interrupt() {
    echo  # New line after ^C
    cleanup
    exit 0
}

# Main execution
main() {
    # Banner
    echo -e "${BLUE}🚀 Virgil Development Environment${NC}"
    echo
    
    # Setup
    setup_directories
    pre_cleanup  # Clean up any orphaned processes
    trap handle_interrupt INT TERM
    
    # Check Node.js
    if ! command -v node >/dev/null 2>&1; then
        log_error "Node.js is not installed"
        exit 1
    fi
    
    # Check ports
    if check_port "$BACKEND_PORT"; then
        log_error "Port $BACKEND_PORT is already in use"
        echo "Run: ./cleanup-ports.sh"
        exit 1
    fi
    
    if check_port "$FRONTEND_PORT"; then
        log_error "Port $FRONTEND_PORT is already in use"
        echo "Run: ./cleanup-ports.sh"
        exit 1
    fi
    
    # Check .env file
    if [[ ! -f "$PROJECT_ROOT/.env" ]]; then
        if [[ -f "$PROJECT_ROOT/.env.example" ]]; then
            cp "$PROJECT_ROOT/.env.example" "$PROJECT_ROOT/.env"
            log_warning "Created .env from .env.example - please configure it"
        else
            log_error "No .env file found"
            exit 1
        fi
    fi
    
    # Smart dependency check - only install if missing or package.json is newer
    if [[ ! -d "$PROJECT_ROOT/node_modules" ]] || 
       [[ "$PROJECT_ROOT/package.json" -nt "$PROJECT_ROOT/node_modules" ]]; then
        log_info "Installing frontend dependencies..."
        (cd "$PROJECT_ROOT" && npm install) || exit 1
    fi
    
    if [[ ! -d "$PROJECT_ROOT/server/node_modules" ]] || 
       [[ "$PROJECT_ROOT/server/package.json" -nt "$PROJECT_ROOT/server/node_modules" ]]; then
        log_info "Installing backend dependencies..."
        (cd "$PROJECT_ROOT/server" && npm install) || exit 1
    fi
    
    # Start servers in parallel
    log_info "Starting servers in parallel..."
    
    # Start both servers simultaneously
    local backend_started=false
    local frontend_started=false
    
    start_backend &
    local backend_job=$!
    
    start_frontend &
    local frontend_job=$!
    
    # Wait for both to complete
    wait $backend_job && backend_started=true
    wait $frontend_job && frontend_started=true
    
    # Check if both started successfully
    if ! $backend_started || ! $frontend_started; then
        log_error "Failed to start all servers"
        cleanup
        exit 1
    fi
    
    # Success message
    echo
    log_success "Virgil is ready!"
    echo
    echo "   Frontend: http://localhost:$FRONTEND_PORT"
    echo "   Backend:  http://localhost:$BACKEND_PORT/api/v1"
    echo
    echo "   Logs: tail -f logs/*.log"
    echo
    echo "Press Ctrl+C to stop"
    
    # Keep running and monitor ports
    while true; do
        if ! lsof -i ":$BACKEND_PORT" -sTCP:LISTEN >/dev/null 2>&1; then
            log_error "Backend crashed!"
            break
        fi
        if ! lsof -i ":$FRONTEND_PORT" -sTCP:LISTEN >/dev/null 2>&1; then
            log_error "Frontend crashed!"
            break
        fi
        sleep 5
    done
    
    cleanup
    exit 1
}

# Run
main "$@"