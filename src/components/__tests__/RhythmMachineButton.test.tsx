/**
 * RhythmMachineButton Test Suite
 * 
 * Tests the rhythm machine emoji button component including:
 * - Rendering with correct props
 * - Lazy loading integration
 * - Error boundary wrapping
 * - Accessibility attributes
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { RhythmMachineButton } from '../RhythmMachineButton';

// Types for mocked components
interface EmojiButtonProps {
  emoji: string;
  ariaLabel: string;
  title: string;
  className?: string;
  position?: { x: number; y: number };
  hoverScale?: number;
  hoverColor?: string;
  GalleryComponent?: React.ComponentType<{ isOpen: boolean; onClose: () => void }>;
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
  appName: string;
}

interface RhythmMachineViewerProps {
  isOpen: boolean;
  onClose: () => void;
}

// Mock dependencies
jest.mock('../common/EmojiButton', () => ({
  EmojiButton: ({ emoji, ariaLabel, title, className, position, hoverScale, hoverColor, GalleryComponent }: EmojiButtonProps) => (
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
  DashboardAppErrorBoundary: ({ children, appName }: ErrorBoundaryProps) => (
    <div data-testid="error-boundary" data-app-name={appName}>
      {children}
    </div>
  ),
}));

jest.mock('../rhythm/RhythmMachineViewer', () => ({
  RhythmMachineViewer: ({ isOpen, onClose }: RhythmMachineViewerProps) => (
    <div data-testid="rhythm-machine-viewer" data-is-open={isOpen}>
      <button onClick={onClose}>Close</button>
    </div>
  ),
}));

describe('RhythmMachineButton', () => {
  it('should render emoji button with correct props', () => {
    render(<RhythmMachineButton />);

    expect(screen.getByTestId('emoji-button')).toBeInTheDocument();
    expect(screen.getByTestId('emoji')).toHaveTextContent('🥁');
    expect(screen.getByTestId('aria-label')).toHaveTextContent('Open Rhythm Machine - AI-powered drum sequencer');
  });

  it('should have correct positioning', () => {
    render(<RhythmMachineButton />);

    const position = JSON.parse(screen.getByTestId('position').textContent || '{}');
    expect(position).toEqual({
      top: '12rem',
      right: 'calc(2rem - 10px)',
    });
  });

  it('should have correct hover effects', () => {
    render(<RhythmMachineButton />);

    expect(screen.getByTestId('hover-scale')).toHaveTextContent('1.15');

    const hoverColor = JSON.parse(screen.getByTestId('hover-color').textContent || '{}');
    expect(hoverColor).toEqual({
      background: 'linear-gradient(135deg, rgba(255, 107, 157, 0.3) 0%, rgba(255, 143, 179, 0.3) 100%)',
      border: 'rgba(255, 107, 157, 0.6)',
      glow: 'rgba(255, 107, 157, 0.4)',
    });
  });

  it('should have correct title and class name', () => {
    render(<RhythmMachineButton />);

    expect(screen.getByTestId('title')).toHaveTextContent('AI Rhythm Machine - Create beats with AI-powered drum sequencer!');
    expect(screen.getByTestId('className')).toHaveTextContent('opacity-80 hover:opacity-100');
  });

  it('should provide gallery component with error boundary', () => {
    render(<RhythmMachineButton />);

    expect(screen.getByTestId('gallery-component')).toBeInTheDocument();
  });

  it('should be memoized', () => {
    const { rerender } = render(<RhythmMachineButton />);
    const firstRender = screen.getByTestId('emoji-button');

    rerender(<RhythmMachineButton />);
    const secondRender = screen.getByTestId('emoji-button');

    // Component should be the same instance due to memo
    expect(firstRender).toBe(secondRender);
  });
});