import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { User as SupabaseUser } from '@supabase/supabase-js';
import type { AuthContextValue } from '../types/auth.types';
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
    const getSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        setUser(session?.user ?? null);
      } catch (error) {
        if (process.env.NODE_ENV === 'development') {
          logger.error('Auth session error', error as Error, {
            component: 'AuthContext',
            action: 'authStateChange',
          });
        }
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    getSession();

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
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
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
      const { data: { user: refreshedUser } } = await supabase.auth.getUser();
      setUser(refreshedUser);
    } catch (error) {
      logger.error('Error refreshing user', error as Error, {
        component: 'AuthContext',
        action: 'refreshUser',
      });
    }
  };

  const value: AuthContextValue = {
    user,
    loading,
    signOut,
    refreshUser,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};