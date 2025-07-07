#!/bin/bash

# Virgil LLM Server Startup Script
echo "🚀 Starting Virgil LLM Server..."

# Check if we're in the right directory
if [ ! -f "server/package.json" ]; then
    echo "❌ Error: Please run this script from the virgil project root directory"
    exit 1
fi

# Check if .env file exists
if [ ! -f "../.env" ]; then
    echo "❌ Error: .env file not found in parent directory"
    echo "Please ensure the .env file is configured with the required environment variables"
    exit 1
fi

# Check if OpenAI API key is set
if ! grep -q "OPENAI_API_KEY=" "../.env"; then
    echo "⚠️  Warning: OPENAI_API_KEY not found in .env file"
    echo "The LLM server will not function without a valid OpenAI API key"
fi

# Change to server directory
cd server

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
    echo "📦 Installing server dependencies..."
    npm install
fi

# Start the server
echo "🌟 Starting LLM server on port 5002..."
echo "📍 Environment: ${NODE_ENV:-development}"
echo "🔗 API will be available at: http://localhost:5002/api/v1"
echo ""
echo "Available endpoints:"
echo "  POST /api/v1/llm/complete - Text completion"
echo "  POST /api/v1/llm/stream - Streaming completion"
echo "  GET /api/v1/health - Health check"
echo ""
echo "Press Ctrl+C to stop the server"
echo ""

# Start the server with auto-restart in development
if [ "${NODE_ENV:-development}" = "development" ]; then
    npx nodemon index.js
else
    node index.js
fi