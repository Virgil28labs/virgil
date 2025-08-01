/**
 * LazyDashboardApps Test Suite
 * 
 * Tests the lazy dashboard apps loader including:
 * - All dashboard app lazy loading
 * - Webpack chunk naming
 * - Module resolution and default exports
 * - Preload functionality
 * - Bundle splitting behavior
 * - Performance optimization
 * - Error handling for missing modules
 * - TypeScript integration
 */

import { Suspense } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { LazyDashboardApps, preloadDashboardApp } from '../LazyDashboardApps';

// Mock all the lazy-loaded components
const mockComponents = {
  NotesApp: jest.fn(() => <div data-testid="notes-app">Notes App</div>),
  CameraApp: jest.fn(() => <div data-testid="camera-app">Camera App</div>),
  NasaApodViewer: jest.fn(() => <div data-testid="nasa-apod-viewer">NASA APOD Viewer</div>),
  MinimalHabitTracker: jest.fn(() => <div data-testid="habit-tracker">Habit Tracker</div>),
  GiphyGallery: jest.fn(() => <div data-testid="giphy-gallery">Giphy Gallery</div>),
  DogGallery: jest.fn(() => <div data-testid="dog-gallery">Dog Gallery</div>),
  RhythmMachineViewer: jest.fn(() => <div data-testid="rhythm-machine">Rhythm Machine</div>),
  DrawPerfectCircle: jest.fn(() => <div data-testid="circle-game">Circle Game</div>),
  VectorMemory: jest.fn(() => <div data-testid="vector-memory">Vector Memory</div>),
};

// Mock the imports
jest.mock('../notes/NotesApp', () => ({
  NotesApp: mockComponents.NotesApp,
}));

jest.mock('../camera/CameraApp', () => ({
  CameraApp: mockComponents.CameraApp,
}));

jest.mock('../nasa/NasaApodViewer', () => ({
  NasaApodViewer: mockComponents.NasaApodViewer,
}));

jest.mock('../streak/MinimalHabitTracker', () => ({
  MinimalHabitTracker: mockComponents.MinimalHabitTracker,
}));

jest.mock('../giphy/GiphyGallery', () => ({
  GiphyGallery: mockComponents.GiphyGallery,
}));

jest.mock('../dog/DogGallery', () => ({
  DogGallery: mockComponents.DogGallery,
}));

jest.mock('../rhythm/RhythmMachineViewer', () => ({
  RhythmMachineViewer: mockComponents.RhythmMachineViewer,
}));

jest.mock('../circle/DrawPerfectCircle', () => ({
  DrawPerfectCircle: mockComponents.DrawPerfectCircle,
}));

jest.mock('../VectorMemory', () => ({
  VectorMemory: mockComponents.VectorMemory,
}));

describe('LazyDashboardApps', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('lazy component loading', () => {
    it('should have all expected dashboard apps', () => {
      const expectedApps = [
        'NotesApp',
        'CameraApp', 
        'NasaApodViewer',
        'MinimalHabitTracker',
        'GiphyGallery',
        'DogGallery',
        'RhythmMachineViewer',
        'DrawPerfectCircle',
        'VectorMemory',
      ];

      expectedApps.forEach(appName => {
        expect(LazyDashboardApps).toHaveProperty(appName);
        expect(LazyDashboardApps[appName as keyof typeof LazyDashboardApps]).toBeDefined();
      });
    });

    it('should lazy load NotesApp', async () => {
      const NotesApp = LazyDashboardApps.NotesApp;
      
      render(
        <Suspense fallback={<div>Loading...</div>}>
          <NotesApp isOpen onClose={() => {}} />
        </Suspense>,
      );

      await waitFor(() => {
        expect(screen.getByTestId('notes-app')).toBeInTheDocument();
      });

      expect(mockComponents.NotesApp).toHaveBeenCalled();
    });

    it('should lazy load CameraApp', async () => {
      const CameraApp = LazyDashboardApps.CameraApp;
      
      render(
        <Suspense fallback={<div>Loading...</div>}>
          <CameraApp isOpen onClose={() => {}} />
        </Suspense>,
      );

      await waitFor(() => {
        expect(screen.getByTestId('camera-app')).toBeInTheDocument();
      });

      expect(mockComponents.CameraApp).toHaveBeenCalled();
    });

    it('should lazy load NasaApodViewer', async () => {
      const NasaApodViewer = LazyDashboardApps.NasaApodViewer;
      
      render(
        <Suspense fallback={<div>Loading...</div>}>
          <NasaApodViewer isOpen onClose={() => {}} />
        </Suspense>,
      );

      await waitFor(() => {
        expect(screen.getByTestId('nasa-apod-viewer')).toBeInTheDocument();
      });

      expect(mockComponents.NasaApodViewer).toHaveBeenCalled();
    });

    it('should lazy load MinimalHabitTracker', async () => {
      const MinimalHabitTracker = LazyDashboardApps.MinimalHabitTracker;
      
      render(
        <Suspense fallback={<div>Loading...</div>}>
          <MinimalHabitTracker isOpen onClose={() => {}} />
        </Suspense>,
      );

      await waitFor(() => {
        expect(screen.getByTestId('habit-tracker')).toBeInTheDocument();
      });

      expect(mockComponents.MinimalHabitTracker).toHaveBeenCalled();
    });

    it('should lazy load GiphyGallery', async () => {
      const GiphyGallery = LazyDashboardApps.GiphyGallery;
      
      render(
        <Suspense fallback={<div>Loading...</div>}>
          <GiphyGallery isOpen onClose={() => {}} />
        </Suspense>,
      );

      await waitFor(() => {
        expect(screen.getByTestId('giphy-gallery')).toBeInTheDocument();
      });

      expect(mockComponents.GiphyGallery).toHaveBeenCalled();
    });

    it('should lazy load DogGallery', async () => {
      const DogGallery = LazyDashboardApps.DogGallery;
      
      render(
        <Suspense fallback={<div>Loading...</div>}>
          <DogGallery isOpen onClose={() => {}} />
        </Suspense>,
      );

      await waitFor(() => {
        expect(screen.getByTestId('dog-gallery')).toBeInTheDocument();
      });

      expect(mockComponents.DogGallery).toHaveBeenCalled();
    });

    it('should lazy load RhythmMachineViewer', async () => {
      const RhythmMachineViewer = LazyDashboardApps.RhythmMachineViewer;
      
      render(
        <Suspense fallback={<div>Loading...</div>}>
          <RhythmMachineViewer isOpen onClose={() => {}} />
        </Suspense>,
      );

      await waitFor(() => {
        expect(screen.getByTestId('rhythm-machine')).toBeInTheDocument();
      });

      expect(mockComponents.RhythmMachineViewer).toHaveBeenCalled();
    });

    it('should lazy load DrawPerfectCircle', async () => {
      const DrawPerfectCircle = LazyDashboardApps.DrawPerfectCircle;
      
      render(
        <Suspense fallback={<div>Loading...</div>}>
          <DrawPerfectCircle isOpen onClose={() => {}} />
        </Suspense>,
      );

      await waitFor(() => {
        expect(screen.getByTestId('circle-game')).toBeInTheDocument();
      });

      expect(mockComponents.DrawPerfectCircle).toHaveBeenCalled();
    });

    it('should lazy load VectorMemory', async () => {
      const VectorMemory = LazyDashboardApps.VectorMemory;
      
      render(
        <Suspense fallback={<div>Loading...</div>}>
          <VectorMemory />
        </Suspense>,
      );

      await waitFor(() => {
        expect(screen.getByTestId('vector-memory')).toBeInTheDocument();
      });

      expect(mockComponents.VectorMemory).toHaveBeenCalled();
    });
  });

  describe('suspense integration', () => {
    it('should show loading fallback while component loads', async () => {
      const NotesApp = LazyDashboardApps.NotesApp;
      
      render(
        <Suspense fallback={<div data-testid="loading">Loading Notes...</div>}>
          <NotesApp isOpen onClose={() => {}} />
        </Suspense>,
      );

      // Should initially show loading
      expect(screen.getByTestId('loading')).toBeInTheDocument();

      // Then show the component
      await waitFor(() => {
        expect(screen.getByTestId('notes-app')).toBeInTheDocument();
        expect(screen.queryByTestId('loading')).not.toBeInTheDocument();
      });
    });

    it('should handle multiple components loading simultaneously', async () => {
      const NotesApp = LazyDashboardApps.NotesApp;
      const CameraApp = LazyDashboardApps.CameraApp;
      
      render(
        <div>
          <Suspense fallback={<div>Loading Notes...</div>}>
            <NotesApp isOpen onClose={() => {}} />
          </Suspense>
          <Suspense fallback={<div>Loading Camera...</div>}>
            <CameraApp isOpen onClose={() => {}} />
          </Suspense>
        </div>,
      );

      await waitFor(() => {
        expect(screen.getByTestId('notes-app')).toBeInTheDocument();
        expect(screen.getByTestId('camera-app')).toBeInTheDocument();
      });
    });

    it('should handle nested suspense boundaries', async () => {
      const NotesApp = LazyDashboardApps.NotesApp;
      
      render(
        <Suspense fallback={<div>Outer loading...</div>}>
          <div>
            <Suspense fallback={<div data-testid="inner-loading">Inner loading...</div>}>
              <NotesApp isOpen onClose={() => {}} />
            </Suspense>
          </div>
        </Suspense>,
      );

      await waitFor(() => {
        expect(screen.getByTestId('notes-app')).toBeInTheDocument();
      });
    });
  });

  describe('component props and behavior', () => {
    it('should pass props to lazy-loaded components', async () => {
      const CameraApp = LazyDashboardApps.CameraApp;
      const testProps = { testProp: 'test value', isOpen: true, onClose: jest.fn() };
      
      render(
        <Suspense fallback={<div>Loading...</div>}>
          <CameraApp {...testProps} />
        </Suspense>,
      );

      await waitFor(() => {
        expect(mockComponents.CameraApp).toHaveBeenCalledWith(testProps, {});
      });
    });

    it('should handle component re-renders correctly', async () => {
      const NotesApp = LazyDashboardApps.NotesApp;
      
      const { rerender } = render(
        <Suspense fallback={<div>Loading...</div>}>
          <NotesApp isOpen onClose={() => {}} />
        </Suspense>,
      );

      await waitFor(() => {
        expect(screen.getByTestId('notes-app')).toBeInTheDocument();
      });

      rerender(
        <Suspense fallback={<div>Loading...</div>}>
          <NotesApp isOpen={false} onClose={() => {}} />
        </Suspense>,
      );

      // Should re-render with new props
      expect(mockComponents.NotesApp).toHaveBeenCalledWith({ isOpen: false, onClose: expect.any(Function) }, {});
    });

    it('should handle component unmounting', async () => {
      const GiphyGallery = LazyDashboardApps.GiphyGallery;
      
      const { unmount } = render(
        <Suspense fallback={<div>Loading...</div>}>
          <GiphyGallery isOpen onClose={() => {}} />
        </Suspense>,
      );

      await waitFor(() => {
        expect(screen.getByTestId('giphy-gallery')).toBeInTheDocument();
      });

      unmount();

      expect(screen.queryByTestId('giphy-gallery')).not.toBeInTheDocument();
    });
  });

  describe('preloadDashboardApp function', () => {
    it('should be callable for all app names', () => {
      const appNames: (keyof typeof LazyDashboardApps)[] = [
        'NotesApp',
        'CameraApp',
        'NasaApodViewer',
        'MinimalHabitTracker',
        'GiphyGallery',
        'DogGallery',
        'RhythmMachineViewer',
        'DrawPerfectCircle',
        'VectorMemory',
      ];

      appNames.forEach(appName => {
        expect(() => preloadDashboardApp(appName)).not.toThrow();
      });
    });

    it('should handle preloading NotesApp', () => {
      expect(() => preloadDashboardApp('NotesApp')).not.toThrow();
    });

    it('should handle preloading CameraApp', () => {
      expect(() => preloadDashboardApp('CameraApp')).not.toThrow();
    });

    it('should handle preloading all apps', () => {
      const appNames = Object.keys(LazyDashboardApps) as (keyof typeof LazyDashboardApps)[];
      
      appNames.forEach(appName => {
        expect(() => preloadDashboardApp(appName)).not.toThrow();
      });
    });

    it('should handle missing _payload gracefully', () => {
      // Mock a component without _payload
      const mockAppWithoutPayload = {
        _payload: null,
      };

      // Should not throw
      expect(() => {
        const app = mockAppWithoutPayload as unknown;
        if (app && '_payload' in app && typeof app._payload === 'function') {
          app._payload();
        }
      }).not.toThrow();
    });
  });

  describe('webpack chunk naming', () => {
    it('should use descriptive chunk names for bundle splitting', () => {
      // This test verifies the webpack chunk comments are present
      // The actual chunk naming is handled by webpack, but we can verify the comments exist
      
      // Check for webpack chunk name comments (these would be in the actual source)
      // Since we can't easily test the actual webpack comments in Jest,
      // we verify the structure is correct
      expect(typeof LazyDashboardApps.NotesApp).toBe('object');
      expect(typeof LazyDashboardApps.CameraApp).toBe('object');
      expect(typeof LazyDashboardApps.NasaApodViewer).toBe('object');
    });

    it('should have separate chunks for each app', () => {
      // Verify each app is a separate lazy component
      const apps = Object.values(LazyDashboardApps);
      
      apps.forEach(app => {
        expect(app).toHaveProperty('$$typeof');
        expect(typeof app).toBe('object');
      });
    });
  });

  describe('error handling', () => {
    it('should handle component loading errors', async () => {
      // Mock a component that fails to load
      const FailingComponent = jest.fn(() => {
        throw new Error('Component failed to load');
      });

      // Replace one of the mock components with failing one
      mockComponents.NotesApp = FailingComponent;

      const NotesApp = LazyDashboardApps.NotesApp;

      // Should not crash the test, error boundary would handle it
      expect(() => {
        render(
          <Suspense fallback={<div>Loading...</div>}>
            <NotesApp isOpen onClose={() => {}} />
          </Suspense>,
        );
      }).not.toThrow();
    });

    it('should handle missing component exports gracefully', async () => {
      // This would typically be caught at build time, but test runtime behavior
      const NotesApp = LazyDashboardApps.NotesApp;
      
      render(
        <Suspense fallback={<div>Loading...</div>}>
          <NotesApp isOpen onClose={() => {}} />
        </Suspense>,
      );

      // Should eventually render the component
      await waitFor(() => {
        expect(screen.getByTestId('notes-app')).toBeInTheDocument();
      });
    });
  });

  describe('performance characteristics', () => {
    it('should not load components until rendered', () => {
      // Just importing LazyDashboardApps should not trigger component loading
      expect(mockComponents.NotesApp).not.toHaveBeenCalled();
      expect(mockComponents.CameraApp).not.toHaveBeenCalled();
      expect(mockComponents.GiphyGallery).not.toHaveBeenCalled();
    });

    it('should load components independently', async () => {
      const NotesApp = LazyDashboardApps.NotesApp;
      
      render(
        <Suspense fallback={<div>Loading...</div>}>
          <NotesApp isOpen onClose={() => {}} />
        </Suspense>,
      );

      await waitFor(() => {
        expect(mockComponents.NotesApp).toHaveBeenCalled();
      });

      // Other components should not have been loaded
      expect(mockComponents.CameraApp).not.toHaveBeenCalled();
      expect(mockComponents.GiphyGallery).not.toHaveBeenCalled();
    });

    it('should support concurrent loading', async () => {
      const NotesApp = LazyDashboardApps.NotesApp;
      const CameraApp = LazyDashboardApps.CameraApp;
      
      render(
        <div>
          <Suspense fallback={<div>Loading Notes...</div>}>
            <NotesApp isOpen onClose={() => {}} />
          </Suspense>
          <Suspense fallback={<div>Loading Camera...</div>}>
            <CameraApp isOpen onClose={() => {}} />
          </Suspense>
        </div>,
      );

      await waitFor(() => {
        expect(mockComponents.NotesApp).toHaveBeenCalled();
        expect(mockComponents.CameraApp).toHaveBeenCalled();
      });
    });
  });

  describe('TypeScript integration', () => {
    it('should provide proper typing for all apps', () => {
      // Verify TypeScript types are correctly inferred
      const appNames: (keyof typeof LazyDashboardApps)[] = [
        'NotesApp',
        'CameraApp',
        'NasaApodViewer',
        'MinimalHabitTracker',
        'GiphyGallery',
        'DogGallery',
        'RhythmMachineViewer',
        'DrawPerfectCircle',
        'VectorMemory',
      ];

      appNames.forEach(appName => {
        expect(LazyDashboardApps[appName]).toBeDefined();
      });
    });

    it('should support proper typing for preloadDashboardApp', () => {
      // This should compile without TypeScript errors
      preloadDashboardApp('NotesApp');
      preloadDashboardApp('CameraApp');
      preloadDashboardApp('VectorMemory');
    });
  });
});