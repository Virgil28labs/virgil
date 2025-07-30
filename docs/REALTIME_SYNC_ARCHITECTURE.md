# Real-time Sync Architecture

## Overview

Virgil uses Supabase Realtime to synchronize chat data across multiple devices in real-time. When a user is logged in on multiple devices, any changes made on one device instantly appear on all others.

## Architecture Components

### 1. Database Schema

The real-time sync relies on three main tables:

```sql
-- Messages table
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  conversation_id UUID,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB,
  local_id TEXT,
  UNIQUE(user_id, local_id)
);

-- Conversations table
CREATE TABLE conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT,
  message_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  local_id TEXT,
  UNIQUE(user_id, local_id)
);

-- Memories table
CREATE TABLE memories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  context TEXT,
  importance_score FLOAT DEFAULT 1.0,
  tag TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  local_id TEXT,
  UNIQUE(user_id, local_id)
);
```

### 2. Row Level Security (RLS)

All tables have RLS policies that ensure users can only access their own data:

```sql
-- Enable RLS on all tables
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE memories ENABLE ROW LEVEL SECURITY;

-- Policies for messages
CREATE POLICY "Users can only see their own messages" 
  ON messages FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can only insert their own messages" 
  ON messages FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

-- Similar policies for conversations and memories tables
```

### 3. Real-time Subscriptions

The `useRealtimeSync` hook manages WebSocket connections for real-time updates:

```typescript
// Create a channel for the user
const channel = supabase
  .channel(`virgil-sync-${userId}`)
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'messages',
    filter: `user_id=eq.${userId}`,
  }, handleMessageChange)
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'conversations',
    filter: `user_id=eq.${userId}`,
  }, handleConversationChange)
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'memories',
    filter: `user_id=eq.${userId}`,
  }, handleMemoryChange)
  .subscribe();
```

### 4. Connection Management

The system handles connection states gracefully:

- **Connected**: Real-time sync active (🔄 SYNC indicator)
- **Disconnected**: Falls back to local storage (⚠️ SYNC indicator)
- **Reconnecting**: Automatic retry with exponential backoff

## Data Flow

### Message Flow
1. User sends a message on Device A
2. Message is saved to Supabase via `SupabaseMemoryService`
3. Supabase broadcasts the change via WebSocket
4. All other devices receive the update via `useRealtimeSync`
5. UI updates automatically with the new message

### Memory Sync
1. User marks a message as important on Device A
2. Memory is saved to the `memories` table
3. Real-time subscription notifies all devices
4. Memory appears in the memory modal on all devices

### Conversation Updates
1. Conversation metadata updates (e.g., message count)
2. Change is broadcast to all subscribed devices
3. UI reflects the updated conversation state

## Security Considerations

### Multi-User Isolation
- RLS policies ensure complete data isolation between users
- Each user's channel is uniquely named: `virgil-sync-${userId}`
- Filters on subscriptions provide an additional security layer
- Server-side validation prevents cross-user data access

### Authentication Flow
1. User must be authenticated to establish subscriptions
2. JWT tokens are automatically included in WebSocket connections
3. Expired tokens trigger automatic refresh attempts
4. Failed auth results in graceful degradation to local storage

## Performance Optimizations

### Batching
- Multiple rapid changes are batched to reduce network traffic
- UI updates are debounced to prevent flickering

### Caching
- Recent messages are cached locally for instant display
- Optimistic updates show changes immediately
- Rollback on server rejection maintains consistency

### Connection Pooling
- Single WebSocket connection for all subscriptions
- Automatic reconnection with exponential backoff
- Connection state persisted across component remounts

## Error Handling

### Network Failures
- Automatic reconnection attempts
- Exponential backoff (5s, 10s, 20s, etc.)
- Local storage fallback for offline mode

### RLS Violations
- Graceful handling of 406 errors
- Falls back to IndexedDB for local storage
- User notification for sync issues

### Data Conflicts
- Last-write-wins for concurrent updates
- Unique constraints prevent duplicate entries
- Optimistic UI with rollback on conflicts

## Testing

### Unit Tests
- `useRealtimeSync.test.ts`: Tests subscription logic
- `SupabaseMemoryService.test.ts`: Tests multi-user isolation

### Integration Testing
1. Login on multiple devices with same account
2. Send messages and verify instant sync
3. Mark memories and check synchronization
4. Test offline mode and reconnection

### Security Testing
- Verify RLS policies block cross-user access
- Test JWT expiration and refresh
- Validate subscription filters

## Future Enhancements

### Planned Features
1. Conflict resolution UI for concurrent edits
2. Selective sync for bandwidth optimization
3. End-to-end encryption for sensitive data
4. Presence indicators (who's online)
5. Collaborative features (shared conversations)

### Performance Improvements
1. Delta sync for large conversations
2. Compression for message content
3. Intelligent prefetching
4. Progressive enhancement for slow connections

## Troubleshooting

### Common Issues

**Sync not working**
- Check authentication status
- Verify Supabase Realtime is enabled
- Check browser WebSocket support
- Review browser console for errors

**Duplicate messages**
- Ensure unique constraints are set
- Check for multiple subscription instances
- Verify cleanup on component unmount

**Performance issues**
- Monitor WebSocket connection count
- Check for subscription leaks
- Review message batching logic
- Consider implementing pagination