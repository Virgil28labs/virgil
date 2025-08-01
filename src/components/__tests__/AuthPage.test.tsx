import { render, screen, fireEvent } from '@testing-library/react';
import { AuthPage } from '../AuthPage';

// Mock the child components
jest.mock('../SignUpForm', () => ({
  SignUpForm: () => <div data-testid="signup-form">Sign Up Form</div>,
}));

jest.mock('../LoginForm', () => ({
  LoginForm: () => <div data-testid="login-form">Login Form</div>,
}));

jest.mock('../raccoon/RaccoonMascot', () => ({
  RaccoonMascot: () => <div data-testid="raccoon-mascot">Raccoon Mascot</div>,
}));

describe('AuthPage', () => {
  it('renders with login form by default', () => {
    render(<AuthPage />);

    expect(screen.getByText('Virgil')).toBeInTheDocument();
    expect(screen.getByTestId('login-form')).toBeInTheDocument();
    expect(screen.queryByTestId('signup-form')).not.toBeInTheDocument();
    expect(screen.getByTestId('raccoon-mascot')).toBeInTheDocument();
  });

  it('renders toggle buttons with correct states', () => {
    render(<AuthPage />);

    const loginButton = screen.getByRole('tab', { name: 'Switch to login form' });
    const signupButton = screen.getByRole('tab', { name: 'Switch to sign up form' });

    expect(loginButton).toHaveClass('active');
    expect(loginButton).toHaveAttribute('aria-selected', 'true');
    expect(signupButton).not.toHaveClass('active');
    expect(signupButton).toHaveAttribute('aria-selected', 'false');
  });

  it('switches to signup form when signup button clicked', () => {
    render(<AuthPage />);

    const signupButton = screen.getByRole('tab', { name: 'Switch to sign up form' });
    fireEvent.click(signupButton);

    expect(screen.getByTestId('signup-form')).toBeInTheDocument();
    expect(screen.queryByTestId('login-form')).not.toBeInTheDocument();
    expect(signupButton).toHaveClass('active');
    expect(signupButton).toHaveAttribute('aria-selected', 'true');
  });

  it('switches back to login form when login button clicked', () => {
    render(<AuthPage />);

    // First switch to signup
    const signupButton = screen.getByRole('tab', { name: 'Switch to sign up form' });
    fireEvent.click(signupButton);

    // Then switch back to login
    const loginButton = screen.getByRole('tab', { name: 'Switch to login form' });
    fireEvent.click(loginButton);

    expect(screen.getByTestId('login-form')).toBeInTheDocument();
    expect(screen.queryByTestId('signup-form')).not.toBeInTheDocument();
  });

  it('shows correct switch message for login state', () => {
    render(<AuthPage />);

    expect(screen.getByText('No account?')).toBeInTheDocument();
    expect(screen.getByText('Sign up here')).toBeInTheDocument();
  });

  it('shows correct switch message for signup state', () => {
    render(<AuthPage />);

    const signupButton = screen.getByRole('tab', { name: 'Switch to sign up form' });
    fireEvent.click(signupButton);

    expect(screen.getByText('Have account?')).toBeInTheDocument();
    expect(screen.getByText('Login here')).toBeInTheDocument();
  });

  it('switches forms using the link buttons', () => {
    render(<AuthPage />);

    // Click "Sign up here" link
    const signupLink = screen.getByText('Sign up here');
    fireEvent.click(signupLink);

    expect(screen.getByTestId('signup-form')).toBeInTheDocument();

    // Click "Login here" link
    const loginLink = screen.getByText('Login here');
    fireEvent.click(loginLink);

    expect(screen.getByTestId('login-form')).toBeInTheDocument();
  });

  it('has proper ARIA attributes for accessibility', () => {
    render(<AuthPage />);

    // Check tablist
    const tablist = screen.getByRole('tablist');
    expect(tablist).toHaveAttribute('aria-label', 'Authentication mode selection');

    // Check tabs
    const loginTab = screen.getByRole('tab', { name: 'Switch to login form' });
    expect(loginTab).toHaveAttribute('id', 'login-tab');
    expect(loginTab).toHaveAttribute('aria-controls', 'auth-form-panel');

    const signupTab = screen.getByRole('tab', { name: 'Switch to sign up form' });
    expect(signupTab).toHaveAttribute('id', 'signup-tab');
    expect(signupTab).toHaveAttribute('aria-controls', 'auth-form-panel');

    // Check tabpanel
    const tabpanel = screen.getByRole('tabpanel');
    expect(tabpanel).toHaveAttribute('id', 'auth-form-panel');
    expect(tabpanel).toHaveAttribute('aria-labelledby', 'login-tab');
  });

  it('updates aria-labelledby when switching forms', () => {
    render(<AuthPage />);

    const tabpanel = screen.getByRole('tabpanel');
    const signupButton = screen.getByRole('tab', { name: 'Switch to sign up form' });

    // Initially should be labeled by login tab
    expect(tabpanel).toHaveAttribute('aria-labelledby', 'login-tab');

    // Switch to signup
    fireEvent.click(signupButton);

    // Should now be labeled by signup tab
    expect(tabpanel).toHaveAttribute('aria-labelledby', 'signup-tab');
  });

  it('maintains consistent layout structure', () => {
    const { container } = render(<AuthPage />);

    expect(container.querySelector('.auth-page')).toBeInTheDocument();
    expect(container.querySelector('.auth-content')).toBeInTheDocument();
    expect(container.querySelector('.auth-container')).toBeInTheDocument();
    expect(container.querySelector('.auth-toggle')).toBeInTheDocument();
    expect(container.querySelector('.auth-switch')).toBeInTheDocument();
  });
});
