import type { FormEvent, ChangeEvent } from 'react';
import { useState, memo } from 'react';
import { supabase } from '../lib/supabase';

interface SignUpFormProps {
  onSuccess?: () => void;
}

interface FormData {
  name: string;
  email: string;
  password: string;
}

export const SignUpForm = memo(function SignUpForm({ onSuccess }: SignUpFormProps) {
  const [formData, setFormData] = useState<FormData>({
    name: '',
    email: '',
    password: '',
  });
  const [loading, setLoading] = useState<boolean>(false);
  const [message, setMessage] = useState<string>('');

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
    if (!formData.name.trim() || !formData.email.trim() || !formData.password.trim()) {
      setMessage('Please fill in all fields');
      setLoading(false);
      return;
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      setMessage('Please enter a valid email address');
      setLoading(false);
      return;
    }

    // Password validation
    if (formData.password.length < 6) {
      setMessage('Password must be at least 6 characters');
      setLoading(false);
      return;
    }

    try {
      const { error } = await supabase.auth.signUp({
        email: formData.email.trim().toLowerCase(),
        password: formData.password,
        options: {
          data: {
            name: formData.name.trim(),
          },
        },
      });

      if (error) {
        setMessage(error.message);
      } else {
        setMessage('Sign up successful! Please check your email to confirm your account.');
        setFormData({ name: '', email: '', password: '' });
        if (onSuccess) onSuccess();
      }
    } catch {
      setMessage('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="signup-form" role="form" aria-labelledby="signup-title">
      <h2 id="signup-title">Sign Up</h2>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
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
            aria-describedby={message ? 'signup-message' : 'password-help'}
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
            placeholder="Enter a password (min 6 characters)"
            disabled={loading}
            required
            minLength={6}
            aria-describedby="password-help"
            autoComplete="new-password"
          />
          <div id="password-help" className="sr-only">
            Password must be at least 6 characters long
          </div>
        </div>

        <button type="submit" disabled={loading}>
          {loading ? 'Signing Up...' : 'Sign Up'}
        </button>
      </form>

      {message && (
        <div
          id="signup-message"
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
