/**
 * useAuthForm - Shared authentication form logic
 * Reduces duplication between LoginForm and SignUpForm
 */

import type { FormEvent, ChangeEvent } from 'react';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { authService } from '../services/AuthService';
import { AUTH_CONFIG, AUTH_MESSAGES } from '../constants/auth.constants';
import { sanitizeInput } from '../lib/utils/validation';
import { getErrorMessage } from '../lib/errors';
import { logger } from '../lib/logger';

interface LoginFormData {
  email: string;
  password: string;
}

interface SignUpFormData extends LoginFormData {
  name: string;
}

type FormData<T extends 'login' | 'signup'> = T extends 'login' 
  ? LoginFormData 
  : SignUpFormData;

interface UseAuthFormReturn<T extends 'login' | 'signup'> {
  formData: FormData<T>;
  loading: boolean;
  message: string;
  isSuccess: boolean;
  handleSubmit: (e: FormEvent<HTMLFormElement>) => Promise<void>;
  handleInputChange: (e: ChangeEvent<HTMLInputElement>) => void;
  clearMessage: () => void;
}

export function useAuthForm<T extends 'login' | 'signup'>(
  mode: T,
  onSuccess?: () => void,
): UseAuthFormReturn<T> {
  // Initialize form data based on mode
  const initialData = useMemo(
    () => mode === 'login'
      ? { email: '', password: '' }
      : { name: '', email: '', password: '' },
    [mode],
  );
    
  const [formData, setFormData] = useState<FormData<T>>(initialData as FormData<T>);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);

  // Load saved email for login form
  useEffect(() => {
    if (mode === 'login') {
      try {
        const savedEmail = localStorage.getItem(AUTH_CONFIG.EMAIL_STORAGE_KEY);
        if (savedEmail) {
          setFormData(prev => ({ ...prev, email: savedEmail }));
        }
      } catch (error) {
        // Ignore localStorage errors
        logger.error('Failed to load saved email', error as Error, {
          component: 'useAuthForm',
          action: 'loadSavedEmail',
        });
      }
    }
  }, [mode]);

  // Handle input changes
  const handleInputChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
    
    // Clear message when user starts typing
    if (message) {
      setMessage('');
      setIsSuccess(false);
    }
  }, [message]);

  // Handle form submission
  const handleSubmit = useCallback(async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    setIsSuccess(false);

    try {
      if (mode === 'login') {
        const loginData = formData as LoginFormData;
        await authService.login({
          email: loginData.email,
          password: loginData.password,
        });
        
        // Save email for next time
        try {
          const cleanEmail = sanitizeInput(loginData.email.trim().toLowerCase());
          localStorage.setItem(AUTH_CONFIG.EMAIL_STORAGE_KEY, cleanEmail);
        } catch (error) {
          // Non-critical error
          logger.error('Failed to save email', error as Error, {
            component: 'useAuthForm',
            action: 'saveEmail',
          });
        }
        
        setMessage(AUTH_MESSAGES.LOGIN_SUCCESS);
        setIsSuccess(true);
        
        // Clear only password, keep email
        setFormData(prev => ({ ...prev, password: '' }));
        
        // Force a session refresh to ensure AuthContext updates
        await authService.getSession();
        
      } else {
        const signUpData = formData as SignUpFormData;
        await authService.signUp({
          name: signUpData.name,
          email: signUpData.email,
          password: signUpData.password,
        });
        
        setMessage(AUTH_MESSAGES.SIGNUP_SUCCESS);
        setIsSuccess(true);
        
        // Clear form
        setFormData(initialData as FormData<T>);
      }
      
      // Call success callback if provided
      if (onSuccess) {
        onSuccess();
      }
      
    } catch (error) {
      const errorMessage = getErrorMessage(error);
      setMessage(errorMessage);
      setIsSuccess(false);
      
      logger.error(`${mode} form error`, error as Error, {
        component: 'useAuthForm',
        action: mode,
      });
    } finally {
      setLoading(false);
    }
  }, [mode, formData, onSuccess, initialData]);

  // Clear message
  const clearMessage = useCallback(() => {
    setMessage('');
    setIsSuccess(false);
  }, []);

  return {
    formData,
    loading,
    message,
    isSuccess,
    handleSubmit,
    handleInputChange,
    clearMessage,
  };
}