import { render, screen, waitFor, act } from '@testing-library/react';
import { AuthProvider, useAuth } from './AuthContext';
import { supabase } from '../lib/supabase';

// Mock supabase
jest.mock('../lib/supabase');

// Test component that uses the auth hook
const TestComponent = () => {
  const { user, loading, signOut } = useAuth();
  return (
    <div>
      <div data-testid="loading">{loading.toString()}</div>
      <div data-testid="user">{user ? user.email : 'No user'}</div>
      <button onClick={signOut}>Sign Out</button>
    </div>
  );
};

describe('AuthContext', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('throws error when useAuth is used outside AuthProvider', () => {
    // Mock console.error to avoid noise
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    
    expect(() => render(<TestComponent />)).toThrow('useAuth must be used within an AuthProvider');
    
    consoleSpy.mockRestore();
  });

  it('provides initial loading state', () => {
    (supabase.auth.getSession as jest.Mock).mockResolvedValue({
      data: { session: null },
      error: null
    });

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    // Initial state is loading
    expect(screen.getByTestId('loading')).toHaveTextContent('true');
  });

  it('loads user session on mount', async () => {
    const mockUser = {
      id: 'test-id',
      email: 'test@example.com'
    };

    (supabase.auth.getSession as jest.Mock).mockResolvedValue({
      data: { 
        session: {
          user: mockUser,
          access_token: 'test-token'
        }
      },
      error: null
    });

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('false');
      expect(screen.getByTestId('user')).toHaveTextContent('test@example.com');
    });
  });

  it('handles session loading error', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    
    (supabase.auth.getSession as jest.Mock).mockRejectedValue(new Error('Session error'));

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('false');
      expect(screen.getByTestId('user')).toHaveTextContent('No user');
    });

    consoleSpy.mockRestore();
  });

  it('subscribes to auth state changes', async () => {
    const mockCallback = jest.fn();
    const unsubscribeMock = jest.fn();

    (supabase.auth.onAuthStateChange as jest.Mock).mockImplementation((callback) => {
      mockCallback.mockImplementation(callback);
      return {
        data: {
          subscription: {
            unsubscribe: unsubscribeMock
          }
        }
      };
    });

    (supabase.auth.getSession as jest.Mock).mockResolvedValue({
      data: { session: null },
      error: null
    });

    const { unmount } = render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(supabase.auth.onAuthStateChange).toHaveBeenCalled();
    });

    // Simulate auth state change
    const newUser = {
      id: 'new-user',
      email: 'new@example.com'
    };

    act(() => {
      mockCallback('SIGNED_IN', {
        user: newUser,
        access_token: 'new-token'
      });
    });

    await waitFor(() => {
      expect(screen.getByTestId('user')).toHaveTextContent('new@example.com');
    });

    unmount();
    expect(unsubscribeMock).toHaveBeenCalled();
  });

  it('handles sign out', async () => {
    const mockUser = {
      id: 'test-id',
      email: 'test@example.com'
    };

    (supabase.auth.getSession as jest.Mock).mockResolvedValue({
      data: { 
        session: {
          user: mockUser,
          access_token: 'test-token'
        }
      },
      error: null
    });

    (supabase.auth.signOut as jest.Mock).mockResolvedValue({ error: null });

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('user')).toHaveTextContent('test@example.com');
    });

    const signOutButton = screen.getByText('Sign Out');
    
    act(() => {
      signOutButton.click();
    });

    await waitFor(() => {
      expect(supabase.auth.signOut).toHaveBeenCalled();
    });
  });

  it('handles null session correctly', async () => {
    (supabase.auth.getSession as jest.Mock).mockResolvedValue({
      data: { session: null },
      error: null
    });

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('false');
      expect(screen.getByTestId('user')).toHaveTextContent('No user');
    });
  });
});