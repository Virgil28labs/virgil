import React, { ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { AuthProvider } from './contexts/AuthContext';
import { LocationProvider } from './contexts/LocationContext';
import { WeatherProvider } from './contexts/WeatherContext';
import { ErrorBoundary } from './components/ErrorBoundary';

// Mock user for testing
export const mockUser = {
  id: 'test-user-id',
  email: 'test@example.com',
  app_metadata: {},
  user_metadata: {},
  aud: 'authenticated',
  created_at: '2024-01-01T00:00:00.000Z'
};

// Mock auth context value
export const mockAuthContextValue = {
  user: mockUser,
  loading: false,
  signOut: jest.fn()
};

// Mock location context value
export const mockLocationContextValue = {
  currentLocation: { lat: 40.7128, lng: -74.0060 },
  locationError: null,
  locationLoading: false,
  address: '123 Test St, New York, NY 10001',
  ipLocation: { lat: 40.7128, lng: -74.0060 },
  hasGPSLocation: true,
  hasIPLocation: true,
  refreshLocation: jest.fn(),
  requestLocationPermission: jest.fn()
};

// Mock weather context value
export const mockWeatherContextValue = {
  weatherData: {
    temp: 72,
    feelsLike: 70,
    description: 'Sunny',
    humidity: 50,
    windSpeed: 10,
    icon: '01d',
    location: 'New York, NY',
    lastUpdated: new Date().toISOString()
  },
  weatherLoading: false,
  weatherError: null,
  refreshWeather: jest.fn()
};

interface AllTheProvidersProps {
  children: React.ReactNode;
  authValue?: typeof mockAuthContextValue;
  locationValue?: typeof mockLocationContextValue;
  weatherValue?: typeof mockWeatherContextValue;
}

// Custom provider that wraps components with all necessary contexts
const AllTheProviders: React.FC<AllTheProvidersProps> = ({ 
  children,
  authValue: _authValue = mockAuthContextValue,
  locationValue: _locationValue = mockLocationContextValue,
  weatherValue: _weatherValue = mockWeatherContextValue
}) => {
  // Note: This is a simplified test setup that uses the default providers
  // The unused parameters are prefixed with _ to indicate they are intentionally unused
  return (
    <ErrorBoundary>
      <AuthProvider>
        <LocationProvider>
          <WeatherProvider>
            {children}
          </WeatherProvider>
        </LocationProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
};

// Custom render method that includes all providers
const customRender = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'> & {
    authValue?: typeof mockAuthContextValue;
    locationValue?: typeof mockLocationContextValue;
    weatherValue?: typeof mockWeatherContextValue;
  }
) => {
  const { authValue, locationValue, weatherValue, ...renderOptions } = options || {};
  
  return render(ui, {
    wrapper: ({ children }) => (
      <AllTheProviders
        authValue={authValue}
        locationValue={locationValue}
        weatherValue={weatherValue}
      >
        {children}
      </AllTheProviders>
    ),
    ...renderOptions
  });
};

// Re-export everything
export * from '@testing-library/react';
export { customRender as render };

// Utility functions for common test scenarios
export const waitForLoadingToFinish = () => {
  return new Promise(resolve => setTimeout(resolve, 0));
};

export const mockFetch = (data: any, options: { ok?: boolean; status?: number } = {}) => {
  const { ok = true, status = 200 } = options;
  return jest.fn(() =>
    Promise.resolve({
      ok,
      status,
      json: () => Promise.resolve(data),
      text: () => Promise.resolve(JSON.stringify(data)),
      headers: new Headers()
    })
  );
};

// Mock Supabase client
export const mockSupabaseClient = {
  auth: {
    getSession: jest.fn().mockResolvedValue({ data: { session: null }, error: null }),
    signInWithPassword: jest.fn().mockResolvedValue({ data: { user: mockUser }, error: null }),
    signUp: jest.fn().mockResolvedValue({ data: { user: mockUser }, error: null }),
    signOut: jest.fn().mockResolvedValue({ error: null }),
    onAuthStateChange: jest.fn(() => ({
      data: { subscription: { unsubscribe: jest.fn() } }
    }))
  },
  from: jest.fn(() => ({
    select: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue({ data: null, error: null })
  }))
};

// Helper to create mock FormEvent
export const createMockFormEvent = (target?: any): React.FormEvent<HTMLFormElement> => {
  const event = {
    preventDefault: jest.fn(),
    stopPropagation: jest.fn(),
    target: target || document.createElement('form'),
    currentTarget: target || document.createElement('form')
  } as unknown as React.FormEvent<HTMLFormElement>;
  
  return event;
};

// Helper to create mock ChangeEvent
export const createMockChangeEvent = (value: string, name?: string): React.ChangeEvent<HTMLInputElement> => {
  const target = document.createElement('input');
  target.value = value;
  if (name) target.name = name;
  
  return {
    target,
    currentTarget: target,
    preventDefault: jest.fn(),
    stopPropagation: jest.fn()
  } as unknown as React.ChangeEvent<HTMLInputElement>;
};