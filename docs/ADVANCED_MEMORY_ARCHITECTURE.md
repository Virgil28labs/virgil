# Virgil Advanced Memory Architecture

## Executive Summary

This document outlines the design and implementation of Virgil's advanced multi-tiered memory system, which combines multiple storage technologies to create a cognitive architecture that mirrors human memory while leveraging AI's unique capabilities for perfect recall and intelligent retrieval.

### Core Components
1. **Sensory Memory** (Context Service) - Immediate environmental awareness
2. **Working Memory** (Local Storage) - Active session state
3. **Semantic Memory** (Vector Database) - Meaning-based knowledge
4. **Episodic Memory** (Neo4j Graph) - Event-based autobiographical memory

### Key Benefits
- Temporal awareness with semantic understanding
- Relationship discovery across memories
- Context-aware retrieval and responses
- Human-like memory organization with AI precision
- Privacy-first design with user control

---

## Memory Component Architecture

### 1. Sensory Memory (Context Service)
**Duration**: < 1 minute (ephemeral)  
**Purpose**: Capture immediate environmental context  
**Human Analogy**: Sensory registers that briefly hold recent perceptions

**Content**:
- Current weather conditions
- User location (if permitted)
- Active applications
- Time of day and date
- Device state (battery, connectivity)
- Ambient information (music playing, etc.)

**Implementation**:
```typescript
interface SensoryMemory {
  timestamp: number;
  weather: WeatherData;
  location: LocationData;
  activeApps: string[];
  deviceState: DeviceState;
  ttl: number; // Time to live in seconds
}
```

### 2. Working Memory (Local Storage / IndexedDB)
**Duration**: Current session to 30 days  
**Purpose**: Maintain conversation continuity and recent interactions  
**Human Analogy**: Short-term memory and active thought processes

**Content**:
- Recent conversation history
- User-marked important memories
- Session state and preferences
- Temporary task contexts
- Recent query results

**Storage Strategy**:
- Rolling 30-day window
- LRU cache for quick access
- Automatic compression for older entries
- Session-based partitioning

### 3. Semantic Memory (Vector Database - Supabase pgvector)
**Duration**: Permanent  
**Purpose**: Store meaning-based knowledge and concepts  
**Human Analogy**: Long-term memory for facts and general knowledge

**Content**:
- Embedded conversation segments
- Extracted concepts and topics
- User preferences and patterns
- Learned knowledge and facts
- Semantic relationships

**Technical Details**:
- Model: OpenAI text-embedding-ada-002 (1536 dimensions)
- Similarity threshold: 0.3 for matching
- Storage format: JSON arrays in PostgreSQL
- Query method: Cosine similarity search

### 4. Episodic Memory (Neo4j Graph Database)
**Duration**: Permanent with decay  
**Purpose**: Maintain temporal and relational memory structure  
**Human Analogy**: Autobiographical memory of life events

**Graph Schema**:
```cypher
// Node Types
(:Memory {
  id: String,
  content: String,
  timestamp: DateTime,
  importance: Float,
  emotion: String,
  decayFactor: Float
})

(:Person { name: String })
(:Location { name: String })
(:Topic { name: String })
(:Activity { name: String })
(:Emotion { type: String })

// Relationship Types
(:Memory)-[:HAPPENED_BEFORE]->(:Memory)
(:Memory)-[:HAPPENED_AFTER]->(:Memory)
(:Memory)-[:INVOLVES]->(:Person)
(:Memory)-[:LOCATED_AT]->(:Location)
(:Memory)-[:RELATES_TO]->(:Topic)
(:Memory)-[:DURING]->(:Activity)
(:Memory)-[:FELT]->(:Emotion)
```

---

## Information Flow and Consolidation

### Memory Pipeline

```
[User Input] 
    ↓
[Context Service] ← [Environmental Data]
    ↓
[Message Processing]
    ↓
[Local Storage] ← [Session State]
    ↓
[Parallel Processing]
    ├─→ [Vector Embedding] → [Vector DB]
    └─→ [Entity Extraction] → [Neo4j Graph]
         ↓
    [Memory Consolidation]
         ↓
    [Unified Memory Index]
```

### Consolidation Rules

1. **Immediate Capture**: All inputs go through Context Service first
2. **Session Persistence**: Important data saved to Local Storage
3. **Selective Long-term Storage**: Based on importance scoring
4. **Parallel Processing**: Vector and graph storage happen simultaneously
5. **Cross-referencing**: Each memory gets unique ID across all systems

---

## Technical Implementation

### Unified Memory Interface

```typescript
interface UnifiedMemory {
  id: string;
  content: string;
  timestamp: Date;
  sources: {
    vector?: VectorSearchResult;
    graph?: GraphMemoryNode;
    local?: LocalMemoryEntry;
    context?: ContextSnapshot;
  };
  score: number;
  metadata: {
    importance: number;
    emotion?: string;
    entities: Entity[];
    decayFactor: number;
  };
}

class MemoryOrchestrator {
  async store(message: Message, context: Context): Promise<string> {
    const memoryId = generateUUID();
    
    // Parallel storage operations
    const operations = Promise.all([
      this.storeInLocalStorage(memoryId, message),
      this.storeInVectorDB(memoryId, message),
      this.storeInGraph(memoryId, message, context),
      this.updateContextService(context)
    ]);
    
    await operations;
    return memoryId;
  }
  
  async retrieve(query: string, options: RetrievalOptions): Promise<UnifiedMemory[]> {
    // Parallel retrieval from all sources
    const [semantic, episodic, recent, current] = await Promise.all([
      this.vectorDB.search(query, options.limit),
      this.graphDB.query(query, options),
      this.localStorage.getRecent(options.timeRange),
      this.contextService.getCurrentState()
    ]);
    
    // Merge and rank results
    return this.mergeAndRank(semantic, episodic, recent, current, query);
  }
}
```

### Query Routing Logic

```typescript
class QueryRouter {
  route(query: string): MemorySource[] {
    const routes: MemorySource[] = [];
    
    // Temporal markers → Neo4j primary
    if (/yesterday|last week|when did|timeline/i.test(query)) {
      routes.push({ source: 'neo4j', weight: 0.6 });
      routes.push({ source: 'vector', weight: 0.4 });
    }
    
    // Semantic markers → Vector DB primary
    else if (/similar to|like when|about the topic/i.test(query)) {
      routes.push({ source: 'vector', weight: 0.7 });
      routes.push({ source: 'neo4j', weight: 0.3 });
    }
    
    // Entity markers → Neo4j graph traversal
    else if (/with \w+|at the \w+|during the/i.test(query)) {
      routes.push({ source: 'neo4j', weight: 0.8 });
      routes.push({ source: 'vector', weight: 0.2 });
    }
    
    // Default: balanced approach
    else {
      routes.push({ source: 'vector', weight: 0.5 });
      routes.push({ source: 'neo4j', weight: 0.5 });
    }
    
    return routes;
  }
}
```

---

## Memory Operations

### Storage Strategy

```typescript
class MemoryStorageStrategy {
  async shouldStore(message: Message): StorageDecision {
    const decision = {
      vector: false,
      graph: true, // Always store structure
      local: true,  // Always store temporarily
      importance: 0
    };
    
    // Calculate importance
    decision.importance = this.calculateImportance(message);
    
    // Vector storage criteria
    if (message.content.length > 50 && 
        !this.isSmallTalk(message) &&
        decision.importance > 0.3) {
      decision.vector = true;
    }
    
    return decision;
  }
  
  calculateImportance(message: Message): number {
    let score = 0.5; // Base score
    
    // Length factor
    score += Math.min(message.content.length / 1000, 0.2);
    
    // Emotion factor
    if (message.emotion && message.emotion !== 'neutral') {
      score += 0.2;
    }
    
    // User marking
    if (message.userMarked) {
      score = Math.max(score, 0.8);
    }
    
    // Entity richness
    const entities = this.extractEntities(message);
    score += Math.min(entities.length * 0.05, 0.2);
    
    return Math.min(score, 1.0);
  }
}
```

### Retrieval Patterns

#### Pattern 1: Temporal + Semantic Fusion
```typescript
async function getMemoryContext(query: string): Promise<string> {
  // Extract temporal markers
  const timeRange = extractTimeRange(query);
  
  // Get episodic memories
  const episodicMemories = await neo4j.query(`
    MATCH (m:Memory)
    WHERE m.timestamp >= $start AND m.timestamp <= $end
    RETURN m
    ORDER BY m.importance DESC, m.timestamp DESC
    LIMIT 10
  `, { start: timeRange.start, end: timeRange.end });
  
  // Get semantic memories
  const semanticMemories = await vectorDB.search(query, 10);
  
  // Merge and format
  return formatMemoryContext(episodicMemories, semanticMemories);
}
```

#### Pattern 2: Relationship Traversal
```typescript
async function findRelatedMemories(memoryId: string): Promise<Memory[]> {
  return await neo4j.query(`
    MATCH (m:Memory {id: $id})
    MATCH path = (m)-[*1..3]-(related:Memory)
    WHERE related.id <> m.id
    WITH related, 
         length(path) as distance,
         [r in relationships(path) | type(r)] as relationTypes
    RETURN related, distance, relationTypes
    ORDER BY related.importance DESC, distance ASC
    LIMIT 20
  `, { id: memoryId });
}
```

### Ranking Algorithm

```typescript
class MemoryRanker {
  rank(memories: UnifiedMemory[], query: string): UnifiedMemory[] {
    return memories
      .map(memory => ({
        ...memory,
        score: this.calculateScore(memory, query)
      }))
      .sort((a, b) => b.score - a.score);
  }
  
  calculateScore(memory: UnifiedMemory, query: string): number {
    const weights = {
      semantic: 0.30,
      temporal: 0.20,
      entities: 0.20,
      importance: 0.15,
      recency: 0.15
    };
    
    const scores = {
      semantic: memory.sources.vector?.similarity || 0,
      temporal: this.getTemporalRelevance(memory, query),
      entities: this.getEntityOverlap(memory, query),
      importance: memory.metadata.importance,
      recency: this.getRecencyScore(memory.timestamp)
    };
    
    return Object.entries(weights).reduce(
      (total, [key, weight]) => total + (scores[key] * weight),
      0
    );
  }
}
```

---

## Advanced Features

### Memory Fusion

Memory fusion combines information from multiple sources to create richer, more contextual responses:

```typescript
class MemoryFusion {
  async fuseMemories(
    semantic: VectorResult[], 
    episodic: GraphResult[]
  ): Promise<FusedMemory[]> {
    const fused: FusedMemory[] = [];
    
    // Match memories by content similarity
    for (const sem of semantic) {
      const matchingEpisodic = episodic.find(ep => 
        this.contentSimilarity(sem.content, ep.content) > 0.8
      );
      
      if (matchingEpisodic) {
        fused.push({
          content: sem.content,
          semanticContext: sem.context,
          episodicContext: {
            when: matchingEpisodic.timestamp,
            where: matchingEpisodic.location,
            who: matchingEpisodic.people,
            emotion: matchingEpisodic.emotion
          },
          importance: Math.max(
            sem.importance || 0, 
            matchingEpisodic.importance || 0
          )
        });
      }
    }
    
    return fused;
  }
}
```

### Pattern Recognition

```cypher
// Find recurring patterns in user behavior
MATCH (m:Memory)-[:INVOLVES]->(activity:Activity)
WHERE m.timestamp > datetime() - duration('P30D')
WITH activity.name as activityName, 
     COLLECT(m.timestamp) as timestamps,
     COUNT(m) as frequency
WHERE frequency > 3
WITH activityName, timestamps, frequency,
     [t in timestamps | t.dayOfWeek] as daysOfWeek,
     [t in timestamps | t.hour] as hoursOfDay
RETURN activityName, 
       frequency,
       mode(daysOfWeek) as typicalDay,
       mode(hoursOfDay) as typicalHour
ORDER BY frequency DESC
```

### Predictive Memory Loading

```typescript
class PredictiveMemoryLoader {
  async preloadRelevantMemories(context: Context): Promise<void> {
    const predictions = await this.predictNeededMemories(context);
    
    // Preload high-probability memories
    for (const prediction of predictions) {
      if (prediction.probability > 0.7) {
        await this.cacheMemory(prediction.memoryId);
      }
    }
  }
  
  async predictNeededMemories(context: Context): Promise<Prediction[]> {
    // Time-based predictions
    const timePatterns = await this.getTimeBasedPatterns(context.time);
    
    // Location-based predictions
    const locationMemories = context.location ? 
      await this.getLocationMemories(context.location) : [];
    
    // Activity-based predictions
    const activityMemories = await this.getActivityMemories(
      context.activeApps
    );
    
    return this.rankPredictions([
      ...timePatterns,
      ...locationMemories,
      ...activityMemories
    ]);
  }
}
```

### Semantic Evolution Tracking

Track how understanding of concepts evolves over time:

```cypher
// Track evolution of understanding for a topic
MATCH (m:Memory)-[:RELATES_TO]->(t:Topic {name: $topic})
WHERE m.timestamp > datetime() - duration('P6M')
WITH m.timestamp as time, 
     m.content as content,
     m.importance as importance
ORDER BY time ASC
WITH COLLECT({time: time, content: content}) as evolution
RETURN [e in evolution | {
  period: CASE 
    WHEN e.time < datetime() - duration('P3M') THEN 'early'
    WHEN e.time < datetime() - duration('P1M') THEN 'middle'
    ELSE 'recent'
  END,
  complexity: size(split(e.content, ' ')),
  content: e.content
}] as learningProgression
```

---

## Use Cases and Examples

### Use Case 1: Temporal Query
**User**: "What did we talk about yesterday?"

**System Flow**:
1. QueryRouter identifies temporal marker "yesterday"
2. Neo4j query for date range (yesterday 00:00 - 23:59)
3. Retrieve all Memory nodes in range
4. Enhance with Vector DB details for top results
5. Format chronologically with context

**Response**: "Yesterday we discussed your React project in the morning, particularly the routing issues. In the afternoon, you asked about TypeScript generics, and in the evening we talked about your weekend plans to visit the museum."

### Use Case 2: Semantic Search
**User**: "Find conversations about machine learning"

**System Flow**:
1. Vector DB search for "machine learning" embeddings
2. Neo4j finds memories with Topic:"MachineLearning"
3. Merge results, prioritizing semantic similarity
4. Include temporal context from Neo4j

**Response**: "I found 5 conversations about machine learning. The most relevant was last Tuesday when you asked about neural networks. You've been progressively learning about ML concepts over the past month, starting with basic algorithms and now exploring deep learning."

### Use Case 3: Relationship Discovery
**User**: "What have I discussed with Alex?"

**System Flow**:
1. Neo4j query for Person:"Alex" relationships
2. Traverse to connected Memory nodes
3. Group by topics and time periods
4. Identify patterns in conversations

**Query**:
```cypher
MATCH (p:Person {name: 'Alex'})<-[:INVOLVES]-(m:Memory)
OPTIONAL MATCH (m)-[:RELATES_TO]->(t:Topic)
WITH m, COLLECT(DISTINCT t.name) as topics
RETURN m.content, m.timestamp, topics
ORDER BY m.timestamp DESC
```

### Use Case 4: Context-Aware Response
**User**: "Continue our conversation about the project"

**System Flow**:
1. Local Storage retrieves recent "project" mentions
2. Neo4j finds the project timeline
3. Context Service checks if project files are open
4. Vector DB finds similar project discussions
5. Combine to understand current project state

**Response**: "Looking at our recent discussions, you're working on adding authentication to your React app. Yesterday you successfully implemented the login form. Based on your currently open files, it seems you're now working on the JWT token handling. Would you like help with the token refresh logic?"

---

## Privacy and Control

### User Memory Management

```typescript
interface MemoryPrivacyControls {
  // Selective deletion
  async deleteMemories(criteria: DeleteCriteria): Promise<number> {
    const memories = await this.findMemories(criteria);
    
    // Delete from all systems
    const deletions = await Promise.all([
      this.vectorDB.delete(memories.map(m => m.vectorId)),
      this.neo4j.delete(memories.map(m => m.graphId)),
      this.localStorage.delete(memories.map(m => m.localId))
    ]);
    
    return memories.length;
  }
  
  // Memory export
  async exportMemories(
    criteria: ExportCriteria
  ): Promise<ExportedMemories> {
    const memories = await this.findMemories(criteria);
    
    return {
      version: '1.0',
      exportDate: new Date(),
      memories: memories.map(m => ({
        content: m.content,
        timestamp: m.timestamp,
        context: m.context,
        relationships: m.relationships
      })),
      format: criteria.format || 'json'
    };
  }
}
```

### Memory Modes

```typescript
enum MemoryMode {
  FULL = 'full',           // All memories accessible
  WORK = 'work',           // Only work-related memories
  PERSONAL = 'personal',   // Only personal memories
  GUEST = 'guest',         // Temporary, auto-deleting
  PRIVATE = 'private'      // Encrypted, requires auth
}

class MemoryModeManager {
  async setMode(mode: MemoryMode, context?: ModeContext): Promise<void> {
    this.currentMode = mode;
    
    // Apply filters based on mode
    switch (mode) {
      case MemoryMode.WORK:
        this.filters = {
          topics: ['work', 'project', 'meeting', 'deadline'],
          locations: ['office', 'workspace'],
          timeRange: 'business_hours'
        };
        break;
        
      case MemoryMode.GUEST:
        this.startGuestSession({
          ttl: context?.duration || 3600, // 1 hour default
          autoDelete: true
        });
        break;
    }
  }
}
```

### Encryption and Security

```typescript
class MemoryEncryption {
  async encryptMemory(
    memory: Memory, 
    userKey: CryptoKey
  ): Promise<EncryptedMemory> {
    const iv = crypto.getRandomValues(new Uint8Array(12));
    
    const encrypted = await crypto.subtle.encrypt(
      {
        name: 'AES-GCM',
        iv: iv
      },
      userKey,
      new TextEncoder().encode(JSON.stringify(memory))
    );
    
    return {
      id: memory.id,
      encryptedData: encrypted,
      iv: iv,
      algorithm: 'AES-GCM'
    };
  }
}
```

---

## Future Enhancements

### Procedural Memory System
Add a fifth memory type for storing "how-to" knowledge:

```typescript
interface ProceduralMemory {
  id: string;
  procedure: string;
  steps: Step[];
  triggers: string[];
  successRate: number;
  lastUsed: Date;
}

// Example: Learning user's morning routine
{
  procedure: "morning_routine",
  steps: [
    { action: "check_weather", time: "07:00" },
    { action: "review_calendar", time: "07:15" },
    { action: "check_stocks", time: "07:30", condition: "weekday" }
  ],
  triggers: ["good morning", "start my day"],
  successRate: 0.85
}
```

### Meta-Memory System
Track memory system performance and optimize:

```typescript
class MetaMemorySystem {
  async analyzeMemoryEffectiveness(): Promise<MetaAnalysis> {
    return {
      queryPerformance: {
        vectorDB: { avgTime: 45, hitRate: 0.78 },
        neo4j: { avgTime: 62, hitRate: 0.85 },
        hybrid: { avgTime: 58, hitRate: 0.92 }
      },
      userSatisfaction: await this.getUserFeedbackAnalysis(),
      recommendations: [
        "Increase vector DB weight for technical queries",
        "Use Neo4j primary for temporal queries",
        "Pre-cache frequently accessed memories"
      ]
    };
  }
}
```

### Cognitive Load Optimization
Dynamically adjust memory retrieval based on user state:

```typescript
class CognitiveLoadOptimizer {
  async optimizeRetrieval(
    query: string, 
    userState: UserState
  ): Promise<OptimizedResults> {
    const cognitiveLoad = this.assessCognitiveLoad(userState);
    
    if (cognitiveLoad.level === 'high') {
      // Return fewer, more relevant results
      return {
        memories: await this.getTopMemories(query, 3),
        summary: await this.generateConciseSummary(query),
        complexity: 'simplified'
      };
    } else {
      // Return comprehensive results
      return {
        memories: await this.getComprehensiveMemories(query, 10),
        relationships: await this.getMemoryGraph(query),
        complexity: 'detailed'
      };
    }
  }
}
```

---

## Implementation Roadmap

### Phase 1: Foundation (Weeks 1-2)
- [ ] Set up Neo4j database infrastructure
- [ ] Create graph schema and relationships
- [ ] Build UnifiedMemory interface
- [ ] Implement basic storage pipeline

### Phase 2: Integration (Weeks 3-4)
- [ ] Connect Neo4j with existing Vector DB
- [ ] Implement MemoryOrchestrator
- [ ] Add query routing logic
- [ ] Create retrieval patterns

### Phase 3: Advanced Features (Weeks 5-6)
- [ ] Implement memory fusion
- [ ] Add pattern recognition
- [ ] Build predictive loading
- [ ] Create importance scoring

### Phase 4: Privacy & Control (Weeks 7-8)
- [ ] Add memory management UI
- [ ] Implement memory modes
- [ ] Create export/import functionality
- [ ] Add encryption support

### Phase 5: Optimization (Weeks 9-10)
- [ ] Performance tuning
- [ ] Add meta-memory analysis
- [ ] Implement cognitive load optimization
- [ ] Create monitoring dashboard

---

## Conclusion

This advanced memory architecture transforms Virgil from a simple chatbot into a cognitive companion with deep understanding of context, relationships, and time. By combining multiple specialized memory systems, we create an AI that not only remembers what was said, but understands when it happened, how things connect, and why they matter to the user.

The system is designed to be:
- **Intelligent**: Multiple retrieval strategies for optimal results
- **Human-like**: Mirrors cognitive memory organization
- **Scalable**: Grows with user interactions
- **Private**: User-controlled with encryption options
- **Extensible**: Ready for future cognitive enhancements

This architecture positions Virgil at the forefront of AI companion technology, matching or exceeding the capabilities of leading platforms while maintaining a focus on user privacy and control.