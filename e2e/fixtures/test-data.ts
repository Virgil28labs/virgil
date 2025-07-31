/**
 * E2E Test Data Fixtures
 * 
 * Centralized test data for consistent E2E testing across
 * authentication, chat, and dashboard functionality.
 */

export const TestUsers = {
  validUser: {
    email: 'test@example.com',
    password: 'TestPassword123!',
    displayName: 'Test User',
  },
  
  invalidUser: {
    email: 'invalid@example.com',
    password: 'wrongpassword',
  },
  
  newUser: {
    email: 'newuser@example.com',
    password: 'NewUserPass123!',
    displayName: 'New Test User',
  },
} as const;

export const TestMessages = {
  simple: 'Hello, how are you today?',
  complex: 'Can you help me analyze the weather data and create a summary of recent trends?',
  multiIntent: 'Show me my notes and also check the weather please',
  withSpecialChars: 'Test message with émojis 🚀 and spéciäl characters!',
  longMessage: 'This is a very long message that tests the chat system\'s ability to handle extensive text input. '.repeat(5),
  codeSnippet: `Here's some code:
\`\`\`javascript
function test() {
  console.log("Hello World");
  return true;
}
\`\`\``,
} as const;

export const TestData = {
  notes: [
    {
      title: 'Test Note 1',
      content: 'This is the first test note for E2E testing.',
      tags: ['test', 'e2e'],
    },
    {
      title: 'Meeting Notes',
      content: 'Important meeting notes with action items.',
      tags: ['meeting', 'work'],
    },
    {
      title: 'Shopping List',
      content: '- Milk\n- Bread\n- Eggs\n- Apples',
      tags: ['shopping', 'personal'],
    },
  ],
  
  photos: [
    {
      name: 'test-photo-1.jpg',
      description: 'Test photo for camera functionality',
    },
    {
      name: 'test-photo-2.jpg', 
      description: 'Another test photo',
    },
  ],
  
  rhythmPatterns: [
    {
      name: 'Techno Beat',
      description: 'Classic 4/4 techno pattern',
      pattern: [
        [true, false, false, false, true, false, false, false],
        [false, false, true, false, false, false, true, false],
      ],
    },
  ],
} as const;

export const ApiResponses = {
  authSuccess: {
    success: true,
    user: {
      id: 'test-user-id',
      email: TestUsers.validUser.email,
      displayName: TestUsers.validUser.displayName,
    },
    token: 'mock-jwt-token',
  },
  
  authError: {
    success: false,
    error: 'Invalid credentials',
  },
  
  chatResponse: {
    success: true,
    message: {
      id: 'chat-response-id',
      role: 'assistant',
      content: 'This is a test response from the chat service.',
      timestamp: new Date().toISOString(),
      confidence: 0.95,
    },
  },
  
  weatherData: {
    location: 'Test City',
    temperature: 22,
    condition: 'Sunny',
    humidity: 65,
    windSpeed: 10,
  },
  
  nasaApod: {
    title: 'Test Astronomy Photo',
    explanation: 'This is a test astronomy photo for E2E testing.',
    url: 'https://example.com/test-photo.jpg',
    date: '2024-01-20',
  },
} as const;

export const Selectors = {
  // Authentication
  auth: {
    loginForm: '[data-testid="login-form"]',
    emailInput: '[data-testid="email-input"]',
    passwordInput: '[data-testid="password-input"]',
    loginButton: '[data-testid="login-button"]',
    registerButton: '[data-testid="register-button"]',
    logoutButton: '[data-testid="logout-button"]',
    errorMessage: '[data-testid="auth-error"]',
  },
  
  // Dashboard
  dashboard: {
    container: '[data-testid="dashboard-container"]',
    appGrid: '[data-testid="app-grid"]',
    appCard: '[data-testid="app-card"]',
    weatherCard: '[data-testid="weather-card"]',
    notesCard: '[data-testid="notes-card"]',
    nasaCard: '[data-testid="nasa-card"]',
  },
  
  // Chat
  chat: {
    container: '[data-testid="chat-container"]',
    messageInput: '[data-testid="message-input"]',
    sendButton: '[data-testid="send-button"]',
    messageList: '[data-testid="message-list"]',
    message: '[data-testid="chat-message"]',
    loadingIndicator: '[data-testid="chat-loading"]',
    clearButton: '[data-testid="clear-chat"]',
  },
  
  // Navigation
  nav: {
    menuButton: '[data-testid="menu-button"]',
    profileButton: '[data-testid="profile-button"]',
    settingsButton: '[data-testid="settings-button"]',
  },
  
  // Common
  common: {
    loading: '[data-testid="loading"]',
    error: '[data-testid="error-message"]',
    modal: '[data-testid="modal"]',
    toast: '[data-testid="toast"]',
  },
} as const;

export const URLs = {
  home: '/',
  login: '/login',
  register: '/register',
  dashboard: '/dashboard',
  chat: '/chat',
  profile: '/profile',
  settings: '/settings',
} as const;