import type { ReactNode } from 'react';
import React from 'react';
import { AuthProvider } from '../contexts/AuthContext';
import { LocationProvider } from '../contexts/LocationContext';
import { WeatherProvider } from '../contexts/WeatherContext';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { mockAuthContextValue, mockLocationContextValue, mockWeatherContextValue } from './test-utils';

interface AllTheProvidersProps {
  children: ReactNode;
  authValue?: typeof mockAuthContextValue;
  locationValue?: typeof mockLocationContextValue;
  weatherValue?: typeof mockWeatherContextValue;
}

// Custom provider that wraps components with all necessary contexts
export const AllTheProviders: React.FC<AllTheProvidersProps> = ({ 
  children,
  authValue: _authValue = mockAuthContextValue,
  locationValue: _locationValue = mockLocationContextValue,
  weatherValue: _weatherValue = mockWeatherContextValue,
}) => {
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