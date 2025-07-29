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
export const UI_SELECTORS = [
  '.virgil-logo', // Virgil "V" logo text
  '.datetime-display .time', // Time display
  '.datetime-display .date', // Date display
  '.datetime-display .day', // Day display
  '.user-name', // User name text
  '.user-email', // Email text
  '.street-address', // Street address
  '.ip-address', // IP address text
  '.elevation', // Elevation text
  '.weather-widget', // Weather display widget
  '.power-button', // Power button
  '.virgil-chatbot-bubble', // Chatbot floating button
  '.emoji-button-interactive', // All emoji buttons (camera, pomodoro, notes, etc.)
] as const;

// Animation timings
export const ANIMATION_TIMINGS = {
  SLEEP_TIMEOUT: 10000, // 10 seconds
  SLEEP_EMOJI_INTERVAL: 2500, // 2.5 seconds
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
