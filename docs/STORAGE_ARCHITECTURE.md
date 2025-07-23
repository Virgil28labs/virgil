# Virgil Storage Architecture

This document provides a comprehensive overview of all data storage locations in the Virgil application.

## 🌐 Cloud Storage (Supabase)

### Authentication & User Data
**Location**: Supabase Cloud (auth.users table)  
**Managed by**: 
- `/src/lib/supabase.ts` - Supabase client
- `/src/contexts/AuthContext.tsx` - Authentication management
- `/src/hooks/useUserProfile.ts` - Profile management

**Data Stored**:
```typescript
// In auth.users.user_metadata
{
  nickname: string
  fullName: string
  dateOfBirth: string
  phone: string
  gender: string
  maritalStatus: string
  uniqueId: string
  address: {
    street: string
    city: string
    state: string
    zip: string
    country: string
  }
  email: string (also in auth.users.email)
  name: string (legacy field)
}
```

**Persistence**: Permanent until user deletion  
**Capacity**: No specific limits  
**Access**: Requires authentication token

## 💾 IndexedDB Storage

### 1. Photo Storage
**Database**: `VirgilCameraDB`  
**Store**: `photos`  
**Managed by**: `/src/components/camera/utils/photoStorage.ts`

**Data Structure**:
```typescript
SavedPhoto {
  id: string
  dataUrl: string (base64 image)
  timestamp: number
  isFavorite: boolean
  size: number (bytes)
  width?: number
  height?: number
  metadata?: {
    location?: string
    weather?: string
    notes?: string
  }
}
```

**Limits**:
- Max storage: 50MB (configurable)
- Auto-cleanup: Photos older than 30 days (except favorites)
- Compression: 0.8 quality JPEG

### 2. Chat Memory
**Database**: `VirgilMemory`  
**Stores**: `conversations`, `memories`  
**Managed by**: `/src/services/MemoryService.ts`

**Data Structure**:
```typescript
// conversations store
{
  id: string
  messages: ChatMessage[]
  timestamp: number
  context?: string
}

// memories store (marked important)
{
  id: string
  content: string
  timestamp: number
  context?: string
}
```

**Limits**:
- Conversations: 30 items with 30-day TTL
- Memories: No limit (user-marked important items)

### 3. Notes Storage
**Database**: `NotesDB`  
**Store**: `notes`  
**Managed by**: `/src/components/notes/storage.ts`

**Data Structure**:
```typescript
Note {
  id: string
  content: string
  timestamp: number
  createdAt: Date
  updatedAt: Date
  isPinned: boolean
  tags: string[]
  sentiment?: 'positive' | 'negative' | 'neutral'
}
```

**Limits**: No specific limits

## 🗄️ localStorage

### 1. Habits/Streaks
**Key**: `virgil-habits`  
**Managed by**: `/src/hooks/useHabits.ts`

**Data Structure**:
```typescript
Habit {
  id: string
  name: string
  emoji: string
  dates: string[] // ['YYYY-MM-DD', ...]
  createdAt: number
  color?: string
}
```

### 2. Favorites Collections
**Keys**: 
- `dogFavorites` - Dog gallery favorites
- `nasaFavorites` - NASA APOD favorites  
- `giphyFavorites` - Giphy favorites

**Managed by**: Various component-specific hooks

**Data Structure**:
```typescript
// Dog favorites
{ url: string, timestamp: number }[]

// NASA favorites
{ 
  date: string
  url: string
  hdurl?: string
  title: string
  explanation: string
  timestamp: number
}[]

// Giphy favorites
{
  id: string
  title: string
  url: string
  preview: string
  timestamp: number
}[]
```

### 3. App Settings & Preferences

**Weather**:
- `weatherData` - Cached weather data
- `weatherUnit` - 'celsius' | 'fahrenheit'
- `weatherLastUpdated` - Timestamp

**Camera**:
- `virgil_camera_settings` - Camera preferences
- `virgil_camera_version` - Migration version

**UI Preferences**:
- `elevationUnit` - 'meters' | 'feet'
- `rhythmVolume` - 0-100
- `timezones` - Selected timezone list

**Virgil Chatbot**:
- `virgil-selected-model` - AI model selection
- `virgil-custom-system-prompt` - Custom prompt
- `virgil-active-conversation` - Current chat session

**Pomodoro Timer**:
- `pomodoro-state` - Timer state
- `pomodoro-settings` - Timer configuration

## 🧠 In-Memory/Session Storage

### 1. LLM Response Cache
**Location**: Memory (WeakMap)  
**Managed by**: `/src/services/llm/utils/cache.ts`

**Structure**:
```typescript
WeakMap<CacheKey, {
  data: any
  timestamp: number
  ttl: number
}>
```

**Limits**:
- Default TTL: 5 minutes
- Garbage collected when references are lost

### 2. Request Deduplication
**Location**: Memory (Map)  
**Managed by**: `/src/lib/requestDeduplication.ts`

**Purpose**: Prevents duplicate API calls for identical requests

### 3. Dashboard Context
**Location**: Memory (class instance)  
**Managed by**: `/src/services/DashboardContextService.ts`

**Real-time Data**:
- Current time/date
- Location data
- Weather data  
- User activity
- Device information
- Active components

### 4. App Adapters State
**Location**: Memory  
**Managed by**: `/src/services/DashboardAppService.ts`

**Tracks**: Real-time state of all dashboard apps (notes count, active timers, etc.)

## 📊 Storage Summary

| Storage Type | Primary Use | Persistence | Size Limits | Sync |
|-------------|------------|-------------|-------------|------|
| **Supabase** | User profiles, auth | Permanent | Unlimited | Yes |
| **IndexedDB** | Photos, notes, chat | Semi-permanent | ~50-100MB per DB | No |
| **localStorage** | Settings, favorites | Permanent | ~5-10MB total | No |
| **Memory** | Cache, active state | Session only | Browser RAM | No |

## 🔄 Data Flow

1. **User Profile**: Supabase → Memory → UI Components
2. **Photos**: Camera → IndexedDB → Gallery UI
3. **Chat**: User Input → Memory → API → IndexedDB (on close)
4. **Settings**: UI → localStorage → Memory (on load)
5. **Device Info**: Browser APIs → Memory → Context Service → Virgil

## 🔒 Privacy & Security

- **Local First**: Most data stays on device (photos, notes, chat history)
- **Cloud Minimal**: Only authentication and profile in cloud
- **No Analytics**: No tracking or analytics data collected
- **User Control**: Users can clear any local data
- **Encryption**: Supabase handles auth encryption, local data unencrypted