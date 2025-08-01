/**
 * AuthContext Tests
 * 
 * Tests the authentication context provider including:
 * - Initial session loading and user state
 * - Authentication state changes
 * - Sign out functionality
 * - User refresh functionality
 * - Error handling and logging
 * - Loading states
 * - Context value memoization
 */

import { render, screen, waitFor, act } from '@testing-library/react';
import { AuthProvider } from '../AuthContext';
import { AuthContext } from '../AuthContextInstance';
import { authService } from '../../services/AuthService';
import { supabase } from '../../lib/supabase';
import { logger } from '../../lib/logger';
import { useContext } from 'react';
import type { User as SupabaseUser } from '@supabase/supabase-js';

// Mock dependencies
jest.mock('../../services/AuthService');
jest.mock('../../lib/supabase');
jest.mock('../../lib/logger', () => ({
  logger: {
    error: jest.fn(),
  },
}));

const mockAuthService = authService as jest.Mocked<typeof authService>;
const mockSupabase = supabase as jest.Mocked<typeof supabase>;
const mockLogger = logger as jest.Mocked<typeof logger>;

// Test component to access context
const TestComponent = () => {
  const context = useContext(AuthContext);
  
  if (!context) {
    return <div>No context</div>;
  }

  const { user, loading, signOut, refreshUser } = context;

  return (
    <div>
      <div data-testid="loading">{loading ? 'loading' : 'not-loading'}</div>
      <div data-testid="user">{user ? user.email : 'no-user'}</div>
      <button data-testid="sign-out" onClick={signOut}>
        Sign Out
      </button>
      <button data-testid="refresh-user" onClick={refreshUser}>
        Refresh User
      </button>
    </div>
  );
};

// Mock user data
const mockUser: SupabaseUser = {
  id: 'user-123',
  email: 'test@example.com',
  aud: 'authenticated',
  role: 'authenticated',
  email_confirmed_at: '2024-01-01T00:00:00Z',
  phone_confirmed_at: undefined,
  last_sign_in_at: '2024-01-01T00:00:00Z',
  app_metadata: {},
  user_metadata: {},
  identities: [],
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
};

describe('AuthContext', () => {
  let mockSubscription: { unsubscribe: jest.Mock };

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock subscription
    mockSubscription = { unsubscribe: jest.fn() };
    
    // Setup auth mock
    mockSupabase.auth = {
      onAuthStateChange: jest.fn(),
    } as any;
    
    // Default mock implementations
    mockAuthService.getSession.mockResolvedValue(null);
    mockAuthService.signOut.mockResolvedValue();
    mockAuthService.getCurrentUser.mockResolvedValue(null);
    
    (mockSupabase.auth.onAuthStateChange as jest.Mock).mockReturnValue({
      data: { subscription: mockSubscription },
      error: null,
    });
  });

  describe('Initialization', () => {
    it('should render children and provide context', async () => {
      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>,
      );

      expect(screen.getByTestId('loading')).toHaveTextContent('loading');
      
      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('not-loading');
      });

      expect(screen.getByTestId('user')).toHaveTextContent('no-user');
    });

    it('should initialize with user from session', async () => {
      mockAuthService.getSession.mockResolvedValue({
        user: mockUser,
        access_token: 'token',
        refresh_token: 'refresh',
        expires_in: 3600,
        expires_at: Date.now() / 1000 + 3600,
        token_type: 'bearer',
      });

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>,
      );

      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('not-loading');
        expect(screen.getByTestId('user')).toHaveTextContent('test@example.com');
      });
    });

    it('should handle initialization errors in development', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      const initError = new Error('Session initialization failed');
      mockAuthService.getSession.mockRejectedValue(initError);

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>,
      );

      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('not-loading');
        expect(screen.getByTestId('user')).toHaveTextContent('no-user');
      });

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Auth session error',
        initError,
        {
          component: 'AuthContext',
          action: 'initializeAuth',
        },
      );

      process.env.NODE_ENV = originalEnv;
    });

    it('should handle initialization errors silently in production', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      const initError = new Error('Session initialization failed');
      mockAuthService.getSession.mockRejectedValue(initError);

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>,
      );

      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('not-loading');
        expect(screen.getByTestId('user')).toHaveTextContent('no-user');
      });

      expect(mockLogger.error).not.toHaveBeenCalled();

      process.env.NODE_ENV = originalEnv;
    });

    it('should setup auth state change listener', () => {
      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>,
      );

      expect(mockSupabase.auth.onAuthStateChange).toHaveBeenCalledWith(
        expect.any(Function),
      );
    });

    it('should cleanup subscription on unmount', () => {
      const { unmount } = render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>,
      );

      unmount();

      expect(mockSubscription.unsubscribe).toHaveBeenCalled();
    });
  });

  describe('Auth state changes', () => {
    it('should update user on auth state change', async () => {
      let authChangeCallback: (event: string, session: unknown) => void;

      (mockSupabase.auth.onAuthStateChange as jest.Mock).mockImplementation((callback: unknown) => {
        authChangeCallback = callback;
        return { data: { subscription: mockSubscription }, error: null };
      });

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>,
      );

      // Wait for initial load
      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('not-loading');
      });

      // Simulate auth state change with user
      await act(async () => {
        authChangeCallback('SIGNED_IN', {
          user: mockUser,
          access_token: 'token',
          refresh_token: 'refresh',
          expires_in: 3600,
          expires_at: Date.now() / 1000 + 3600,
          token_type: 'bearer',
        });
      });

      expect(screen.getByTestId('user')).toHaveTextContent('test@example.com');
      expect(screen.getByTestId('loading')).toHaveTextContent('not-loading');
    });

    it('should handle null session on auth state change', async () => {
      let authChangeCallback: (event: string, session: unknown) => void;

      (mockSupabase.auth.onAuthStateChange as jest.Mock).mockImplementation((callback: unknown) => {
        authChangeCallback = callback;
        return { data: { subscription: mockSubscription }, error: null };
      });

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>,
      );

      // Wait for initial load
      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('not-loading');
      });

      // Simulate auth state change with null session
      await act(async () => {
        authChangeCallback('SIGNED_OUT', null);
      });

      expect(screen.getByTestId('user')).toHaveTextContent('no-user');
      expect(screen.getByTestId('loading')).toHaveTextContent('not-loading');
    });

    it('should handle auth state change with session but no user', async () => {
      let authChangeCallback: (event: string, session: unknown) => void;

      (mockSupabase.auth.onAuthStateChange as jest.Mock).mockImplementation((callback: unknown) => {
        authChangeCallback = callback;
        return { data: { subscription: mockSubscription }, error: null };
      });

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>,
      );

      // Wait for initial load
      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('not-loading');
      });

      // Simulate auth state change with session but no user
      await act(async () => {
        authChangeCallback('TOKEN_REFRESHED', {
          user: null,
          access_token: 'token',
          refresh_token: 'refresh',
          expires_in: 3600,
          expires_at: Date.now() / 1000 + 3600,
          token_type: 'bearer',
        });
      });

      expect(screen.getByTestId('user')).toHaveTextContent('no-user');
    });
  });

  describe('signOut', () => {
    it('should sign out successfully', async () => {
      mockAuthService.signOut.mockResolvedValue();

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>,
      );

      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('not-loading');
      });

      await act(async () => {
        screen.getByTestId('sign-out').click();
      });

      expect(mockAuthService.signOut).toHaveBeenCalled();
    });

    it('should handle sign out errors', async () => {
      const signOutError = new Error('Sign out failed');
      mockAuthService.signOut.mockRejectedValue(signOutError);

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>,
      );

      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('not-loading');
      });

      await act(async () => {
        screen.getByTestId('sign-out').click();
      });

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Sign out error',
        signOutError,
        {
          component: 'AuthContext',
          action: 'signOut',
        },
      );
    });

    it('should return error object on sign out failure', async () => {
      const signOutError = new Error('Sign out failed');
      mockAuthService.signOut.mockRejectedValue(signOutError);

      let signOutResult: unknown;
      const TestSignOut = () => {
        const context = useContext(AuthContext);
        
        const handleSignOut = async () => {
          if (context) {
            signOutResult = await context.signOut();
          }
        };

        return (
          <button data-testid="sign-out" onClick={handleSignOut}>
            Sign Out
          </button>
        );
      };

      render(
        <AuthProvider>
          <TestSignOut />
        </AuthProvider>,
      );

      await waitFor(() => {
        expect(screen.getByTestId('sign-out')).toBeInTheDocument();
      });

      await act(async () => {
        screen.getByTestId('sign-out').click();
      });

      expect(signOutResult).toEqual({ error: signOutError });
    });

    it('should return empty object on successful sign out', async () => {
      mockAuthService.signOut.mockResolvedValue();

      let signOutResult: unknown;
      const TestSignOut = () => {
        const context = useContext(AuthContext);
        
        const handleSignOut = async () => {
          if (context) {
            signOutResult = await context.signOut();
          }
        };

        return (
          <button data-testid="sign-out" onClick={handleSignOut}>
            Sign Out
          </button>
        );
      };

      render(
        <AuthProvider>
          <TestSignOut />
        </AuthProvider>,
      );

      await waitFor(() => {
        expect(screen.getByTestId('sign-out')).toBeInTheDocument();
      });

      await act(async () => {
        screen.getByTestId('sign-out').click();
      });

      expect(signOutResult).toEqual({});
    });
  });

  describe('refreshUser', () => {
    it('should refresh user successfully', async () => {
      const refreshedUser = { ...mockUser, email: 'refreshed@example.com' };
      mockAuthService.getCurrentUser.mockResolvedValue(refreshedUser);

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>,
      );

      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('not-loading');
      });

      await act(async () => {
        screen.getByTestId('refresh-user').click();
      });

      expect(mockAuthService.getCurrentUser).toHaveBeenCalled();
      expect(screen.getByTestId('user')).toHaveTextContent('refreshed@example.com');
    });

    it('should handle refresh user errors', async () => {
      const refreshError = new Error('Refresh failed');
      mockAuthService.getCurrentUser.mockRejectedValue(refreshError);

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>,
      );

      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('not-loading');
      });

      await act(async () => {
        screen.getByTestId('refresh-user').click();
      });

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Error refreshing user',
        refreshError,
        {
          component: 'AuthContext',
          action: 'refreshUser',
        },
      );
    });

    it('should handle null user from refresh', async () => {
      mockAuthService.getCurrentUser.mockResolvedValue(null);

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>,
      );

      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('not-loading');
      });

      await act(async () => {
        screen.getByTestId('refresh-user').click();
      });

      expect(screen.getByTestId('user')).toHaveTextContent('no-user');
    });
  });

  describe('Context value memoization', () => {
    it('should memoize context value to prevent unnecessary re-renders', async () => {
      let renderCount = 0;
      const TestMemoization = () => {
        renderCount++;
        useContext(AuthContext);
        return <div data-testid="render-count">{renderCount}</div>;
      };

      const { rerender } = render(
        <AuthProvider>
          <TestMemoization />
        </AuthProvider>,
      );

      // Wait for initial loading to complete
      await waitFor(() => {
        expect(screen.getByTestId('render-count')).toHaveTextContent('2'); // Initial + loading state change
      });

      const renderCountAfterInit = parseInt(screen.getByTestId('render-count').textContent || '0');

      // Re-render parent with same props should not trigger additional child renders
      rerender(
        <AuthProvider>
          <TestMemoization />
        </AuthProvider>,
      );

      // Should not have additional renders because context value dependencies haven't changed
      expect(screen.getByTestId('render-count')).toHaveTextContent(renderCountAfterInit.toString());
    });

    it('should update memoized value when user changes', async () => {
      let authChangeCallback: (event: string, session: unknown) => void;

      (mockSupabase.auth.onAuthStateChange as jest.Mock).mockImplementation((callback: unknown) => {
        authChangeCallback = callback;
        return { data: { subscription: mockSubscription }, error: null };
      });

      const contextValues: unknown[] = [];
      const TestMemoization = () => {
        const context = useContext(AuthContext);
        contextValues.push(context);
        return <div data-testid="user">{context?.user?.email || 'no-user'}</div>;
      };

      render(
        <AuthProvider>
          <TestMemoization />
        </AuthProvider>,
      );

      await waitFor(() => {
        expect(screen.getByTestId('user')).toHaveTextContent('no-user');
      });

      // Simulate user sign in
      await act(async () => {
        authChangeCallback('SIGNED_IN', {
          user: mockUser,
          access_token: 'token',
          refresh_token: 'refresh',
          expires_in: 3600,
          expires_at: Date.now() / 1000 + 3600,
          token_type: 'bearer',
        });
      });

      expect(screen.getByTestId('user')).toHaveTextContent('test@example.com');

      // Context values should be different objects
      expect(contextValues.length).toBeGreaterThan(1);
      expect(contextValues[0]).not.toBe(contextValues[contextValues.length - 1]);
    });
  });

  describe('Error edge cases', () => {
    it('should handle malformed session data', async () => {
      let authChangeCallback: (event: string, session: unknown) => void;

      (mockSupabase.auth.onAuthStateChange as jest.Mock).mockImplementation((callback: unknown) => {
        authChangeCallback = callback;
        return { data: { subscription: mockSubscription }, error: null };
      });

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>,
      );

      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('not-loading');
      });

      // Simulate malformed session data
      await act(async () => {
        authChangeCallback('SIGNED_IN', {
          user: undefined, // Malformed user data
          access_token: 'token',
        });
      });

      expect(screen.getByTestId('user')).toHaveTextContent('no-user');
    });

    it('should handle subscription setup failure gracefully', () => {
      // Mock subscription with proper unsubscribe method
      const mockUnsubscribe = jest.fn();
      (mockSupabase.auth.onAuthStateChange as jest.Mock).mockReturnValue({
        data: { subscription: { unsubscribe: mockUnsubscribe } },
        error: new Error('Subscription failed'),
      });

      const { unmount } = render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>,
      );

      // Should render without throwing
      expect(screen.getByTestId('loading')).toBeInTheDocument();
      
      // Should cleanup subscription on unmount
      unmount();
      expect(mockUnsubscribe).toHaveBeenCalled();
    });

    it('should handle concurrent auth operations', async () => {
      mockAuthService.getCurrentUser.mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve(mockUser), 100)),
      );

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>,
      );

      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('not-loading');
      });

      // Trigger multiple concurrent refresh operations
      const refreshPromises = [
        act(async () => { screen.getByTestId('refresh-user').click(); }),
        act(async () => { screen.getByTestId('refresh-user').click(); }),
        act(async () => { screen.getByTestId('refresh-user').click(); }),
      ];

      await Promise.all(refreshPromises);

      expect(mockAuthService.getCurrentUser).toHaveBeenCalledTimes(3);
    });
  });
});