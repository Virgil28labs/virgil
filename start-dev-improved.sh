#!/bin/bash

# Virgil Development Environment Startup Script v2
# This script starts both the frontend and backend servers with better control

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Starting Virgil Development Environment...${NC}"
echo ""

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo -e "${RED}❌ Error: Please run this script from the virgil project root directory${NC}"
    exit 1
fi

# Check if .env file exists
if [ ! -f ".env" ]; then
    echo -e "${RED}⚠️  Warning: .env file not found${NC}"
    echo "   Please copy .env.example to .env and configure your environment variables"
    echo "   cp .env.example .env"
    exit 1
fi

# Variables for tracking PIDs
BACKEND_PID=""
FRONTEND_PID=""
LOG_DIR="./logs"

# Create logs directory if it doesn't exist
mkdir -p "$LOG_DIR"

# Function to check if port is in use
check_port() {
    local port=$1
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1 ; then
        return 0  # Port is in use
    elif netstat -an | grep -q "[:.]$port.*LISTEN" 2>/dev/null ; then
        return 0  # Port is in use (fallback method)
    else
        return 1  # Port is free
    fi
}

# Function to cleanup background processes on exit
cleanup() {
    echo ""
    echo -e "${YELLOW}🛑 Shutting down servers...${NC}"
    
    # Kill frontend process
    if [ ! -z "$FRONTEND_PID" ] && kill -0 $FRONTEND_PID 2>/dev/null; then
        kill $FRONTEND_PID
        echo -e "${GREEN}✅ Frontend server stopped${NC}"
    fi
    
    # Kill backend process
    if [ ! -z "$BACKEND_PID" ] && kill -0 $BACKEND_PID 2>/dev/null; then
        kill $BACKEND_PID
        echo -e "${GREEN}✅ Backend server stopped${NC}"
    fi
    
    # Clean up any orphaned node processes on our ports
    lsof -ti:3000 | xargs kill -9 2>/dev/null || true
    lsof -ti:5002 | xargs kill -9 2>/dev/null || true
    
    exit 0
}

# Set up trap to cleanup on script exit
trap cleanup EXIT INT TERM

# Check if ports are available
if check_port 5002; then
    echo -e "${RED}❌ Error: Port 5002 (backend) is already in use${NC}"
    echo "   Please stop the existing server or choose a different port"
    
    # Show what's using the port
    echo -e "${YELLOW}   Process using port 5002:${NC}"
    lsof -i :5002 | grep LISTEN || netstat -an | grep ":5002.*LISTEN" || echo "   (Unable to identify process)"
    exit 1
fi

if check_port 3000; then
    echo -e "${RED}❌ Error: Port 3000 (frontend) is already in use${NC}"
    echo "   Please stop the existing server or choose a different port"
    
    # Show what's using the port
    echo -e "${YELLOW}   Process using port 3000:${NC}"
    lsof -i :3000 | grep LISTEN || netstat -an | grep ":3000.*LISTEN" || echo "   (Unable to identify process)"
    exit 1
fi

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}📦 Installing frontend dependencies...${NC}"
    npm install
fi

if [ ! -d "server/node_modules" ]; then
    echo -e "${YELLOW}📦 Installing backend dependencies...${NC}"
    (cd server && npm install)
fi

# Start backend server
echo -e "${BLUE}📡 Starting Backend/LLM Server on port 5002...${NC}"
(cd server && npm run dev > "../$LOG_DIR/backend.log" 2>&1 &)
BACKEND_PID=$!

# Wait for backend to start
echo -e "${YELLOW}⏳ Waiting for backend server to start...${NC}"
for i in {1..30}; do
    if curl -s http://localhost:5002/api/v1/health >/dev/null 2>&1; then
        echo -e "${GREEN}✅ Backend server is ready!${NC}"
        break
    fi
    if [ $i -eq 30 ]; then
        echo -e "${RED}❌ Backend server failed to start within 30 seconds${NC}"
        echo -e "${YELLOW}   Check logs at: $LOG_DIR/backend.log${NC}"
        tail -20 "$LOG_DIR/backend.log"
        exit 1
    fi
    printf "."
    sleep 1
done

echo ""
echo -e "${BLUE}🌐 Starting Frontend Development Server on port 3000...${NC}"

# Start frontend server in background
npm run dev > "$LOG_DIR/frontend.log" 2>&1 &
FRONTEND_PID=$!

# Wait for frontend to start
echo -e "${YELLOW}⏳ Waiting for frontend server to start...${NC}"
for i in {1..20}; do
    if curl -s http://localhost:3000 >/dev/null 2>&1; then
        echo -e "${GREEN}✅ Frontend server is ready!${NC}"
        break
    fi
    if [ $i -eq 20 ]; then
        echo -e "${RED}❌ Frontend server failed to start within 20 seconds${NC}"
        echo -e "${YELLOW}   Check logs at: $LOG_DIR/frontend.log${NC}"
        tail -20 "$LOG_DIR/frontend.log"
        exit 1
    fi
    printf "."
    sleep 1
done

echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}🎉 Virgil Development Environment is ready!${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "${BLUE}📋 Server Status:${NC}"
echo -e "   Backend API:  ${GREEN}http://localhost:5002/api/v1${NC}"
echo -e "   Frontend App: ${GREEN}http://localhost:3000${NC}"
echo ""
echo -e "${BLUE}📁 Log Files:${NC}"
echo -e "   Backend:  $LOG_DIR/backend.log"
echo -e "   Frontend: $LOG_DIR/frontend.log"
echo ""
echo -e "${YELLOW}💡 Tips:${NC}"
echo -e "   • View backend logs:  ${BLUE}tail -f $LOG_DIR/backend.log${NC}"
echo -e "   • View frontend logs: ${BLUE}tail -f $LOG_DIR/frontend.log${NC}"
echo -e "   • Stop all servers:   ${BLUE}Press Ctrl+C${NC}"
echo ""

# Monitor servers and show if they crash
while true; do
    # Check if backend is still running
    if [ ! -z "$BACKEND_PID" ] && ! kill -0 $BACKEND_PID 2>/dev/null; then
        echo -e "${RED}⚠️  Backend server crashed! Check $LOG_DIR/backend.log${NC}"
        tail -10 "$LOG_DIR/backend.log"
        exit 1
    fi
    
    # Check if frontend is still running
    if [ ! -z "$FRONTEND_PID" ] && ! kill -0 $FRONTEND_PID 2>/dev/null; then
        echo -e "${RED}⚠️  Frontend server crashed! Check $LOG_DIR/frontend.log${NC}"
        tail -10 "$LOG_DIR/frontend.log"
        exit 1
    fi
    
    sleep 5
done