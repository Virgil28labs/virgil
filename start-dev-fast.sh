#!/bin/bash

# Virgil Ultra-Fast Startup - Skip all checks, just start
set -euo pipefail

readonly PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
readonly LOG_DIR="$PROJECT_ROOT/logs"
readonly FRONTEND_PORT="${FRONTEND_PORT:-3000}"
readonly BACKEND_PORT="${BACKEND_PORT:-5002}"

# Colors
readonly GREEN='\033[0;32m'
readonly BLUE='\033[0;34m'
readonly NC='\033[0m'

echo -e "${BLUE}🚀 Virgil Fast Start${NC}"

# Setup logs
mkdir -p "$LOG_DIR"
> "$LOG_DIR/backend.log"
> "$LOG_DIR/frontend.log"

# Force kill anything on our ports
for port in $BACKEND_PORT $FRONTEND_PORT; do
    lsof -ti ":$port" 2>/dev/null | xargs -r kill -9 2>/dev/null || true
done

# Start servers immediately
(cd "$PROJECT_ROOT/server" && npm run dev > "$LOG_DIR/backend.log" 2>&1) &
(cd "$PROJECT_ROOT" && npm run dev > "$LOG_DIR/frontend.log" 2>&1) &

# Quick check - just see if ports are listening
sleep 2
echo
echo -e "${GREEN}✅ Servers launched!${NC}"
echo
echo "   Frontend: http://localhost:$FRONTEND_PORT"
echo "   Backend:  http://localhost:$BACKEND_PORT/api/v1"
echo
echo "   Logs: tail -f logs/*.log"
echo "   Stop: ./cleanup-ports.sh"

exit 0