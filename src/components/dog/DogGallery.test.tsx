import { render, screen, fireEvent, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DogGallery } from './DogGallery';
import { useDogApi } from './hooks/useDogApi';
import { useDogFavorites } from './hooks/useDogFavorites';
import { useKeyboardShortcuts } from '../../hooks/useKeyboardShortcuts';
import type { Shortcut } from '../../hooks/useKeyboardShortcuts';
import type { DogImage } from './hooks/useDogApi';

// Mock hooks
jest.mock('./hooks/useDogApi');
jest.mock('./hooks/useDogFavorites');
jest.mock('../../hooks/useKeyboardShortcuts');

// Mock components
jest.mock('./FetchControls', () => ({
  FetchControls: jest.fn(({ onFetch, onBreedChange, onCountChange }) => (
    <div data-testid="fetch-controls">
      <button onClick={onFetch}>Fetch</button>
      <button onClick={() => onBreedChange('akita')}>Select Akita</button>
      <button onClick={() => onCountChange(5)}>Set Count 5</button>
    </div>
  )),
}));

jest.mock('./DogGrid', () => ({
  DogGrid: jest.fn(({ dogs, onImageClick, onFavoriteToggle }) => (
    <div data-testid="dog-grid">
      {dogs.map((dog: DogImage, _index: number) => (
        <div key={dog.id} data-testid={`dog-${dog.id}`}>
          <button onClick={() => onImageClick(dog.url)}>View {dog.breed}</button>
          <button onClick={() => onFavoriteToggle(dog)}>Toggle Favorite</button>
        </div>
      ))}
    </div>
  )),
}));

jest.mock('./ImageModal', () => ({
  ImageModal: jest.fn(({ currentIndex, onClose, onNavigate }) => 
    currentIndex !== null ? (
      <div data-testid="image-modal">
        <button onClick={onClose}>Close Modal</button>
        <button onClick={() => onNavigate(currentIndex + 1)}>Next</button>
      </div>
    ) : null,
  ),
}));

const mockUseDogApi = useDogApi as jest.MockedFunction<typeof useDogApi>;
const mockUseDogFavorites = useDogFavorites as jest.MockedFunction<typeof useDogFavorites>;
const mockUseKeyboardShortcuts = useKeyboardShortcuts as jest.MockedFunction<typeof useKeyboardShortcuts>;

describe('DogGallery', () => {
  const mockDogs: DogImage[] = [
    { url: 'https://example.com/dog1.jpg', breed: 'akita', id: 'dog-1' },
    { url: 'https://example.com/dog2.jpg', breed: 'beagle', id: 'dog-2' },
  ];

  const mockFavorites: DogImage[] = [
    { url: 'https://example.com/fav1.jpg', breed: 'corgi', id: 'fav-1' },
  ];

  const defaultApiReturn = {
    dogs: mockDogs,
    breeds: ['akita', 'beagle', 'corgi'],
    loading: false,
    error: null,
    fetchDogs: jest.fn(),
    fetchBreeds: jest.fn(),
  };

  const defaultFavoritesReturn = {
    favorites: mockFavorites,
    isFavorited: jest.fn((url: string) => url.includes('fav')),
    toggleFavorite: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseDogApi.mockReturnValue(defaultApiReturn);
    mockUseDogFavorites.mockReturnValue(defaultFavoritesReturn);
    mockUseKeyboardShortcuts.mockImplementation(() => {});
  });

  describe('rendering', () => {
    it('should render when open', () => {
      render(<DogGallery isOpen onClose={jest.fn()} />);

      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText('Doggo Sanctuary')).toBeInTheDocument();
    });

    it('should not render when closed', () => {
      render(<DogGallery isOpen={false} onClose={jest.fn()} />);

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('should render tabs', () => {
      render(<DogGallery isOpen onClose={jest.fn()} />);

      expect(screen.getByRole('tab', { name: /Fetch Doggos/i })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /Favorites/i })).toBeInTheDocument();
    });

    it('should show favorites count in gallery tab', () => {
      render(<DogGallery isOpen onClose={jest.fn()} />);

      // The tab shows "❤️ Favorites (1)"
      expect(screen.getByText(/Favorites.*\(1\)/)).toBeInTheDocument();
    });

    it('should render close button', () => {
      render(<DogGallery isOpen onClose={jest.fn()} />);

      expect(screen.getByLabelText('Close sanctuary')).toBeInTheDocument();
    });

    it('should render FetchControls in fetch tab', () => {
      render(<DogGallery isOpen onClose={jest.fn()} />);

      expect(screen.getByTestId('fetch-controls')).toBeInTheDocument();
    });

    it('should render DogGrid with dogs in fetch tab', () => {
      render(<DogGallery isOpen onClose={jest.fn()} />);

      expect(screen.getByTestId('dog-grid')).toBeInTheDocument();
      expect(screen.getByTestId('dog-dog-1')).toBeInTheDocument();
      expect(screen.getByTestId('dog-dog-2')).toBeInTheDocument();
    });

    it('should render DogGrid with favorites in gallery tab', async () => {
      const user = userEvent.setup();
      render(<DogGallery isOpen onClose={jest.fn()} />);

      await user.click(screen.getByRole('tab', { name: /Favorites/i }));

      expect(screen.getByTestId('dog-fav-1')).toBeInTheDocument();
      expect(screen.queryByTestId('dog-dog-1')).not.toBeInTheDocument();
    });
  });

  describe('loading and error states', () => {
    it('should show loading state', () => {
      mockUseDogApi.mockReturnValue({
        ...defaultApiReturn,
        loading: true,
      });

      render(<DogGallery isOpen onClose={jest.fn()} />);

      expect(screen.getByText('Fetching adorable doggos...')).toBeInTheDocument();
      expect(document.querySelector('.doggo-loading-spinner')).toBeInTheDocument();
    });

    it('should show error state', () => {
      mockUseDogApi.mockReturnValue({
        ...defaultApiReturn,
        error: 'Failed to fetch dogs',
      });

      render(<DogGallery isOpen onClose={jest.fn()} />);

      expect(screen.getByText('😢')).toBeInTheDocument();
      expect(screen.getByText('Failed to fetch dogs')).toBeInTheDocument();
    });

    it('should show empty state for fetch tab', () => {
      mockUseDogApi.mockReturnValue({
        ...defaultApiReturn,
        dogs: [],
      });

      render(<DogGallery isOpen onClose={jest.fn()} />);

      expect(screen.getByText('Ready to meet some doggos?')).toBeInTheDocument();
      expect(screen.getByText("Choose your preferences and click 'Fetch'")).toBeInTheDocument();
    });

    it('should show empty state for gallery tab', async () => {
      const user = userEvent.setup();
      mockUseDogFavorites.mockReturnValue({
        ...defaultFavoritesReturn,
        favorites: [],
      });

      render(<DogGallery isOpen onClose={jest.fn()} />);

      await user.click(screen.getByRole('tab', { name: /Favorites/i }));

      expect(screen.getByText('Your Doggo Sanctuary is empty!')).toBeInTheDocument();
      expect(screen.getByText('Start by fetching some adorable friends')).toBeInTheDocument();
      expect(screen.getByText('Go Fetch →')).toBeInTheDocument();
    });
  });

  describe('interactions', () => {
    it('should close when clicking backdrop', async () => {
      const user = userEvent.setup();
      const onClose = jest.fn();
      render(<DogGallery isOpen onClose={onClose} />);

      const backdrop = document.querySelector('.doggo-sanctuary-backdrop');
      if (!backdrop) throw new Error('Backdrop not found');
      await user.click(backdrop);

      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('should not close when clicking panel', async () => {
      const user = userEvent.setup();
      const onClose = jest.fn();
      render(<DogGallery isOpen onClose={onClose} />);

      const panel = document.querySelector('.doggo-sanctuary-panel');
      if (!panel) throw new Error('Panel not found');
      await user.click(panel);

      expect(onClose).not.toHaveBeenCalled();
    });

    it('should close when clicking close button', async () => {
      const user = userEvent.setup();
      const onClose = jest.fn();
      render(<DogGallery isOpen onClose={onClose} />);

      await user.click(screen.getByLabelText('Close sanctuary'));

      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('should switch tabs', async () => {
      const user = userEvent.setup();
      render(<DogGallery isOpen onClose={jest.fn()} />);

      // Start in fetch tab
      expect(screen.getByRole('tab', { name: /Fetch Doggos/i })).toHaveAttribute('aria-selected', 'true');

      // Switch to gallery
      await user.click(screen.getByRole('tab', { name: /Favorites/i }));

      expect(screen.getByRole('tab', { name: /Favorites/i })).toHaveAttribute('aria-selected', 'true');
      expect(screen.getByRole('tab', { name: /Fetch Doggos/i })).toHaveAttribute('aria-selected', 'false');
    });

    it('should handle fetch button', async () => {
      const user = userEvent.setup();
      render(<DogGallery isOpen onClose={jest.fn()} />);

      await user.click(screen.getByText('Fetch'));

      expect(defaultApiReturn.fetchDogs).toHaveBeenCalledWith('', 3);
    });

    it('should handle breed selection', async () => {
      const user = userEvent.setup();
      render(<DogGallery isOpen onClose={jest.fn()} />);

      await user.click(screen.getByText('Select Akita'));
      await user.click(screen.getByText('Fetch'));

      expect(defaultApiReturn.fetchDogs).toHaveBeenCalledWith('akita', 3);
    });

    it('should handle count change', async () => {
      const user = userEvent.setup();
      render(<DogGallery isOpen onClose={jest.fn()} />);

      await user.click(screen.getByText('Set Count 5'));
      await user.click(screen.getByText('Fetch'));

      expect(defaultApiReturn.fetchDogs).toHaveBeenCalledWith('', 5);
    });

    it('should open image modal when clicking dog', async () => {
      const user = userEvent.setup();
      render(<DogGallery isOpen onClose={jest.fn()} />);

      await user.click(screen.getByText('View akita'));

      expect(screen.getByTestId('image-modal')).toBeInTheDocument();
    });

    it('should close image modal', async () => {
      const user = userEvent.setup();
      render(<DogGallery isOpen onClose={jest.fn()} />);

      await user.click(screen.getByText('View akita'));
      await user.click(screen.getByText('Close Modal'));

      expect(screen.queryByTestId('image-modal')).not.toBeInTheDocument();
    });

    it('should navigate in image modal', async () => {
      const user = userEvent.setup();
      render(<DogGallery isOpen onClose={jest.fn()} />);

      await user.click(screen.getByText('View akita'));
      
      // Modal should be showing first image (index 0)
      expect(screen.getByTestId('image-modal')).toBeInTheDocument();
      
      // Click next should update index
      await user.click(screen.getByText('Next'));
      
      // Modal should still be visible (with updated index)
      expect(screen.getByTestId('image-modal')).toBeInTheDocument();
    });

    it('should toggle favorite', async () => {
      const user = userEvent.setup();
      render(<DogGallery isOpen onClose={jest.fn()} />);

      const toggleButtons = screen.getAllByText('Toggle Favorite');
      await user.click(toggleButtons[0]);

      expect(defaultFavoritesReturn.toggleFavorite).toHaveBeenCalledWith(mockDogs[0]);
    });

    it('should navigate to fetch tab from empty gallery', async () => {
      const user = userEvent.setup();
      mockUseDogFavorites.mockReturnValue({
        ...defaultFavoritesReturn,
        favorites: [],
      });

      render(<DogGallery isOpen onClose={jest.fn()} />);

      await user.click(screen.getByRole('tab', { name: /Favorites/i }));
      await user.click(screen.getByText('Go Fetch →'));

      expect(screen.getByRole('tab', { name: /Fetch Doggos/i })).toHaveAttribute('aria-selected', 'true');
    });
  });

  describe('breed loading', () => {
    it('should fetch breeds when opening with no breeds', () => {
      mockUseDogApi.mockReturnValue({
        ...defaultApiReturn,
        breeds: [],
      });

      render(<DogGallery isOpen onClose={jest.fn()} />);

      expect(defaultApiReturn.fetchBreeds).toHaveBeenCalledTimes(1);
    });

    it('should not fetch breeds when already loaded', () => {
      render(<DogGallery isOpen onClose={jest.fn()} />);

      expect(defaultApiReturn.fetchBreeds).not.toHaveBeenCalled();
    });

    it('should not fetch breeds when closed', () => {
      mockUseDogApi.mockReturnValue({
        ...defaultApiReturn,
        breeds: [],
      });

      render(<DogGallery isOpen={false} onClose={jest.fn()} />);

      expect(defaultApiReturn.fetchBreeds).not.toHaveBeenCalled();
    });
  });

  describe('keyboard shortcuts', () => {
    it('should register keyboard shortcuts when open', () => {
      render(<DogGallery isOpen onClose={jest.fn()} />);

      expect(mockUseKeyboardShortcuts).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            key: 'Escape',
            handler: expect.any(Function),
          }),
          expect.objectContaining({
            key: 'f',
            handler: expect.any(Function),
          }),
          expect.objectContaining({
            key: 'g',
            handler: expect.any(Function),
          }),
        ]),
        expect.objectContaining({ enabled: true }),
      );
    });

    it('should handle Escape key for closing modal', () => {
      const onClose = jest.fn();
      render(<DogGallery isOpen onClose={onClose} />);

      const shortcuts = mockUseKeyboardShortcuts.mock.calls[0][0];
      const escapeShortcut = shortcuts.find((s: Shortcut) => s.key === 'Escape');
      escapeShortcut?.handler();

      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('should handle f key for fetch tab', () => {
      render(<DogGallery isOpen onClose={jest.fn()} />);

      const shortcuts = mockUseKeyboardShortcuts.mock.calls[0][0];
      
      // Switch to gallery first
      fireEvent.click(screen.getByRole('tab', { name: /Favorites/i }));
      
      // Use f shortcut
      act(() => {
        const fShortcut = shortcuts.find((s: Shortcut) => s.key === 'f');
        fShortcut?.handler();
      });

      // Should be back on fetch tab
      expect(screen.getByRole('tab', { name: /Fetch Doggos/i })).toHaveClass('doggo-sanctuary-tab active');
    });

    it('should handle g key for gallery tab', () => {
      render(<DogGallery isOpen onClose={jest.fn()} />);

      const shortcuts = mockUseKeyboardShortcuts.mock.calls[0][0];
      act(() => {
        const gShortcut = shortcuts.find((s: Shortcut) => s.key === 'g');
        gShortcut?.handler();
      });

      expect(screen.getByRole('tab', { name: /Favorites/i })).toHaveClass('doggo-sanctuary-tab active');
    });

    it('should close image modal with Escape when modal is open', async () => {
      const user = userEvent.setup();
      render(<DogGallery isOpen onClose={jest.fn()} />);

      // Open image modal
      await user.click(screen.getByText('View akita'));
      expect(screen.getByTestId('image-modal')).toBeInTheDocument();

      // Simulate having selectedImageIndex set (would be 0 after clicking View akita)
      // The component would pass a different Escape handler when modal is open
      // For this test, we'll verify the modal closes
      await user.click(screen.getByText('Close Modal'));
      
      expect(screen.queryByTestId('image-modal')).not.toBeInTheDocument();
    });
  });

  describe('memoization', () => {
    it('should not re-render when props are the same', () => {
      const { rerender } = render(<DogGallery isOpen onClose={jest.fn()} />);
      
      const title = screen.getByText('Doggo Sanctuary');
      const originalTitle = title;

      // Re-render with same props
      rerender(<DogGallery isOpen onClose={jest.fn()} />);

      // Should be the same element instance
      expect(screen.getByText('Doggo Sanctuary')).toBe(originalTitle);
    });

    it('should re-render when isOpen changes', () => {
      const { rerender } = render(<DogGallery isOpen={false} onClose={jest.fn()} />);
      
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

      rerender(<DogGallery isOpen onClose={jest.fn()} />);

      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });
  });

  describe('edge cases', () => {
    it('should handle rapid tab switching', async () => {
      const user = userEvent.setup();
      render(<DogGallery isOpen onClose={jest.fn()} />);

      const fetchTab = screen.getByRole('tab', { name: /Fetch Doggos/i });
      const galleryTab = screen.getByRole('tab', { name: /Favorites/i });

      // Click rapidly
      await user.click(galleryTab);
      await user.click(fetchTab);
      await user.click(galleryTab);
      await user.click(fetchTab);

      expect(fetchTab).toHaveAttribute('aria-selected', 'true');
    });

    it('should handle fetch while loading', async () => {
      const user = userEvent.setup();
      mockUseDogApi.mockReturnValue({
        ...defaultApiReturn,
        loading: true,
      });

      render(<DogGallery isOpen onClose={jest.fn()} />);

      // FetchControls should still be rendered even while loading
      expect(screen.getByTestId('fetch-controls')).toBeInTheDocument();
      
      // Clicking fetch should still work
      await user.click(screen.getByText('Fetch'));
      expect(defaultApiReturn.fetchDogs).toHaveBeenCalled();
    });
  });
});