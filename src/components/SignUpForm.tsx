import { memo } from 'react';
import { useAuthForm } from '../hooks/useAuthForm';
import { AUTH_CONFIG } from '../constants/auth.constants';
import styles from './AuthPage.module.css';

interface SignUpFormProps {
  onSuccess?: () => void;
}

/**
 * Sign up form component with proper validation
 * Uses centralized auth logic from useAuthForm hook
 */
export const SignUpForm = memo(function SignUpForm({ onSuccess }: SignUpFormProps) {
  const {
    formData,
    loading,
    message,
    isSuccess,
    handleSubmit,
    handleInputChange,
  } = useAuthForm('signup', onSuccess);

  return (
    <div className={styles.signupForm} role="form" aria-labelledby="signup-title">
      <h2 id="signup-title">Sign Up</h2>
      <form onSubmit={handleSubmit}>
        <div className={styles.formGroup}>
          <label htmlFor="name">Name:</label>
          <input
            type="text"
            id="name"
            name="name"
            value={formData.name}
            onChange={handleInputChange}
            placeholder="Enter your full name"
            disabled={loading}
            required
            aria-describedby={message ? 'signup-message' : undefined}
            autoComplete="name"
          />
        </div>

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
            aria-describedby={message ? 'signup-message' : 'password-help'}
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
            placeholder={`Enter a password (min ${AUTH_CONFIG.MIN_PASSWORD_LENGTH} characters)`}
            disabled={loading}
            required
            minLength={AUTH_CONFIG.MIN_PASSWORD_LENGTH}
            aria-describedby="password-help"
            autoComplete="new-password"
          />
          <div id="password-help" className="sr-only">
            Password must be at least {AUTH_CONFIG.MIN_PASSWORD_LENGTH} characters long
          </div>
        </div>

        <button type="submit" disabled={loading}>
          {loading ? 'Signing Up...' : 'Sign Up'}
        </button>
      </form>

      {message && (
        <div
          id="signup-message"
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
