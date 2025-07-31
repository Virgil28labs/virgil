import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LoginForm } from './LoginForm';
import { authService } from '../services/AuthService';
import { AUTH_CONFIG } from '../constants/auth.constants';
import { AuthError, ValidationError } from '../lib/errors';

// Mock AuthService
jest.mock('../services/AuthService');

// Mock useFocusManagement hook
jest.mock('../hooks/useFocusManagement', () => ({
  useFocusManagement: () => ({
    containerRef: { current: null },
  }),
}));

describe('LoginForm', () => {
  const mockOnSuccess = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
  });

  it('renders login form with all fields', () => {
    render(<LoginForm />);

    expect(screen.getByRole('form')).toBeInTheDocument();
    expect(screen.getByLabelText('Email:')).toBeInTheDocument();
    expect(screen.getByLabelText('Password:')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Login' })).toBeInTheDocument();
  });

  it('loads saved email from localStorage', () => {
    localStorage.setItem(AUTH_CONFIG.EMAIL_STORAGE_KEY, 'saved@example.com');

    render(<LoginForm />);

    const emailInput = screen.getByLabelText('Email:') as HTMLInputElement;
    expect(emailInput.value).toBe('saved@example.com');
  });

  it('handles form input changes', async () => {
    const user = userEvent.setup();
    render(<LoginForm />);

    const emailInput = screen.getByLabelText('Email:');
    const passwordInput = screen.getByLabelText('Password:');

    await user.type(emailInput, 'test@example.com');
    await user.type(passwordInput, 'password123');

    expect(emailInput).toHaveValue('test@example.com');
    expect(passwordInput).toHaveValue('password123');
  });

  it('validates empty fields when bypassing HTML validation', async () => {
    const { container } = render(<LoginForm />);
    
    // Mock validation error from AuthService
    (authService.login as jest.Mock).mockRejectedValueOnce(
      new ValidationError('Please fill in all fields'),
    );

    // Bypass HTML5 validation by calling submit directly
    const form = container.querySelector('form');

    // Mock form submission to bypass HTML5 validation
    if (form) {
      fireEvent.submit(form);
    }

    await waitFor(() => {
      expect(screen.getByText('Please fill in all fields')).toBeInTheDocument();
    });
  });

  it('handles successful login', async () => {
    const user = userEvent.setup();

    // AuthService mock already returns success by default

    render(<LoginForm onSuccess={mockOnSuccess} />);

    const emailInput = screen.getByLabelText('Email:');
    const passwordInput = screen.getByLabelText('Password:');
    const submitButton = screen.getByRole('button', { name: 'Login' });

    await user.type(emailInput, 'test@example.com');
    await user.type(passwordInput, 'password123');
    await user.click(submitButton);

    await waitFor(() => {
      expect(authService.login).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
      });
    });

    expect(screen.getByText('Login successful!')).toBeInTheDocument();
    expect(localStorage.getItem(AUTH_CONFIG.EMAIL_STORAGE_KEY)).toBe('test@example.com');
    expect(mockOnSuccess).toHaveBeenCalled();
  });

  it('handles login error', async () => {
    const user = userEvent.setup();

    (authService.login as jest.Mock).mockRejectedValueOnce(
      new AuthError('Invalid credentials'),
    );

    render(<LoginForm />);

    const emailInput = screen.getByLabelText('Email:');
    const passwordInput = screen.getByLabelText('Password:');
    const submitButton = screen.getByRole('button', { name: 'Login' });

    await user.type(emailInput, 'test@example.com');
    await user.type(passwordInput, 'wrongpassword');
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Invalid credentials')).toBeInTheDocument();
    });

    const errorMessage = screen.getByRole('alert');
    expect(errorMessage).toHaveClass('error');
  });

  it('handles network error', async () => {
    const user = userEvent.setup();

    (authService.login as jest.Mock).mockRejectedValueOnce(
      new Error('Network error. Please try again.'),
    );

    render(<LoginForm />);

    const emailInput = screen.getByLabelText('Email:');
    const passwordInput = screen.getByLabelText('Password:');
    const submitButton = screen.getByRole('button', { name: 'Login' });

    await user.type(emailInput, 'test@example.com');
    await user.type(passwordInput, 'password123');
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Network error. Please try again.')).toBeInTheDocument();
    });
  });

  it('disables form during submission', async () => {
    const user = userEvent.setup();

    (authService.login as jest.Mock).mockImplementation(
      () => new Promise(resolve => setTimeout(() => resolve({ user: {}, session: {} }), 100)),
    );

    render(<LoginForm />);

    const emailInput = screen.getByLabelText('Email:');
    const passwordInput = screen.getByLabelText('Password:');
    const submitButton = screen.getByRole('button', { name: 'Login' });

    await user.type(emailInput, 'test@example.com');
    await user.type(passwordInput, 'password123');
    await user.click(submitButton);

    expect(emailInput).toBeDisabled();
    expect(passwordInput).toBeDisabled();
    expect(submitButton).toBeDisabled();
    expect(submitButton).toHaveTextContent('Logging in...');

    await waitFor(() => {
      expect(emailInput).not.toBeDisabled();
    });
  });

  it('passes raw email to AuthService which handles lowercasing', async () => {
    const user = userEvent.setup();

    // AuthService mock already returns success by default

    render(<LoginForm />);

    const emailInput = screen.getByLabelText('Email:');
    const passwordInput = screen.getByLabelText('Password:');
    const submitButton = screen.getByRole('button', { name: 'Login' });

    await user.type(emailInput, 'TEST@EXAMPLE.COM');
    await user.type(passwordInput, 'password123');
    await user.click(submitButton);

    // useAuthForm passes raw input to AuthService (HTML input trims spaces automatically)
    await waitFor(() => {
      expect(authService.login).toHaveBeenCalledWith({
        email: 'TEST@EXAMPLE.COM',
        password: 'password123',
      });
    });

    // AuthService handles the lowercasing internally, and the lowercased email is saved
    await waitFor(() => {
      expect(localStorage.getItem(AUTH_CONFIG.EMAIL_STORAGE_KEY)).toBe('test@example.com');
    });
  });

  it('clears password but keeps email after successful login', async () => {
    const user = userEvent.setup();

    // AuthService mock already returns success by default

    render(<LoginForm />);

    const emailInput = screen.getByLabelText('Email:');
    const passwordInput = screen.getByLabelText('Password:');
    const submitButton = screen.getByRole('button', { name: 'Login' });

    await user.type(emailInput, 'test@example.com');
    await user.type(passwordInput, 'password123');
    await user.click(submitButton);

    await waitFor(() => {
      expect(emailInput).toHaveValue('test@example.com');
      expect(passwordInput).toHaveValue('');
    });
  });

  it('has proper accessibility attributes', () => {
    render(<LoginForm />);

    const form = screen.getByRole('form');
    expect(form).toHaveAttribute('aria-labelledby', 'login-title');

    const emailInput = screen.getByLabelText('Email:');
    expect(emailInput).toHaveAttribute('type', 'email');
    expect(emailInput).toHaveAttribute('required');
    expect(emailInput).toHaveAttribute('autoComplete', 'email');

    const passwordInput = screen.getByLabelText('Password:');
    expect(passwordInput).toHaveAttribute('type', 'password');
    expect(passwordInput).toHaveAttribute('required');
    expect(passwordInput).toHaveAttribute('autoComplete', 'current-password');
  });
});
