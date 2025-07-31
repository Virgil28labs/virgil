import { authService } from '../AuthService';
import { supabase } from '../../lib/supabase';
import { AppError } from '../../lib/errors';
import { AUTH_CONFIG, AUTH_MESSAGES } from '../../constants/auth.constants';
import { timeService } from '../TimeService';

// Mock dependencies
jest.mock('../../lib/supabase');
jest.mock('../../lib/logger');
jest.mock('../TimeService', () => ({
  timeService: {
    getTimestamp: jest.fn(() => Date.now()),
  },
}));

describe('AuthService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset session cache
    (authService as any).sessionCache = null;
  });

  describe('login', () => {
    it('should login successfully with valid credentials', async () => {
      const mockUser = { id: 'test-id', email: 'test@example.com' };
      const mockSession = { access_token: 'test-token' };

      (supabase.auth.signInWithPassword as jest.Mock).mockResolvedValueOnce({
        data: { user: mockUser, session: mockSession },
        error: null,
      });

      const result = await authService.login({
        email: 'TEST@EXAMPLE.COM',
        password: 'password123',
      });

      expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith({
        email: 'test@example.com', // Should be lowercased
        password: 'password123',
      });

      expect(result).toEqual({
        user: mockUser,
        session: mockSession,
      });

      // Should cache the session
      expect((authService as any).sessionCache).toEqual({
        data: mockSession,
        timestamp: expect.any(Number),
      });
    });

    it('should trim and lowercase email', async () => {
      const mockUser = { id: 'test-id', email: 'test@example.com' };
      const mockSession = { access_token: 'test-token' };

      (supabase.auth.signInWithPassword as jest.Mock).mockResolvedValueOnce({
        data: { user: mockUser, session: mockSession },
        error: null,
      });

      await authService.login({
        email: '  TEST@EXAMPLE.COM  ',
        password: 'password123',
      });

      expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
      });
    });

    it('should throw ValidationError for empty fields', async () => {
      try {
        await authService.login({ email: '', password: '' });
        throw new Error('Should have thrown ValidationError');
      } catch (error) {
        expect(error).toBeInstanceOf(AppError);
        expect((error as AppError).name).toBe('ValidationError');
        expect((error as Error).message).toBe(AUTH_MESSAGES.VALIDATION_ERROR);
      }

      try {
        await authService.login({ email: 'test@example.com', password: '' });
        throw new Error('Should have thrown ValidationError');
      } catch (error) {
        expect(error).toBeInstanceOf(AppError);
        expect((error as AppError).name).toBe('ValidationError');
        expect((error as Error).message).toBe(AUTH_MESSAGES.VALIDATION_ERROR);
      }

      expect(supabase.auth.signInWithPassword).not.toHaveBeenCalled();
    });

    it('should throw ValidationError for invalid email', async () => {
      try {
        await authService.login({ email: 'invalid-email', password: 'password123' });
        throw new Error('Should have thrown ValidationError');
      } catch (error) {
        expect(error).toBeInstanceOf(AppError);
        expect((error as AppError).name).toBe('ValidationError');
        expect((error as Error).message).toBe(AUTH_MESSAGES.INVALID_EMAIL);
      }

      expect(supabase.auth.signInWithPassword).not.toHaveBeenCalled();
    });

    it('should map Supabase errors to user-friendly messages', async () => {
      (supabase.auth.signInWithPassword as jest.Mock).mockResolvedValueOnce({
        data: null,
        error: { message: 'Invalid login credentials' },
      });

      try {
        await authService.login({
          email: 'test@example.com',
          password: 'wrong-password',
        });
        throw new Error('Should have thrown AuthError');
      } catch (error) {
        expect(error).toBeInstanceOf(AppError);
        expect((error as AppError).name).toBe('AuthError');
        expect((error as Error).message).toBe(AUTH_MESSAGES.INVALID_CREDENTIALS);
      }
    });

    it('should handle network errors', async () => {
      (supabase.auth.signInWithPassword as jest.Mock).mockResolvedValueOnce({
        data: null,
        error: { message: 'Network error' },
      });

      try {
        await authService.login({
          email: 'test@example.com',
          password: 'password123',
        });
        throw new Error('Should have thrown AuthError');
      } catch (error) {
        expect(error).toBeInstanceOf(AppError);
        expect((error as AppError).name).toBe('AuthError');
        expect((error as Error).message).toBe(AUTH_MESSAGES.NETWORK_ERROR);
      }
    });

    it('should handle unexpected errors', async () => {
      (supabase.auth.signInWithPassword as jest.Mock).mockRejectedValueOnce(
        new Error('Unexpected error'),
      );

      try {
        await authService.login({
          email: 'test@example.com',
          password: 'password123',
        });
        throw new Error('Should have thrown AuthError');
      } catch (error) {
        expect(error).toBeInstanceOf(AppError);
        expect((error as AppError).name).toBe('AuthError');
        expect((error as Error).message).toBe(AUTH_MESSAGES.UNKNOWN_ERROR);
      }
    });
  });

  describe('signUp', () => {
    it('should sign up successfully with valid data', async () => {
      const mockUser = { id: 'test-id', email: 'test@example.com' };
      const mockSession = { access_token: 'test-token' };

      (supabase.auth.signUp as jest.Mock).mockResolvedValueOnce({
        data: { user: mockUser, session: mockSession },
        error: null,
      });

      const result = await authService.signUp({
        name: 'Test User',
        email: 'TEST@EXAMPLE.COM',
        password: 'Password123!',
      });

      expect(supabase.auth.signUp).toHaveBeenCalledWith({
        email: 'test@example.com', // Should be lowercased
        password: 'Password123!',
        options: {
          data: {
            name: 'Test User',
          },
        },
      });

      expect(result).toEqual({
        user: mockUser,
        session: mockSession,
      });
    });

    it('should sanitize and trim inputs', async () => {
      const mockUser = { id: 'test-id', email: 'test@example.com' };

      (supabase.auth.signUp as jest.Mock).mockResolvedValueOnce({
        data: { user: mockUser, session: {} },
        error: null,
      });

      await authService.signUp({
        name: '  Test User  ',
        email: '  TEST@EXAMPLE.COM  ',
        password: 'Password123!',
      });

      expect(supabase.auth.signUp).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'Password123!',
        options: {
          data: {
            name: 'Test User', // Should be trimmed
          },
        },
      });
    });

    it('should throw ValidationError for empty fields', async () => {
      try {
        await authService.signUp({
          name: '',
          email: '',
          password: '',
        });
        throw new Error('Should have thrown ValidationError');
      } catch (error) {
        expect(error).toBeInstanceOf(AppError);
        expect((error as AppError).name).toBe('ValidationError');
        expect((error as Error).message).toBe(AUTH_MESSAGES.VALIDATION_ERROR);
      }

      try {
        await authService.signUp({
          name: 'Test',
          email: '',
          password: 'password123',
        });
        throw new Error('Should have thrown ValidationError');
      } catch (error) {
        expect(error).toBeInstanceOf(AppError);
        expect((error as AppError).name).toBe('ValidationError');
        expect((error as Error).message).toBe(AUTH_MESSAGES.VALIDATION_ERROR);
      }

      expect(supabase.auth.signUp).not.toHaveBeenCalled();
    });

    it('should throw ValidationError for invalid email', async () => {
      try {
        await authService.signUp({
          name: 'Test User',
          email: 'invalid-email',
          password: 'password123',
        });
        throw new Error('Should have thrown ValidationError');
      } catch (error) {
        expect(error).toBeInstanceOf(AppError);
        expect((error as AppError).name).toBe('ValidationError');
        expect((error as Error).message).toBe(AUTH_MESSAGES.INVALID_EMAIL);
      }

      expect(supabase.auth.signUp).not.toHaveBeenCalled();
    });

    it('should validate password requirements', async () => {
      try {
        await authService.signUp({
          name: 'Test User',
          email: 'test@example.com',
          password: '12345', // Too short
        });
        throw new Error('Should have thrown ValidationError');
      } catch (error) {
        expect(error).toBeInstanceOf(AppError);
        expect((error as AppError).name).toBe('ValidationError');
        expect((error as Error).message).toBe('Password must be at least 8 characters long');
      }

      expect(supabase.auth.signUp).not.toHaveBeenCalled();
    });

    it('should map user already exists error', async () => {
      (supabase.auth.signUp as jest.Mock).mockResolvedValueOnce({
        data: null,
        error: { message: 'User already registered' },
      });

      try {
        await authService.signUp({
          name: 'Test User',
          email: 'existing@example.com',
          password: 'Password123!',
        });
        throw new Error('Should have thrown AuthError');
      } catch (error) {
        expect(error).toBeInstanceOf(AppError);
        expect((error as AppError).name).toBe('AuthError');
        expect((error as Error).message).toBe(AUTH_MESSAGES.USER_ALREADY_EXISTS);
      }
    });
  });

  describe('signOut', () => {
    it('should sign out successfully', async () => {
      (supabase.auth.signOut as jest.Mock).mockResolvedValueOnce({
        error: null,
      });

      // Set a cached session
      (authService as any).sessionCache = {
        data: { access_token: 'test' },
        timestamp: timeService.getTimestamp(),
      };

      await authService.signOut();

      expect(supabase.auth.signOut).toHaveBeenCalled();
      expect((authService as any).sessionCache).toBeNull();
    });

    it('should handle sign out errors', async () => {
      (supabase.auth.signOut as jest.Mock).mockResolvedValueOnce({
        error: { message: 'Sign out failed' },
      });

      try {
        await authService.signOut();
        throw new Error('Should have thrown AuthError');
      } catch (error) {
        expect(error).toBeInstanceOf(AppError);
        expect((error as AppError).name).toBe('AuthError');
        expect((error as Error).message).toBe('Failed to sign out');
      }
    });
  });

  describe('getCurrentUser', () => {
    it('should return user from cache if valid', async () => {
      const mockUser = { id: 'test-id', email: 'test@example.com' };
      
      // Set valid cache
      (authService as any).sessionCache = {
        data: { user: mockUser },
        timestamp: timeService.getTimestamp(),
      };

      const result = await authService.getCurrentUser();

      expect(result).toEqual(mockUser);
      expect(supabase.auth.getUser).not.toHaveBeenCalled();
    });

    it('should fetch user if cache is expired', async () => {
      const mockUser = { id: 'test-id', email: 'test@example.com' };
      const mockSession = { user: mockUser, access_token: 'test' };

      // Set expired cache
      (authService as any).sessionCache = {
        data: { user: { id: 'old' } },
        timestamp: timeService.getTimestamp() - AUTH_CONFIG.SESSION_CACHE_TIME - 1000,
      };

      (supabase.auth.getUser as jest.Mock).mockResolvedValueOnce({
        data: { user: mockUser },
      });

      (supabase.auth.getSession as jest.Mock).mockResolvedValueOnce({
        data: { session: mockSession },
      });

      const result = await authService.getCurrentUser();

      expect(result).toEqual(mockUser);
      expect(supabase.auth.getUser).toHaveBeenCalled();
      expect((authService as any).sessionCache.data).toEqual(mockSession);
    });

    it('should return null if no user', async () => {
      (supabase.auth.getUser as jest.Mock).mockResolvedValueOnce({
        data: { user: null },
      });

      const result = await authService.getCurrentUser();

      expect(result).toBeNull();
    });

    it('should handle errors gracefully', async () => {
      (supabase.auth.getUser as jest.Mock).mockRejectedValueOnce(
        new Error('Failed to get user'),
      );

      const result = await authService.getCurrentUser();

      expect(result).toBeNull();
    });
  });

  describe('getSession', () => {
    it('should return session from cache if valid', async () => {
      const mockSession = { access_token: 'test-token' };
      
      // Set valid cache
      (authService as any).sessionCache = {
        data: mockSession,
        timestamp: timeService.getTimestamp(),
      };

      const result = await authService.getSession();

      expect(result).toEqual(mockSession);
      expect(supabase.auth.getSession).not.toHaveBeenCalled();
    });

    it('should fetch session if no cache', async () => {
      const mockSession = { access_token: 'test-token' };

      (supabase.auth.getSession as jest.Mock).mockResolvedValueOnce({
        data: { session: mockSession },
      });

      const result = await authService.getSession();

      expect(result).toEqual(mockSession);
      expect(supabase.auth.getSession).toHaveBeenCalled();
      expect((authService as any).sessionCache.data).toEqual(mockSession);
    });
  });

  describe('refreshSession', () => {
    it('should refresh session successfully', async () => {
      const mockSession = { access_token: 'new-token' };

      (supabase.auth.refreshSession as jest.Mock).mockResolvedValueOnce({
        data: { session: mockSession },
        error: null,
      });

      const result = await authService.refreshSession();

      expect(result).toEqual(mockSession);
      expect((authService as any).sessionCache.data).toEqual(mockSession);
    });

    it('should handle refresh errors', async () => {
      (supabase.auth.refreshSession as jest.Mock).mockResolvedValueOnce({
        data: { session: null },
        error: { message: 'Session expired' },
      });

      try {
        await authService.refreshSession();
        throw new Error('Should have thrown AuthError');
      } catch (error) {
        expect(error).toBeInstanceOf(AppError);
        expect((error as AppError).name).toBe('AuthError');
        expect((error as Error).message).toBe(AUTH_MESSAGES.SESSION_EXPIRED);
      }
    });
  });

  describe('private methods', () => {
    it('should map various Supabase errors correctly', () => {
      const mapError = (authService as any).mapSupabaseError.bind(authService);

      expect(mapError({ message: 'Invalid login credentials' })).toBe(AUTH_MESSAGES.INVALID_CREDENTIALS);
      expect(mapError({ message: 'Email not confirmed' })).toBe(AUTH_MESSAGES.EMAIL_NOT_CONFIRMED);
      expect(mapError({ message: 'User already registered' })).toBe(AUTH_MESSAGES.USER_ALREADY_EXISTS);
      expect(mapError({ message: 'Network error' })).toBe(AUTH_MESSAGES.NETWORK_ERROR);
      expect(mapError({ message: 'fetch failed' })).toBe(AUTH_MESSAGES.NETWORK_ERROR);
      expect(mapError({ message: 'Unknown error' })).toBe(AUTH_MESSAGES.AUTH_ERROR);
      expect(mapError({})).toBe(AUTH_MESSAGES.AUTH_ERROR);
    });

    it('should validate cache correctly', () => {
      const isCacheValid = (authService as any).isCacheValid.bind(authService);

      // No cache
      (authService as any).sessionCache = null;
      expect(isCacheValid()).toBe(false);

      // Valid cache
      (authService as any).sessionCache = {
        data: {},
        timestamp: timeService.getTimestamp(),
      };
      expect(isCacheValid()).toBe(true);

      // Expired cache
      (authService as any).sessionCache = {
        data: {},
        timestamp: timeService.getTimestamp() - AUTH_CONFIG.SESSION_CACHE_TIME - 1000,
      };
      expect(isCacheValid()).toBe(false);
    });
  });
});