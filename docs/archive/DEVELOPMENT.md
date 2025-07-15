# Virgil Development Environment Setup

## Overview
Virgil is a React/TypeScript application with a Node.js backend that provides LLM API proxy services. The application requires **two servers** to run simultaneously for full functionality.

## Server Architecture

### 1. Frontend Development Server (Vite)
- **Port**: 3000 (configurable via `VITE_DEV_PORT`)
- **Technology**: Vite + React + TypeScript
- **Purpose**: Serves the React application with hot reloading

### 2. Backend/LLM Server (Express)
- **Port**: 5002 (configurable via `LLM_SERVER_PORT`)
- **Technology**: Node.js + Express
- **Purpose**: API proxy for LLM services, analytics, and chat functionality

## Prerequisites

1. **Node.js** (v16.0.0 or higher)
2. **npm** package manager
3. **Environment Configuration** (`.env` file)

## Environment Setup

1. Copy the environment template:
   ```bash
   cp .env.example .env
   ```

2. Configure required environment variables in `.env`:
   ```env
   # Backend/LLM Server Configuration
   OPENAI_API_KEY=your_openai_api_key_here
   LLM_SERVER_PORT=5002
   
   # Frontend Configuration
   VITE_LLM_API_URL=http://localhost:5002/api/v1
   VITE_DEV_PORT=3000
   
   # Optional: Other service keys
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_supabase_key
   ```

## Starting the Development Environment

### Method 1: Manual Startup (Recommended for Development)

1. **Start Backend Server** (Terminal 1):
   ```bash
   # From project root
   ./start-llm-server.sh
   # OR manually:
   cd server && npm install && npm run dev
   ```

2. **Start Frontend Server** (Terminal 2):
   ```bash
   # From project root
   npm run dev
   ```

### Method 2: Quick Startup Script

Create a startup script for convenience:

```bash
#!/bin/bash
# start-dev.sh

echo "🚀 Starting Virgil Development Environment..."

# Start backend server in background
echo "📡 Starting Backend/LLM Server..."
./start-llm-server.sh &
BACKEND_PID=$!

# Wait for backend to start
sleep 3

# Start frontend server
echo "🌐 Starting Frontend Development Server..."
npm run dev

# Cleanup on exit
trap "kill $BACKEND_PID" EXIT
```

## Verification

### Check Server Status

1. **Backend Health Check**:
   ```bash
   curl http://localhost:5002/api/v1/health
   ```
   Expected response: `{"status":"healthy",...}`

2. **Frontend Access**:
   - Open browser to: http://localhost:3000
   - Should display the Virgil application

3. **API Integration Test**:
   ```bash
   curl -X POST http://localhost:5002/api/v1/llm/complete \
     -H "Content-Type: application/json" \
     -d '{"messages":[{"role":"user","content":"Hello"}],"model":"gpt-4o-mini"}'
   ```

### Check Running Processes

```bash
# Check if both servers are running
ps aux | grep -E "(vite|node.*index.js)" | grep -v grep
```

Expected output:
- `node .../vite` (Frontend server)
- `node index.js` (Backend server)

## Available Endpoints

### Backend API (http://localhost:5002)
- `GET /api/v1/health` - Health check
- `POST /api/v1/llm/complete` - Text completion
- `POST /api/v1/llm/stream` - Streaming completion  
- `POST /api/v1/chat` - Chat endpoint
- `POST /api/v1/analytics/track` - Analytics

### Frontend (http://localhost:3000)
- Main Virgil application interface
- Authentication pages
- Dashboard with location services
- Interactive raccoon mascot
- LLM chatbot integration

## Troubleshooting

### Common Issues

1. **Port Already in Use**:
   ```bash
   # Kill process on port 3000
   lsof -ti:3000 | xargs kill
   
   # Kill process on port 5002
   lsof -ti:5002 | xargs kill
   ```

2. **Missing Dependencies**:
   ```bash
   # Reinstall frontend dependencies
   npm install
   
   # Reinstall backend dependencies
   cd server && npm install
   ```

3. **Environment Variables Not Loaded**:
   - Verify `.env` file exists in project root
   - Check for typos in variable names
   - Restart servers after changing `.env`

4. **OpenAI API Issues**:
   - Verify `OPENAI_API_KEY` is set correctly
   - Check API key permissions and quota
   - Test with: `curl http://localhost:5002/api/v1/health/ready`

### Log Files

- Backend logs: Check terminal output or `server/server.log`
- Frontend logs: Check browser console (F12)

## Development Workflow

1. **Start both servers** using one of the methods above
2. **Frontend development**: Changes automatically reload via Vite HMR
3. **Backend development**: Changes automatically restart via nodemon
4. **API testing**: Use the health and LLM endpoints for testing
5. **Stop servers**: Ctrl+C in terminals or kill processes

## Production Deployment

For production deployment, see separate production deployment documentation.

---

**Note**: Both servers must be running for full application functionality. The frontend will not work properly without the backend LLM server.