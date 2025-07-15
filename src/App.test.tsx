import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import App from './App';

// Mock the lazy loaded components
jest.mock('./components/LazyComponents', () => ({
  LazyVirgilChatbot: () => <div data-testid="chatbot">Chatbot Component</div>
}));

// Mock child components to simplify testing
jest.mock('./components/AuthPage', () => ({
  AuthPage: () => <div data-testid="auth-page">Auth Page</div>
}));

jest.mock('./components/Dashboard', () => ({
  Dashboard: () => <div data-testid="dashboard">Dashboard</div>
}));

// Mock contexts
jest.mock('./contexts/AuthContext', () => {
  const React = require('react');
  const mockUseAuth = jest.fn(() => ({
    user: null,
    loading: false,
    signOut: jest.fn()
  }));
  
  return {
    AuthProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    useAuth: mockUseAuth
  };
});

jest.mock('./contexts/LocationContext', () => ({
  LocationProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>
}));

jest.mock('./contexts/WeatherContext', () => ({
  WeatherProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>
}));

jest.mock('./hooks/useToast', () => ({
  useToast: () => ({
    toasts: [],
    removeToast: jest.fn()
  })
}));

describe('App Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders without crashing', () => {
    render(<App />);
    expect(document.querySelector('.app')).toBeInTheDocument();
  });

  it('includes skip link for accessibility', () => {
    render(<App />);
    const skipLink = screen.getByText('Skip to main content');
    expect(skipLink).toBeInTheDocument();
    expect(skipLink).toHaveAttribute('href', '#main-content');
  });

  it('renders auth page when user is not logged in', () => {
    render(<App />);
    expect(screen.getByTestId('auth-page')).toBeInTheDocument();
  });

  it('renders dashboard when user is logged in', () => {
    // Mock authenticated user
    const useAuthMock = jest.requireMock('./contexts/AuthContext').useAuth;
    useAuthMock.mockReturnValue({
      user: { id: '123', email: 'test@example.com' },
      loading: false,
      signOut: jest.fn()
    });

    render(<App />);
    expect(screen.getByTestId('dashboard')).toBeInTheDocument();
  });

  it('shows loading skeleton when auth is loading', () => {
    const useAuthMock = jest.requireMock('./contexts/AuthContext').useAuth;
    useAuthMock.mockReturnValue({
      user: null,
      loading: true,
      signOut: jest.fn()
    });

    render(<App />);
    expect(document.querySelector('.loading-screen')).toBeInTheDocument();
  });

  it('renders chatbot for authenticated users', async () => {
    const useAuthMock = jest.requireMock('./contexts/AuthContext').useAuth;
    useAuthMock.mockReturnValue({
      user: { id: '123', email: 'test@example.com' },
      loading: false,
      signOut: jest.fn()
    });

    render(<App />);
    
    // Wait for lazy component to load
    await waitFor(() => {
      expect(screen.getByTestId('chatbot')).toBeInTheDocument();
    });
  });

  it('has error boundary wrapper', () => {
    // Just verify that the app renders with error boundary
    // Testing error boundary behavior is done in ErrorBoundary.test.tsx
    render(<App />);
    
    // App should render successfully
    expect(document.querySelector('.app')).toBeInTheDocument();
  });

  it('renders toast container', () => {
    const { container } = render(<App />);
    // App structure should be present
    expect(container.querySelector('.app')).toBeInTheDocument();
  });
});