import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LoginForm } from './LoginForm';
import { supabase } from '../lib/supabase';

// Mock supabase
jest.mock('../lib/supabase');

// Mock useFocusManagement hook
jest.mock('../hooks/useFocusManagement', () => ({
  useFocusManagement: () => ({
    containerRef: { current: null }
  })
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
    localStorage.setItem('virgil_email', 'saved@example.com');
    
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
    const _user = userEvent.setup();
    const { container } = render(<LoginForm />);
    
    // Bypass HTML5 validation by calling submit directly
    const form = container.querySelector('form');
    
    // Mock form submission to bypass HTML5 validation
    fireEvent.submit(form!);
    
    await waitFor(() => {
      expect(screen.getByText('Please fill in all fields')).toBeInTheDocument();
    });
    
    expect(supabase.auth.signInWithPassword).not.toHaveBeenCalled();
  });

  it('handles successful login', async () => {
    const user = userEvent.setup();
    const mockUser = {
      id: 'test-id',
      email: 'test@example.com'
    };
    
    (supabase.auth.signInWithPassword as jest.Mock).mockResolvedValue({
      data: { user: mockUser },
      error: null
    });
    
    (supabase.auth.getSession as jest.Mock).mockResolvedValue({
      data: { session: { user: mockUser } },
      error: null
    });
    
    render(<LoginForm onSuccess={mockOnSuccess} />);
    
    const emailInput = screen.getByLabelText('Email:');
    const passwordInput = screen.getByLabelText('Password:');
    const submitButton = screen.getByRole('button', { name: 'Login' });
    
    await user.type(emailInput, 'test@example.com');
    await user.type(passwordInput, 'password123');
    await user.click(submitButton);
    
    await waitFor(() => {
      expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123'
      });
    });
    
    expect(screen.getByText('Login successful!')).toBeInTheDocument();
    expect(localStorage.getItem('virgil_email')).toBe('test@example.com');
    expect(mockOnSuccess).toHaveBeenCalled();
  });

  it('handles login error', async () => {
    const user = userEvent.setup();
    
    (supabase.auth.signInWithPassword as jest.Mock).mockResolvedValue({
      data: null,
      error: { message: 'Invalid credentials' }
    });
    
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
    
    (supabase.auth.signInWithPassword as jest.Mock).mockRejectedValue(new Error('Network error'));
    
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
    
    (supabase.auth.signInWithPassword as jest.Mock).mockImplementation(
      () => new Promise(resolve => setTimeout(() => resolve({ data: null, error: null }), 100))
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

  it('trims and lowercases email', async () => {
    const user = userEvent.setup();
    
    (supabase.auth.signInWithPassword as jest.Mock).mockResolvedValue({
      data: { user: { email: 'test@example.com' } },
      error: null
    });
    
    render(<LoginForm />);
    
    const emailInput = screen.getByLabelText('Email:');
    const passwordInput = screen.getByLabelText('Password:');
    const submitButton = screen.getByRole('button', { name: 'Login' });
    
    await user.type(emailInput, '  TEST@EXAMPLE.COM  ');
    await user.type(passwordInput, 'password123');
    await user.click(submitButton);
    
    await waitFor(() => {
      expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123'
      });
    });
  });

  it('clears password but keeps email after successful login', async () => {
    const user = userEvent.setup();
    
    (supabase.auth.signInWithPassword as jest.Mock).mockResolvedValue({
      data: { user: { email: 'test@example.com' } },
      error: null
    });
    
    (supabase.auth.getSession as jest.Mock).mockResolvedValue({
      data: { session: {} },
      error: null
    });
    
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