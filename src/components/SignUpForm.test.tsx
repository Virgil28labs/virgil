import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SignUpForm } from './SignUpForm';
import { supabase } from '../lib/supabase';
import { assertElement } from '../test-utils/domHelpers';

// Mock supabase
jest.mock('../lib/supabase');

describe('SignUpForm', () => {
  const mockOnSuccess = jest.fn();
  
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders sign up form with all fields', () => {
    render(<SignUpForm />);
    
    expect(screen.getByRole('form')).toBeInTheDocument();
    expect(screen.getByLabelText('Name:')).toBeInTheDocument();
    expect(screen.getByLabelText('Email:')).toBeInTheDocument();
    expect(screen.getByLabelText('Password:')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sign Up' })).toBeInTheDocument();
  });

  it('handles form input changes', async () => {
    const user = userEvent.setup();
    render(<SignUpForm />);
    
    const nameInput = screen.getByLabelText('Name:');
    const emailInput = screen.getByLabelText('Email:');
    const passwordInput = screen.getByLabelText('Password:');
    
    await user.type(nameInput, 'Test User');
    await user.type(emailInput, 'newuser@example.com');
    await user.type(passwordInput, 'password123');
    
    expect(nameInput).toHaveValue('Test User');
    expect(emailInput).toHaveValue('newuser@example.com');
    expect(passwordInput).toHaveValue('password123');
  });

  it('validates empty fields when bypassing HTML validation', async () => {
    const { container } = render(<SignUpForm />);
    
    // Bypass HTML5 validation by calling submit directly
    const form = container.querySelector('form');
    const validForm = assertElement(form, 'Form not found');
    fireEvent.submit(validForm);
    
    await waitFor(() => {
      expect(screen.getByText('Please fill in all fields')).toBeInTheDocument();
    });
    
    expect(supabase.auth.signUp).not.toHaveBeenCalled();
  });

  it('validates email format', async () => {
    const user = userEvent.setup();
    const { container } = render(<SignUpForm />);
    
    const nameInput = screen.getByLabelText('Name:');
    const emailInput = screen.getByLabelText('Email:') as HTMLInputElement;
    const passwordInput = screen.getByLabelText('Password:');
    const form = container.querySelector('form') as HTMLFormElement;
    
    // Disable HTML5 validation
    form.setAttribute('novalidate', 'true');
    
    await user.type(nameInput, 'Test User');
    await user.type(emailInput, 'invalid-email');
    await user.type(passwordInput, 'password123');
    
    fireEvent.submit(form);
    
    await waitFor(() => {
      expect(screen.getByText('Please enter a valid email address')).toBeInTheDocument();
    });
    
    expect(supabase.auth.signUp).not.toHaveBeenCalled();
  });

  it('validates password length', async () => {
    const user = userEvent.setup();
    const { container } = render(<SignUpForm />);
    
    const nameInput = screen.getByLabelText('Name:');
    const emailInput = screen.getByLabelText('Email:');
    const passwordInput = screen.getByLabelText('Password:');
    const form = container.querySelector('form') as HTMLFormElement;
    
    // Disable HTML5 validation
    form.setAttribute('novalidate', 'true');
    
    await user.type(nameInput, 'Test User');
    await user.type(emailInput, 'test@example.com');
    await user.type(passwordInput, '12345');
    
    fireEvent.submit(form);
    
    await waitFor(() => {
      expect(screen.getByText('Password must be at least 6 characters')).toBeInTheDocument();
    });
    
    expect(supabase.auth.signUp).not.toHaveBeenCalled();
  });

  it('handles successful sign up', async () => {
    const user = userEvent.setup();
    const mockUser = {
      id: 'test-id',
      email: 'newuser@example.com',
    };
    
    (supabase.auth.signUp as jest.Mock).mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });
    
    render(<SignUpForm onSuccess={mockOnSuccess} />);
    
    const nameInput = screen.getByLabelText('Name:');
    const emailInput = screen.getByLabelText('Email:');
    const passwordInput = screen.getByLabelText('Password:');
    const submitButton = screen.getByRole('button', { name: 'Sign Up' });
    
    await user.type(nameInput, 'Test User');
    await user.type(emailInput, 'newuser@example.com');
    await user.type(passwordInput, 'password123');
    await user.click(submitButton);
    
    await waitFor(() => {
      expect(supabase.auth.signUp).toHaveBeenCalledWith({
        email: 'newuser@example.com',
        password: 'password123',
        options: {
          data: {
            name: 'Test User',
          },
        },
      });
    });
    
    expect(screen.getByText(/check your email/i)).toBeInTheDocument();
    expect(mockOnSuccess).toHaveBeenCalled();
  });

  it('handles sign up error', async () => {
    const user = userEvent.setup();
    
    (supabase.auth.signUp as jest.Mock).mockResolvedValue({
      data: null,
      error: { message: 'User already exists' },
    });
    
    render(<SignUpForm />);
    
    const nameInput = screen.getByLabelText('Name:');
    const emailInput = screen.getByLabelText('Email:');
    const passwordInput = screen.getByLabelText('Password:');
    const submitButton = screen.getByRole('button', { name: 'Sign Up' });
    
    await user.type(nameInput, 'Test User');
    await user.type(emailInput, 'existing@example.com');
    await user.type(passwordInput, 'password123');
    await user.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByText('User already exists')).toBeInTheDocument();
    });
    
    const errorMessage = screen.getByRole('alert');
    expect(errorMessage).toHaveClass('error');
  });

  it('handles network error', async () => {
    const user = userEvent.setup();
    
    (supabase.auth.signUp as jest.Mock).mockRejectedValue(new Error('Network error'));
    
    render(<SignUpForm />);
    
    const nameInput = screen.getByLabelText('Name:');
    const emailInput = screen.getByLabelText('Email:');
    const passwordInput = screen.getByLabelText('Password:');
    const submitButton = screen.getByRole('button', { name: 'Sign Up' });
    
    await user.type(nameInput, 'Test User');
    await user.type(emailInput, 'test@example.com');
    await user.type(passwordInput, 'password123');
    await user.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByText('Network error. Please try again.')).toBeInTheDocument();
    });
  });

  it('disables form during submission', async () => {
    const user = userEvent.setup();
    
    (supabase.auth.signUp as jest.Mock).mockImplementation(
      () => new Promise(resolve => setTimeout(() => resolve({ data: null, error: null }), 100)),
    );
    
    render(<SignUpForm />);
    
    const nameInput = screen.getByLabelText('Name:');
    const emailInput = screen.getByLabelText('Email:');
    const passwordInput = screen.getByLabelText('Password:');
    const submitButton = screen.getByRole('button', { name: 'Sign Up' });
    
    await user.type(nameInput, 'Test User');
    await user.type(emailInput, 'test@example.com');
    await user.type(passwordInput, 'password123');
    await user.click(submitButton);
    
    expect(nameInput).toBeDisabled();
    expect(emailInput).toBeDisabled();
    expect(passwordInput).toBeDisabled();
    expect(submitButton).toBeDisabled();
    expect(submitButton).toHaveTextContent('Signing Up...');
    
    await waitFor(() => {
      expect(nameInput).not.toBeDisabled();
    });
  });

  it('trims and lowercases email', async () => {
    const user = userEvent.setup();
    
    (supabase.auth.signUp as jest.Mock).mockResolvedValue({
      data: { user: { email: 'test@example.com' } },
      error: null,
    });
    
    render(<SignUpForm />);
    
    const nameInput = screen.getByLabelText('Name:');
    const emailInput = screen.getByLabelText('Email:');
    const passwordInput = screen.getByLabelText('Password:');
    const submitButton = screen.getByRole('button', { name: 'Sign Up' });
    
    await user.type(nameInput, '  Test User  ');
    await user.type(emailInput, '  TEST@EXAMPLE.COM  ');
    await user.type(passwordInput, 'password123');
    await user.click(submitButton);
    
    await waitFor(() => {
      expect(supabase.auth.signUp).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
        options: {
          data: {
            name: 'Test User',
          },
        },
      });
    });
  });

  it('clears form after successful sign up', async () => {
    const user = userEvent.setup();
    
    (supabase.auth.signUp as jest.Mock).mockResolvedValue({
      data: { user: { email: 'test@example.com' } },
      error: null,
    });
    
    render(<SignUpForm />);
    
    const nameInput = screen.getByLabelText('Name:');
    const emailInput = screen.getByLabelText('Email:');
    const passwordInput = screen.getByLabelText('Password:');
    const submitButton = screen.getByRole('button', { name: 'Sign Up' });
    
    await user.type(nameInput, 'Test User');
    await user.type(emailInput, 'test@example.com');
    await user.type(passwordInput, 'password123');
    await user.click(submitButton);
    
    await waitFor(() => {
      expect(nameInput).toHaveValue('');
      expect(emailInput).toHaveValue('');
      expect(passwordInput).toHaveValue('');
    });
  });

  it('has proper accessibility attributes', () => {
    render(<SignUpForm />);
    
    const nameInput = screen.getByLabelText('Name:');
    expect(nameInput).toHaveAttribute('type', 'text');
    expect(nameInput).toHaveAttribute('required');
    expect(nameInput).toHaveAttribute('autoComplete', 'name');
    
    const emailInput = screen.getByLabelText('Email:');
    expect(emailInput).toHaveAttribute('type', 'email');
    expect(emailInput).toHaveAttribute('required');
    expect(emailInput).toHaveAttribute('autoComplete', 'email');
    
    const passwordInput = screen.getByLabelText('Password:');
    expect(passwordInput).toHaveAttribute('type', 'password');
    expect(passwordInput).toHaveAttribute('required');
    expect(passwordInput).toHaveAttribute('autoComplete', 'new-password');
    expect(passwordInput).toHaveAttribute('minLength', '6');
  });

  it('shows password help text for screen readers', () => {
    render(<SignUpForm />);
    
    const passwordHelp = screen.getByText('Password must be at least 6 characters long');
    expect(passwordHelp).toHaveClass('sr-only');
  });
});