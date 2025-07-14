import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { DogEmojiButton } from './DogEmojiButton';
import { dedupeFetch } from '../lib/requestDeduplication';

// Mock the dedupe fetch
jest.mock('../lib/requestDeduplication', () => ({
  dedupeFetch: jest.fn()
}));

const mockDedupeFetch = dedupeFetch as jest.MockedFunction<typeof dedupeFetch>;

// Mock successful responses
const mockBreedsResponse = {
  message: {
    'akita': [],
    'beagle': [],
    'bulldog': ['english', 'french'],
    'collie': ['border'],
    'corgi': ['cardigan', 'pembroke']
  },
  status: 'success'
};

const mockDogImageResponse = {
  message: 'https://images.dog.ceo/breeds/akita/512.jpg',
  status: 'success'
};

const mockGalleryResponse = {
  message: [
    'https://images.dog.ceo/breeds/akita/1.jpg',
    'https://images.dog.ceo/breeds/akita/2.jpg',
    'https://images.dog.ceo/breeds/akita/3.jpg'
  ],
  status: 'success'
};

describe('DogEmojiButton', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Default successful fetch mock
    mockDedupeFetch.mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue(mockDogImageResponse),
      status: 200,
      statusText: 'OK',
      headers: new Headers(),
      redirected: false,
      type: 'basic',
      url: '',
      clone: jest.fn(),
      body: null,
      bodyUsed: false,
      arrayBuffer: jest.fn(),
      blob: jest.fn(),
      formData: jest.fn(),
      text: jest.fn()
    } as Response);
  });

  it('renders the dog emoji button', () => {
    render(<DogEmojiButton />);
    
    const button = screen.getByRole('button', { name: /random dog picture/i });
    expect(button).toBeInTheDocument();
    expect(button).toHaveTextContent('🐕');
  });

  it('opens modal when button is clicked', async () => {
    render(<DogEmojiButton />);
    
    const button = screen.getByRole('button', { name: /random dog picture/i });
    fireEvent.click(button);
    
    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText('Random Dog Generator')).toBeInTheDocument();
    });
  });

  it('fetches and displays a random dog image', async () => {
    render(<DogEmojiButton />);
    
    const button = screen.getByRole('button', { name: /random dog picture/i });
    fireEvent.click(button);
    
    await waitFor(() => {
      const dogImage = screen.getByAltText('Random dog');
      expect(dogImage).toBeInTheDocument();
      expect(dogImage).toHaveAttribute('src', 'https://images.dog.ceo/breeds/akita/512.jpg');
    });
  });

  it('fetches breeds list when modal opens', async () => {
    mockDedupeFetch.mockImplementation((url) => {
      if (url.includes('/breeds/list/all')) {
        return Promise.resolve({
          ok: true,
          json: jest.fn().mockResolvedValue(mockBreedsResponse)
        } as any);
      }
      return Promise.resolve({
        ok: true,
        json: jest.fn().mockResolvedValue(mockDogImageResponse)
      } as any);
    });
    
    render(<DogEmojiButton />);
    
    const button = screen.getByRole('button', { name: /random dog picture/i });
    fireEvent.click(button);
    
    await waitFor(() => {
      const breedSelect = screen.getByRole('combobox', { name: /filter by breed/i });
      expect(breedSelect).toBeInTheDocument();
    });
    
    // Check that breeds are loaded
    const breedSelect = screen.getByRole('combobox', { name: /filter by breed/i });
    fireEvent.click(breedSelect);
    
    expect(screen.getByRole('option', { name: 'akita' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'beagle' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'bulldog' })).toBeInTheDocument();
  });

  it('fetches breed-specific dog when breed is selected', async () => {
    mockDedupeFetch.mockImplementation((url) => {
      if (url.includes('/breeds/list/all')) {
        return Promise.resolve({
          ok: true,
          json: jest.fn().mockResolvedValue(mockBreedsResponse)
        } as any);
      }
      if (url.includes('/breed/beagle/images/random')) {
        return Promise.resolve({
          ok: true,
          json: jest.fn().mockResolvedValue({
            message: 'https://images.dog.ceo/breeds/beagle/123.jpg',
            status: 'success'
          })
        } as any);
      }
      return Promise.resolve({
        ok: true,
        json: jest.fn().mockResolvedValue(mockDogImageResponse)
      } as any);
    });
    
    render(<DogEmojiButton />);
    
    const button = screen.getByRole('button', { name: /random dog picture/i });
    fireEvent.click(button);
    
    await waitFor(() => {
      expect(screen.getByRole('combobox', { name: /filter by breed/i })).toBeInTheDocument();
    });
    
    // Select a breed
    const breedSelect = screen.getByRole('combobox', { name: /filter by breed/i });
    fireEvent.change(breedSelect, { target: { value: 'beagle' } });
    
    // Fetch new dog button
    const fetchButton = screen.getByRole('button', { name: /new beagle/i });
    fireEvent.click(fetchButton);
    
    await waitFor(() => {
      const dogImage = screen.getByAltText('Random dog');
      expect(dogImage).toHaveAttribute('src', 'https://images.dog.ceo/breeds/beagle/123.jpg');
    });
  });

  it('shows loading state while fetching', async () => {
    // Mock a slow response
    mockDedupeFetch.mockImplementation(() => new Promise(resolve => {
      setTimeout(() => {
        resolve({
          ok: true,
          json: jest.fn().mockResolvedValue(mockDogImageResponse)
        } as any);
      }, 100);
    }));
    
    render(<DogEmojiButton />);
    
    const button = screen.getByRole('button', { name: /random dog picture/i });
    fireEvent.click(button);
    
    // Should show loading skeleton
    expect(screen.getByTestId('skeleton-loader')).toBeInTheDocument();
    
    await waitFor(() => {
      expect(screen.queryByTestId('skeleton-loader')).not.toBeInTheDocument();
      expect(screen.getByAltText('Random dog')).toBeInTheDocument();
    });
  });

  it('handles API errors gracefully', async () => {
    mockDedupeFetch.mockRejectedValue(new Error('Network error'));
    
    render(<DogEmojiButton />);
    
    const button = screen.getByRole('button', { name: /random dog picture/i });
    fireEvent.click(button);
    
    await waitFor(() => {
      expect(screen.getByText(/unable to load dog/i)).toBeInTheDocument();
    });
    
    // Retry button should be available
    const retryButton = screen.getByRole('button', { name: /try again/i });
    expect(retryButton).toBeInTheDocument();
  });

  it('closes modal when close button is clicked', async () => {
    render(<DogEmojiButton />);
    
    const button = screen.getByRole('button', { name: /random dog picture/i });
    fireEvent.click(button);
    
    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });
    
    const closeButton = screen.getByRole('button', { name: /close modal/i });
    fireEvent.click(closeButton);
    
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });

  it('closes modal when clicking outside', async () => {
    render(<DogEmojiButton />);
    
    const button = screen.getByRole('button', { name: /random dog picture/i });
    fireEvent.click(button);
    
    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });
    
    // Click on the overlay
    const overlay = screen.getByRole('dialog').parentElement;
    if (overlay) {
      fireEvent.click(overlay);
    }
    
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });

  it('opens modal with keyboard shortcut', async () => {
    render(<DogEmojiButton />);
    
    // Press 'd' key
    fireEvent.keyDown(document, { key: 'd', code: 'KeyD' });
    
    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });
  });

  it('does not open modal with keyboard when modifier keys are pressed', () => {
    render(<DogEmojiButton />);
    
    // Press 'd' with Ctrl
    fireEvent.keyDown(document, { key: 'd', code: 'KeyD', ctrlKey: true });
    
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    
    // Press 'd' with Meta
    fireEvent.keyDown(document, { key: 'd', code: 'KeyD', metaKey: true });
    
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('fetches gallery images when gallery tab is clicked', async () => {
    mockDedupeFetch.mockImplementation((url) => {
      if (url.includes('/breeds/list/all')) {
        return Promise.resolve({
          ok: true,
          json: jest.fn().mockResolvedValue(mockBreedsResponse)
        } as any);
      }
      if (url.includes('/breed/akita/images')) {
        return Promise.resolve({
          ok: true,
          json: jest.fn().mockResolvedValue(mockGalleryResponse)
        } as any);
      }
      return Promise.resolve({
        ok: true,
        json: jest.fn().mockResolvedValue(mockDogImageResponse)
      } as any);
    });
    
    render(<DogEmojiButton />);
    
    const button = screen.getByRole('button', { name: /random dog picture/i });
    fireEvent.click(button);
    
    await waitFor(() => {
      expect(screen.getByRole('combobox')).toBeInTheDocument();
    });
    
    // Select a breed first
    const breedSelect = screen.getByRole('combobox', { name: /filter by breed/i });
    fireEvent.change(breedSelect, { target: { value: 'akita' } });
    
    // Click gallery tab
    const galleryTab = screen.getByRole('tab', { name: /breed gallery/i });
    fireEvent.click(galleryTab);
    
    await waitFor(() => {
      const galleryImages = screen.getAllByAltText(/akita gallery/i);
      expect(galleryImages).toHaveLength(3);
    });
  });

  it('shows placeholder when no breed selected for gallery', async () => {
    render(<DogEmojiButton />);
    
    const button = screen.getByRole('button', { name: /random dog picture/i });
    fireEvent.click(button);
    
    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });
    
    // Click gallery tab without selecting breed
    const galleryTab = screen.getByRole('tab', { name: /breed gallery/i });
    fireEvent.click(galleryTab);
    
    expect(screen.getByText(/select a breed/i)).toBeInTheDocument();
  });

  it('has proper accessibility attributes', () => {
    render(<DogEmojiButton />);
    
    const button = screen.getByRole('button', { name: /random dog picture/i });
    expect(button).toHaveAttribute('aria-label', 'Get random dog picture');
    expect(button).toHaveAttribute('title', 'Press D key for quick access');
  });

  it('shows proper loading state for gallery', async () => {
    // Mock slow gallery response
    mockDedupeFetch.mockImplementation((url) => {
      if (url.includes('/breeds/list/all')) {
        return Promise.resolve({
          ok: true,
          json: jest.fn().mockResolvedValue(mockBreedsResponse)
        } as any);
      }
      if (url.includes('/breed/akita/images')) {
        return new Promise(resolve => {
          setTimeout(() => {
            resolve({
              ok: true,
              json: jest.fn().mockResolvedValue(mockGalleryResponse)
            } as any);
          }, 100);
        });
      }
      return Promise.resolve({
        ok: true,
        json: jest.fn().mockResolvedValue(mockDogImageResponse)
      } as any);
    });
    
    render(<DogEmojiButton />);
    
    const button = screen.getByRole('button', { name: /random dog picture/i });
    fireEvent.click(button);
    
    await waitFor(() => {
      expect(screen.getByRole('combobox')).toBeInTheDocument();
    });
    
    // Select a breed
    const breedSelect = screen.getByRole('combobox', { name: /filter by breed/i });
    fireEvent.change(breedSelect, { target: { value: 'akita' } });
    
    // Click gallery tab
    const galleryTab = screen.getByRole('tab', { name: /breed gallery/i });
    fireEvent.click(galleryTab);
    
    // Should show loading skeletons
    expect(screen.getAllByTestId('skeleton-loader')).toHaveLength(6);
    
    await waitFor(() => {
      expect(screen.queryByTestId('skeleton-loader')).not.toBeInTheDocument();
      expect(screen.getAllByAltText(/akita gallery/i)).toHaveLength(3);
    });
  });
});