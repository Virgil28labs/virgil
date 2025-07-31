/**
 * AuthService - Centralized authentication logic
 * Handles all Supabase auth operations with proper validation and error handling
 */

import { supabase } from '../lib/supabase';
import type { User } from '../types/auth.types';
import { AuthError, ValidationError } from '../lib/errors';
import { isValidEmail, sanitizeInput, validatePassword } from '../lib/utils/validation';
import { AUTH_CONFIG, AUTH_MESSAGES } from '../constants/auth.constants';
import { logger } from '../lib/logger';
import { timeService } from './TimeService';

interface LoginCredentials {
  email: string;
  password: string;
}

interface SignUpData extends LoginCredentials {
  name: string;
}

interface AuthResponse {
  user: User | null;
  session: any;
}

export class AuthService {
  private sessionCache: { data: any; timestamp: number } | null = null;

  /**
   * Login with email and password
   */
  async login({ email, password }: LoginCredentials): Promise<AuthResponse> {
    try {
      // Sanitize and validate inputs
      const cleanEmail = sanitizeInput(email).trim().toLowerCase();
      
      if (!cleanEmail || !password) {
        throw new ValidationError(AUTH_MESSAGES.VALIDATION_ERROR);
      }
      
      if (!isValidEmail(cleanEmail)) {
        throw new ValidationError(AUTH_MESSAGES.INVALID_EMAIL);
      }

      // Call Supabase
      const { data, error } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password,
      });

      if (error) {
        logger.error('Login error', error, {
          component: 'AuthService',
          action: 'login',
        });
        throw new AuthError(this.mapSupabaseError(error));
      }

      // Cache the session
      this.cacheSession(data.session);

      return {
        user: data.user,
        session: data.session,
      };
    } catch (error) {
      // Re-throw our custom errors, wrap others
      if (error instanceof ValidationError || error instanceof AuthError) {
        throw error;
      }
      
      logger.error('Unexpected login error', error as Error, {
        component: 'AuthService',
        action: 'login',
      });
      
      throw new AuthError(AUTH_MESSAGES.UNKNOWN_ERROR);
    }
  }

  /**
   * Sign up with name, email, and password
   */
  async signUp({ name, email, password }: SignUpData): Promise<AuthResponse> {
    try {
      // Sanitize inputs
      const cleanEmail = sanitizeInput(email).trim().toLowerCase();
      const cleanName = sanitizeInput(name).trim();
      
      // Validate all fields
      if (!cleanName || !cleanEmail || !password) {
        throw new ValidationError(AUTH_MESSAGES.VALIDATION_ERROR);
      }
      
      if (!isValidEmail(cleanEmail)) {
        throw new ValidationError(AUTH_MESSAGES.INVALID_EMAIL);
      }
      
      // Use our password validation utility
      const passwordCheck = validatePassword(password);
      if (!passwordCheck.isValid) {
        throw new ValidationError(
          passwordCheck.feedback[0] || AUTH_MESSAGES.PASSWORD_TOO_SHORT,
        );
      }

      // Call Supabase
      const { data, error } = await supabase.auth.signUp({
        email: cleanEmail,
        password,
        options: {
          data: {
            name: cleanName,
          },
        },
      });

      if (error) {
        logger.error('Sign up error', error, {
          component: 'AuthService',
          action: 'signUp',
        });
        throw new AuthError(this.mapSupabaseError(error));
      }

      return {
        user: data.user,
        session: data.session,
      };
    } catch (error) {
      if (error instanceof ValidationError || error instanceof AuthError) {
        throw error;
      }
      
      logger.error('Unexpected sign up error', error as Error, {
        component: 'AuthService',
        action: 'signUp',
      });
      
      throw new AuthError(AUTH_MESSAGES.UNKNOWN_ERROR);
    }
  }

  /**
   * Sign out the current user
   */
  async signOut(): Promise<void> {
    try {
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        logger.error('Sign out error', error, {
          component: 'AuthService',
          action: 'signOut',
        });
        throw new AuthError('Failed to sign out');
      }
      
      // Clear cache
      this.sessionCache = null;
    } catch (error) {
      if (error instanceof AuthError) {
        throw error;
      }
      
      logger.error('Unexpected sign out error', error as Error, {
        component: 'AuthService',
        action: 'signOut',
      });
      
      throw new AuthError(AUTH_MESSAGES.UNKNOWN_ERROR);
    }
  }

  /**
   * Get current user (with caching)
   */
  async getCurrentUser(): Promise<User | null> {
    try {
      // Check cache first
      if (this.sessionCache && this.isCacheValid()) {
        return this.sessionCache.data.user;
      }

      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        // Update cache
        const { data: { session } } = await supabase.auth.getSession();
        this.cacheSession(session);
      }
      
      return user;
    } catch (error) {
      logger.error('Get current user error', error as Error, {
        component: 'AuthService',
        action: 'getCurrentUser',
      });
      return null;
    }
  }

  /**
   * Get current session (with caching)
   */
  async getSession(): Promise<any> {
    try {
      // Check cache first
      if (this.sessionCache && this.isCacheValid()) {
        return this.sessionCache.data;
      }

      const { data: { session } } = await supabase.auth.getSession();
      
      if (session) {
        this.cacheSession(session);
      }
      
      return session;
    } catch (error) {
      logger.error('Get session error', error as Error, {
        component: 'AuthService',
        action: 'getSession',
      });
      return null;
    }
  }

  /**
   * Refresh the current session
   */
  async refreshSession(): Promise<any> {
    try {
      const { data: { session }, error } = await supabase.auth.refreshSession();
      
      if (error) {
        throw new AuthError(AUTH_MESSAGES.SESSION_EXPIRED);
      }
      
      if (session) {
        this.cacheSession(session);
      }
      
      return session;
    } catch (error) {
      if (error instanceof AuthError) {
        throw error;
      }
      
      logger.error('Refresh session error', error as Error, {
        component: 'AuthService',
        action: 'refreshSession',
      });
      
      throw new AuthError(AUTH_MESSAGES.SESSION_EXPIRED);
    }
  }

  /**
   * Map Supabase errors to user-friendly messages
   */
  private mapSupabaseError(error: any): string {
    const message = error.message?.toLowerCase() || '';
    
    if (message.includes('invalid login credentials')) {
      return AUTH_MESSAGES.INVALID_CREDENTIALS;
    }
    
    if (message.includes('email not confirmed')) {
      return AUTH_MESSAGES.EMAIL_NOT_CONFIRMED;
    }
    
    if (message.includes('user already registered')) {
      return AUTH_MESSAGES.USER_ALREADY_EXISTS;
    }
    
    if (message.includes('network') || message.includes('fetch')) {
      return AUTH_MESSAGES.NETWORK_ERROR;
    }
    
    // Don't expose technical details
    return AUTH_MESSAGES.AUTH_ERROR;
  }

  /**
   * Cache session data
   */
  private cacheSession(session: any): void {
    if (session) {
      this.sessionCache = {
        data: session,
        timestamp: timeService.getTimestamp(),
      };
    }
  }

  /**
   * Check if cache is still valid
   */
  private isCacheValid(): boolean {
    if (!this.sessionCache) return false;
    
    const age = timeService.getTimestamp() - this.sessionCache.timestamp;
    return age < AUTH_CONFIG.SESSION_CACHE_TIME;
  }
}

// Export singleton instance
export const authService = new AuthService();