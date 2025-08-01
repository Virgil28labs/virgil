/**
 * Indicators Component Test Suite
 * 
 * Tests visual indicators for raccoon state (wall sticking, UI element interaction).
 * Simple conditional rendering component with different indicator types.
 */

import { render, screen } from '@testing-library/react';
import { Indicators } from '../Indicators';

// Mock styles
jest.mock('../raccoonStyles', () => ({
  styles: {
    indicator: {
      position: 'absolute',
      fontSize: '18px',
      pointerEvents: 'none',
      zIndex: 5,
    },
    wallIndicator: {
      top: '-35px',
      left: '50%',
      transform: 'translateX(-50%)',
      animation: 'pulse 1s infinite',
    },
    uiIndicator: {
      top: '-40px',
      left: '50%',
      transform: 'translateX(-50%)',
      animation: 'bounce 0.5s ease-out',
      fontSize: '20px',
    },
  },
}));

describe('Indicators', () => {
  const defaultProps = {
    isOnWall: false,
    isOnUIElement: false,
    currentRaccoonEmoji: '🦝',
  };

  describe('Wall Indicator', () => {
    it('renders wall indicator when isOnWall is true', () => {
      render(<Indicators {...defaultProps} isOnWall />);
      
      expect(screen.getByText('🧲')).toBeInTheDocument();
    });

    it('does not render wall indicator when isOnWall is false', () => {
      render(<Indicators {...defaultProps} isOnWall={false} />);
      
      expect(screen.queryByText('🧲')).not.toBeInTheDocument();
    });

    it('applies correct styles to wall indicator', () => {
      render(<Indicators {...defaultProps} isOnWall />);
      
      const wallIndicator = screen.getByText('🧲');
      
      // Check that styles are applied through style prop
      const parentDiv = wallIndicator.parentElement;
      expect(parentDiv).toHaveStyle({
        position: 'absolute',
        fontSize: '18px',
        pointerEvents: 'none',
        zIndex: '5',
        top: '-35px',
        left: '50%',
        transform: 'translateX(-50%)',
        animation: 'pulse 1s infinite',
      });
    });
  });

  describe('UI Element Indicator', () => {
    it('renders UI indicator when isOnUIElement is true', () => {
      render(<Indicators {...defaultProps} isOnUIElement />);
      
      expect(screen.getByText('🦝')).toBeInTheDocument();
    });

    it('does not render UI indicator when isOnUIElement is false', () => {
      render(<Indicators {...defaultProps} isOnUIElement={false} />);
      
      expect(screen.queryByText('🦝')).not.toBeInTheDocument();
    });

    it('displays correct emoji from currentRaccoonEmoji prop', () => {
      render(<Indicators {...defaultProps} isOnUIElement currentRaccoonEmoji="⚡" />);
      
      expect(screen.getByText('⚡')).toBeInTheDocument();
      expect(screen.queryByText('🦝')).not.toBeInTheDocument();
    });

    it('applies correct styles to UI indicator', () => {
      render(<Indicators {...defaultProps} isOnUIElement />);
      
      const uiIndicator = screen.getByText('🦝');
      const parentDiv = uiIndicator.parentElement;
      
      expect(parentDiv).toHaveStyle({
        position: 'absolute',
        fontSize: '20px', // UI indicator has larger font size
        pointerEvents: 'none',
        zIndex: '5',
        top: '-40px',
        left: '50%',
        transform: 'translateX(-50%)',
        animation: 'bounce 0.5s ease-out',
      });
    });

    it('handles different raccoon emojis', () => {
      const emojis = ['🦝', '⚡', '🌤️', '🐾', '🍃'];

      emojis.forEach(emoji => {
        const { rerender } = render(
          <Indicators {...defaultProps} isOnUIElement currentRaccoonEmoji={emoji} />,
        );
        
        expect(screen.getByText(emoji)).toBeInTheDocument();
        
        rerender(
          <Indicators {...defaultProps} isOnUIElement={false} currentRaccoonEmoji={emoji} />,
        );
        
        expect(screen.queryByText(emoji)).not.toBeInTheDocument();
      });
    });
  });

  describe('Multiple Indicators', () => {
    it('renders both indicators when both conditions are true', () => {
      render(<Indicators {...defaultProps} isOnWall isOnUIElement />);
      
      expect(screen.getByText('🧲')).toBeInTheDocument();
      expect(screen.getByText('🦝')).toBeInTheDocument();
    });

    it('renders neither indicator when both conditions are false', () => {
      render(<Indicators {...defaultProps} isOnWall={false} isOnUIElement={false} />);
      
      expect(screen.queryByText('🧲')).not.toBeInTheDocument();
      expect(screen.queryByText('🦝')).not.toBeInTheDocument();
    });

    it('positions indicators correctly when both are shown', () => {
      render(<Indicators {...defaultProps} isOnWall isOnUIElement />);
      
      const wallIndicator = screen.getByText('🧲').parentElement;
      const uiIndicator = screen.getByText('🦝').parentElement;
      
      // Wall indicator should be at -35px
      expect(wallIndicator).toHaveStyle({ top: '-35px' });
      
      // UI indicator should be at -40px (higher up)
      expect(uiIndicator).toHaveStyle({ top: '-40px' });
    });
  });

  describe('Accessibility', () => {
    it('indicators are decorative and do not interfere with interaction', () => {
      render(<Indicators {...defaultProps} isOnWall isOnUIElement />);
      
      const indicators = screen.getAllByText(/[🧲🦝]/u);
      indicators.forEach(indicator => {
        const parentDiv = indicator.parentElement;
        expect(parentDiv).toHaveStyle({ pointerEvents: 'none' });
      });
    });

    it('uses semantic emoji content for screen readers', () => {
      render(<Indicators {...defaultProps} isOnWall />);
      
      // Wall indicator uses magnet emoji which is semantic for "sticking"
      const wallIndicator = screen.getByText('🧲');
      expect(wallIndicator).toBeInTheDocument();
    });

    it('UI indicator reflects current interaction context', () => {
      // Test power button interaction
      render(<Indicators {...defaultProps} isOnUIElement currentRaccoonEmoji="⚡" />);
      expect(screen.getByText('⚡')).toBeInTheDocument();
      
      // Test weather widget interaction
      render(<Indicators {...defaultProps} isOnUIElement currentRaccoonEmoji="⛅" />);
      expect(screen.getByText('⛅')).toBeInTheDocument();
    });
  });

  describe('Performance', () => {
    it('renders minimal DOM structure', () => {
      const { container } = render(<Indicators {...defaultProps} isOnWall isOnUIElement />);
      
      // Should only render necessary elements
      const allDivs = container.querySelectorAll('div');
      expect(allDivs.length).toBe(2); // One for each indicator
    });

    it('conditionally renders only needed indicators', () => {
      const { container, rerender } = render(<Indicators {...defaultProps} />);
      
      // Initially no indicators
      expect(container.children.length).toBe(1); // Fragment wrapper
      expect(container.textContent).toBe('');
      
      // Add wall indicator
      rerender(<Indicators {...defaultProps} isOnWall />);
      expect(screen.getByText('🧲')).toBeInTheDocument();
      
      // Add UI indicator
      rerender(<Indicators {...defaultProps} isOnWall isOnUIElement />);
      expect(screen.getByText('🧲')).toBeInTheDocument();
      expect(screen.getByText('🦝')).toBeInTheDocument();
      
      // Remove all indicators
      rerender(<Indicators {...defaultProps} />);
      expect(screen.queryByText('🧲')).not.toBeInTheDocument();
      expect(screen.queryByText('🦝')).not.toBeInTheDocument();
    });
  });

  describe('Props Validation', () => {
    it('handles boolean props correctly', () => {
      // Test all combinations
      const combinations = [
        { isOnWall: true, isOnUIElement: true },
        { isOnWall: true, isOnUIElement: false },
        { isOnWall: false, isOnUIElement: true },
        { isOnWall: false, isOnUIElement: false },
      ];

      combinations.forEach(({ isOnWall, isOnUIElement }) => {
        render(
          <Indicators 
            {...defaultProps} 
            isOnWall={isOnWall} 
            isOnUIElement={isOnUIElement} 
          />,
        );

        if (isOnWall) {
          expect(screen.getByText('🧲')).toBeInTheDocument();
        } else {
          expect(screen.queryByText('🧲')).not.toBeInTheDocument();
        }

        if (isOnUIElement) {
          expect(screen.getByText('🦝')).toBeInTheDocument();
        } else {
          expect(screen.queryByText('🦝')).not.toBeInTheDocument();
        }
      });
    });

    it('handles empty currentRaccoonEmoji gracefully', () => {
      render(<Indicators {...defaultProps} isOnUIElement currentRaccoonEmoji="" />);
      
      // Should render empty indicator div
      const indicators = document.querySelectorAll('div');
      expect(indicators.length).toBe(1);
    });

    it('handles special characters in currentRaccoonEmoji', () => {
      const specialEmojis = ['🏠', '🌟', '💝', '🎉', '🔥'];

      specialEmojis.forEach(emoji => {
        render(
          <Indicators {...defaultProps} isOnUIElement currentRaccoonEmoji={emoji} />,
        );
        
        expect(screen.getByText(emoji)).toBeInTheDocument();
      });
    });
  });

  describe('Animation States', () => {
    it('applies different animations to different indicators', () => {
      render(<Indicators {...defaultProps} isOnWall isOnUIElement />);
      
      const wallIndicator = screen.getByText('🧲').parentElement;
      const uiIndicator = screen.getByText('🦝').parentElement;
      
      // Wall indicator should have pulse animation
      expect(wallIndicator).toHaveStyle({ animation: 'pulse 1s infinite' });
      
      // UI indicator should have bounce animation
      expect(uiIndicator).toHaveStyle({ animation: 'bounce 0.5s ease-out' });
    });

    it('maintains consistent positioning across different states', () => {
      render(<Indicators {...defaultProps} isOnWall isOnUIElement />);
      
      const indicators = document.querySelectorAll('div');
      indicators.forEach(indicator => {
        expect(indicator).toHaveStyle({
          left: '50%',
          transform: 'translateX(-50%)',
        });
      });
    });
  });
});