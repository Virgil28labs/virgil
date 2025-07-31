/**
 * Centralized timing constants for the application
 * All durations are in milliseconds
 */

// Basic time units
export const MS_PER_SECOND = 1000;
export const MS_PER_MINUTE = 60 * MS_PER_SECOND;
export const MS_PER_HOUR = 60 * MS_PER_MINUTE;
export const MS_PER_DAY = 24 * MS_PER_HOUR;
export const MS_PER_WEEK = 7 * MS_PER_DAY;

// Network timeouts
export const NETWORK_TIMEOUT_SHORT = 5 * MS_PER_SECOND; // 5s - for quick operations
export const NETWORK_TIMEOUT_MEDIUM = 10 * MS_PER_SECOND; // 10s - standard timeout
export const NETWORK_TIMEOUT_LONG = 30 * MS_PER_SECOND; // 30s - for file uploads/downloads

// Cache durations
export const CACHE_DURATION_SHORT = 5 * MS_PER_SECOND; // 5s - for frequently changing data
export const CACHE_DURATION_MEDIUM = 30 * MS_PER_SECOND; // 30s - standard cache
export const CACHE_DURATION_LONG = 60 * MS_PER_SECOND; // 60s - for stable data
export const CACHE_DURATION_EXTENDED = 5 * MS_PER_MINUTE; // 5m - for rarely changing data
export const CACHE_DURATION_HOUR = MS_PER_HOUR; // 1h - for very stable data

// UI/Animation durations
export const ANIMATION_DURATION_FAST = 200; // 200ms
export const ANIMATION_DURATION_NORMAL = 300; // 300ms
export const ANIMATION_DURATION_SLOW = 500; // 500ms
export const HOVER_DELAY = 500; // 500ms - standard hover delay
export const TOAST_DURATION_DEFAULT = 5 * MS_PER_SECOND; // 5s - default toast notification

// Polling/Update intervals
export const POLLING_INTERVAL_FAST = MS_PER_SECOND; // 1s - for real-time updates
export const POLLING_INTERVAL_NORMAL = 5 * MS_PER_SECOND; // 5s - standard polling
export const POLLING_INTERVAL_SLOW = MS_PER_MINUTE; // 1m - for infrequent checks

// Retry/Debounce delays
export const RETRY_DELAY_SHORT = MS_PER_SECOND; // 1s
export const RETRY_DELAY_MEDIUM = 5 * MS_PER_SECOND; // 5s
export const RETRY_DELAY_LONG = MS_PER_MINUTE; // 1m
export const DEBOUNCE_DELAY = 300; // 300ms - standard debounce
export const THROTTLE_DELAY = 100; // 100ms - standard throttle

// Service-specific timeouts
export const LOCATION_TIMEOUT_FAST = 5 * MS_PER_SECOND; // 5s - quick location check
export const LOCATION_TIMEOUT_STANDARD = 10 * MS_PER_SECOND; // 10s - standard location
export const LOCATION_CACHE_DURATION = 5 * MS_PER_MINUTE; // 5m - location cache

// Raccoon animation timings
export const RACCOON_SLEEP_TIMEOUT = 10 * MS_PER_SECOND; // 10s - before sleeping
export const RACCOON_SPARKLE_DURATION = MS_PER_SECOND; // 1s
export const RACCOON_PICKUP_DROP_DELAY = 2 * MS_PER_SECOND; // 2s
export const RACCOON_UPDATE_INTERVAL = 5 * MS_PER_SECOND; // 5s - UI detection

// Memory service timings
export const MEMORY_CONTEXT_CACHE_DURATION = 30 * MS_PER_SECOND; // 30s
export const CONFIDENCE_CACHE_TTL = MS_PER_MINUTE; // 60s
export const RECENT_USE_THRESHOLD = 5 * MS_PER_MINUTE; // 5m - for context scoring
export const CONFIDENCE_CACHE_MAX_SIZE = 100; // Max cache entries
export const MAX_QUERY_LOG_LENGTH = 50; // Max chars for query logging

// Vector memory service timings
export const MIN_MESSAGE_LENGTH = 50; // Minimum chars to store as vector
export const CONTEXT_SEARCH_LIMIT = 5; // Number of memories to retrieve for context
export const VECTOR_CONFIDENCE_CACHE_TTL = 5 * MS_PER_MINUTE; // 5m
export const VECTOR_CONFIDENCE_CACHE_MAX_SIZE = 1000; // Max entries to prevent memory growth
export const THREAD_GAP_THRESHOLD = 30 * MS_PER_MINUTE; // 30m - for conversation threading
export const MAX_CONTENT_PREVIEW_LENGTH = 100; // Max chars for content preview
export const HOURLY_CHECK_INTERVAL = MS_PER_HOUR; // 1h - for scheduled tasks

// Error handling
export const ERROR_WINDOW_DURATION = MS_PER_MINUTE; // 1m - for rate limiting errors
export const CIRCUIT_BREAKER_TIMEOUT = MS_PER_MINUTE; // 60s - circuit breaker reset

// Weather service
export const WEATHER_CACHE_DURATION = 10 * MS_PER_MINUTE; // 10m
export const WEATHER_RETRY_DELAY = MS_PER_SECOND; // 1s initial retry

// Cleanup intervals
export const CLEANUP_INTERVAL_SHORT = 10 * MS_PER_SECOND; // 10s - for request dedup
export const CLEANUP_INTERVAL_LONG = MS_PER_HOUR; // 1h - for old data cleanup