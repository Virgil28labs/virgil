// context.types.ts

export type Context = {
  time: {
    iso: string;           // e.g. "2025-08-02T20:12:00.000Z"
    local: string;         // e.g. "Saturday, August 2, 2025, 1:12 PM"
    timezone: string;      // e.g. "America/Los_Angeles"
    partOfDay: string;     // e.g. "afternoon"
  };

  user: {
    name: string;          // e.g. "Ben"
    dob: string;           // e.g. "28-11-1982"
    username: string;      // e.g. "Ben28" - Generated display username
  };

  env: {
    ip: string;            // e.g. "76.33.141.122"
    city: string;          // e.g. "Los Angeles"
    lat: number;           // e.g. 34.0451
    long: number;          // e.g. -118.4422
    weather: string;       // e.g. "Clear, 82°F"
    deviceType: string;    // e.g. "desktop"
    browser: string;       // e.g. "Chrome"
    os: string;            // e.g. "macOS"
  };

  sensors?: {
    motion?: 'still' | 'moving' | 'unknown'; // Inferred from idle time + tab visibility
    battery?: {
      level: number;               // 0.0 to 1.0 (navigator.getBattery)
      charging: boolean;
    };
    inputActivity?: {
      mouse: boolean;             // Mouse movement in last X seconds
      keyboard: boolean;          // Keypress in last X seconds
      lastInteraction: number;    // Timestamp (ms) of last input
    };
    visibility?: 'visible' | 'hidden'; // From document.visibilityState
    pageFocus?: boolean;           // From window.onfocus / onblur
    scrollDepth?: number;          // % scrolled down the page (0–100)
    systemIdleTime?: number;       // Seconds since any interaction (mouse/keyboard/scroll)
  };

  system?: {
    activeApp?: string;            // Optional, via app context
    pageTitle?: string;            // document.title
    windowVisibility: 'visible' | 'hidden'; // document.visibilityState
    idleTime: number;              // Time since last user activity (seconds)
    userAgent: string;             // navigator.userAgent
    platform: string;             // navigator.platform
    language: string;             // navigator.language
    screen: {
      width: number;
      height: number;
      pixelDepth: number;
    };
  };

  network?: {
    online: boolean;              // navigator.onLine
    connectionType?: string;     // navigator.connection.type
    effectiveType?: string;      // navigator.connection.effectiveType
  };

  chat?: {
    lastTopics: string[];         // e.g. ["sleep", "focus", "Virgil project"]
    lastInteraction: string;      // ISO timestamp of last chat message
    lastSpokenAgo: string;        // e.g. "3 minutes ago"
    currentIntent?: string;       // e.g. "ask", "vent", "journal"
  };

  locationConfidence?: {
    city: string;                  // e.g. "Los Angeles"
    lat: number;
    long: number;
    source: 'geolocation' | 'ip' | 'inferred';
    confidence: number;           // 0.0 to 1.0
    confirmedBy: string[];        // e.g. ["ip", "connectionType", "routine"]
  };

  locationContext?: {
    probablePlace: 'Home' | 'Work' | 'Travel' | 'Unknown';
    confidence: number;           // 0.0 to 1.0
    basedOn: string[];            // e.g. ["timeOfDay", "IP", "history"]
  };
};