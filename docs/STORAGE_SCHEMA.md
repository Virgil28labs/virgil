# Virgil Storage Schema

Last Updated: 2025-08-02

## localStorage Schema

### User & Authentication
- **`virgil-user-v1`** - Main user context store (Zustand persist)
  - Structure: `{ user: { user, profile, isAuthenticated, memberSince, preferences } }`
  - Size: ~28KB typical
  - Persisted from ContextStore

- **`virgil_email`** - Saved email for login form
  - Structure: `"user@example.com"`
  - Size: ~0.2KB
  - Used for login convenience

- **`sb-*-auth-token`** - Supabase authentication tokens
  - Multiple entries for different project refs/environments
  - Managed by Supabase SDK

### User Preferences
- **`elevationUnit`** - Elevation display preference
  - Values: `"meters"` | `"feet"`
  
- **`weatherUnit`** - Weather temperature unit
  - Values: `"celsius"` | `"fahrenheit"`

- **`notesAiEnabled`** - AI features in notes
  - Values: `"true"` | `"false"`

### App Data & Features
- **`virgil_habits`** - Habit tracker data
  - Structure: `{ habits: [...], settings: {...} }`

- **`virgil_dog_favorites`** - Favorite dog images
- **`virgil_nasa_favorites`** - Favorite NASA APOD images  
- **`giphy-favorites`** - Favorite GIFs
- **`rhythmMachineSaveSlots`** - Saved rhythm patterns
- **`virgil_selected_timezones`** - Selected timezone list

### Game Scores
- **`perfectCircleBestScore`** - Best score in circle drawing game
- **`perfectCircleAttempts`** - Number of attempts

### Cache Data (with TTL)
- **`virgil-weather-cache-v1`** - Weather data (30 min TTL)
- **`virgil-location-cache-v1`** - Location data (24 hour TTL)
- **`virgil-preferences-v1`** - User preferences (no expiry)
- **`nasa-apod-cache`** - NASA APOD API cache
- **`virgil_intent_cache`** - Intent initialization cache

### Chat & Conversation
- **`virgil-selected-model`** - Selected AI model
- **`virgil-custom-system-prompt`** - Custom system prompt
- **`virgil-window-size`** - Chat window size
- **`virgil-active-conversation`** - Active conversation state

### Camera
- **`virgil_camera_settings`** - Camera app settings
- **`virgil_camera_version`** - Camera storage version

### Navigation
- **`virgil_saved_places`** - Saved locations
- **`virgil_last_destination`** - Last searched destination

## IndexedDB Schema

### 1. VirgilContextDB
**Purpose**: Stores context snapshots every 60 seconds for 30 days

**Store: `snapshots`**
- **Key**: `id` (e.g., "snap_1234567890")
- **Indexes**: `timestamp`
- **Record Structure**:
  ```javascript
  {
    id: string,
    timestamp: number,
    time: { iso, local, timezone, partOfDay },
    user: { name, dob, username },
    env: { ip, city, lat, long, weather, deviceType, browser, os },
    sensors: { visibility, pageFocus, systemIdleTime, inputActivity, motion, battery },
    system: { pageTitle, windowVisibility, idleTime, userAgent, platform, language, screen },
    network: { online, connectionType, effectiveType },
    locationContext: { probablePlace, confidence, basedOn }
  }
  ```
- **Typical Size**: ~1KB per record
- **Retention**: 30 days (auto-cleanup)

### 2. VirgilCameraDB  
**Purpose**: Stores photos taken with camera app

**Store: `photos`**
- **Key**: `id` (UUID)
- **Indexes**: `timestamp`, `isFavorite`
- **Record Structure**:
  ```javascript
  {
    id: string,
    dataUrl: string,        // Base64 image data
    timestamp: number,
    isFavorite: boolean,
    metadata: {
      width: number,
      height: number,
      mimeType: string,
      size: number
    }
  }
  ```
- **Typical Size**: ~100KB per photo
- **Retention**: Manual deletion only

### 3. VirgilMemory (if using local mode)
**Purpose**: Chat memories and conversations

**Store: `memories`**
- **Key**: `id`
- **Indexes**: `conversationId`, `timestamp`
- **Record Structure**:
  ```javascript
  {
    id: string,
    conversationId: string,
    role: 'user' | 'assistant',
    content: string,
    timestamp: number,
    metadata: { ... }
  }
  ```
- **Typical Size**: ~512B per message
- **Note**: Only used if not using Supabase backend

## Storage Limits & Considerations

### localStorage
- **Limit**: ~5-10MB (browser dependent)
- **Current Usage**: Typically < 100KB
- **Sync**: Synchronous API, blocks main thread

### IndexedDB  
- **Limit**: Up to 50% of available disk space
- **Current Usage**: Varies (few MB to hundreds of MB with photos)
- **Async**: Non-blocking asynchronous API

### Best Practices
1. Use localStorage for small, critical settings
2. Use IndexedDB for large data (photos, logs, history)
3. Implement TTL for cached data
4. Clean up old data regularly
5. Handle quota exceeded errors gracefully