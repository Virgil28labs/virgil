import React, { memo } from 'react';
import { useAuthForm } from '../hooks/useAuthForm';
import { useFocusManagement } from '../hooks/useFocusManagement';
import styles from './AuthPage.module.css';

interface LoginFormProps {
  onSuccess?: () => void;
}

/**
 * Login form component with automatic email remembering
 * Uses centralized auth logic from useAuthForm hook
 */
export const LoginForm = memo(function LoginForm({ onSuccess }: LoginFormProps) {
  const {
    formData,
    loading,
    message,
    isSuccess,
    handleSubmit,
    handleInputChange,
  } = useAuthForm('login', onSuccess);

  // Focus management for login form
  const { containerRef } = useFocusManagement(true, {
    autoFocus: true,
    initialFocusSelector: 'input[type="email"]',
  });

  return (
    <div ref={containerRef as React.RefObject<HTMLDivElement>} className={styles.loginForm} role="form" aria-labelledby="login-title">
      <h2 id="login-title">Login</h2>
      <form onSubmit={handleSubmit}>
        <div className={styles.formGroup}>
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

        <div className={styles.formGroup}>
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
          className={`${styles.message} ${isSuccess ? styles.success : styles.error}`}
          role="alert"
          aria-live="polite"
        >
          <span aria-hidden="true">
            {isSuccess ? '✅ ' : '❌ '}
          </span>
          {message}
        </div>
      )}
    </div>
  );
});
