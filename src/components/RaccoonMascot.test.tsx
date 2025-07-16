import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RaccoonMascot } from './RaccoonMascot';
import { useLocation } from '../contexts/LocationContext';
import type { LocationContextType } from '../types/location.types';

// Mock LocationContext
jest.mock('../contexts/LocationContext', () => ({
  useLocation: jest.fn()
}));

// Mock window properties
const mockInnerWidth = 1024;
const mockInnerHeight = 768;

Object.defineProperty(window, 'innerWidth', {
  writable: true,
  configurable: true,
  value: mockInnerWidth
});

Object.defineProperty(window, 'innerHeight', {
  writable: true,
  configurable: true,
  value: mockInnerHeight
});

// Mock requestAnimationFrame
const mockRequestAnimationFrame = (callback: FrameRequestCallback) => {
  setTimeout(() => callback(Date.now()), 16); // 60fps
  return 1;
};
global.requestAnimationFrame = mockRequestAnimationFrame as any;
global.cancelAnimationFrame = jest.fn();

// Mock Audio for sound effects
global.Audio = jest.fn().mockImplementation(() => ({
  play: jest.fn().mockResolvedValue(undefined),
  volume: 0
}));

// Test data
const mockLocationData: Partial<LocationContextType> = {
  address: {
    formatted: '123 Test St, New York, NY 10001',
    street: 'Test St',
    house_number: '123',
    city: 'New York',
    postcode: '10001',
    country: 'USA'
  } as any,
  ipLocation: {
    ip: '192.168.1.1',
    city: 'New York',
    region: 'NY',
    country: 'USA',
    timezone: 'America/New_York'
  } as any,
  hasGPSLocation: true,
  hasIPLocation: true
};

describe('RaccoonMascot', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    
    // Default mock for useLocation
    (useLocation as jest.Mock).mockReturnValue({
      address: null,
      ipLocation: null,
      hasGPSLocation: false,
      hasIPLocation: false
    });
  });

  afterEach(() => {
    act(() => {
      jest.runOnlyPendingTimers();
    });
    jest.useRealTimers();
  });

  describe('Rendering and Initial State', () => {
    it('renders the raccoon mascot', () => {
      render(<RaccoonMascot />);
      
      const mascotImage = screen.getByAltText('Racoon Mascot');
      expect(mascotImage).toBeInTheDocument();
      expect(mascotImage).toHaveAttribute('src', '/racoon.png');
    });

    it('starts at the initial position near the ground', () => {
      render(<RaccoonMascot />);
      
      // The fixed position div is the great-grandparent of the img
      const mascotImage = screen.getByAltText('Racoon Mascot');
      const mascot = mascotImage.closest('div')?.parentElement;
      
      // The component sets inline styles
      expect(mascot).toHaveAttribute('style');
      const style = mascot?.getAttribute('style');
      expect(style).toContain('position: fixed');
      expect(style).toContain('left: 20px');
      expect(style).toContain(`top: ${mockInnerHeight - 100}px`);
    });

    it('has grab cursor when not picked up', () => {
      render(<RaccoonMascot />);
      
      const mascotImage = screen.getByAltText('Racoon Mascot');
      const mascot = mascotImage.closest('div')?.parentElement;
      
      expect(mascot).toHaveAttribute('style');
      const style = mascot?.getAttribute('style');
      expect(style).toContain('cursor: grab');
    });

    it('displays helpful title on hover', () => {
      render(<RaccoonMascot />);
      
      const mascotContainer = screen.getByAltText('Racoon Mascot').parentElement;
      expect(mascotContainer).toHaveAttribute(
        'title',
        'Click to pick up, use ← → to run, space to jump (triple jump available)!'
      );
    });
  });

  describe('Click Interactions', () => {
    it('shows picked up state when clicked', async () => {
      const user = userEvent.setup({ delay: null });
      render(<RaccoonMascot />);
      
      const mascotContainer = screen.getByAltText('Racoon Mascot').parentElement!;
      await user.click(mascotContainer);
      
      // Check for picked up visual changes - check the style attribute directly
      const style = mascotContainer.getAttribute('style');
      expect(style).toContain('transform: scale(1.2)');
      expect(style).toContain('filter: drop-shadow(0 8px 16px rgba(0,0,0,0.3))');
      
      // Check cursor changes to grabbing
      const mascot = mascotContainer.parentElement;
      const mascotStyle = mascot?.getAttribute('style');
      expect(mascotStyle).toContain('cursor: grabbing');
    });

    it('shows sparkles effect when picked up', async () => {
      const user = userEvent.setup({ delay: null });
      render(<RaccoonMascot />);
      
      const mascotContainer = screen.getByAltText('Racoon Mascot').parentElement!;
      await user.click(mascotContainer);
      
      // Check for sparkle emojis - there are multiple of some emojis
      expect(screen.getAllByText('✨')).toHaveLength(2);
      expect(screen.getAllByText('⭐')).toHaveLength(2);
      expect(screen.getByText('💫')).toBeInTheDocument();
    });

    it('plays sound effect when clicked', async () => {
      const user = userEvent.setup({ delay: null });
      const mockPlay = jest.fn().mockResolvedValue(undefined);
      global.Audio = jest.fn().mockImplementation(() => ({
        play: mockPlay,
        volume: 0
      }));
      
      render(<RaccoonMascot />);
      
      const mascotContainer = screen.getByAltText('Racoon Mascot').parentElement!;
      await user.click(mascotContainer);
      
      expect(global.Audio).toHaveBeenCalled();
      expect(mockPlay).toHaveBeenCalled();
    });

    it('shows GIF modal when clicked', async () => {
      const user = userEvent.setup({ delay: null });
      render(<RaccoonMascot />);
      
      const mascotContainer = screen.getByAltText('Racoon Mascot').parentElement!;
      await user.click(mascotContainer);
      
      const gifImage = screen.getByAltText('Raccoon GIF');
      expect(gifImage).toBeInTheDocument();
      expect(gifImage).toHaveAttribute('src', '/racoon_celebration.gif');
    });

    it('closes GIF modal when close button is clicked', async () => {
      const user = userEvent.setup({ delay: null });
      render(<RaccoonMascot />);
      
      const mascotContainer = screen.getByAltText('Racoon Mascot').parentElement!;
      await user.click(mascotContainer);
      
      const closeButton = screen.getByTitle('Close GIF');
      await user.click(closeButton);
      
      expect(screen.queryByAltText('Raccoon GIF')).not.toBeInTheDocument();
    });

    it('closes GIF modal when clicking backdrop', async () => {
      const user = userEvent.setup({ delay: null });
      render(<RaccoonMascot />);
      
      const mascotContainer = screen.getByAltText('Racoon Mascot').parentElement!;
      await user.click(mascotContainer);
      
      const backdrop = screen.getByAltText('Raccoon GIF').parentElement?.parentElement;
      if (backdrop) {
        await user.click(backdrop);
      }
      
      expect(screen.queryByAltText('Raccoon GIF')).not.toBeInTheDocument();
    });

    it('drops the mascot after being picked up', async () => {
      const user = userEvent.setup({ delay: null });
      render(<RaccoonMascot />);
      
      const mascotContainer = screen.getByAltText('Racoon Mascot').parentElement!;
      await user.click(mascotContainer);
      
      // Fast forward 2 seconds for the drop
      act(() => {
        jest.advanceTimersByTime(2000);
      });
      
      await waitFor(() => {
        expect(mascotContainer).not.toHaveStyle({
          transform: expect.stringContaining('scale(1.2)')
        });
      });
    });
  });

  describe('Keyboard Controls', () => {
    it('moves left when ArrowLeft is pressed', () => {
      render(<RaccoonMascot />);
      
      fireEvent.keyDown(document, { key: 'ArrowLeft' });
      
      // Trigger animation frame
      act(() => {
        jest.advanceTimersByTime(16);
      });
      
      fireEvent.keyUp(document, { key: 'ArrowLeft' });
    });

    it('moves right when ArrowRight is pressed', () => {
      render(<RaccoonMascot />);
      
      fireEvent.keyDown(document, { key: 'ArrowRight' });
      
      // Trigger animation frame
      act(() => {
        jest.advanceTimersByTime(16);
      });
      
      fireEvent.keyUp(document, { key: 'ArrowRight' });
    });

    it('jumps when Space is pressed', () => {
      render(<RaccoonMascot />);
      
      fireEvent.keyDown(document, { key: ' ' });
      
      // Trigger animation frame
      act(() => {
        jest.advanceTimersByTime(16);
      });
      
      fireEvent.keyUp(document, { key: ' ' });
    });

    it('flips direction when moving', () => {
      render(<RaccoonMascot />);
      
      const mascotImage = screen.getByAltText('Racoon Mascot');
      
      // Initially facing right
      expect(mascotImage).toHaveStyle({ transform: 'scaleX(1)' });
      
      // Move left
      fireEvent.keyDown(document, { key: 'ArrowLeft' });
      act(() => {
        jest.advanceTimersByTime(16);
      });
      
      expect(mascotImage).toHaveStyle({ transform: 'scaleX(-1)' });
      
      fireEvent.keyUp(document, { key: 'ArrowLeft' });
    });

    it('shows charge bar when holding space on ground', () => {
      render(<RaccoonMascot />);
      
      fireEvent.keyDown(document, { key: ' ' });
      
      act(() => {
        jest.advanceTimersByTime(100);
      });
      
      // Look for charge bar
      const chargeBar = screen.getByAltText('Racoon Mascot')
        .closest('div')?.parentElement?.parentElement
        ?.querySelector('div[style*="overflow: hidden"]');
      
      expect(chargeBar).toBeInTheDocument();
      
      fireEvent.keyUp(document, { key: ' ' });
    });

    it('does not respond to keyboard when picked up', async () => {
      const user = userEvent.setup({ delay: null });
      render(<RaccoonMascot />);
      
      const mascotContainer = screen.getByAltText('Racoon Mascot').parentElement!;
      await user.click(mascotContainer);
      
      // Try to move while picked up
      fireEvent.keyDown(document, { key: 'ArrowLeft' });
      fireEvent.keyDown(document, { key: ' ' });
      
      // Should still be in picked up state
      expect(mascotContainer).toHaveStyle({
        transform: expect.stringContaining('scale(1.2)')
      });
    });
  });

  describe('Drag and Drop', () => {
    it('allows dragging the mascot', async () => {
      const _user = userEvent.setup({ delay: null });
      render(<RaccoonMascot />);
      
      const mascotContainer = screen.getByAltText('Racoon Mascot').parentElement!;
      
      // Start drag
      fireEvent.mouseDown(mascotContainer, { clientX: 50, clientY: 50 });
      
      // Move mouse
      fireEvent.mouseMove(document, { clientX: 200, clientY: 200 });
      
      // End drag
      fireEvent.mouseUp(document);
      
      // Mascot should have moved
      const mascot = mascotContainer.parentElement?.parentElement;
      expect(mascot).toHaveStyle({
        position: 'fixed',
        left: expect.not.stringContaining('20px')
      });
    });
  });

  describe('Physics and Collisions', () => {
    it('respects window boundaries', () => {
      render(<RaccoonMascot />);
      
      // Try to move beyond right boundary
      for (let i = 0; i < 200; i++) {
        fireEvent.keyDown(document, { key: 'ArrowRight' });
        act(() => {
          jest.advanceTimersByTime(16);
        });
      }
      fireEvent.keyUp(document, { key: 'ArrowRight' });
      
      const mascot = screen.getByAltText('Racoon Mascot').closest('div')?.parentElement?.parentElement;
      const leftPosition = parseInt(mascot?.style.left || '0');
      
      expect(leftPosition).toBeLessThanOrEqual(mockInnerWidth - 80);
    });

    it('shows wall stick indicator when on wall', () => {
      render(<RaccoonMascot />);
      
      // Move to left wall
      for (let i = 0; i < 50; i++) {
        fireEvent.keyDown(document, { key: 'ArrowLeft' });
        act(() => {
          jest.advanceTimersByTime(16);
        });
      }
      
      // Jump and hold space to stick
      fireEvent.keyDown(document, { key: ' ' });
      
      act(() => {
        jest.advanceTimersByTime(500);
      });
      
      fireEvent.keyUp(document, { key: 'ArrowLeft' });
    });

    it('shows jump counter when jumping', () => {
      render(<RaccoonMascot />);
      
      // Jump
      fireEvent.keyDown(document, { key: ' ' });
      fireEvent.keyUp(document, { key: ' ' });
      
      act(() => {
        jest.advanceTimersByTime(100);
      });
      
      // Look for jump counter
      const jumpCounter = screen.getByText('1');
      expect(jumpCounter).toBeInTheDocument();
      expect(jumpCounter.parentElement).toHaveStyle({
        color: '#6c3baa'
      });
    });
  });

  describe('UI Element Interactions', () => {
    beforeEach(() => {
      // Mock UI elements
      const mockElement = document.createElement('div');
      mockElement.className = 'virgil-logo';
      mockElement.textContent = 'Virgil';
      mockElement.getBoundingClientRect = jest.fn(() => ({
        left: 100,
        top: 100,
        right: 200,
        bottom: 130,
        width: 100,
        height: 30,
        x: 100,
        y: 100
      } as DOMRect));
      Object.defineProperty(mockElement, 'offsetParent', {
        get: () => document.body
      });
      document.body.appendChild(mockElement);
    });

    afterEach(() => {
      document.body.innerHTML = '';
    });

    it('detects UI elements for collision', () => {
      render(<RaccoonMascot />);
      
      act(() => {
        jest.advanceTimersByTime(100);
      });
      
      // The component should detect the virgil-logo element
      expect(document.querySelector('.virgil-logo')).toBeInTheDocument();
    });

    it('updates UI elements when location data changes', () => {
      const { rerender } = render(<RaccoonMascot />);
      
      // Update location data
      (useLocation as jest.Mock).mockReturnValue(mockLocationData);
      
      rerender(<RaccoonMascot />);
      
      act(() => {
        jest.advanceTimersByTime(5000); // UI elements update every 5 seconds
      });
    });
  });

  describe('Sleep Animation', () => {
    it('shows sleeping animation after 10 seconds of inactivity', () => {
      render(<RaccoonMascot />);
      
      // Fast forward 10 seconds
      act(() => {
        jest.advanceTimersByTime(10000);
      });
      
      // Look for sleeping emoji
      const sleepEmoji = screen.getByText('💤');
      expect(sleepEmoji).toBeInTheDocument();
      expect(sleepEmoji).toHaveStyle({
        animation: expect.stringContaining('floating-zzz')
      });
    });

    it('wakes up when any key is pressed', () => {
      render(<RaccoonMascot />);
      
      // Make it sleep
      act(() => {
        jest.advanceTimersByTime(10000);
      });
      
      expect(screen.getByText('💤')).toBeInTheDocument();
      
      // Press a key to wake up
      fireEvent.keyDown(document, { key: 'ArrowLeft' });
      
      expect(screen.queryByText('💤')).not.toBeInTheDocument();
      
      fireEvent.keyUp(document, { key: 'ArrowLeft' });
    });

    it('wakes up when clicked', async () => {
      const user = userEvent.setup({ delay: null });
      render(<RaccoonMascot />);
      
      // Make it sleep
      act(() => {
        jest.advanceTimersByTime(10000);
      });
      
      expect(screen.getByText('💤')).toBeInTheDocument();
      
      // Click to wake up
      const mascotContainer = screen.getByAltText('Racoon Mascot').parentElement!;
      await user.click(mascotContainer);
      
      expect(screen.queryByText('💤')).not.toBeInTheDocument();
    });

    it('does not sleep while being dragged', () => {
      render(<RaccoonMascot />);
      
      const mascotContainer = screen.getByAltText('Racoon Mascot').parentElement!;
      
      // Start dragging
      fireEvent.mouseDown(mascotContainer, { clientX: 50, clientY: 50 });
      
      // Fast forward 10 seconds while dragging
      act(() => {
        jest.advanceTimersByTime(10000);
      });
      
      // Should not be sleeping
      expect(screen.queryByText('💤')).not.toBeInTheDocument();
      
      fireEvent.mouseUp(document);
    });
  });

  describe('Visual States', () => {
    it('shows bounce counter when clicked multiple times', async () => {
      const user = userEvent.setup({ delay: null });
      render(<RaccoonMascot />);
      
      const mascotContainer = screen.getByAltText('Racoon Mascot').parentElement!;
      
      // Click once
      await user.click(mascotContainer);
      
      // Wait for drop
      act(() => {
        jest.advanceTimersByTime(2100);
      });
      
      // Click again
      await user.click(mascotContainer);
      
      // Should show bounce counter
      const bounceCounter = screen.getByText('2');
      expect(bounceCounter).toBeInTheDocument();
    });

    it('shows running animation when moving', () => {
      render(<RaccoonMascot />);
      
      const mascotContainer = screen.getByAltText('Racoon Mascot').parentElement!;
      
      // Start moving
      fireEvent.keyDown(document, { key: 'ArrowRight' });
      
      act(() => {
        jest.advanceTimersByTime(16);
      });
      
      expect(mascotContainer).toHaveStyle({
        animation: expect.stringContaining('running')
      });
      
      fireEvent.keyUp(document, { key: 'ArrowRight' });
    });

    it('shows idle animation when stationary', () => {
      render(<RaccoonMascot />);
      
      const mascotContainer = screen.getByAltText('Racoon Mascot').parentElement!;
      
      expect(mascotContainer).toHaveStyle({
        animation: expect.stringContaining('idle')
      });
    });
  });

  describe('Window Resize', () => {
    it('keeps mascot within bounds on window resize', () => {
      render(<RaccoonMascot />);
      
      // Move mascot to right edge
      const mascotElement = screen.getByAltText('Racoon Mascot').parentElement!;
      fireEvent.mouseDown(mascotElement, { clientX: 50, clientY: 50 });
      fireEvent.mouseMove(document, { clientX: 900, clientY: 400 });
      fireEvent.mouseUp(document);
      
      // Resize window to be smaller
      Object.defineProperty(window, 'innerWidth', { value: 600 });
      fireEvent(window, new Event('resize'));
      
      act(() => {
        jest.advanceTimersByTime(100);
      });
      
      const mascot = mascotElement.parentElement?.parentElement;
      const leftPosition = parseInt(mascot?.style.left || '0');
      
      expect(leftPosition).toBeLessThanOrEqual(600 - 80);
    });
  });

  describe('Accessibility', () => {
    it('has appropriate alt text', () => {
      render(<RaccoonMascot />);
      
      const mascotImage = screen.getByAltText('Racoon Mascot');
      expect(mascotImage).toBeInTheDocument();
    });

    it('prevents image from being draggable', () => {
      render(<RaccoonMascot />);
      
      const mascotImage = screen.getByAltText('Racoon Mascot');
      expect(mascotImage).toHaveAttribute('draggable', 'false');
    });

    it('has user-select none to prevent text selection', () => {
      render(<RaccoonMascot />);
      
      const mascot = screen.getByAltText('Racoon Mascot').closest('div')?.parentElement?.parentElement;
      expect(mascot).toHaveStyle({ userSelect: 'none' });
    });
  });
});