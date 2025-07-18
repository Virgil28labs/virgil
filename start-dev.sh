#!/bin/bash

# Virgil Development Environment - Simple Startup Script
set -euo pipefail

# Configuration
readonly PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
readonly LOG_DIR="$PROJECT_ROOT/logs"
readonly PID_DIR="$PROJECT_ROOT/.pids"
readonly FRONTEND_PORT="${FRONTEND_PORT:-3000}"
readonly BACKEND_PORT="${BACKEND_PORT:-5002}"

# Timeout configurations (in seconds)
readonly HEALTH_CHECK_TIMEOUT="${VIRGIL_HEALTH_TIMEOUT:-15}"
readonly CURL_TIMEOUT="${VIRGIL_CURL_TIMEOUT:-5}"
readonly STARTUP_DELAY="${VIRGIL_STARTUP_DELAY:-0.5}"

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


# Wait for server to be ready with progressive health checks
wait_for_server() {
    local url=$1
    local port=$2
    local server_name=$3
    local timeout_iterations=$((HEALTH_CHECK_TIMEOUT * 10))  # Convert to 100ms intervals
    local count=0
    local last_error=""
    
    # Give server a moment to start binding to port
    sleep "$STARTUP_DELAY"
    
    while [ $count -lt $timeout_iterations ]; do
        # Progressive health check with specific timeout
        if curl -sf --max-time "$CURL_TIMEOUT" --connect-timeout 2 "$url" >/dev/null 2>&1; then
            # Backend gets additional validation
            if [[ "$port" == "$BACKEND_PORT" ]]; then
                log_info "Backend responding, validating readiness..."
                
                # Test multiple endpoints to ensure full initialization
                local ready_check_url="http://localhost:$BACKEND_PORT/api/v1/health/ready"
                if curl -sf --max-time "$CURL_TIMEOUT" "$ready_check_url" >/dev/null 2>&1; then
                    export VITE_BACKEND_READY=true
                    sleep 0.5  # Brief stabilization delay
                    return 0
                else
                    echo -n "R"  # Readiness check failed
                fi
            else
                # Frontend is ready when it responds
                return 0
            fi
        else
            # Capture more specific error information
            local curl_exit_code=$?
            case $curl_exit_code in
                7) last_error="Connection refused" ;;
                28) last_error="Timeout" ;;
                52) last_error="Empty response" ;;
                *) last_error="HTTP error (code: $curl_exit_code)" ;;
            esac
        fi
        
        sleep 0.1
        ((count++))
        
        # Progress indicator every 0.5s with more informative display
        if [[ $((count % 5)) -eq 0 ]]; then
            local elapsed=$((count / 10))
            echo -n ".$elapsed"
        fi
    done
    
    # Timeout reached - provide detailed error information
    log_error "$server_name failed to start within ${HEALTH_CHECK_TIMEOUT}s"
    if [[ -n "$last_error" ]]; then
        log_error "Last error: $last_error"
    fi
    
    # Additional diagnostics for backend
    if [[ "$port" == "$BACKEND_PORT" ]]; then
        log_error "Backend diagnostics:"
        echo "  Port check:" $(lsof -i ":$port" 2>/dev/null | grep LISTEN || echo "Not listening")
        echo "  Health URL: $url"
        echo "  Process check:" $(ps aux | grep "server.*index.js" | grep -v grep || echo "Not found")
    fi
    
    return 1
}

# Start backend server
start_backend() {
    log_info "Starting backend server..."
    (cd "$PROJECT_ROOT/server" && npm run dev > "$LOG_DIR/backend.log" 2>&1) &
    echo -n "   Waiting for backend"
    if wait_for_server "http://localhost:$BACKEND_PORT/api/v1/health" "$BACKEND_PORT" "Backend"; then
        echo " ✓"
        log_success "Backend server ready at http://localhost:$BACKEND_PORT"
        return 0
    else
        echo " ✗"
        log_error "Backend failed to start within ${HEALTH_CHECK_TIMEOUT}s"
        echo
        log_error "Recent backend logs:"
        tail -15 "$LOG_DIR/backend.log" 2>/dev/null | sed 's/^/  /'
        echo
        log_error "Try: tail -f logs/backend.log (in another terminal)"
        return 1
    fi
}

# Start frontend server
start_frontend() {
    log_info "Starting frontend server..."
    (cd "$PROJECT_ROOT" && npm run dev > "$LOG_DIR/frontend.log" 2>&1) &
    echo -n "   Waiting for frontend"
    if wait_for_server "http://localhost:$FRONTEND_PORT" "$FRONTEND_PORT" "Frontend"; then
        echo " ✓"
        log_success "Frontend server ready at http://localhost:$FRONTEND_PORT"
        return 0
    else
        echo " ✗"
        log_error "Frontend failed to start within ${HEALTH_CHECK_TIMEOUT}s"
        echo
        log_error "Recent frontend logs:"
        tail -15 "$LOG_DIR/frontend.log" 2>/dev/null | sed 's/^/  /'
        echo
        log_error "Try: tail -f logs/frontend.log (in another terminal)"
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

# Show help
show_help() {
    cat << EOF
Virgil Development Environment Startup Script

Usage: $0 [OPTIONS]

Options:
  --no-monitor    Start servers and exit (don't monitor)
  --help, -h      Show this help message

Environment Variables:
  FRONTEND_PORT          Frontend port (default: 3000)
  BACKEND_PORT           Backend port (default: 5002)
  VIRGIL_HEALTH_TIMEOUT  Health check timeout in seconds (default: 15)
  VIRGIL_CURL_TIMEOUT    Individual curl timeout in seconds (default: 5)
  VIRGIL_STARTUP_DELAY   Initial startup delay in seconds (default: 0.5)

Examples:
  $0                                    # Normal startup with monitoring
  $0 --no-monitor                       # Start and exit
  VIRGIL_HEALTH_TIMEOUT=30 $0           # Extended timeout for slow systems
  FRONTEND_PORT=3001 BACKEND_PORT=5003 $0  # Custom ports

For troubleshooting, run: ./diagnose.sh
EOF
}

# Main execution
main() {
    # Parse command line arguments
    local no_monitor=false
    for arg in "$@"; do
        case $arg in
            --no-monitor)
                no_monitor=true
                ;;
            --help|-h)
                show_help
                exit 0
                ;;
            *)
                log_error "Unknown option: $arg"
                echo "Use --help for usage information"
                exit 1
                ;;
        esac
    done
    
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
    
    # If --no-monitor flag is set, exit successfully
    if $no_monitor; then
        exit 0
    fi
    
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