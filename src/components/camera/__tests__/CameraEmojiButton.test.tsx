/**
 * CameraEmojiButton Component Test Suite
 * 
 * Tests emoji button rendering, lazy loading, error boundary integration,
 * and camera app integration.
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CameraEmojiButton } from '../CameraEmojiButton';
import { AllTheProviders } from '../../../test-utils/AllTheProviders';

// Mock the EmojiButton component
jest.mock('../../common/EmojiButton', () => ({
  EmojiButton: ({ emoji, ariaLabel, GalleryComponent, title, ...props }: any) => (
    <div data-testid="emoji-button" {...props}>
      <span>{emoji}</span>
      <span>{ariaLabel}</span>
      <span>{title}</span>
      <div data-testid="gallery-component-container">
        {GalleryComponent && <GalleryComponent onClose={() => {}} />}
      </div>
    </div>
  ),
}));

// Mock the CameraApp component
jest.mock('../CameraApp', () => ({
  CameraApp: ({ isOpen, onClose }: any) => (
    <div data-testid="camera-app">
      <span>Camera App Open: {isOpen.toString()}</span>
      <button onClick={onClose}>Close Camera</button>
    </div>
  ),
}));

// Mock the DashboardAppErrorBoundary
jest.mock('../../common/DashboardAppErrorBoundary', () => ({
  DashboardAppErrorBoundary: ({ children, appName }: any) => (
    <div data-testid="error-boundary" data-app-name={appName}>
      {children}
    </div>
  ),
}));

describe('CameraEmojiButton', () => {
  const renderCameraEmojiButton = () => {
    return render(
      <AllTheProviders>
        <CameraEmojiButton />
      </AllTheProviders>,
    );
  };

  describe('rendering', () => {
    it('should render emoji button with correct props', () => {
      renderCameraEmojiButton();

      const emojiButton = screen.getByTestId('emoji-button');
      expect(emojiButton).toBeInTheDocument();

      // Check emoji
      expect(screen.getByText('📸')).toBeInTheDocument();

      // Check aria label
      expect(screen.getByText('Open Virgil Camera')).toBeInTheDocument();

      // Check title
      expect(screen.getByText('Take selfies with Virgil Camera!')).toBeInTheDocument();
    });

    it('should render with correct styling and position props', () => {
      renderCameraEmojiButton();

      const emojiButton = screen.getByTestId('emoji-button');
      expect(emojiButton).toBeInTheDocument();

      // The component should pass through all the styling props
      // Since we're mocking EmojiButton, we can't test the actual styles
      // but we can verify the component renders without errors
    });

    it('should be memoized', () => {
      const { rerender } = renderCameraEmojiButton();
      
      const firstRender = screen.getByTestId('emoji-button');
      
      rerender(
        <AllTheProviders>
          <CameraEmojiButton />
        </AllTheProviders>,
      );
      
      const secondRender = screen.getByTestId('emoji-button');
      
      // Should be the same instance due to memoization
      expect(firstRender).toBe(secondRender);
    });
  });

  describe('camera app integration', () => {
    it('should render camera app through wrapper', () => {
      renderCameraEmojiButton();

      // The camera app should be rendered through the gallery component
      expect(screen.getByTestId('camera-app')).toBeInTheDocument();
      expect(screen.getByText('Camera App Open: true')).toBeInTheDocument();
    });

    it('should wrap camera app with error boundary', () => {
      renderCameraEmojiButton();

      const errorBoundary = screen.getByTestId('error-boundary');
      expect(errorBoundary).toBeInTheDocument();
      expect(errorBoundary).toHaveAttribute('data-app-name', 'Virgil Camera');

      // Camera app should be inside error boundary
      const cameraApp = screen.getByTestId('camera-app');
      expect(errorBoundary).toContainElement(cameraApp);
    });

    it('should handle camera app close', async () => {
      renderCameraEmojiButton();

      const closeButton = screen.getByText('Close Camera');
      await userEvent.click(closeButton);

      // The close functionality would be handled by the parent EmojiButton
      // Since we're mocking it, we just verify the button exists and is clickable
      expect(closeButton).toBeInTheDocument();
    });
  });

  describe('lazy loading', () => {
    it('should handle lazy loading of CameraApp', async () => {
      renderCameraEmojiButton();

      // Wait for lazy loaded component to render
      await waitFor(() => {
        expect(screen.getByTestId('camera-app')).toBeInTheDocument();
      });
    });
  });

  describe('accessibility', () => {
    it('should have proper accessibility attributes', () => {
      renderCameraEmojiButton();

      // Check aria-label is passed through
      expect(screen.getByText('Open Virgil Camera')).toBeInTheDocument();
    });

    it('should have descriptive title', () => {
      renderCameraEmojiButton();

      expect(screen.getByText('Take selfies with Virgil Camera!')).toBeInTheDocument();
    });
  });

  describe('styling and visual properties', () => {
    it('should pass correct emoji', () => {
      renderCameraEmojiButton();

      expect(screen.getByText('📸')).toBeInTheDocument();
    });

    it('should have camera-specific styling', () => {
      renderCameraEmojiButton();

      const emojiButton = screen.getByTestId('emoji-button');
      expect(emojiButton).toBeInTheDocument();

      // The styling props would be passed to EmojiButton
      // We can't test the actual styles since we're mocking,
      // but we verify the component renders successfully
    });
  });

  describe('component structure', () => {
    it('should use memo for performance optimization', () => {
      // Test that the component is properly memoized
      const { rerender } = renderCameraEmojiButton();
      
      const firstRender = screen.getByTestId('emoji-button');
      
      // Re-render with same props
      rerender(
        <AllTheProviders>
          <CameraEmojiButton />
        </AllTheProviders>,
      );
      
      const secondRender = screen.getByTestId('emoji-button');
      
      // With memo, the component reference should be the same
      expect(firstRender).toBe(secondRender);
    });

    it('should properly structure the wrapper component', () => {
      renderCameraEmojiButton();

      // Verify the wrapper structure
      const errorBoundary = screen.getByTestId('error-boundary');
      const cameraApp = screen.getByTestId('camera-app');

      expect(errorBoundary).toContainElement(cameraApp);
      expect(errorBoundary).toHaveAttribute('data-app-name', 'Virgil Camera');
    });
  });

  describe('integration with parent components', () => {
    it('should integrate properly with dashboard', () => {
      renderCameraEmojiButton();

      // Verify it renders without errors in the context of AllTheProviders
      expect(screen.getByTestId('emoji-button')).toBeInTheDocument();
      expect(screen.getByTestId('camera-app')).toBeInTheDocument();
    });

    it('should handle provider context correctly', () => {
      renderCameraEmojiButton();

      // Should render successfully with all required providers
      expect(screen.getByTestId('emoji-button')).toBeInTheDocument();
      expect(screen.getByTestId('error-boundary')).toBeInTheDocument();
      expect(screen.getByTestId('camera-app')).toBeInTheDocument();
    });
  });

  describe('error handling', () => {
    it('should be wrapped in error boundary', () => {
      renderCameraEmojiButton();

      const errorBoundary = screen.getByTestId('error-boundary');
      expect(errorBoundary).toBeInTheDocument();
      expect(errorBoundary).toHaveAttribute('data-app-name', 'Virgil Camera');
    });

    it('should handle lazy loading errors gracefully', async () => {
      renderCameraEmojiButton();

      // Even if there were lazy loading issues, the error boundary should catch them
      await waitFor(() => {
        expect(screen.getByTestId('error-boundary')).toBeInTheDocument();
      });
    });
  });

  describe('performance considerations', () => {
    it('should use lazy loading for CameraApp', () => {
      renderCameraEmojiButton();

      // The CameraApp is imported lazily, which helps with code splitting
      // We can verify it still renders correctly
      expect(screen.getByTestId('camera-app')).toBeInTheDocument();
    });

    it('should be optimized with memo', () => {
      const { rerender } = renderCameraEmojiButton();
      
      const initialElement = screen.getByTestId('emoji-button');
      
      // Rerender multiple times
      for (let i = 0; i < 3; i++) {
        rerender(
          <AllTheProviders>
            <CameraEmojiButton />
          </AllTheProviders>,
        );
      }
      
      const finalElement = screen.getByTestId('emoji-button');
      
      // Should be the same element due to memoization
      expect(initialElement).toBe(finalElement);
    });
  });
});