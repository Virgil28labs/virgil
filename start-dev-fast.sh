#!/bin/bash

# Virgil Development Environment - Fast Startup Script
# Optimized for quick development starts - skips dependency checks
set -euo pipefail

# Configuration
readonly PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
readonly LOG_DIR="$PROJECT_ROOT/logs"
readonly FRONTEND_PORT="${FRONTEND_PORT:-3000}"
readonly BACKEND_PORT="${BACKEND_PORT:-5002}"

# Fast timeouts (in seconds)
readonly HEALTH_CHECK_TIMEOUT="${VIRGIL_HEALTH_TIMEOUT:-10}"
readonly CURL_TIMEOUT="${VIRGIL_CURL_TIMEOUT:-3}"

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

# Quick cleanup
quick_cleanup() {
    # Kill processes on our ports in parallel
    for port in $BACKEND_PORT $FRONTEND_PORT; do
        lsof -ti ":$port" 2>/dev/null | xargs -r kill -9 2>/dev/null || true &
    done
    wait
}

# Fast server check
wait_for_server_fast() {
    local url=$1
    local port=$2
    local name=$3
    local max_attempts=50  # 5 seconds total
    local attempt=0
    
    while [ $attempt -lt $max_attempts ]; do
        if curl -sf --max-time 1 --connect-timeout 1 "$url" >/dev/null 2>&1; then
            return 0
        fi
        sleep 0.1
        ((attempt++))
        [[ $((attempt % 10)) -eq 0 ]] && echo -n "."
    done
    
    log_error "$name failed to start quickly"
    return 1
}

# Handle interrupt
handle_interrupt() {
    echo
    log_info "Stopping servers..."
    quick_cleanup
    exit 0
}

# Main execution
main() {
    echo -e "${BLUE}🚀 Virgil Fast Start${NC}"
    
    # Setup
    mkdir -p "$LOG_DIR"
    trap handle_interrupt INT TERM
    
    # Quick port cleanup
    quick_cleanup
    
    # Start servers in parallel without npm install
    log_info "Starting servers..."
    
    # Backend
    (cd "$PROJECT_ROOT/server" && npm run dev > "$LOG_DIR/backend.log" 2>&1) &
    BACKEND_PID=$!
    
    # Frontend  
    (cd "$PROJECT_ROOT" && npm run dev > "$LOG_DIR/frontend.log" 2>&1) &
    FRONTEND_PID=$!
    
    # Wait for both in parallel
    echo -n "   Backend"
    wait_for_server_fast "http://localhost:$BACKEND_PORT/api/v1/health" "$BACKEND_PORT" "Backend" &
    BACKEND_CHECK=$!
    
    echo -n "   Frontend"
    wait_for_server_fast "http://localhost:$FRONTEND_PORT" "$FRONTEND_PORT" "Frontend" &
    FRONTEND_CHECK=$!
    
    # Wait for checks to complete
    wait $BACKEND_CHECK
    BACKEND_READY=$?
    echo " $([ $BACKEND_READY -eq 0 ] && echo ✓ || echo ✗)"
    
    wait $FRONTEND_CHECK
    FRONTEND_READY=$?
    echo " $([ $FRONTEND_READY -eq 0 ] && echo ✓ || echo ✗)"
    
    # Check results
    if [ $BACKEND_READY -ne 0 ] || [ $FRONTEND_READY -ne 0 ]; then
        log_error "Failed to start servers"
        
        # Show recent logs on failure
        if [ $BACKEND_READY -ne 0 ]; then
            echo
            log_error "Backend logs:"
            tail -10 "$LOG_DIR/backend.log" 2>/dev/null | sed 's/^/  /'
        fi
        
        if [ $FRONTEND_READY -ne 0 ]; then
            echo
            log_error "Frontend logs:"
            tail -10 "$LOG_DIR/frontend.log" 2>/dev/null | sed 's/^/  /'
        fi
        
        quick_cleanup
        exit 1
    fi
    
    # Success
    echo
    log_success "Virgil is ready! (fast mode)"
    echo
    echo "   Frontend: http://localhost:$FRONTEND_PORT"
    echo "   Backend:  http://localhost:$BACKEND_PORT/api/v1"
    echo
    echo "Press Ctrl+C to stop"
    
    # Monitor
    while kill -0 $BACKEND_PID 2>/dev/null && kill -0 $FRONTEND_PID 2>/dev/null; do
        sleep 2
    done
    
    log_error "A server crashed!"
    quick_cleanup
    exit 1
}

# Run
main "$@"