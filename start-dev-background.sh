#!/bin/bash

# Quick start script that launches servers in background and exits
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
    readonly BLUE='\033[0;34m'
    readonly NC='\033[0m'
else
    readonly GREEN='' RED='' BLUE='' NC=''
fi

echo -e "${BLUE}🚀 Starting Virgil servers in background...${NC}"

# Setup log directory
mkdir -p "$LOG_DIR"

# Clean up any existing processes
for port in $BACKEND_PORT $FRONTEND_PORT; do
    pids=$(lsof -ti ":$port" 2>/dev/null || true)
    if [[ -n "$pids" ]]; then
        echo "$pids" | xargs kill -9 2>/dev/null || true
    fi
done

# Start backend
echo "Starting backend on port $BACKEND_PORT..."
(cd "$PROJECT_ROOT/server" && npm run dev > "$LOG_DIR/backend.log" 2>&1) &

# Start frontend
echo "Starting frontend on port $FRONTEND_PORT..."
(cd "$PROJECT_ROOT" && npm run dev > "$LOG_DIR/frontend.log" 2>&1) &

# Wait a moment for servers to start
sleep 2

echo -e "${GREEN}✅ Servers launched!${NC}"
echo
echo "   Frontend: http://localhost:$FRONTEND_PORT"
echo "   Backend:  http://localhost:$BACKEND_PORT/api/v1"
echo
echo "   Logs: tail -f logs/*.log"
echo "   Stop: npm run cleanup-ports"

exit 0