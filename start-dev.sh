#!/bin/bash

# Virgil Development Environment - Optimized Startup Script
# Fast, simple, and reliable
set -euo pipefail

# Configuration
readonly PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
readonly LOG_DIR="$PROJECT_ROOT/logs"
readonly FRONTEND_PORT="${FRONTEND_PORT:-3000}"
readonly BACKEND_PORT="${BACKEND_PORT:-5002}"

# Colors
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

# Quick port cleanup
cleanup_ports() {
    for port in $BACKEND_PORT $FRONTEND_PORT; do
        local pids=$(lsof -ti ":$port" 2>/dev/null || true)
        if [[ -n "$pids" ]]; then
            echo "$pids" | xargs kill -9 2>/dev/null || true
        fi
    done
}

# Fast health check
wait_for_server() {
    local url=$1
    local name=$2
    local max_attempts=50  # 5 seconds max
    local attempt=0
    
    while [ $attempt -lt $max_attempts ]; do
        if curl -sf --max-time 1 "$url" >/dev/null 2>&1; then
            return 0
        fi
        sleep 0.1
        ((attempt++))
        if [[ $((attempt % 10)) -eq 0 ]]; then
            echo -n "."
        fi
    done
    
    echo " ✗"
    log_error "$name failed to start"
    return 1
}

# Handle Ctrl+C
handle_interrupt() {
    echo
    log_info "Stopping servers..."
    cleanup_ports
    exit 0
}

# Main execution
main() {
    # Parse simple flags
    local skip_deps=false
    if [[ "${1:-}" == "--skip-deps" ]]; then
        skip_deps=true
    fi
    
    echo -e "${BLUE}🚀 Virgil Development Environment${NC}"
    echo
    
    # Setup
    mkdir -p "$LOG_DIR"
    trap handle_interrupt INT TERM
    
    # Fast port cleanup
    cleanup_ports
    
    # Quick .env check
    if [[ ! -f "$PROJECT_ROOT/.env" ]] && [[ -f "$PROJECT_ROOT/.env.example" ]]; then
        cp "$PROJECT_ROOT/.env.example" "$PROJECT_ROOT/.env"
        log_info "Created .env from .env.example"
    fi
    
    # Smart dependency check - only if missing or stale (>24 hours)
    if ! $skip_deps; then
        local check_deps=false
        
        # Check frontend
        if [[ ! -d "$PROJECT_ROOT/node_modules" ]]; then
            check_deps=true
        elif [[ -n "$(find "$PROJECT_ROOT/package.json" -mtime -1 -newer "$PROJECT_ROOT/node_modules" 2>/dev/null)" ]]; then
            check_deps=true
        fi
        
        if $check_deps; then
            log_info "Installing frontend dependencies..."
            (cd "$PROJECT_ROOT" && npm install) || exit 1
        fi
        
        # Check backend
        check_deps=false
        if [[ ! -d "$PROJECT_ROOT/server/node_modules" ]]; then
            check_deps=true
        elif [[ -n "$(find "$PROJECT_ROOT/server/package.json" -mtime -1 -newer "$PROJECT_ROOT/server/node_modules" 2>/dev/null)" ]]; then
            check_deps=true
        fi
        
        if $check_deps; then
            log_info "Installing backend dependencies..."
            (cd "$PROJECT_ROOT/server" && npm install) || exit 1
        fi
    fi
    
    # Start servers in parallel
    log_info "Starting servers..."
    
    # Clear logs
    > "$LOG_DIR/backend.log"
    > "$LOG_DIR/frontend.log"
    
    # Start both servers
    (cd "$PROJECT_ROOT/server" && npm run dev > "$LOG_DIR/backend.log" 2>&1) &
    local backend_pid=$!
    
    (cd "$PROJECT_ROOT" && npm run dev > "$LOG_DIR/frontend.log" 2>&1) &
    local frontend_pid=$!
    
    # Wait for both in parallel
    echo -n "   Backend"
    wait_for_server "http://localhost:$BACKEND_PORT/api/v1/health" "Backend" &
    local backend_check=$!
    
    echo -n "   Frontend"
    wait_for_server "http://localhost:$FRONTEND_PORT" "Frontend" &
    local frontend_check=$!
    
    # Check results
    local backend_ready=false
    local frontend_ready=false
    
    if wait $backend_check; then
        echo " ✓"
        backend_ready=true
    fi
    
    if wait $frontend_check; then
        echo " ✓"
        frontend_ready=true
    fi
    
    if ! $backend_ready || ! $frontend_ready; then
        log_error "Failed to start all servers"
        
        # Show logs on failure
        if ! $backend_ready && [[ -f "$LOG_DIR/backend.log" ]]; then
            echo
            log_error "Backend logs:"
            tail -10 "$LOG_DIR/backend.log" | sed 's/^/  /'
        fi
        
        if ! $frontend_ready && [[ -f "$LOG_DIR/frontend.log" ]]; then
            echo
            log_error "Frontend logs:"
            tail -10 "$LOG_DIR/frontend.log" | sed 's/^/  /'
        fi
        
        cleanup_ports
        exit 1
    fi
    
    # Success
    echo
    log_success "Virgil is ready!"
    echo
    echo "   Frontend: http://localhost:$FRONTEND_PORT"
    echo "   Backend:  http://localhost:$BACKEND_PORT/api/v1"
    echo
    echo "   Logs: tail -f logs/*.log"
    echo
    echo "Press Ctrl+C to stop"
    
    # Simple monitoring
    while true; do
        if ! kill -0 $backend_pid 2>/dev/null || ! kill -0 $frontend_pid 2>/dev/null; then
            log_error "A server crashed!"
            break
        fi
        sleep 3
    done
    
    cleanup_ports
    exit 1
}

# Run
main "$@"