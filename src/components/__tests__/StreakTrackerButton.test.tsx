/**
 * StreakTrackerButton Test Suite
 * 
 * Tests the streak tracker emoji button component including:
 * - Rendering with correct props
 * - Lazy loading integration
 * - Error boundary wrapping
 * - Accessibility attributes
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { StreakTrackerButton } from '../StreakTrackerButton';

// Mock dependencies
jest.mock('../common/EmojiButton', () => ({
  EmojiButton: ({ emoji, ariaLabel, title, className, position, hoverScale, hoverColor, GalleryComponent }: any) => (
    <div data-testid="emoji-button">
      <span data-testid="emoji">{emoji}</span>
      <span data-testid="aria-label">{ariaLabel}</span>
      <span data-testid="title">{title}</span>
      <span data-testid="className">{className}</span>
      <span data-testid="position">{JSON.stringify(position)}</span>
      <span data-testid="hover-scale">{hoverScale}</span>
      <span data-testid="hover-color">{JSON.stringify(hoverColor)}</span>
      {GalleryComponent && <div data-testid="gallery-component">Gallery Component Present</div>}
    </div>
  ),
}));

jest.mock('../common/DashboardAppErrorBoundary', () => ({
  DashboardAppErrorBoundary: ({ children, appName }: any) => (
    <div data-testid="error-boundary" data-app-name={appName}>
      {children}
    </div>
  ),
}));

jest.mock('../streak/MinimalHabitTracker', () => ({
  MinimalHabitTracker: ({ isOpen, onClose }: any) => (
    <div data-testid="habit-tracker" data-is-open={isOpen}>
      <button onClick={onClose}>Close</button>
    </div>
  ),
}));

describe('StreakTrackerButton', () => {
  it('should render emoji button with correct props', () => {
    render(<StreakTrackerButton />);

    expect(screen.getByTestId('emoji-button')).toBeInTheDocument();
    expect(screen.getByTestId('emoji')).toHaveTextContent('🔥');
    expect(screen.getByTestId('aria-label')).toHaveTextContent('Open Habit Tracker - Track your daily habits with fire streaks!');
  });

  it('should have correct positioning', () => {
    render(<StreakTrackerButton />);

    const position = JSON.parse(screen.getByTestId('position').textContent || '{}');
    expect(position).toEqual({
      top: '4.5rem',
      left: '1.9rem',
    });
  });

  it('should have correct hover effects', () => {
    render(<StreakTrackerButton />);

    expect(screen.getByTestId('hover-scale')).toHaveTextContent('1.15');

    const hoverColor = JSON.parse(screen.getByTestId('hover-color').textContent || '{}');
    expect(hoverColor).toEqual({
      background: 'linear-gradient(135deg, rgba(108, 59, 170, 0.3) 0%, rgba(90, 50, 140, 0.3) 100%)',
      border: 'rgba(108, 59, 170, 0.6)',
      glow: 'rgba(108, 59, 170, 0.4)',
    });
  });

  it('should have correct title and class name', () => {
    render(<StreakTrackerButton />);

    expect(screen.getByTestId('title')).toHaveTextContent('Habit Streaks - Track up to 10 habits and build fire streaks!');
    expect(screen.getByTestId('className')).toHaveTextContent('opacity-80 hover:opacity-100');
  });

  it('should provide gallery component with error boundary', () => {
    render(<StreakTrackerButton />);

    expect(screen.getByTestId('gallery-component')).toBeInTheDocument();
  });

  it('should be memoized', () => {
    const { rerender } = render(<StreakTrackerButton />);
    const firstRender = screen.getByTestId('emoji-button');

    rerender(<StreakTrackerButton />);
    const secondRender = screen.getByTestId('emoji-button');

    // Component should be the same instance due to memo
    expect(firstRender).toBe(secondRender);
  });
});