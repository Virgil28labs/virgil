# Supabase Vector Integration Plan for Virgil

## Overview
Integrate Supabase's pgvector extension to add semantic search capabilities to Virgil's memory system while maintaining the local-first architecture.

## Current State Analysis
- **Supabase Usage**: Currently only for auth and user profiles (auth.users table)
- **Memory Storage**: All in IndexedDB (local-first)
- **No Cloud Sync**: Memory data stays on device
- **Existing Auth**: Already has Supabase authentication flow

## Supabase Database Setup

### 1. Enable pgvector Extension
```sql
-- Run in Supabase SQL editor
CREATE EXTENSION IF NOT EXISTS vector;
```

### 2. Create Memory Tables
```sql
-- Main memory vectors table
CREATE TABLE IF NOT EXISTS memory_vectors (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  embedding vector(384), -- Using gte-small model (384 dimensions)
  importance_score FLOAT DEFAULT 0.5,
  memory_type TEXT NOT NULL CHECK (memory_type IN ('conversation', 'memory', 'consolidated', 'summary')),
  source_id TEXT, -- Original IndexedDB ID for sync
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  synced_at TIMESTAMPTZ,
  is_deleted BOOLEAN DEFAULT FALSE
);

-- Conversation summaries table
CREATE TABLE IF NOT EXISTS conversation_summaries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  conversation_id TEXT NOT NULL, -- IndexedDB conversation ID
  summary TEXT NOT NULL,
  summary_embedding vector(384),
  message_count INTEGER,
  start_time TIMESTAMPTZ,
  end_time TIMESTAMPTZ,
  topics TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Sync status tracking
CREATE TABLE IF NOT EXISTS memory_sync_status (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  last_sync TIMESTAMPTZ,
  sync_cursor TEXT,
  status TEXT DEFAULT 'idle',
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 3. Create Indexes
```sql
-- Vector similarity search index
CREATE INDEX memory_vectors_embedding_idx ON memory_vectors 
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- Performance indexes
CREATE INDEX idx_memory_vectors_user_id ON memory_vectors(user_id);
CREATE INDEX idx_memory_vectors_created_at ON memory_vectors(created_at DESC);
CREATE INDEX idx_memory_vectors_importance ON memory_vectors(importance_score DESC);
CREATE INDEX idx_memory_vectors_source_id ON memory_vectors(source_id);

-- Conversation summaries indexes
CREATE INDEX idx_conversation_summaries_user_id ON conversation_summaries(user_id);
CREATE INDEX idx_conversation_summaries_conversation_id ON conversation_summaries(conversation_id);
```

### 4. Row Level Security (RLS) Policies
```sql
-- Enable RLS
ALTER TABLE memory_vectors ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_summaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE memory_sync_status ENABLE ROW LEVEL SECURITY;

-- Memory vectors policies
CREATE POLICY "Users can only see their own memories" ON memory_vectors
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can only insert their own memories" ON memory_vectors
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can only update their own memories" ON memory_vectors
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can only delete their own memories" ON memory_vectors
  FOR DELETE USING (auth.uid() = user_id);

-- Conversation summaries policies
CREATE POLICY "Users can only see their own summaries" ON conversation_summaries
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can only insert their own summaries" ON conversation_summaries
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Sync status policies
CREATE POLICY "Users can only see their own sync status" ON memory_sync_status
  FOR ALL USING (auth.uid() = user_id);
```

### 5. Database Functions
```sql
-- Function to search memories by vector similarity
CREATE OR REPLACE FUNCTION search_memories(
  query_embedding vector(384),
  match_count INT DEFAULT 10,
  threshold FLOAT DEFAULT 0.7
)
RETURNS TABLE (
  id UUID,
  content TEXT,
  importance_score FLOAT,
  memory_type TEXT,
  metadata JSONB,
  similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    m.id,
    m.content,
    m.importance_score,
    m.memory_type,
    m.metadata,
    1 - (m.embedding <=> query_embedding) as similarity
  FROM memory_vectors m
  WHERE 
    m.user_id = auth.uid()
    AND m.is_deleted = FALSE
    AND 1 - (m.embedding <=> query_embedding) > threshold
  ORDER BY m.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Function to get memory statistics
CREATE OR REPLACE FUNCTION get_memory_stats()
RETURNS TABLE (
  total_memories BIGINT,
  total_conversations BIGINT,
  avg_importance FLOAT,
  memory_types JSONB
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*)::BIGINT as total_memories,
    COUNT(DISTINCT metadata->>'conversation_id')::BIGINT as total_conversations,
    AVG(importance_score)::FLOAT as avg_importance,
    jsonb_object_agg(memory_type, type_count) as memory_types
  FROM (
    SELECT memory_type, COUNT(*) as type_count
    FROM memory_vectors
    WHERE user_id = auth.uid() AND is_deleted = FALSE
    GROUP BY memory_type
  ) t;
END;
$$;
```

## Service Architecture

### SupabaseMemoryService
```typescript
// src/services/SupabaseMemoryService.ts
export class SupabaseMemoryService {
  // Hybrid approach: IndexedDB primary, Supabase for search & sync
  
  async syncToSupabase(memories: Memory[]): Promise<void> {
    // Batch sync memories to Supabase
    // Generate embeddings using Supabase Edge Function
    // Update sync status
  }
  
  async searchSemantic(query: string): Promise<Memory[]> {
    // Generate query embedding
    // Search using vector similarity
    // Merge with local results
  }
  
  async consolidateMemories(): Promise<void> {
    // Identify similar memories via clustering
    // Create consolidated entries
    // Update importance scores
  }
}
```

### Embedding Generation
```typescript
// Use Supabase Edge Function for embedding generation
const { data } = await supabase.functions.invoke('generate-embedding', {
  body: { text: memoryContent }
});
```

## Migration Strategy

### Phase 1: Setup Infrastructure (Week 1)
1. Enable pgvector in Supabase dashboard
2. Run SQL migrations to create tables
3. Deploy embedding generation Edge Function
4. Create SupabaseMemoryService class

### Phase 2: Sync Implementation (Week 2)
1. Implement background sync from IndexedDB to Supabase
2. Add sync status UI indicators
3. Handle offline/online transitions
4. Implement conflict resolution

### Phase 3: Search Enhancement (Week 3)
1. Add semantic search UI
2. Implement hybrid search (local + vector)
3. Add relevance scoring
4. Performance optimization

## Security Considerations

1. **User Isolation**: Strict RLS policies ensure users only access their own data
2. **Authentication**: Use existing Supabase auth tokens
3. **Data Privacy**: Sensitive content never leaves device without user consent
4. **Sync Control**: Users can disable cloud sync entirely
5. **Encryption**: Consider encrypting memory content before storing

## Performance Optimization

1. **Batch Operations**: Sync in batches of 100 memories
2. **Background Sync**: Use Web Workers for non-blocking sync
3. **Caching**: Cache embeddings locally to reduce API calls
4. **Indexes**: Proper database indexes for fast queries
5. **Connection Pooling**: Reuse Supabase connections

## Error Handling

1. **Offline Graceful Degradation**: Fall back to local search
2. **Sync Failures**: Exponential backoff with retry
3. **Quota Management**: Monitor Supabase usage limits
4. **User Feedback**: Clear sync status indicators

## Testing Strategy

1. **Unit Tests**: Test sync logic and conflict resolution
2. **Integration Tests**: Test Supabase operations
3. **E2E Tests**: Test full sync flow
4. **Performance Tests**: Measure search latency
5. **Security Tests**: Verify RLS policies

## Rollback Plan

1. Feature flag for Supabase sync
2. Export functionality to download all cloud data
3. One-click disable cloud sync
4. Maintain IndexedDB as source of truth

This plan ensures proper Supabase integration while maintaining Virgil's local-first philosophy and excellent user experience.

---

*Created: January 2025*