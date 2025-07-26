import { render, screen, fireEvent } from '@testing-library/react';
import { DogFavoriteOverlay } from './DogFavoriteOverlay';

const defaultProps = {
  isFavorited: false,
  onFavoriteToggle: jest.fn(),
};

describe('DogFavoriteOverlay', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders unfavorited state correctly', () => {
    render(<DogFavoriteOverlay {...defaultProps} />);

    const button = screen.getByLabelText('Add to favorites');
    expect(button).toBeInTheDocument();
    expect(button).toHaveTextContent('🤍');
    expect(button).toHaveClass('doggo-favorite-overlay');
    expect(button).not.toHaveClass('favorited');
  });

  it('renders favorited state correctly', () => {
    render(<DogFavoriteOverlay {...defaultProps} isFavorited />);

    const button = screen.getByLabelText('Remove from favorites');
    expect(button).toBeInTheDocument();
    expect(button).toHaveTextContent('❤️');
    expect(button).toHaveClass('doggo-favorite-overlay');
    expect(button).toHaveClass('favorited');
  });

  it('calls onFavoriteToggle when clicked', () => {
    const mockToggle = jest.fn();
    render(<DogFavoriteOverlay {...defaultProps} onFavoriteToggle={mockToggle} />);

    fireEvent.click(screen.getByLabelText('Add to favorites'));
    expect(mockToggle).toHaveBeenCalledTimes(1);
  });

  it('has proper accessibility attributes', () => {
    render(<DogFavoriteOverlay {...defaultProps} />);

    const button = screen.getByLabelText('Add to favorites');
    expect(button).toHaveAttribute('title', 'Add to favorites');
    expect(button).toHaveAttribute('aria-label', 'Add to favorites');
  });

  it('updates accessibility attributes when favorited', () => {
    render(<DogFavoriteOverlay {...defaultProps} isFavorited />);

    const button = screen.getByLabelText('Remove from favorites');
    expect(button).toHaveAttribute('title', 'Remove from favorites');
    expect(button).toHaveAttribute('aria-label', 'Remove from favorites');
  });
});
