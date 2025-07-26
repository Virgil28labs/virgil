# Virgil Memory System Documentation

*Last Updated: July 25, 2025*

## Executive Summary

Virgil has evolved from a simple chatbot into a sophisticated context-aware AI assistant with dual memory systems. The system currently features:

- **IndexedDB-based local memory** for offline-first continuous conversations
- **Supabase pgvector integration** for semantic memory search using OpenAI embeddings
- **Dashboard Context Service** that provides real-time environmental and user data
- **Dynamic context building** with intelligent relevance scoring

While functional, the current implementation reveals architectural redundancy where both memory systems store identical raw messages rather than leveraging their unique strengths.

## Architecture Overview

### System Components

```
┌─────────────────────────────────────────────────────────────┐
│                    Virgil AI Assistant                       │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌─────────────────┐  ┌──────────────────┐  ┌────────────┐ │
│  │  Context Layer  │  │   Memory Layer    │  │ UI Layer   │ │
│  ├─────────────────┤  ├──────────────────┤  ├────────────┤ │
│  │ Dashboard       │  │ IndexedDB        │  │ Chat       │ │
│  │ Context Service │  │ (Local Storage)  │  │ Interface  │ │
│  │                 │  │                  │  │            │ │
│  │ Dynamic Context │  │ Vector Memory    │  │ Memory     │ │
│  │ Builder         │  │ (Supabase)       │  │ Modal      │ │
│  │                 │  │                  │  │            │ │
│  │ App Adapters    │  │ Memory Service   │  │ Dashboard  │ │
│  │ (8+ apps)       │  │ Extensions       │  │ Apps       │ │
│  └─────────────────┘  └──────────────────┘  └────────────┘ │
│                                                              │
├─────────────────────────────────────────────────────────────┤
│                     Backend Services                         │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌──────────────────┐  ┌────────────┐ │
│  │ Express Server  │  │ OpenAI API       │  │ Supabase   │ │
│  │ (Port 5002)     │  │ (Embeddings)     │  │ (pgvector) │ │
│  └─────────────────┘  └──────────────────┘  └────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

### Data Flow

1. **User Input** → Chat Interface
2. **Context Gathering** → DashboardContextService aggregates environmental data
3. **Memory Retrieval** → Both IndexedDB and Vector search for relevant context
4. **Prompt Enhancement** → DynamicContextBuilder creates optimized prompt
5. **LLM Processing** → OpenAI API with context-aware prompt
6. **Response Storage** → Dual storage in both memory systems
7. **UI Update** → Real-time response streaming

## Context Awareness System

### DashboardContextService

The heart of Virgil's contextual awareness, this service continuously aggregates data from multiple sources:

**Location**: `/src/services/DashboardContextService.ts`

#### Context Types

```typescript
interface DashboardContext {
  // Temporal Context
  currentDateTime: string;      // "July 25, 2025, 3:45 PM"
  timeOfDay: string;           // "afternoon"
  dayOfWeek: string;           // "Friday"
  
  // Location Context
  location: {
    city?: string;             // "San Francisco"
    country?: string;          // "United States"
    timezone: string;          // "America/Los_Angeles"
    coordinates?: { lat: number; lng: number };
  };
  
  // Weather Context
  weather?: {
    temperature: number;       // 72
    conditions: string;        // "Partly Cloudy"
    humidity: number;          // 65
  };
  
  // User Context
  user?: {
    name: string;
    email: string;
    sessionDuration: string;   // "2 hours"
  };
  
  // Device Context
  device: {
    type: string;              // "desktop"
    os: string;                // "macOS"
    browser: string;           // "Chrome"
    networkStatus: 'online' | 'offline';
  };
  
  // Activity Context
  activeFeatures: string[];    // ["notes", "pomodoro"]
  recentActivity: Activity[];  // Last 10 actions
}
```

#### Key Features

- **Real-time Updates**: 60-second refresh cycle for dynamic data
- **Subscription Model**: Components subscribe to context changes
- **Performance Optimized**: Caching and batched updates
- **Privacy-First**: All processing happens locally

### DynamicContextBuilder

Intelligently selects relevant context based on user queries:

**Location**: `/src/services/DynamicContextBuilder.ts`

#### Relevance Scoring

```typescript
// Example relevance scores for query: "What's the weather like?"
{
  weather: 1.0,        // Highly relevant
  location: 0.8,       // Important for weather context
  time: 0.6,          // Moderate relevance
  user: 0.2,          // Low relevance
  device: 0.0         // Not relevant
}
```

### Dashboard App Integration

Virgil integrates with 8+ dashboard applications through a unified adapter system:

1. **Notes App**: Task management, journaling, tagging
2. **Pomodoro Timer**: Productivity tracking, work sessions
3. **Streak Tracker**: Habit monitoring, statistics
4. **Camera**: Photo gallery with metadata
5. **Dog Gallery**: Favorite pet images
6. **NASA APOD**: Space image collection
7. **Giphy**: GIF favorites
8. **User Profile**: Personal information

Each app provides:
- Real-time state data
- Search capabilities
- Direct action execution
- Contextual suggestions

## Memory System Components

### IndexedDB Memory System

The primary, local-first memory storage:

**Location**: `/src/services/MemoryService.ts`

#### Database Schema

```javascript
// Database: VirgilMemory
// Store: conversations
{
  id: 'continuous-main',
  messages: ChatMessage[],
  firstMessage: string,      // First 100 chars
  lastMessage: string,       // Last 100 chars
  timestamp: number,
  messageCount: number
}

// Store: memories
{
  id: string,               // mem-timestamp-random
  content: string,          // Up to 500 chars
  context: string,          // Up to 200 chars
  timestamp: number,
  tag?: string
}
```

#### Performance Characteristics

- **Read Operations**: <10ms from IndexedDB
- **Cache Strategy**: Recent 50 messages in memory
- **Context Cache**: 30-second TTL
- **Batch Saves**: Incremental message appending

### Vector Memory System

Semantic search capabilities using Supabase pgvector:

**Location**: `/src/services/VectorMemoryService.ts`

#### Supabase Schema

```sql
-- Table: memory_vectors
CREATE TABLE memory_vectors (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  content TEXT NOT NULL,
  embedding vector(1536) NOT NULL,  -- OpenAI ada-002 dimensions
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Function: match_memories
CREATE FUNCTION match_memories (
  query_embedding vector(1536),
  match_threshold float DEFAULT 0.5,
  match_count int DEFAULT 10
) RETURNS TABLE (
  id BIGINT,
  content TEXT,
  similarity float
)
```

#### Backend API

**Location**: `/server/routes/vector.js`

```javascript
// Endpoints
POST /api/v1/vector/store     // Store content with embedding
POST /api/v1/vector/search    // Semantic search
GET  /api/v1/vector/health    // Service health check
GET  /api/v1/vector/count     // Total vectors stored
```

#### Key Features

- **OpenAI Embeddings**: text-embedding-ada-002 model
- **Server-side Generation**: Secure API key handling
- **Rate Limiting**: 30 requests/minute per IP
- **Cosine Similarity**: HNSW indexing for fast search

## Implementation Timeline (July 2025)

### Phase 1: Initial Planning (July 25, Morning)
- Reviewed VIRGIL_MEMORY_ENHANCEMENT_PLAN.md
- Researched 2025 best practices for vector embeddings
- Decided on Supabase pgvector integration

### Phase 2: First Implementation Attempt (July 25, Early Afternoon)
- Attempted client-side embeddings with @xenova/transformers
- Created initial VectorTestButton component
- **Failed**: CDN issues, model loading errors, HTML responses instead of model files

### Phase 3: Pivot to OpenAI (July 25, Mid Afternoon)
- Removed all @xenova/transformers dependencies
- Implemented server-side OpenAI embedding generation
- Created Express routes for vector operations
- Successfully stored and searched vectors

### Phase 4: Integration with Virgil (July 25, Late Afternoon)
- Created VectorMemoryService extending MemoryService
- Updated useMessageHandling to store messages in both systems
- Modified useSystemPrompt for semantic memory retrieval
- Fixed formatTimestamp errors

### Phase 5: Analysis and Documentation (July 25, Evening)
- Identified architectural redundancy
- Both systems store identical raw messages
- Created comprehensive documentation

## Technical Implementation Details

### Message Storage Flow

```typescript
// When user sends a message:
1. useMessageHandling.sendMessage()
   ├── memoryService.saveConversation([userMessage])
   │   └── Stores in IndexedDB
   └── vectorMemoryService.storeMessageWithEmbedding(userMessage)
       └── If message > 50 chars and not small talk:
           ├── Creates context string with timestamp
           ├── Sends to /api/v1/vector/store
           ├── OpenAI generates embedding
           └── Stores in Supabase

2. When assistant responds:
   └── Same dual storage process
```

### Context-Enhanced System Prompts

```typescript
// Async version with vector search
async createSystemPrompt(userQuery?: string) {
  let systemPrompt = basePrompt + userContext;
  
  if (userQuery) {
    // Search for semantically similar memories
    const enhancedContext = await vectorMemoryService.getEnhancedContext(userQuery);
    systemPrompt += enhancedContext;
  }
  
  // Add dashboard context if relevant
  const enhancedPrompt = DynamicContextBuilder.buildEnhancedPrompt(
    systemPrompt,
    userQuery,
    dashboardContext,
    suggestions
  );
  
  return enhancedPrompt;
}
```

## Current State Analysis

### Architectural Redundancy

Both memory systems currently store the same raw messages:

```
IndexedDB:          "What's the weather like?"
Vector DB:          "What's the weather like?\n[Context: July 25, 2025, 3:45 PM, user]"
```

This redundancy leads to:
- **2x storage usage** for identical content
- **Missed opportunities** for specialized storage
- **Unclear separation** of concerns

### Performance Metrics

- **Vector Storage**: ~100-200ms (including embedding generation)
- **Vector Search**: ~50-150ms for semantic queries
- **Context Updates**: Every 60 seconds
- **Memory Operations**: <10ms for IndexedDB reads

### Integration Points

1. **Message Handling**: Dual storage on every message
2. **System Prompts**: Vector search enhances context
3. **Memory Modal**: Currently shows only IndexedDB memories
4. **Dashboard Context**: Enriches stored vectors with metadata

## Key Code Components

### Context Services

- `/src/services/DashboardContextService.ts` - Central context aggregation
- `/src/services/DynamicContextBuilder.ts` - Intelligent context selection
- `/src/hooks/useSystemPrompt.ts` - Context-aware prompt generation

### Memory Services

- `/src/services/MemoryService.ts` - IndexedDB operations, caching
- `/src/services/VectorMemoryService.ts` - Vector storage and search
- `/src/services/vectorService.ts` - Frontend API client
- `/server/routes/vector.js` - Backend vector endpoints

### Integration Hooks

- `/src/hooks/useMessageHandling.ts` - Message flow orchestration
- `/src/hooks/useChatMemory.ts` - Memory state management

## Lessons Learned

### Why @xenova/transformers Failed

1. **CDN Issues**: Models couldn't load from jsDelivr
2. **CORS Problems**: Browser security blocked model fetching
3. **Large Models**: 90MB+ downloads for client-side processing
4. **Complexity**: Overcomplicated for our needs

### Benefits of Server-Side OpenAI Approach

1. **Simplicity**: Single API call vs complex model management
2. **Performance**: Faster embedding generation
3. **Security**: API keys stay on server
4. **Reliability**: No client-side model loading issues
5. **Cost Effective**: Pay-per-use vs hosting models

### Integration Best Practices

1. **Start Simple**: Basic integration before optimization
2. **Server-Side Security**: Never expose API keys
3. **Graceful Degradation**: System works without vector service
4. **Incremental Enhancement**: Add features progressively

## Future Recommendations

### 1. Optimize Storage Strategy

Instead of storing raw messages in both systems:

**IndexedDB**: 
- Full conversation history
- UI state and metadata
- Quick access for recent messages

**Vector DB**:
- Consolidated memories only
- Important insights and patterns
- Semantic search index

### 2. Implement Memory Consolidation

```typescript
// Automatic consolidation example
"User asked about weather 5 times this week, prefers metric units"
// Instead of 5 separate weather queries
```

### 3. Enhanced Memory Features

- **Automatic Importance Detection**: ML-based relevance scoring
- **Memory Clustering**: Group related memories
- **Time Decay**: Reduce importance of old memories
- **Cross-Conversation Patterns**: Learn user preferences

### 4. Performance Optimizations

- **Batch Embeddings**: Process multiple messages together
- **Background Processing**: Web Workers for heavy operations
- **Selective Sync**: Only sync important memories
- **Compression**: Reduce storage footprint

### 5. UI Enhancements

- **Semantic Search Tab**: In MemoryModal
- **Memory Timeline**: Visual memory browser
- **Context Inspector**: Show active context in UI
- **Memory Management**: Bulk operations, tagging

## Appendices

### A. Environment Configuration

```env
# Frontend (.env)
VITE_SUPABASE_URL=your-project-url
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_OPENAI_API_KEY=your-api-key

# Backend (.env)
SUPABASE_URL=your-project-url
SUPABASE_SERVICE_KEY=your-service-key
OPENAI_API_KEY=your-api-key
```

### B. Migration SQL

```sql
-- Enable pgvector
CREATE EXTENSION IF NOT EXISTS vector;

-- Create memory vectors table
CREATE TABLE memory_vectors (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  content TEXT NOT NULL,
  embedding vector(1536) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create search function
CREATE OR REPLACE FUNCTION match_memories (
  query_embedding vector(1536),
  match_threshold float DEFAULT 0.5,
  match_count int DEFAULT 10
) RETURNS TABLE (
  id BIGINT,
  content TEXT,
  similarity float
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    id,
    content,
    1 - (embedding <=> query_embedding) as similarity
  FROM memory_vectors
  WHERE 1 - (embedding <=> query_embedding) > match_threshold
  ORDER BY embedding <=> query_embedding
  LIMIT match_count;
END;
$$ LANGUAGE plpgsql;

-- Create index for vector similarity search
CREATE INDEX memory_vectors_embedding_idx ON memory_vectors 
USING hnsw (embedding vector_cosine_ops);
```

### C. Troubleshooting Guide

**Issue**: "Cannot find module 'openai'"
**Solution**: Run `cd server && npm install openai @supabase/supabase-js`

**Issue**: "formatTimestamp is not a function"
**Solution**: Use `timeService.formatDateToLocal(new Date(timestamp))`

**Issue**: Vector search returns empty results
**Check**: 
- Vector service health endpoint
- OpenAI API key validity
- Supabase connection
- Embedding dimension match (1536)

**Issue**: High latency on vector operations
**Optimize**:
- Batch multiple operations
- Implement caching layer
- Use connection pooling
- Consider edge functions

## Conclusion

Virgil's memory system has evolved significantly but currently operates with architectural redundancy. While both IndexedDB and vector storage work well independently, they're not leveraging their unique strengths. The next phase should focus on optimizing this architecture to create a truly intelligent memory system that learns and adapts to user needs.

The integration of context awareness with semantic memory search provides a strong foundation for future enhancements. With proper optimization, Virgil can become a truly personal AI assistant that remembers what matters and understands context deeply.

---

*Document created: July 25, 2025*  
*Version: 1.0*