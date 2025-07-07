#!/bin/bash

# Virgil Development Environment Startup Script
# This script starts both the frontend and backend servers

set -e  # Exit on any error

echo "🚀 Starting Virgil Development Environment..."
echo ""

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: Please run this script from the virgil project root directory"
    exit 1
fi

# Check if .env file exists
if [ ! -f ".env" ]; then
    echo "⚠️  Warning: .env file not found"
    echo "   Please copy .env.example to .env and configure your environment variables"
    echo "   cp .env.example .env"
    exit 1
fi

# Function to cleanup background processes on exit
cleanup() {
    echo ""
    echo "🛑 Shutting down servers..."
    if [ ! -z "$BACKEND_PID" ] && kill -0 $BACKEND_PID 2>/dev/null; then
        kill $BACKEND_PID
        echo "✅ Backend server stopped"
    fi
    exit 0
}

# Set up trap to cleanup on script exit
trap cleanup EXIT INT TERM

# Check if ports are available
if lsof -Pi :5002 -sTCP:LISTEN -t >/dev/null 2>&1 ; then
    echo "❌ Error: Port 5002 (backend) is already in use"
    echo "   Please stop the existing server or choose a different port"
    exit 1
fi

if lsof -Pi :3000 -sTCP:LISTEN -t >/dev/null 2>&1 ; then
    echo "❌ Error: Port 3000 (frontend) is already in use"
    echo "   Please stop the existing server or choose a different port"
    exit 1
fi

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing frontend dependencies..."
    npm install
fi

if [ ! -d "server/node_modules" ]; then
    echo "📦 Installing backend dependencies..."
    cd server && npm install && cd ..
fi

# Start backend server
echo "📡 Starting Backend/LLM Server on port 5002..."
cd server
npm run dev &
BACKEND_PID=$!
cd ..

# Wait for backend to start
echo "⏳ Waiting for backend server to start..."
for i in {1..30}; do
    if curl -s http://localhost:5002/api/v1/health >/dev/null 2>&1; then
        echo "✅ Backend server is ready!"
        break
    fi
    if [ $i -eq 30 ]; then
        echo "❌ Backend server failed to start within 30 seconds"
        exit 1
    fi
    sleep 1
done

echo ""
echo "🌐 Starting Frontend Development Server on port 3000..."
echo ""
echo "📋 Development Environment Status:"
echo "   Backend:  http://localhost:5002/api/v1/health"
echo "   Frontend: http://localhost:3000"
echo ""
echo "🎯 Ready for development! Press Ctrl+C to stop all servers."
echo ""

# Start frontend server (this will run in foreground)
npm run dev