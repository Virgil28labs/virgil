# Virgil Implementation Notes

## Quick Reference for Future Development

### Current Working Features

#### 1. Memory System
- **What Works**: Full conversation persistence, marked memories, memory modal
- **Storage**: IndexedDB (`virgil-memory-db`)
- **Key Methods**: 
  - `memoryService.saveConversation(messages)`
  - `memoryService.markAsImportant(messageId, content, context)`
  - `memoryService.getContextForPrompt()`

#### 2. Context Awareness
- **What Works**: Weather, location, time, user data integration
- **How**: DashboardContextService collects data, DynamicContextBuilder enhances prompts
- **Visual**: 🎯 Context Aware badge shows when active

#### 3. App Data Access (Partial)
- **Working Apps**: Notes, Pomodoro, Habit Tracker
- **How**: DashboardAppService with adapter pattern
- **Query Examples**:
  - "How many notes do I have?"
  - "What habits did I complete today?"
  - "Is my timer running?"

### File Structure
```
src/
├── components/
│   └── VirgilChatbot.tsx         # Main chatbot component
├── services/
│   ├── MemoryService.ts          # Memory persistence
│   ├── DashboardContextService.ts # Environmental context
│   ├── DynamicContextBuilder.ts   # Smart prompt enhancement
│   ├── DashboardAppService.ts     # App data orchestrator
│   └── adapters/                  # App-specific adapters
│       ├── NotesAdapter.ts
│       ├── PomodoroAdapter.ts
│       └── StreakAdapter.ts
```

### How to Add New App Integration

1. **Create Adapter** in `/src/services/adapters/[AppName]Adapter.ts`:
```typescript
export class [AppName]Adapter implements AppDataAdapter<[DataType]> {
  readonly appName = 'appname';
  readonly displayName = 'App Name';
  readonly icon = '🎯';
  
  getContextData(): AppContextData<[DataType]> { }
  canAnswer(query: string): boolean { }
  getKeywords(): string[] { }
  async getResponse(query: string): Promise<string> { }
}
```

2. **Register in Dashboard.tsx**:
```typescript
useEffect(() => {
  const adapter = new [AppName]Adapter();
  dashboardAppService.registerAdapter(adapter);
  
  return () => {
    dashboardAppService.unregisterAdapter('appname');
  };
}, []);
```

3. **Test with queries** related to the app

### Storage Locations

| App | Storage Type | Key | Data |
|-----|--------------|-----|------|
| Notes | IndexedDB | `notesDB` | Full entries |
| Camera | localStorage | `virgil_camera_photos` | Photos + metadata |
| Dog Gallery | localStorage | `virgil_dog_favorites` | Favorite URLs |
| NASA APOD | localStorage | `virgil_nasa_favorites` | Favorite images |
| Giphy | localStorage | `giphy-favorites` | Favorite GIFs |
| Habits | localStorage | `virgil_habits` | All habit data |
| Rhythm | localStorage | `rhythmMachineSaveSlots` | Patterns |
| Circle Game | localStorage | `perfectCircleBestScore` | Scores |

### TypeScript Interfaces

Key interfaces to know:
```typescript
// For app adapters
interface AppDataAdapter<T = any> {
  appName: string;
  displayName: string;
  icon?: string;
  getContextData(): AppContextData<T>;
  canAnswer(query: string): boolean;
  getKeywords(): string[];
  getResponse?(query: string): Promise<string>;
  search?(query: string): Promise<any[]>;
  subscribe?(callback: (data: T) => void): () => void;
}

// For chat messages
interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}
```

### Testing

1. **Memory System**: Create conversations, mark messages, close/reopen chat
2. **Context**: Check time/weather queries, verify context badges
3. **App Data**: Open apps, add data, ask Virgil about it

### Common Issues & Solutions

1. **TypeScript Errors**: Usually missing properties in context types
   - Solution: Add mock/default values for unused properties

2. **App Data Not Showing**: Adapter not registered
   - Solution: Check Dashboard.tsx useEffect registration

3. **Query Not Routing**: Keywords not matching
   - Solution: Add more keywords to adapter's getKeywords()

### Performance Considerations

- Memory service auto-cleans conversations older than 30 days
- Context updates every minute (time) and on data changes
- App adapters cache for 5 seconds to prevent excessive reads
- Camera app has 50MB storage limit with auto-cleanup

### Future Work Priorities

1. **Complete Gallery Adapters** (Camera, Dog, NASA, Giphy)
2. **Multi-modal Support** (analyze photos in chat)
3. **Cross-app Intelligence** (correlate data across apps)
4. **Voice Interface** (speech input/output)
5. **Predictive Suggestions** (based on patterns)