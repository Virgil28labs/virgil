import { renderHook, act } from '@testing-library/react';
import { useAuthForm } from '../useAuthForm';
import { authService } from '../../services/AuthService';
import { AUTH_CONFIG, AUTH_MESSAGES } from '../../constants/auth.constants';

// Mock the AuthService
jest.mock('../../services/AuthService');

describe('useAuthForm', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
  });

  describe('login mode', () => {
    it('should initialize with empty form data', () => {
      const { result } = renderHook(() => useAuthForm('login'));
      
      expect(result.current.formData).toEqual({
        email: '',
        password: '',
      });
      expect(result.current.loading).toBe(false);
      expect(result.current.message).toBe('');
      expect(result.current.isSuccess).toBe(false);
    });

    it('should load saved email from localStorage', () => {
      localStorage.setItem(AUTH_CONFIG.EMAIL_STORAGE_KEY, 'saved@example.com');
      
      const { result } = renderHook(() => useAuthForm('login'));
      
      expect(result.current.formData.email).toBe('saved@example.com');
    });

    it('should handle input changes', () => {
      const { result } = renderHook(() => useAuthForm('login'));
      
      act(() => {
        result.current.handleInputChange({
          target: { name: 'email', value: 'test@example.com' },
        } as any);
      });
      
      expect(result.current.formData.email).toBe('test@example.com');
    });

    it('should handle successful login', async () => {
      const mockSuccess = jest.fn();
      const { result } = renderHook(() => useAuthForm('login', mockSuccess));
      
      // Set form data
      act(() => {
        result.current.handleInputChange({
          target: { name: 'email', value: 'test@example.com' },
        } as any);
        result.current.handleInputChange({
          target: { name: 'password', value: 'password123' },
        } as any);
      });
      
      // Submit form
      const mockEvent = { preventDefault: jest.fn() };
      await act(async () => {
        await result.current.handleSubmit(mockEvent as any);
      });
      
      expect(authService.login).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
      });
      expect(result.current.message).toBe(AUTH_MESSAGES.LOGIN_SUCCESS);
      expect(result.current.isSuccess).toBe(true);
      expect(mockSuccess).toHaveBeenCalled();
      expect(localStorage.getItem(AUTH_CONFIG.EMAIL_STORAGE_KEY)).toBe('test@example.com');
    });

    it('should handle login error', async () => {
      (authService.login as jest.Mock).mockRejectedValueOnce(new Error('Invalid credentials'));
      
      const { result } = renderHook(() => useAuthForm('login'));
      
      // Set form data
      act(() => {
        result.current.handleInputChange({
          target: { name: 'email', value: 'test@example.com' },
        } as any);
        result.current.handleInputChange({
          target: { name: 'password', value: 'wrong' },
        } as any);
      });
      
      // Submit form
      const mockEvent = { preventDefault: jest.fn() };
      await act(async () => {
        await result.current.handleSubmit(mockEvent as any);
      });
      
      expect(result.current.message).toBe('Invalid credentials');
      expect(result.current.isSuccess).toBe(false);
      expect(result.current.loading).toBe(false);
    });
  });

  describe('signup mode', () => {
    it('should initialize with empty form data including name', () => {
      const { result } = renderHook(() => useAuthForm('signup'));
      
      expect(result.current.formData).toEqual({
        name: '',
        email: '',
        password: '',
      });
    });

    it('should handle successful signup', async () => {
      const mockSuccess = jest.fn();
      const { result } = renderHook(() => useAuthForm('signup', mockSuccess));
      
      // Set form data
      act(() => {
        result.current.handleInputChange({
          target: { name: 'name', value: 'Test User' },
        } as any);
        result.current.handleInputChange({
          target: { name: 'email', value: 'test@example.com' },
        } as any);
        result.current.handleInputChange({
          target: { name: 'password', value: 'password123' },
        } as any);
      });
      
      // Submit form
      const mockEvent = { preventDefault: jest.fn() };
      await act(async () => {
        await result.current.handleSubmit(mockEvent as any);
      });
      
      expect(authService.signUp).toHaveBeenCalledWith({
        name: 'Test User',
        email: 'test@example.com',
        password: 'password123',
      });
      expect(result.current.message).toBe(AUTH_MESSAGES.SIGNUP_SUCCESS);
      expect(result.current.isSuccess).toBe(true);
      expect(mockSuccess).toHaveBeenCalled();
      
      // Form should be cleared after signup
      expect(result.current.formData).toEqual({
        name: '',
        email: '',
        password: '',
      });
    });
  });

  describe('clearMessage', () => {
    it('should clear message and success state', () => {
      const { result } = renderHook(() => useAuthForm('login'));
      
      // Set a message
      act(() => {
        result.current.handleInputChange({
          target: { name: 'email', value: 'test' },
        } as any);
      });
      
      // Clear message
      act(() => {
        result.current.clearMessage();
      });
      
      expect(result.current.message).toBe('');
      expect(result.current.isSuccess).toBe(false);
    });
  });
});