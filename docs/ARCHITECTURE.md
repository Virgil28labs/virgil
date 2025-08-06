# Virgil Architecture Documentation

## Overview
Virgil is a React/TypeScript application with a physics-based raccoon mascot, weather integration, location services, and LLM chat capabilities. This document consolidates all architectural decisions and system designs.

## System Architecture

### Frontend Architecture
- **Framework**: React 19.1 with TypeScript 5.8
- **Build Tool**: Vite 7.0
- **State Management**: React Context + Custom Hooks
- **Styling**: Tailwind CSS v4 + Custom CSS Variables
- **PWA**: Service Worker enabled

### Backend Architecture
- **Server**: Express 5.1 (port 5002)
- **Database**: Supabase (PostgreSQL)
- **Caching**: In-memory cache with TTL
- **Security**: Helmet, CORS, Rate Limiting

## Storage Architecture

### Client-Side Storage Strategy
1. **LocalStorage**: User preferences, favorites, settings, and small data
   - All favorites (Dog, NASA, Giphy) use localStorage for simplicity and reliability
   - User preferences and application settings
   - Quick access data that doesn't require complex querying
2. **IndexedDB**: Large structured data requiring advanced queries
   - Chat messages and conversation history
   - Photo gallery with metadata
   - Rhythm machine save slots and game data
   - Performance analytics and logging
3. **Service Worker Cache**: PWA assets and offline support

### Storage Service Architecture
- `StorageService`: Unified localStorage interface with type safety
- `AppDataService`: IndexedDB interface for large/complex data
- Selective migration: Only specific data types moved to IndexedDB
- Graceful fallback mechanisms with error recovery

### Performance Optimizations
- Lazy loading for all modals and heavy components
- Image compression for camera photos
- Message batching for chat
- Debounced search inputs
- Virtual scrolling for large lists

## Memory System Architecture

### Vector Memory Integration
- Semantic search using embeddings
- Context-aware memory retrieval
- Automatic importance scoring
- Background synchronization

### Chat Memory Architecture
1. **Short-term**: Recent messages in IndexedDB
2. **Long-term**: Vector embeddings for semantic search
3. **Context Building**: Dynamic context generation based on relevance

## Component Architecture

### Dashboard System
- Central hub for all app features
- Lazy-loaded modals for each feature
- Context-aware state management
- Unified adapter pattern for app integration

### Key Components
1. **VirgilChatbot**: Main chat interface with memory
2. **RaccoonMascot**: Physics-based interactive mascot
3. **Weather**: Location-based weather with caching
4. **Notes**: Tag-based note system with AI integration
5. **Camera**: Photo capture with IndexedDB storage
6. **Location**: OpenStreetMap-based location services with GPS fallback

## API Architecture

### RESTful Endpoints
- `/api/v1/llm/*`: LLM completion endpoints
- `/api/v1/chat`: Secure chat with auth
- `/api/v1/weather/*`: Weather data endpoints
- `/api/v1/vector/*`: Vector memory operations
- `/api/v1/rhythm/*`: AI rhythm generation

### Security
- JWT-based authentication
- Rate limiting per endpoint
- Request validation middleware
- Secure environment variables

## Database Architecture

### Supabase Integration
- Real-time subscriptions for chat
- Row-level security policies
- Vector embeddings with pgvector
- Automatic backups

### Supabase MCP Server
- Direct database access via Claude
- Natural language queries and migrations
- Separate from JS SDK used in app
- Full development mode access enabled

### Schema Design
- Users table with profiles
- Messages with user associations
- Vector embeddings with metadata
- Analytics events tracking

## Performance Architecture

### Frontend Performance
- Code splitting at route level
- Lazy loading for heavy components
- Optimized bundle size (<200KB initial)
- Service worker for offline support

### Backend Performance
- Request queuing for LLM calls
- Response caching with TTL
- Compression for all responses
- Efficient database queries

## Testing Architecture

### Frontend Testing
- Jest + React Testing Library
- Component isolation testing
- Hook testing utilities
- 80%+ coverage target

### Backend Testing
- Jest for unit tests
- Supertest for integration
- Mock services for external APIs
- Comprehensive error scenarios

## Deployment Architecture

### Build Process
- TypeScript compilation
- Bundle optimization
- Asset compression
- Environment-specific configs

### Monitoring
- Error logging with context
- Performance metrics
- User analytics
- Health check endpoints

## Future Enhancements

### Planned Features
1. Real-time collaboration
2. Advanced AI memory features
3. Multi-modal interactions
4. Enhanced offline support

### Technical Debt
- Migrate remaining class components
- Implement proper error boundaries
- Add E2E testing
- Optimize bundle size further