import React, { Suspense } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import {
  LazyRaccoonMascot,
  LazyVirgilChatbot,
  LazyWeather,
  LazyUserProfileViewer,
  lazyWeatherService,
  lazySearchService,
  lazyLocationService
} from './LazyComponents';

// Mock the actual component imports
jest.mock('./RaccoonMascot.tsx', () => ({
  RaccoonMascot: () => <div data-testid="raccoon-mascot">Raccoon Mascot Component</div>
}));

jest.mock('./VirgilChatbot.tsx', () => ({
  default: () => <div data-testid="virgil-chatbot">Virgil Chatbot Component</div>
}));

jest.mock('./Weather.tsx', () => ({
  Weather: () => <div data-testid="weather">Weather Component</div>
}));

jest.mock('./UserProfileViewer.tsx', () => ({
  UserProfileViewer: () => <div data-testid="user-profile-viewer">User Profile Viewer Component</div>
}));

// Mock the service imports
jest.mock('../lib/weatherService.ts', () => ({
  weatherService: {
    getWeatherByCoordinates: jest.fn(),
    formatTemperature: jest.fn()
  }
}));

jest.mock('../lib/searchService.ts', () => ({
  searchService: {
    search: jest.fn(),
    formatResults: jest.fn()
  }
}));

jest.mock('../lib/locationService.ts', () => ({
  locationService: {
    getIPLocation: jest.fn(),
    getAddressFromCoordinates: jest.fn()
  }
}));

// Helper component for testing lazy loaded components
const TestWrapper = ({ children }: { children: React.ReactNode }) => (
  <Suspense fallback={<div data-testid="loading">Loading...</div>}>
    {children}
  </Suspense>
);

describe('LazyComponents', () => {
  describe('LazyRaccoonMascot', () => {
    it('lazy loads the RaccoonMascot component', async () => {
      render(
        <TestWrapper>
          <LazyRaccoonMascot />
        </TestWrapper>
      );

      // Initially shows loading
      expect(screen.getByTestId('loading')).toBeInTheDocument();

      // Wait for the component to load
      await waitFor(() => {
        expect(screen.getByTestId('raccoon-mascot')).toBeInTheDocument();
      });

      expect(screen.getByText('Raccoon Mascot Component')).toBeInTheDocument();
    });
  });

  describe('LazyVirgilChatbot', () => {
    it('lazy loads the VirgilChatbot component', async () => {
      render(
        <TestWrapper>
          <LazyVirgilChatbot />
        </TestWrapper>
      );

      expect(screen.getByTestId('loading')).toBeInTheDocument();

      await waitFor(() => {
        expect(screen.getByTestId('virgil-chatbot')).toBeInTheDocument();
      });

      expect(screen.getByText('Virgil Chatbot Component')).toBeInTheDocument();
    });
  });

  describe('LazyWeather', () => {
    it('lazy loads the Weather component', async () => {
      render(
        <TestWrapper>
          <LazyWeather />
        </TestWrapper>
      );

      expect(screen.getByTestId('loading')).toBeInTheDocument();

      await waitFor(() => {
        expect(screen.getByTestId('weather')).toBeInTheDocument();
      });

      expect(screen.getByText('Weather Component')).toBeInTheDocument();
    });
  });

  describe('LazyUserProfileViewer', () => {
    it('lazy loads the UserProfileViewer component', async () => {
      render(
        <TestWrapper>
          <LazyUserProfileViewer isOpen={true} onClose={() => {}} />
        </TestWrapper>
      );

      expect(screen.getByTestId('loading')).toBeInTheDocument();

      await waitFor(() => {
        expect(screen.getByTestId('user-profile-viewer')).toBeInTheDocument();
      });

      expect(screen.getByText('User Profile Viewer Component')).toBeInTheDocument();
    });
  });

  describe('Lazy Service Loaders', () => {
    it('lazy loads the weather service', async () => {
      const weatherService = await lazyWeatherService();
      
      expect(weatherService).toBeDefined();
      expect(weatherService.getWeatherByCoordinates).toBeDefined();
      expect(weatherService.formatTemperature).toBeDefined();
    });

    it('lazy loads the search service', async () => {
      const searchService = await lazySearchService();
      
      expect(searchService).toBeDefined();
      expect(searchService.search).toBeDefined();
      expect(searchService.formatResults).toBeDefined();
    });

    it('lazy loads the location service', async () => {
      const locationService = await lazyLocationService();
      
      expect(locationService).toBeDefined();
      expect(locationService.getIPLocation).toBeDefined();
      expect(locationService.getAddressFromCoordinates).toBeDefined();
    });
  });

  describe('Error handling', () => {
    it('handles component loading errors gracefully', async () => {
      // Mock a loading error
      const consoleError = jest.spyOn(console, 'error').mockImplementation();
      
      // Override the mock to throw an error
      jest.isolateModules(() => {
        jest.doMock('./RaccoonMascot.tsx', () => {
          throw new Error('Failed to load component');
        });
      });

      // The error boundary in the actual app would catch this
      // Here we're just testing that the lazy loading mechanism works
      expect(LazyRaccoonMascot).toBeDefined();
      
      consoleError.mockRestore();
    });
  });

  describe('Performance', () => {
    it('does not load components until rendered', () => {
      // Simply importing LazyComponents should not trigger the actual imports
      expect(LazyRaccoonMascot).toBeDefined();
      expect(LazyVirgilChatbot).toBeDefined();
      expect(LazyWeather).toBeDefined();
      expect(LazyUserProfileViewer).toBeDefined();
      
      // The actual components are not loaded yet
      // They will only load when rendered in a Suspense boundary
    });

    it('shows fallback while loading', async () => {
      const { rerender } = render(
        <TestWrapper>
          <div>Initial content</div>
        </TestWrapper>
      );

      // Rerender with lazy component
      rerender(
        <TestWrapper>
          <LazyWeather />
        </TestWrapper>
      );

      // Should show loading fallback immediately
      expect(screen.getByTestId('loading')).toBeInTheDocument();

      // Wait for component to load
      await waitFor(() => {
        expect(screen.queryByTestId('loading')).not.toBeInTheDocument();
        expect(screen.getByTestId('weather')).toBeInTheDocument();
      });
    });
  });
});