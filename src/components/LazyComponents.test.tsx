import React, { Suspense } from 'react';
import { render, screen } from '@testing-library/react';
import {
  LazyRaccoonMascot,
  LazyVirgilChatbot,
} from './LazyComponents';
import { lazyWeatherService, lazyLocationService } from '../lib/lazyServices';

// Mock React.lazy to return resolved promises with proper component structure
jest.mock('react', () => ({
  ...jest.requireActual('react'),
  lazy: (importFn: () => Promise<{ default: React.ComponentType }>) => {
    const MockComponent = () => {
      // Determine which component based on the import function
      const importStr = importFn.toString();
      if (importStr.includes('RaccoonMascot')) {
        return <div data-testid="raccoon-mascot">Raccoon Mascot Component</div>;
      } else if (importStr.includes('VirgilChatbot')) {
        return <div data-testid="virgil-chatbot">Virgil Chatbot Component</div>;
      }
      return <div>Unknown Component</div>;
    };

    MockComponent.displayName = 'MockLazyComponent';
    return MockComponent;
  },
}));

// Mock the service imports
jest.mock('../lib/weatherService', () => ({
  weatherService: {
    getWeatherByCoordinates: jest.fn(),
    formatTemperature: jest.fn(),
    convertTemperature: jest.fn(),
  },
}));

jest.mock('../lib/locationService', () => ({
  locationService: {
    getIpLocation: jest.fn(),
    getAddressFromCoordinates: jest.fn(),
  },
}));

// Helper component for testing lazy loaded components
const TestWrapper = ({ children }: { children: React.ReactNode }) => (
  <Suspense fallback={<div data-testid="loading">Loading...</div>}>
    {children}
  </Suspense>
);

describe('LazyComponents', () => {
  describe('LazyRaccoonMascot', () => {
    it('renders the RaccoonMascot component', async () => {
      render(
        <TestWrapper>
          <LazyRaccoonMascot />
        </TestWrapper>,
      );

      // In test environment with mocked lazy, component loads immediately
      expect(screen.getByTestId('raccoon-mascot')).toBeInTheDocument();
      expect(screen.getByText('Raccoon Mascot Component')).toBeInTheDocument();
    });
  });

  describe('LazyVirgilChatbot', () => {
    it('renders the VirgilChatbot component', async () => {
      render(
        <TestWrapper>
          <LazyVirgilChatbot />
        </TestWrapper>,
      );

      expect(screen.getByTestId('virgil-chatbot')).toBeInTheDocument();
      expect(screen.getByText('Virgil Chatbot Component')).toBeInTheDocument();
    });
  });


  describe('Lazy Service Loaders', () => {
    it('lazy loads the weather service', async () => {
      const weatherService = await lazyWeatherService();

      expect(weatherService).toBeDefined();
      expect(weatherService.getWeatherByCoordinates).toBeDefined();
      expect(weatherService.convertTemperature).toBeDefined();
    });

    it('lazy loads the location service', async () => {
      const locationService = await lazyLocationService();

      expect(locationService).toBeDefined();
      expect(locationService.getIpLocation).toBeDefined();
      expect(locationService.getAddressFromCoordinates).toBeDefined();
    });
  });

  describe('Component availability', () => {
    it('provides all lazy components as valid React components', () => {
      // Verify that all lazy components are defined and can be used
      expect(LazyRaccoonMascot).toBeDefined();
      expect(LazyVirgilChatbot).toBeDefined();

      // In test environment, these are mocked but still valid components
      expect(typeof LazyRaccoonMascot).toBe('function');
      expect(typeof LazyVirgilChatbot).toBe('function');
    });

    it('allows multiple lazy components to be rendered together', () => {
      render(
        <TestWrapper>
          <div>
            <LazyRaccoonMascot />
            <LazyVirgilChatbot />
          </div>
        </TestWrapper>,
      );

      expect(screen.getByTestId('raccoon-mascot')).toBeInTheDocument();
      expect(screen.getByTestId('virgil-chatbot')).toBeInTheDocument();
    });
  });
});
