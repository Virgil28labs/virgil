import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DrawPerfectCircle } from './DrawPerfectCircle';

// Mock localStorage
const mockLocalStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};

Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
  writable: true,
});

// Mock canvas context
const mockCanvasContext = {
  clearRect: jest.fn(),
  fillStyle: '',
  fillRect: jest.fn(),
  strokeStyle: '',
  lineWidth: 0,
  lineCap: '',
  lineJoin: '',
  beginPath: jest.fn(),
  moveTo: jest.fn(),
  lineTo: jest.fn(),
  stroke: jest.fn(),
  save: jest.fn(),
  restore: jest.fn(),
  scale: jest.fn(),
  globalAlpha: 1,
  shadowBlur: 0,
  shadowColor: '',
};

// Mock HTMLCanvasElement
HTMLCanvasElement.prototype.getContext = jest.fn(() => mockCanvasContext);

// Mock getBoundingClientRect
HTMLCanvasElement.prototype.getBoundingClientRect = jest.fn(() => ({
  left: 0,
  top: 0,
  right: 400,
  bottom: 400,
  width: 400,
  height: 400,
  x: 0,
  y: 0,
  toJSON: jest.fn(),
}));

describe('DrawPerfectCircle', () => {
  const mockOnClose = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockLocalStorage.getItem.mockReturnValue('0');
    // Mock devicePixelRatio
    Object.defineProperty(window, 'devicePixelRatio', {
      value: 1,
      writable: true,
    });
  });

  it('renders when isOpen is true', () => {
    render(<DrawPerfectCircle isOpen={true} onClose={mockOnClose} />);
    
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Draw Perfect Circle')).toBeInTheDocument();
    expect(screen.getByText('Draw a perfect circle')).toBeInTheDocument();
  });

  it('does not render when isOpen is false', () => {
    render(<DrawPerfectCircle isOpen={false} onClose={mockOnClose} />);
    
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('calls onClose when close button is clicked', async () => {
    const user = userEvent.setup();
    render(<DrawPerfectCircle isOpen={true} onClose={mockOnClose} />);
    
    const closeButton = screen.getByRole('button', { name: /close circle game/i });
    await user.click(closeButton);
    
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when backdrop is clicked', async () => {
    const user = userEvent.setup();
    render(<DrawPerfectCircle isOpen={true} onClose={mockOnClose} />);
    
    const backdrop = screen.getByRole('dialog');
    await user.click(backdrop);
    
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('does not call onClose when panel is clicked', async () => {
    const user = userEvent.setup();
    render(<DrawPerfectCircle isOpen={true} onClose={mockOnClose} />);
    
    const panel = screen.getByRole('document');
    await user.click(panel);
    
    expect(mockOnClose).not.toHaveBeenCalled();
  });

  it('displays initial instructions', () => {
    render(<DrawPerfectCircle isOpen={true} onClose={mockOnClose} />);
    
    expect(screen.getByText('Draw a perfect circle')).toBeInTheDocument();
    expect(screen.getByText('Click and drag to draw your circle')).toBeInTheDocument();
    expect(screen.getByText(/Best score: 0/)).toBeInTheDocument();
    expect(screen.getByText(/Attempts: 0/)).toBeInTheDocument();
  });

  it('renders canvas element', () => {
    render(<DrawPerfectCircle isOpen={true} onClose={mockOnClose} />);
    
    const canvas = document.querySelector('canvas');
    expect(canvas).toBeInTheDocument();
    expect(canvas).toHaveClass('circle-game-canvas');
  });

  it('renders control buttons', () => {
    render(<DrawPerfectCircle isOpen={true} onClose={mockOnClose} />);
    
    expect(screen.getByRole('button', { name: /clear/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /hide grid/i })).toBeInTheDocument();
  });

  it('toggles grid visibility', async () => {
    const user = userEvent.setup();
    render(<DrawPerfectCircle isOpen={true} onClose={mockOnClose} />);
    
    const gridButton = screen.getByRole('button', { name: /hide grid/i });
    await user.click(gridButton);
    
    expect(screen.getByRole('button', { name: /show grid/i })).toBeInTheDocument();
  });

  it('clears canvas when clear button is clicked', async () => {
    const user = userEvent.setup();
    render(<DrawPerfectCircle isOpen={true} onClose={mockOnClose} />);
    
    const clearButton = screen.getByRole('button', { name: /clear/i });
    await user.click(clearButton);
    
    expect(mockCanvasContext.clearRect).toHaveBeenCalled();
  });

  it('loads best score from localStorage', () => {
    mockLocalStorage.getItem.mockImplementation((key) => {
      if (key === 'perfectCircleBestScore') return '85';
      if (key === 'perfectCircleAttempts') return '3';
      return null;
    });

    render(<DrawPerfectCircle isOpen={true} onClose={mockOnClose} />);
    
    expect(screen.getByText(/Best score: 85/)).toBeInTheDocument();
    expect(screen.getByText(/Attempts: 3/)).toBeInTheDocument();
  });

  it('handles keyboard shortcuts', async () => {
    const user = userEvent.setup();
    render(<DrawPerfectCircle isOpen={true} onClose={mockOnClose} />);
    
    // Test Escape key
    await user.keyboard('{Escape}');
    expect(mockOnClose).toHaveBeenCalledTimes(1);
    
    // Reset mock
    mockOnClose.mockClear();
    
    // Test Ctrl+C for clear
    await user.keyboard('{Control>}c{/Control}');
    expect(mockCanvasContext.clearRect).toHaveBeenCalled();
    
    // Test Ctrl+G for grid toggle
    await user.keyboard('{Control>}g{/Control}');
    expect(screen.getByRole('button', { name: /show grid/i })).toBeInTheDocument();
  });

  it('handles mouse drawing events', async () => {
    render(<DrawPerfectCircle isOpen={true} onClose={mockOnClose} />);
    
    const canvas = document.querySelector('canvas')!;
    
    // Simulate mouse down
    fireEvent.mouseDown(canvas, { clientX: 100, clientY: 100 });
    
    // Simulate mouse move
    fireEvent.mouseMove(canvas, { clientX: 150, clientY: 150 });
    
    // Simulate mouse up
    fireEvent.mouseUp(canvas);
    
    expect(mockCanvasContext.beginPath).toHaveBeenCalled();
    expect(mockCanvasContext.moveTo).toHaveBeenCalled();
    expect(mockCanvasContext.lineTo).toHaveBeenCalled();
    expect(mockCanvasContext.stroke).toHaveBeenCalled();
  });

  it('handles touch drawing events', async () => {
    render(<DrawPerfectCircle isOpen={true} onClose={mockOnClose} />);
    
    const canvas = document.querySelector('canvas')!;
    
    // Simulate touch start
    fireEvent.touchStart(canvas, {
      touches: [{ clientX: 100, clientY: 100 }]
    });
    
    // Simulate touch move
    fireEvent.touchMove(canvas, {
      touches: [{ clientX: 150, clientY: 150 }]
    });
    
    // Simulate touch end
    fireEvent.touchEnd(canvas);
    
    expect(mockCanvasContext.beginPath).toHaveBeenCalled();
    expect(mockCanvasContext.moveTo).toHaveBeenCalled();
    expect(mockCanvasContext.lineTo).toHaveBeenCalled();
    expect(mockCanvasContext.stroke).toHaveBeenCalled();
  });

  it('has proper accessibility attributes', () => {
    render(<DrawPerfectCircle isOpen={true} onClose={mockOnClose} />);
    
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toHaveAttribute('aria-label', 'Draw Perfect Circle Game');
    
    const closeButton = screen.getByRole('button', { name: /close circle game/i });
    expect(closeButton).toHaveAttribute('aria-label', 'Close circle game');
  });

  it('handles window resize events', async () => {
    render(<DrawPerfectCircle isOpen={true} onClose={mockOnClose} />);
    
    // Simulate window resize
    fireEvent.resize(window);
    
    // Check that canvas context methods are called (indicating redraw)
    await waitFor(() => {
      expect(mockCanvasContext.scale).toHaveBeenCalled();
    });
  });

  it('prevents default on mouse and touch events', () => {
    render(<DrawPerfectCircle isOpen={true} onClose={mockOnClose} />);
    
    const canvas = document.querySelector('canvas')!;
    
    const mouseDownEvent = new MouseEvent('mousedown', { 
      bubbles: true, 
      cancelable: true,
      clientX: 100,
      clientY: 100
    });
    
    const preventDefault = jest.spyOn(mouseDownEvent, 'preventDefault');
    fireEvent(canvas, mouseDownEvent);
    
    expect(preventDefault).toHaveBeenCalled();
  });
});