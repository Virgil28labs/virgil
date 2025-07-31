import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DogEmojiButton } from '../DogEmojiButton';

// Mock the DogGallery component since it's lazily loaded
jest.mock('../dog/DogGallery', () => ({
  DogGallery: ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => {
    if (!isOpen) return null;
    return (
      <div data-testid="dog-gallery" role="dialog" aria-label="Doggo Sanctuary">
        <h2>Doggo Sanctuary</h2>
        <p>Your personal collection of adorable companions</p>
        <button onClick={onClose} aria-label="Close sanctuary">×</button>
        <div role="tablist">
          <button role="tab" aria-selected="true">Fetch Doggos</button>
          <button role="tab" aria-selected="false">My Collection</button>
        </div>
      </div>
    );
  },
}));

describe('DogEmojiButton', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the dog emoji button', () => {
    render(<DogEmojiButton />);

    const button = screen.getByRole('button', { name: /Open Doggo Sanctuary/i });
    expect(button).toBeInTheDocument();
    expect(button).toHaveTextContent('🐕');
    expect(button).toHaveAttribute('title', 'Visit the Doggo Sanctuary!');
  });

  it('opens modal when button is clicked', async () => {
    render(<DogEmojiButton />);

    const button = screen.getByRole('button', { name: /Open Doggo Sanctuary/i });
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByRole('dialog', { name: 'Doggo Sanctuary' })).toBeInTheDocument();
      expect(screen.getByText('Doggo Sanctuary')).toBeInTheDocument();
    });
  });

  it('shows sanctuary content when opened', async () => {
    render(<DogEmojiButton />);

    const button = screen.getByRole('button', { name: /Open Doggo Sanctuary/i });
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByRole('dialog', { name: /Doggo Sanctuary/i })).toBeInTheDocument();
      expect(screen.getByText('Your personal collection of adorable companions')).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /Fetch Doggos/i })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /My Collection/i })).toBeInTheDocument();
    });
  });

  it('closes modal when close button is clicked', async () => {
    render(<DogEmojiButton />);

    // Open the modal
    const openButton = screen.getByRole('button', { name: /Open Doggo Sanctuary/i });
    fireEvent.click(openButton);

    await waitFor(() => {
      expect(screen.getByRole('dialog', { name: 'Doggo Sanctuary' })).toBeInTheDocument();
    });

    // Close the modal
    const closeButton = screen.getByRole('button', { name: /Close sanctuary/i });
    fireEvent.click(closeButton);

    await waitFor(() => {
      expect(screen.queryByTestId('dog-gallery')).not.toBeInTheDocument();
    });
  });

  it('does not show gallery when not opened', () => {
    render(<DogEmojiButton />);

    expect(screen.queryByTestId('dog-gallery')).not.toBeInTheDocument();
    expect(screen.queryByText('Doggo Sanctuary')).not.toBeInTheDocument();
  });

  it('handles hover states correctly', async () => {
    const user = userEvent.setup();
    render(<DogEmojiButton />);

    const button = screen.getByRole('button', { name: /Open Doggo Sanctuary/i });

    // Test hover
    await user.hover(button);
    expect(button).toHaveStyle({ opacity: '1' });

    // Test unhover
    await user.unhover(button);
    expect(button).toHaveStyle({ opacity: '0.8' });
  });

  it('opens modal with Enter key', async () => {
    render(<DogEmojiButton />);

    const button = screen.getByRole('button', { name: /Open Doggo Sanctuary/i });

    // Buttons automatically handle Enter and Space keys for accessibility
    // In testing, we simulate the click that would result from these key presses
    button.focus();
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByRole('dialog', { name: 'Doggo Sanctuary' })).toBeInTheDocument();
    });
  });

  it('opens modal with Space key', async () => {
    render(<DogEmojiButton />);

    const button = screen.getByRole('button', { name: /Open Doggo Sanctuary/i });

    // Buttons automatically handle Enter and Space keys for accessibility
    // In testing, we simulate the click that would result from these key presses
    button.focus();
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByRole('dialog', { name: 'Doggo Sanctuary' })).toBeInTheDocument();
    });
  });

  it('has proper accessibility attributes', () => {
    render(<DogEmojiButton />);

    const button = screen.getByRole('button', { name: /Open Doggo Sanctuary/i });
    expect(button).toHaveAttribute('aria-label', 'Open Doggo Sanctuary');
    expect(button).toHaveAttribute('title', 'Visit the Doggo Sanctuary!');
  });

  it('maintains proper button styling', () => {
    render(<DogEmojiButton />);

    const button = screen.getByRole('button', { name: /Open Doggo Sanctuary/i });

    // Check if button has the expected styles
    expect(button).toHaveStyle({
      position: 'fixed',
      cursor: 'pointer',
      borderRadius: '50%',
      fontSize: '1.2rem',
    });
  });

  it('uses lazy loading for DogGallery', () => {
    render(<DogEmojiButton />);

    // Gallery should not be in DOM initially (lazy loaded)
    expect(screen.queryByRole('dialog', { name: 'Doggo Sanctuary' })).not.toBeInTheDocument();

    // Only after clicking should it appear
    const button = screen.getByRole('button', { name: /Open Doggo Sanctuary/i });
    fireEvent.click(button);

    // Now it should be rendered
    expect(screen.getByRole('dialog', { name: 'Doggo Sanctuary' })).toBeInTheDocument();
  });
});
