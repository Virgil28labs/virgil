import type { ReactNode } from 'react';
import { useEffect, useState, useMemo } from 'react';
import type { User as SupabaseUser } from '@supabase/supabase-js';
import type { AuthContextValue } from '../types/auth.types';
import { authService } from '../services/AuthService';
import { supabase } from '../lib/supabase';
import { logger } from '../lib/logger';
import { AuthContext } from './AuthContextInstance';

/**
 * Authentication Context for Virgil
 * Manages user authentication state using Supabase Auth
 */

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    // Get initial session with error handling
    const initializeAuth = async () => {
      try {
        const session = await authService.getSession();
        setUser(session?.user ?? null);
      } catch (error) {
        if (process.env.NODE_ENV === 'development') {
          logger.error('Auth session error', error as Error, {
            component: 'AuthContext',
            action: 'initializeAuth',
          });
        }
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setUser(session?.user ?? null);
        setLoading(false);
      },
    );

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async (): Promise<{ error?: Error }> => {
    try {
      await authService.signOut();
      return {};
    } catch (error) {
      logger.error('Sign out error', error as Error, {
        component: 'AuthContext',
        action: 'signOut',
      });
      return { error: error as Error };
    }
  };

  const refreshUser = async (): Promise<void> => {
    try {
      const refreshedUser = await authService.getCurrentUser();
      setUser(refreshedUser);
    } catch (error) {
      logger.error('Error refreshing user', error as Error, {
        component: 'AuthContext',
        action: 'refreshUser',
      });
    }
  };

  // Memoize the context value to prevent unnecessary re-renders
  const value = useMemo<AuthContextValue>(() => ({
    user,
    loading,
    signOut,
    refreshUser,
  }), [user, loading]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
