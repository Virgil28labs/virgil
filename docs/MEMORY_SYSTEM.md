# Virgil Memory System Documentation

## Overview
Comprehensive documentation for Virgil's AI memory system, including vector embeddings, context building, and memory management.

## Memory Architecture

### Three-Tier Memory System

1. **Immediate Context** (Active Session)
   - Last 10-20 messages
   - Current conversation state
   - Active user preferences
   - Real-time access

2. **Short-Term Memory** (IndexedDB)
   - Recent conversations (30 days)
   - Searchable message history
   - Tagged important messages
   - Quick retrieval

3. **Long-Term Memory** (Vector Database)
   - Semantic embeddings
   - Cross-conversation insights
   - Pattern recognition
   - Context-aware retrieval

## Vector Memory Integration

### Architecture
```typescript
interface VectorMemory {
  id: string
  content: string
  embedding: number[]
  metadata: {
    timestamp: number
    importance: number
    context: string
    tags: string[]
  }
}
```

### Embedding Pipeline
1. **Content Preparation**: Extract meaningful text
2. **Embedding Generation**: Convert to vectors
3. **Storage**: Save with metadata
4. **Indexing**: Build search indices

### Similarity Search
- Cosine similarity for relevance
- Hybrid search (keyword + semantic)
- Context-aware ranking
- Result filtering and re-ranking

## Context Building

### Dynamic Context Builder
```typescript
class DynamicContextBuilder {
  // Builds context from multiple sources
  async buildContext(query: string): Promise<string> {
    const immediate = this.getImmediateContext()
    const shortTerm = await this.searchShortTerm(query)
    const longTerm = await this.searchVectors(query)
    return this.mergeContexts(immediate, shortTerm, longTerm)
  }
}
```

### Context Sources
1. **Dashboard State**: Active apps, user actions
2. **User Profile**: Preferences, history
3. **Temporal Context**: Time, weather, location
4. **Conversation History**: Recent messages
5. **Semantic Memories**: Related past conversations

## Memory Management

### Importance Scoring
- User engagement (stars, reactions)
- Semantic richness (information density)
- Temporal relevance (recency)
- Cross-reference frequency

### Memory Lifecycle
1. **Creation**: New messages evaluated
2. **Storage**: Important messages saved
3. **Indexing**: Embeddings generated
4. **Retrieval**: Context-based search
5. **Decay**: Old memories archived
6. **Cleanup**: Irrelevant data removed

### Storage Strategies
- **Selective Storage**: Only important messages
- **Compression**: Summarize old conversations
- **Hierarchical**: Different detail levels
- **Distributed**: Local + cloud hybrid

## Implementation Details

### MemoryService
- Manages all memory operations
- Coordinates between storage layers
- Handles memory lifecycle
- Provides unified API

### VectorMemoryService
- Interfaces with vector database
- Manages embeddings
- Performs similarity search
- Handles synchronization

### Context Services
- DashboardContextService: App state
- DynamicContextBuilder: Context assembly
- TimeService: Temporal context
- LocationContext: Spatial awareness

## Performance Optimization

### Caching Strategy
- LRU cache for embeddings
- Memoized search results
- Pre-computed similarities
- Lazy loading patterns

### Search Optimization
- Indexed fields for fast lookup
- Batch embedding generation
- Parallel search queries
- Result pagination

## Privacy & Security

### Data Protection
- Local-first architecture
- Encrypted storage
- User-controlled sharing
- Data retention policies

### User Control
- Memory on/off toggle
- Selective forgetting
- Export capabilities
- Clear history options

## Integration Points

### Chat Interface
- Real-time memory formation
- Context injection
- Memory indicators
- Search integration

### Dashboard Apps
- App-specific memories
- Cross-app insights
- Usage patterns
- Preference learning

## Future Enhancements

### Planned Features
1. **Multi-Modal Memory**: Images, audio
2. **Emotional Context**: Sentiment tracking
3. **Collaborative Memory**: Shared contexts
4. **Predictive Recall**: Proactive suggestions

### Research Areas
- Federated learning for privacy
- Compression algorithms
- Novel embedding techniques
- Cognitive architectures

## Memory System Metrics

### Performance
- Embedding generation: <100ms
- Similarity search: <200ms
- Context building: <500ms
- Memory storage: <50ms

### Capacity
- Short-term: 10,000 messages
- Long-term: 100,000 embeddings
- Context window: 8,000 tokens
- Search results: 20 items

## Best Practices

### Do's
- Regular memory maintenance
- Monitor storage usage
- Implement privacy controls
- Test retrieval accuracy
- Optimize search queries

### Don'ts
- Store sensitive data
- Ignore user preferences
- Skip importance scoring
- Overload context
- Block on memory operations