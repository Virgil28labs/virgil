#!/bin/bash

# Virgil Port Cleanup - Simple and fast
set -euo pipefail

readonly FRONTEND_PORT="${FRONTEND_PORT:-3000}"
readonly BACKEND_PORT="${BACKEND_PORT:-5002}"
readonly LOG_DIR="logs"

# Colors
if [[ -t 1 ]]; then
    readonly RED='\033[0;31m'
    readonly GREEN='\033[0;32m'
    readonly BLUE='\033[0;34m'
    readonly NC='\033[0m'
else
    readonly RED='' GREEN='' BLUE='' NC=''
fi

echo -e "${BLUE}🧹 Cleaning up Virgil ports...${NC}"

# Kill processes on our ports
killed=0
for port in $BACKEND_PORT $FRONTEND_PORT; do
    pids=$(lsof -ti ":$port" 2>/dev/null || true)
    if [[ -n "$pids" ]]; then
        echo "Killing processes on port $port: $pids"
        echo "$pids" | xargs kill -9 2>/dev/null || true
        ((killed++))
    fi
done

# Clean up PID files if they exist
if [[ -d "$LOG_DIR" ]]; then
    rm -f "$LOG_DIR"/*.pid 2>/dev/null || true
fi

# Clean up stale PID directory if it exists
rm -rf .pids 2>/dev/null || true

if [[ $killed -gt 0 ]]; then
    echo -e "${GREEN}✅ Cleaned up $killed port(s)${NC}"
else
    echo -e "${GREEN}✅ No processes found on Virgil ports${NC}"
fi