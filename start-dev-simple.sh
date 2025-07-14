#!/bin/bash

# Simple Virgil Development Startup - Opens servers in new terminal windows

echo "🚀 Starting Virgil Development Environment (Simple Mode)..."
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
    exit 1
fi

# Detect OS and terminal
if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    echo "📱 Detected macOS - Opening servers in new Terminal windows..."
    
    # Start backend in new terminal
    osascript -e 'tell app "Terminal" to do script "cd '"$(pwd)"'/server && echo \"🔷 Backend Server (Port 5002)\" && echo \"========================\" && npm run dev"'
    
    # Wait a bit for backend to start
    sleep 3
    
    # Start frontend in new terminal
    osascript -e 'tell app "Terminal" to do script "cd '"$(pwd)"' && echo \"🔶 Frontend Server (Port 3000)\" && echo \"=========================\" && npm run dev"'
    
else
    # Linux/Other
    echo "🐧 Starting servers (please open two terminal windows)..."
    echo ""
    echo "In Terminal 1, run:"
    echo "  cd $(pwd)/server && npm run dev"
    echo ""
    echo "In Terminal 2, run:"
    echo "  cd $(pwd) && npm run dev"
fi

echo ""
echo "📋 Servers will be available at:"
echo "   Backend:  http://localhost:5002/api/v1/health"
echo "   Frontend: http://localhost:3000"
echo ""
echo "💡 Tip: Close the terminal windows to stop the servers"