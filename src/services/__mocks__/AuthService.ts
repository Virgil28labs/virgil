/**
 * Mock AuthService for testing
 */

export const authService = {
  login: jest.fn().mockResolvedValue({
    user: {
      id: 'test-user-id',
      email: 'test@example.com',
    },
    session: {
      access_token: 'test-token',
      refresh_token: 'test-refresh',
    },
  }),
  
  signUp: jest.fn().mockResolvedValue({
    user: {
      id: 'test-user-id',
      email: 'test@example.com',
    },
    session: {
      access_token: 'test-token',
      refresh_token: 'test-refresh',
    },
  }),
  
  signOut: jest.fn().mockResolvedValue(undefined),
  
  getCurrentUser: jest.fn().mockResolvedValue({
    id: 'test-user-id',
    email: 'test@example.com',
  }),
  
  getSession: jest.fn().mockResolvedValue({
    access_token: 'test-token',
    refresh_token: 'test-refresh',
    user: {
      id: 'test-user-id',
      email: 'test@example.com',
    },
  }),
  
  refreshSession: jest.fn().mockResolvedValue({
    access_token: 'test-token',
    refresh_token: 'test-refresh',
    user: {
      id: 'test-user-id',
      email: 'test@example.com',
    },
  }),
};