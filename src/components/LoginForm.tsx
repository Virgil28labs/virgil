import type { FormEvent, ChangeEvent } from 'react';
import React, { useState, useEffect, memo } from 'react';
import { supabase } from '../lib/supabase';
import { useFocusManagement } from '../hooks/useFocusManagement';

interface LoginFormProps {
  onSuccess?: () => void;
}

interface FormData {
  email: string;
  password: string;
}

/**
 * Login form component with automatic email remembering
 * Saves email to localStorage on successful login for convenience
 */
export const LoginForm = memo(function LoginForm({ onSuccess }: LoginFormProps) {
  const [formData, setFormData] = useState<FormData>({
    email: '',
    password: '',
  });
  const [loading, setLoading] = useState<boolean>(false);
  const [message, setMessage] = useState<string>('');

  // Focus management for login form
  const { containerRef } = useFocusManagement(true, {
    autoFocus: true,
    initialFocusSelector: 'input[type="email"]',
  });

  // Load saved email on component mount
  useEffect(() => {
    try {
      const savedEmail = localStorage.getItem('virgil_email');
      if (savedEmail) {
        setFormData(prev => ({ ...prev, email: savedEmail }));
      }
    } catch {
      // Ignore localStorage errors
    }
  }, []);

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>): void => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    // Basic validation
    if (!formData.email.trim() || !formData.password.trim()) {
      setMessage('Please fill in all fields');
      setLoading(false);
      return;
    }

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: formData.email.trim().toLowerCase(),
        password: formData.password,
      });

      if (error) {
        setMessage(error.message);
      } else {
        setMessage('Login successful!');
        
        // Save email for next time
        try {
          localStorage.setItem('virgil_email', formData.email.trim().toLowerCase());
        } catch {
          // Ignore localStorage errors
        }
        
        // Clear only password, keep email
        setFormData(prev => ({ ...prev, password: '' }));
        
        // Force a session refresh to ensure AuthContext updates
        await supabase.auth.getSession();
        
        if (onSuccess) onSuccess();
      }
    } catch {
      setMessage('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div ref={containerRef as React.RefObject<HTMLDivElement>} className="login-form" role="form" aria-labelledby="login-title">
      <h2 id="login-title">Login</h2>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="email">Email:</label>
          <input
            type="email"
            id="email"
            name="email"
            value={formData.email}
            onChange={handleInputChange}
            placeholder="Enter your email address"
            disabled={loading}
            required
            aria-describedby={message ? 'login-message' : undefined}
            autoComplete="email"
          />
        </div>
        
        <div className="form-group">
          <label htmlFor="password">Password:</label>
          <input
            type="password"
            id="password"
            name="password"
            value={formData.password}
            onChange={handleInputChange}
            placeholder="Enter your password"
            disabled={loading}
            required
            aria-describedby={message ? 'login-message' : undefined}
            autoComplete="current-password"
          />
        </div>
        
        <button type="submit" disabled={loading}>
          {loading ? 'Logging in...' : 'Login'}
        </button>
      </form>
      
      {message && (
        <div 
          id="login-message"
          className={`message ${message.includes('successful') ? 'success' : 'error'}`}
          role="alert"
          aria-live="polite"
        >
          <span aria-hidden="true">
            {message.includes('successful') ? '✅ ' : '❌ '}
          </span>
          {message}
        </div>
      )}
    </div>
  );
});