# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Virgil is a modern React/TypeScript web application featuring an interactive physics-based raccoon mascot, location services, weather integration, and LLM chatbot capabilities. The project uses a two-server architecture with a React frontend and Express backend.

## Development Commands

### Essential Commands
```bash
# Install dependencies
npm install

# Start development (frontend + backend)
npm run dev-full        # Recommended: starts both servers
npm run dev            # Frontend only (port 3000)
npm run backend        # Backend only (port 5002)

# Environment & Diagnostics
npm run check-env      # Check development environment
npm run cleanup-ports  # Clean up stuck processes on ports
npm run diagnose       # Run comprehensive diagnostics

# Testing
npm test               # Run all tests with coverage
npm run test:watch     # Watch mode for development
npm run test:unit      # Unit tests only
npm run test:integration # Integration tests only

# Code Quality
npm run lint           # ESLint
npm run type-check     # TypeScript type checking
npm run format         # Prettier formatting

# Build & Production
npm run build          # Production build
npm run preview        # Preview production build
npm start              # Production server
```

### Testing Specific Components
```bash
# Run tests for a specific file
npm test -- src/components/FeatureName.test.tsx

# Run tests with coverage for specific directory
npm test -- --coverage --collectCoverageFrom='src/components/**/*.{ts,tsx}' src/components/
```

## Architecture Overview

### Two-Server Architecture
1. **Frontend Server** (Port 3000): Vite-powered React application
2. **Backend Server** (Port 5002): Express API for LLM proxy and sensitive operations

### Key Architectural Patterns

#### State Management
- **Context Providers**: Auth, Location, Weather contexts for global state
- **Custom Hooks**: Encapsulate complex logic (useAuth, useLocation, useWeather)
- **Service Layer**: LLM service with built-in caching and error handling

#### Component Architecture
- **Feature-based organization**: Components grouped by functionality
- **Lazy loading**: Code splitting for performance
- **Error boundaries**: Graceful error handling throughout
- **TypeScript strict mode**: Full type safety

#### Backend Security
- **API Key Management**: Server-side only, never exposed to client
- **Request Validation**: Middleware for input sanitization
- **Rate Limiting**: Protection against abuse
- **Supabase Integration**: Secure authentication flow

### Critical Implementation Details

#### LLM Integration
- Backend proxy pattern to protect API keys
- Request/response caching to reduce API calls
- Error handling with user-friendly messages
- Streaming support for real-time responses

#### Location Services
- GPS-first approach with IP fallback
- Privacy-conscious with user permission
- Cached results to minimize API usage
- Error states for denied permissions

#### Weather Integration
- OpenWeatherMap API with server-side proxy
- Location-based automatic updates
- Efficient caching strategy
- Graceful degradation without location

#### Interactive Mascot
- Physics engine integration
- Performance-optimized animations
- Responsive to user interactions
- Fallback for low-performance devices

## Important Constraints

### Performance Requirements
- Initial load: <3s on 3G
- Core Web Vitals compliance
- 60fps animations
- Lighthouse score >90

### Code Quality Standards
- TypeScript strict mode required
- Test coverage: 80% lines minimum
- ESLint must pass with no errors
- All new features require tests

### Security Considerations
- Never expose API keys in client code
- Validate all user inputs
- Use server-side proxy for external APIs
- Follow Supabase security best practices

## Development Workflow

1. **Feature Development**:
   - Create feature branch from main
   - Implement with TypeScript types
   - Add comprehensive tests
   - Ensure lint and type-check pass

2. **Testing Strategy**:
   - Unit tests for utilities and hooks
   - Component tests with React Testing Library
   - Integration tests for API endpoints
   - E2E tests for critical user flows

3. **Before Committing**:
   - Run `npm run lint`
   - Run `npm run type-check`
   - Run `npm test`
   - Ensure all checks pass

## Project-Specific Patterns

### API Route Pattern
Backend routes follow REST conventions:
```
POST   /api/llm/chat     - Chat with LLM
GET    /api/weather      - Get weather data
GET    /api/location     - Get location from IP
GET    /api/elevation/coordinates/:lat/:lon - Get elevation data
```

### Component Testing Pattern
Tests are co-located with components:
```
ComponentName.tsx
ComponentName.test.tsx
ComponentName.module.css (when needed)
```

### Type Definition Pattern
Shared types in `src/types/`:
- `auth.types.ts` - Authentication types
- `weather.types.ts` - Weather API types
- `llm.types.ts` - LLM service types

## AI Assistant Tools

### Context7 MCP Server
Context7 is configured to provide up-to-date documentation for all project dependencies:
- **React 19.1.0**: Latest hooks, components, and patterns
- **TypeScript 5.8.3**: Current type system features and best practices
- **Express 5.1.0**: Modern middleware and routing patterns
- **Vite 7.0.0**: Build configuration and optimization strategies
- **Supabase JS 2.50.3**: Authentication and database operations

To use Context7, add "use context7" to your prompts for accurate, version-specific documentation.

### MCP Fetch Server
The MCP Fetch server enables web content retrieval and processing capabilities:
- **Web Content Fetching**: Retrieve any web URL and convert HTML to markdown
- **Chunked Content**: Extract specific sections of web pages using start_index parameter
- **Flexible Configuration**: Supports custom user agents, proxy settings, and robots.txt handling

Usage examples:
- "Fetch the latest React documentation from react.dev"
- "Retrieve and analyze content from [specific URL]"
- "Get web-based API documentation not available in Context7"

⚠️ Security Note: The fetch server can access local/internal IPs. Use only with trusted URLs.

## Development Scripts

### Unified Startup Script
The project includes a robust startup script (`start-dev.sh`) that handles:
- Process management with graceful shutdown
- Port conflict detection and resolution
- Automatic dependency installation
- Real-time server monitoring
- Cross-platform compatibility (macOS, Linux, Windows with WSL)

### Diagnostic Tools
- **check-env.sh**: Validates development environment, checks dependencies, ports, and configuration
- **cleanup-ports.sh**: Safely cleans up processes using Virgil's ports (3000, 5002)
- **diagnose.sh**: Comprehensive troubleshooting tool that generates diagnostic reports

## Common Debugging Scenarios

### Frontend Not Loading
1. Check if backend is running: `npm run backend`
2. Verify ports 3000 and 5002 are available
3. Check browser console for CORS errors

### LLM Not Responding
1. Verify ANTHROPIC_API_KEY in server/.env
2. Check backend logs for API errors
3. Ensure request format matches expected schema

### Tests Failing
1. Run `npm install` to ensure dependencies are up to date
2. Check for timezone-related issues in date tests
3. Verify mock implementations match actual services