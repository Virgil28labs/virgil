# Notes Application Documentation

## Overview

The Notes application is a sophisticated note-taking system built with React and TypeScript. It features a two-layer tagging system, AI-powered tag generation, task extraction, and persistent storage using IndexedDB.

## Architecture

### Core Components

1. **NotesApp** - Main application container with error boundary
2. **NotesInput** - Smart input field with rotating placeholders
3. **NotesList** - List container for note entries
4. **NotesEntry** - Individual note component with editing capabilities
5. **NotesFilter** - Two-layer filtering system for domains and actions
6. **DeleteConfirmModal** - Confirmation dialog for note deletion
7. **NotesErrorBoundary** - Graceful error handling wrapper

### State Management

- **useNotesStore** - Central hook managing all notes state
- Optimistic updates for better UX
- Automatic IndexedDB persistence
- AI processing queue management

### Storage Layer

- **IndexedDB** for persistent local storage
- Automatic migration and versioning
- Offline-first architecture
- Type-safe storage operations

## Two-Layer Tag System

### Layer 1: Life Domains (WHERE)

- **work** - Career, professional, education
- **health** - Physical & mental wellness
- **money** - Finance, budgeting, expenses
- **people** - Relationships, social, family
- **growth** - Learning, personal development
- **life** - Home, hobbies, daily routines

### Layer 2: Action Types (WHAT)

- **task** - Actionable to-dos
- **note** - Information, reference
- **idea** - Creative thoughts
- **goal** - Long-term objectives
- **reflect** - Journal entries

## Features

### AI Integration

- Powered by GPT-4o-mini
- Automatic tag generation
- Task extraction from natural language
- Fallback patterns when AI unavailable
- Configurable via settings

### Task Management

- Checkbox syntax support: `[ ]` and `[x]`
- AI-extracted tasks
- Toggle completion status
- Task progress tracking

### Performance Optimizations

- React.memo for component memoization
- useMemo for expensive computations
- Virtual scrolling ready (useVirtualization hook)
- Lazy loading capabilities
- Efficient re-render prevention

### Keyboard Shortcuts

- `Cmd/Ctrl + Enter` - Submit note
- `Cmd/Ctrl + K` - Toggle search
- `Cmd/Ctrl + ,` - Toggle settings
- `Esc` - Close search or modal

### Error Handling

- Comprehensive error boundary
- User-friendly error messages
- Graceful degradation
- Automatic recovery options
- Development mode debugging

## Utility Functions

### Task Utilities (`utils/taskUtils.ts`)

- `extractTasksFromContent` - Parse checkbox tasks
- `extractFallbackTasks` - Natural language task detection
- `mergeTasksWithAI` - Deduplicate manual and AI tasks
- `toggleTaskAtIndex` - Safe task state updates

### Tag Patterns (`utils/tagPatterns.ts`)

- `detectTags` - Keyword-based tag detection
- `detectActionType` - Linguistic pattern matching
- `validateTags` - Type-safe tag validation
- `validateActionType` - Action type validation

### Date Utilities (`utils/dateUtils.ts`)

- `formatRelativeTime` - Human-friendly timestamps
- `isSameDay` - Date comparison
- `formatDate` - Consistent date formatting

### Type Guards (`utils/typeGuards.ts`)

- Runtime type checking
- Safe JSON parsing
- Data sanitization
- Property validation

## Configuration

### Constants (`constants.ts`)

- AI service configuration
- Storage settings
- UI configuration
- Filter definitions
- Keyboard shortcuts

### Environment Variables

- `NODE_ENV` - Development/production mode
- API endpoints configured in LLMService

## Testing

### Unit Tests

- Task utility functions
- Tag pattern matching
- Type guard validation
- Date formatting

### Integration Tests

- Component interaction
- State management
- Storage operations
- AI service integration

## Development Guidelines

### Code Style

- TypeScript strict mode
- Comprehensive JSDoc comments
- Functional components with hooks
- Immutable state updates

### Performance Best Practices

- Minimize re-renders with React.memo
- Use useCallback for stable references
- Batch state updates
- Lazy load heavy components

### Error Handling

- Always use try-catch for async operations
- Provide user-friendly error messages
- Log errors for debugging
- Implement recovery mechanisms

## Future Enhancements

### Planned Features

- Export/import functionality
- Cloud sync capabilities
- Advanced search with filters
- Markdown support
- Voice input
- Collaborative notes

### Performance Improvements

- Implement virtual scrolling for large lists
- Add service worker for offline support
- Optimize bundle size with code splitting
- Implement progressive web app features

## Troubleshooting

### Common Issues

1. **IndexedDB Access Denied**
   - Check browser privacy settings
   - Ensure not in private browsing mode
   - Clear browser storage if corrupted

2. **AI Processing Fails**
   - Verify API key configuration
   - Check network connectivity
   - Fallback patterns will activate automatically

3. **Performance Degradation**
   - Clear old entries periodically
   - Check browser console for errors
   - Disable AI if not needed

### Debug Mode

Enable development mode to see:

- Detailed error stack traces
- Component render counts
- State update logs
- Network request details

## API Reference

### useNotesStore Hook

```typescript
const {
  entries, // All note entries
  isLoading, // Loading state
  error, // Current error
  processingIds, // AI processing queue
  addEntry, // Add new note
  updateEntry, // Update existing note
  toggleTask, // Toggle task completion
  deleteEntry, // Delete note
  aiEnabled, // AI status
  toggleAI, // Toggle AI
  clearError, // Clear error state
} = useNotesStore();
```

### Entry Interface

```typescript
interface Entry {
  id: string;
  timestamp: Date;
  content: string;
  tags: TagType[];
  actionType?: ActionType;
  tasks: Task[];
  aiProcessed: boolean;
  isEdited: boolean;
}
```

## Contributing

1. Follow TypeScript best practices
2. Add tests for new features
3. Update documentation
4. Ensure accessibility compliance
5. Test across browsers

## License

Part of the Virgil project. See main project license.
