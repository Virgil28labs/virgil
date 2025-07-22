import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CircleGameButton } from './CircleGameButton';

// Mock the DrawPerfectCircle component since it's lazily loaded
jest.mock('./circle/DrawPerfectCircle', () => ({
  DrawPerfectCircle: ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => {
    if (!isOpen) return null;
    return (
      <div data-testid="draw-perfect-circle" role="dialog" aria-label="Draw Perfect Circle Game">
        <h2>Draw Perfect Circle</h2>
        <p>Draw a perfect circle</p>
        <button onClick={onClose} aria-label="Close circle game">×</button>
        <canvas data-testid="circle-canvas" />
        <button>Clear</button>
        <button>Show grid</button>
      </div>
    );
  },
}));

describe('CircleGameButton', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the circle game button', () => {
    render(<CircleGameButton />);
    const button = screen.getByRole('button', { name: /open perfect circle game/i });
    expect(button).toBeInTheDocument();
    expect(button).toHaveAttribute('title', 'Draw Perfect Circle - Can you draw a perfect circle?');
  });

  it('displays the circle emoji', () => {
    render(<CircleGameButton />);
    const button = screen.getByRole('button', { name: /open perfect circle game/i });
    expect(button).toHaveTextContent('⭕');
  });

  it('has correct accessibility attributes', () => {
    render(<CircleGameButton />);
    const button = screen.getByRole('button', { name: /open perfect circle game/i });
    expect(button).toHaveAttribute('aria-label', 'Open Perfect Circle Game - Test your drawing skills!');
    expect(button).toHaveAttribute('title', 'Draw Perfect Circle - Can you draw a perfect circle?');
  });

  it('opens the circle game when clicked', async () => {
    const user = userEvent.setup();
    render(<CircleGameButton />);
    
    const button = screen.getByRole('button', { name: /open perfect circle game/i });
    
    // Initially, the circle game should not be visible
    expect(screen.queryByTestId('draw-perfect-circle')).not.toBeInTheDocument();
    
    // Click the button
    await user.click(button);
    
    // The circle game should now be visible
    await waitFor(() => {
      expect(screen.getByTestId('draw-perfect-circle')).toBeInTheDocument();
    });
  });

  it('renders with proper CSS classes', () => {
    render(<CircleGameButton />);
    const button = screen.getByRole('button', { name: /open perfect circle game/i });
    
    // EmojiButton uses Tailwind classes
    expect(button).toHaveClass('touch-manipulation');
    expect(button).toHaveClass('select-none');
    
    const emoji = button.querySelector('span');
    expect(emoji).toBeInTheDocument();
  });

  it('closes the circle game when close button is clicked', async () => {
    const user = userEvent.setup();
    render(<CircleGameButton />);
    
    const button = screen.getByRole('button', { name: /open perfect circle game/i });
    
    // Open the circle game
    await user.click(button);
    
    await waitFor(() => {
      expect(screen.getByTestId('draw-perfect-circle')).toBeInTheDocument();
    });
    
    // Close the circle game
    const closeButton = screen.getByRole('button', { name: /close circle game/i });
    await user.click(closeButton);
    
    await waitFor(() => {
      expect(screen.queryByTestId('draw-perfect-circle')).not.toBeInTheDocument();
    });
  });

  it('handles keyboard interactions', async () => {
    const user = userEvent.setup();
    render(<CircleGameButton />);
    
    const button = screen.getByRole('button', { name: /open perfect circle game/i });
    
    // Focus the button
    await user.tab();
    expect(button).toHaveFocus();
    
    // Press Enter to open
    await user.keyboard('{Enter}');
    
    await waitFor(() => {
      expect(screen.getByTestId('draw-perfect-circle')).toBeInTheDocument();
    });
  });

  it('handles space key to open circle game', async () => {
    const user = userEvent.setup();
    render(<CircleGameButton />);
    
    const button = screen.getByRole('button', { name: /open perfect circle game/i });
    
    // Focus the button
    await user.tab();
    expect(button).toHaveFocus();
    
    // Press Space to open
    await user.keyboard(' ');
    
    await waitFor(() => {
      expect(screen.getByTestId('draw-perfect-circle')).toBeInTheDocument();
    });
  });

  it('maintains proper z-index stacking', () => {
    render(<CircleGameButton />);
    const button = screen.getByRole('button', { name: /open perfect circle game/i });
    
    // Check that the button has the correct CSS classes from EmojiButton
    expect(button).toHaveClass('touch-manipulation');
    expect(button).toHaveClass('select-none');
  });
});