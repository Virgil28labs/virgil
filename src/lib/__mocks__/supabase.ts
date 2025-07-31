export const supabase = {
  auth: {
    getSession: jest.fn().mockResolvedValue({
      data: { session: null },
      error: null,
    }),
    getUser: jest.fn().mockResolvedValue({
      data: { 
        user: {
          id: 'test-user-id',
          email: 'test@example.com',
        },
      },
      error: null,
    }),
    signInWithPassword: jest.fn().mockResolvedValue({
      data: {
        user: {
          id: 'test-user-id',
          email: 'test@example.com',
        },
        session: {
          access_token: 'test-token',
          refresh_token: 'test-refresh',
        },
      },
      error: null,
    }),
    signUp: jest.fn().mockResolvedValue({
      data: {
        user: {
          id: 'test-user-id',
          email: 'test@example.com',
        },
        session: {
          access_token: 'test-token',
          refresh_token: 'test-refresh',
        },
      },
      error: null,
    }),
    signOut: jest.fn().mockResolvedValue({ error: null }),
    refreshSession: jest.fn().mockResolvedValue({
      data: { 
        session: {
          access_token: 'test-token',
          refresh_token: 'test-refresh',
        },
      },
      error: null,
    }),
    onAuthStateChange: jest.fn(() => {
      // Return a mock subscription
      return {
        data: {
          subscription: {
            unsubscribe: jest.fn(),
          },
        },
      };
    }),
  },
  from: jest.fn(() => ({
    select: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue({ data: null, error: null }),
    limit: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
  })),
};
