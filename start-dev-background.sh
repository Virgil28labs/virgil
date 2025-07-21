#!/bin/bash

# Virgil Background Mode - Start and exit for CI/automation
set -euo pipefail

readonly PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
readonly LOG_DIR="$PROJECT_ROOT/logs"
readonly FRONTEND_PORT="${FRONTEND_PORT:-3000}"
readonly BACKEND_PORT="${BACKEND_PORT:-5002}"

# Setup
mkdir -p "$LOG_DIR"

# Quick port cleanup
for port in $BACKEND_PORT $FRONTEND_PORT; do
    lsof -ti ":$port" 2>/dev/null | xargs -r kill -9 2>/dev/null || true
done

# Start servers with nohup
nohup bash -c "cd '$PROJECT_ROOT/server' && npm run dev" > "$LOG_DIR/backend.log" 2>&1 &
echo $! > "$LOG_DIR/backend.pid"

nohup bash -c "cd '$PROJECT_ROOT' && npm run dev" > "$LOG_DIR/frontend.log" 2>&1 &
echo $! > "$LOG_DIR/frontend.pid"

echo "Servers starting in background..."
echo "Frontend: http://localhost:$FRONTEND_PORT"
echo "Backend:  http://localhost:$BACKEND_PORT/api/v1"
echo "Stop with: ./cleanup-ports.sh"

exit 0