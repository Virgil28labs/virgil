# Notes App - Architecture & Documentation

A minimalist, AI-powered notes, journal, and tasks application built for Virgil. This app provides a zero-friction capture experience with intelligent organization powered by OpenAI.

## Table of Contents

1. [Overview](#overview)
2. [Features](#features)
3. [Architecture](#architecture)
4. [Components](#components)
5. [Data Flow](#data-flow)
6. [Storage](#storage)
7. [AI Integration](#ai-integration)
8. [Performance Optimizations](#performance-optimizations)
9. [Accessibility](#accessibility)
10. [Future Enhancements](#future-enhancements)

## Overview

The Notes app is designed around the principle of "capture first, organize later." Users can quickly capture thoughts, tasks, and ideas in a single input field, while AI handles the organization through automatic tagging and task extraction.

### Design Philosophy

- **Minimalist**: Clean, distraction-free interface
- **Zero-friction**: Single input, no folders or complex hierarchies
- **AI-powered**: Automatic tagging and task extraction
- **Local-first**: All data stored locally in IndexedDB
- **Performant**: Optimistic updates and React optimizations

## Features

### Core Features

- ✅ Single input field with rotating placeholders
- ✅ AI-powered auto-tagging (work, personal, journal, task, idea, health, etc.)
- ✅ Automatic task extraction from natural language
- ✅ Checkbox support in notes (`[ ]` syntax)
- ✅ Tag-based filtering
- ✅ Full-text search
- ✅ Inline editing
- ✅ Delete functionality with confirmation
- ✅ Keyboard shortcuts (⌘+Enter, ⌘K, ⌘,)
- ✅ Persistent local storage (IndexedDB)
- ✅ Responsive design

### AI Features

- Automatic tag generation based on content
- Task extraction from natural language
- Mood detection (positive, neutral, negative)
- Graceful fallback when AI is unavailable
- Optional AI processing (can be disabled)

## Architecture

```
src/components/notes/
├── NotesEmojiButton.tsx    # Entry point - emoji button launcher
├── NotesApp.tsx            # Main app container and state coordination
├── NotesInput.tsx          # Smart input field with placeholders
├── NotesFilter.tsx         # Tag filters and search functionality
├── NotesList.tsx           # List container for entries
├── NotesEntry.tsx          # Individual note entry component
├── DeleteConfirmModal.tsx  # Custom delete confirmation dialog
├── useNotesStore.ts        # Main state management hook
├── storage.ts              # IndexedDB persistence layer
├── aiService.ts            # OpenAI integration service
├── types.ts                # TypeScript type definitions
└── *.css                   # Component-specific styles
```

### Component Hierarchy

```
NotesEmojiButton
  └── NotesApp (Modal)
      ├── NotesInput
      ├── NotesFilter
      └── NotesList
          └── NotesEntry[]
              └── DeleteConfirmModal
```

## Components

### NotesEmojiButton

Entry point component that renders the emoji button. Uses React.lazy for code splitting.

### NotesApp

Main container component that:

- Manages modal state
- Coordinates between input, filter, and list
- Handles keyboard shortcuts
- Displays loading/error states
- Manages settings

### NotesInput

Smart input component with:

- Auto-resizing textarea
- Rotating placeholder text for inspiration
- Keyboard shortcut support (⌘+Enter)
- Character limit (5000)

### NotesFilter

Filter bar with:

- Tag-based filtering buttons
- Search functionality
- Keyboard navigation support
- ARIA labels for accessibility

### NotesEntry

Individual note display with:

- Relative time display ("2 hours ago")
- Tag pills
- Checkbox rendering
- Edit mode
- Delete functionality
- AI processing indicator
- React.memo optimization

### useNotesStore

Central state management hook providing:

- Entry CRUD operations
- AI processing coordination
- Error handling
- Optimistic updates
- Loading states

## Data Flow

### Creating a Note

1. User types in NotesInput
2. Submits with ⌘+Enter
3. useNotesStore creates entry with optimistic update
4. Entry saved to IndexedDB
5. AI processing triggered (if enabled)
6. UI updates when AI completes

### Editing a Note

1. User clicks edit button
2. NotesEntry switches to edit mode
3. User modifies content
4. Save triggers update in useNotesStore
5. Optimistic update applied
6. IndexedDB updated

### AI Processing Flow

1. New entry created
2. shouldProcessContent validates content
3. processEntryWithAI called asynchronously
4. OpenAI API analyzes content
5. Tags and tasks extracted
6. Entry updated with AI data
7. Fallback extraction if AI fails

## Storage

### IndexedDB Schema

Database: `VirgilNotesDB`
Store: `entries`

```typescript
Entry {
  id: string              // UUID
  timestamp: Date         // ISO timestamp
  content: string         // Raw note content
  tags: string[]          // AI or fallback generated
  tasks: Task[]           // Extracted tasks
  aiProcessed: boolean    // AI processing complete
  isEdited: boolean       // Has been edited
}

Task {
  text: string           // Task description
  completed: boolean     // Completion status
  extracted: boolean     // AI-extracted vs manual
}
```

### Storage Operations

- `getAllEntries()`: Retrieve all notes
- `addEntry()`: Create new note
- `updateEntry()`: Modify existing note
- `deleteEntry()`: Remove note
- `searchEntries()`: Full-text search
- `getEntriesByTag()`: Filter by tag
- `getEntriesByDateRange()`: Date filtering

## AI Integration

### OpenAI Configuration

- Model: GPT-4o-mini
- Temperature: 0.3 (consistent output)
- Max tokens: 200
- Retry logic with exponential backoff

### Prompt Engineering

The AI is instructed to:

1. Extract clear action items
2. Generate 2-3 relevant tags
3. Detect mood if expressed
4. Use specific tags for health, work, etc.

### Fallback System

When AI is unavailable:

- Keyword-based tag generation
- Pattern matching for task extraction
- Maintains core functionality offline

## Performance Optimizations

### React Optimizations

- React.memo on NotesEntry component
- useMemo for expensive computations
- useCallback for event handlers
- Lazy loading of main app

### State Management

- Optimistic updates for instant feedback
- Batch state updates
- Minimal re-renders

### Storage Optimizations

- Singleton IndexedDB instance
- Cached database connection
- Efficient queries with indexes

### AI Processing

- Asynchronous processing
- Non-blocking UI updates
- Retry logic for transient failures
- Content validation before processing

## Accessibility

### Keyboard Navigation

- Full keyboard support
- Tab navigation
- Escape to close modals
- Shortcuts documented in UI

### Screen Reader Support

- Semantic HTML
- ARIA labels and descriptions
- Role attributes
- Live regions for updates

### Visual Design

- High contrast colors
- Clear focus indicators
- Readable font sizes
- Responsive layout

## Error Handling

### User-Friendly Messages

- Storage errors: "Failed to save your note"
- Network errors: "AI processing unavailable"
- Clear recovery actions

### Error Recovery

- Optimistic update rollback
- Graceful degradation
- Retry mechanisms
- Fallback strategies

## Future Enhancements

### Planned Features

1. **Export functionality**: Download notes as markdown/JSON
2. **Bulk operations**: Select and delete/tag multiple notes
3. **Advanced search**: Search within date ranges, by mood
4. **Rich text**: Basic markdown support
5. **Attachments**: Image/file support
6. **Sync**: Optional cloud backup
7. **Templates**: Quick templates for common note types
8. **Analytics**: Personal insights dashboard

### Performance Improvements

1. **Virtual scrolling**: For large note collections
2. **Web Workers**: Offload AI processing
3. **Service Worker**: Offline support
4. **Compression**: Reduce storage usage

### AI Enhancements

1. **Smart suggestions**: Context-aware prompts
2. **Summarization**: Daily/weekly summaries
3. **Sentiment tracking**: Mood trends over time
4. **Custom models**: Fine-tuned for personal use

## Testing Strategy

### Unit Tests Needed

- Storage operations
- AI service with mocks
- Tag/task extraction logic
- Date formatting utilities

### Integration Tests

- Full CRUD workflows
- AI processing pipeline
- Error recovery scenarios
- Keyboard shortcuts

### E2E Tests

- Note creation flow
- Search and filter
- Edit/delete operations
- Settings management

## Code Quality

### TypeScript

- Strict mode enabled
- Comprehensive type definitions
- No any types
- Error types for better handling

### Documentation

- JSDoc comments on all public APIs
- Inline comments for complex logic
- README for architecture
- Component documentation

### Patterns

- Composition over inheritance
- Custom hooks for logic reuse
- Optimistic updates
- Graceful degradation

## Contributing

When adding features:

1. Follow existing patterns
2. Add TypeScript types
3. Include error handling
4. Consider accessibility
5. Add documentation
6. Test edge cases

## Performance Metrics

Target metrics:

- Initial load: <3s on 3G
- Bundle size: <200KB
- Time to interactive: <1s
- AI processing: <2s average
- Search results: <100ms
