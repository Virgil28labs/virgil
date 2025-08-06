import type { ReactElement } from 'react';
import type { RenderOptions } from '@testing-library/react';
import { render } from '@testing-library/react';
import { AllTheProviders } from './AllTheProviders';
import { timeService } from '../services/TimeService';

// Mock user for testing
export const mockUser = {
  id: 'test-user-id',
  email: 'test@example.com',
  app_metadata: {},
  user_metadata: {},
  aud: 'authenticated',
  created_at: '2024-01-01T00:00:00.000Z',
};

// Mock auth context value
export const mockAuthContextValue = {
  user: mockUser,
  loading: false,
  signOut: jest.fn(),
};

// Mock location context value
export const mockLocationContextValue = {
  currentLocation: { lat: 40.7128, lng: -74.0060 },
  locationError: null,
  locationLoading: false,
  address: '123 Test St, New York, NY 10001',
  ipLocation: { lat: 40.7128, lng: -74.0060 },
  hasGPSLocation: true,
  hasIpLocation: true,
  refreshLocation: jest.fn(),
  requestLocationPermission: jest.fn(),
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
    lastUpdated: timeService.toISOString(new Date()),
  },
  weatherLoading: false,
  weatherError: null,
  refreshWeather: jest.fn(),
};

// Custom render function that includes providers
const customRender = (
  ui: ReactElement,
  {
    authValue = mockAuthContextValue,
    locationValue = mockLocationContextValue,
    weatherValue = mockWeatherContextValue,
    ...renderOptions
  }: RenderOptions & {
    authValue?: typeof mockAuthContextValue;
    locationValue?: typeof mockLocationContextValue;
    weatherValue?: typeof mockWeatherContextValue;
  } = {},
) => {
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
    ...renderOptions,
  });
};

// Re-export everything
// eslint-disable-next-line react-refresh/only-export-components
export * from '@testing-library/react';
export { customRender as render };

// Utility functions for common test scenarios
export const waitForLoadingToFinish = () => {
  return new Promise(resolve => setTimeout(resolve, 0));
};
