/**
 * Constants for the RaccoonMascot component
 */

// Physics constants for raccoon movement
export const PHYSICS_CONSTANTS = {
  GROUND_Y: window.innerHeight - 100,
  GRAVITY: 1.2,
  JUMP_FORCE: 20,
  MOVE_SPEED: 8,
  MAX_JUMPS: 3,
  WALL_STICK_FORCE: 0.3,
  CHARGE_MAX: 1.5,
  CHARGE_RATE: 0.025, // Increased from 0.015 for 60% faster charging (~1s to full charge)
  // Smooth movement constants
  ACCELERATION: 2.0,      // How fast to speed up
  FRICTION: 0.8,          // How fast to slow down (ground)
  AIR_CONTROL: 0.3,       // Reduced control multiplier when in air
  TERMINAL_VELOCITY: 25,  // Maximum fall speed
} as const;

// Emoji arrays
export const RACCOON_EMOJIS = ['🦝', '🐾', '🍃', '🌰', '🗑️', '🌙', '🐻', '🍯'] as const;
export const WEATHER_EMOJIS = ['⛅', '🌤️', '🌧️', '🌦️', '☀️', '🌩️', '❄️', '🌪️', '🌈'] as const;

// UI selectors for collision detection
// Using data attributes to support CSS modules
export const UI_SELECTORS = [
  '[data-raccoon-collision="virgil-logo"]', // Virgil "V" logo text
  '[data-raccoon-collision="time"]', // Time display
  '[data-raccoon-collision="date"]', // Date display
  '[data-raccoon-collision="day"]', // Day display
  '[data-raccoon-collision="user-name"]', // User name text
  '[data-raccoon-collision="user-email"]', // Email text
  '[data-raccoon-collision="street-address"]', // Street address
  '[data-raccoon-collision="ip-address"]', // IP address text
  '[data-raccoon-collision="elevation"]', // Elevation text
  '[data-raccoon-collision="weather-widget"]', // Weather display widget
  '[data-raccoon-collision="power-button"]', // Power button
  '[data-raccoon-collision="virgil-chatbot-bubble"]', // Chatbot floating button
  '[data-raccoon-collision="emoji-button-interactive"]', // All emoji buttons (camera, pomodoro, notes, etc.)
] as const;

// Animation timings
export const ANIMATION_TIMINGS = {
  SLEEP_TIMEOUT: 10000, // 10 seconds
  SLEEP_EMOJI_INTERVAL: 8000, // 8 seconds - less frequent for subtlety
  SPARKLE_DURATION: 1000, // 1 second
  PICKUP_DROP_DELAY: 2000, // 2 seconds
  TARGET_FPS: 60,
  DOUBLE_CLICK_DELAY: 300, // 300ms for double click detection
} as const;

// Timing constants (alias for backwards compatibility)
export const TIMING_CONSTANTS = ANIMATION_TIMINGS;

// Raccoon dimensions
export const RACCOON_SIZE = {
  WIDTH: 80,
  HEIGHT: 80,
} as const;

// Visual effect constants
export const VISUAL_EFFECTS = {
  SQUASH_DURATION: 200, // Squash effect duration
  DUST_PARTICLE_DURATION: 500, // Dust particle fade out
  DUST_CREATION_LIMIT: 100, // Minimum ms between dust particles
  TRAIL_SPEED_THRESHOLD: 10, // Speed needed for trail effect
  TRAIL_MAX_POSITIONS: 3, // Maximum trail positions
  SHADOW_HEIGHT: 20,
  SHADOW_OFFSET: 10,
  LANDING_VELOCITY_THRESHOLD: 5, // Velocity for squash effect
} as const;

// UI constants
export const UI_CONSTANTS = {
  UPDATE_INTERVAL: 5000, // UI element detection interval
  CACHE_DURATION: 1000, // UI cache validity duration
  CHARGE_BAR_WIDTH: 70,
  CHARGE_BAR_HEIGHT: 10,
  CHARGE_BAR_OFFSET: 20,
  INDICATOR_OFFSET: 15,
  INDICATOR_OFFSET_WALL: 45,
  COUNTER_OFFSET: 30,
} as const;

// Pickup constants  
export const PICKUP_CONSTANTS = {
  PICKUP_DURATION: 2000, // Time before drop
  PICKUP_SCALE: 1.2,
  PICKUP_ROTATE: 5, // degrees
  BOUNCE_SCALE: 1.3,
  BOUNCE_ROTATE: 10, // degrees
} as const;

// Collision constants
export const COLLISION_CONSTANTS = {
  CEILING_CHECK_OFFSET: 20,
  TEXT_WIDTH_MULTIPLIER: 0.6, // Text width estimation
  TEXT_BASELINE_MULTIPLIER: 0.8,
  GROUND_OFFSET: 100, // Distance from bottom
} as const;

// Animation constants
export const ANIMATION_CONSTANTS = {
  IDLE_DURATION: 2000, // 2s for idle animation
  SITTING_DURATION: 3000, // 3s for sitting animation
  RUNNING_DURATION: 300, // 0.3s for running animation
  SLEEPING_BREATH_DURATION: 3000, // 3s for sleeping animation
  PULSE_GLOW_DURATION: 1000, // 1s for charge glow
  FLOATING_ZZZ_DURATION: 3000, // 3s for zzz float
  CHARGE_UPDATE_INTERVAL: 16, // ~60fps for charge update
} as const;

// Sparkle positions
export const SPARKLE_POSITIONS = [
  { top: 0, left: '50%', size: 20, emoji: '✨', delay: 0 },
  { top: '20%', left: '20%', size: 16, emoji: '⭐', delay: 0.2 },
  { top: '30%', right: '20%', size: 18, emoji: '💫', delay: 0.4 },
  { bottom: '20%', left: '30%', size: 14, emoji: '✨', delay: 0.6 },
  { bottom: '10%', right: '30%', size: 16, emoji: '⭐', delay: 0.8 },
] as const;
