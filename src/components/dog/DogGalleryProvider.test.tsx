import { render, screen, act } from '@testing-library/react';
import { DogGalleryProvider, useDogGallery } from './DogGalleryProvider';
import { useDogApi } from './hooks/useDogApi';
import { useDogFavorites } from './hooks/useDogFavorites';
import type { DogImage } from '../../types';

// Mock the hooks
jest.mock('./hooks/useDogApi');
jest.mock('./hooks/useDogFavorites');

const mockUseDogApi = useDogApi as jest.MockedFunction<typeof useDogApi>;
const mockUseDogFavorites = useDogFavorites as jest.MockedFunction<typeof useDogFavorites>;

const mockDog: DogImage = {
  id: 'test-1',
  url: 'https://example.com/dog.jpg',
  breed: 'golden-retriever',
};

const mockApiReturn = {
  dogs: [mockDog],
  breeds: ['golden-retriever', 'bulldog'],
  loading: false,
  error: null,
  fetchDogs: jest.fn(),
  fetchBreeds: jest.fn(),
};

const mockFavoritesReturn = {
  favorites: [],
  isFavorited: jest.fn().mockReturnValue(false),
  toggleFavorite: jest.fn(),
};

function TestComponent() {
  const {
    state,
    dogs,
    breeds,
    loading,
    error,
    favorites,
    setActiveTab,
    setSelectedBreed,
    setFetchCount,
    setSelectedImageIndex,
    fetchDogs,
    fetchBreeds,
    toggleFavorite,
  } = useDogGallery();

  return (
    <div>
      <div data-testid="active-tab">{state.activeTab}</div>
      <div data-testid="selected-breed">{state.selectedBreed}</div>
      <div data-testid="fetch-count">{state.fetchCount}</div>
      <div data-testid="selected-image-index">{state.selectedImageIndex}</div>
      <div data-testid="dogs-count">{dogs.length}</div>
      <div data-testid="breeds-count">{breeds.length}</div>
      <div data-testid="loading">{loading.toString()}</div>
      <div data-testid="error">{error || 'no-error'}</div>
      <div data-testid="favorites-count">{favorites.length}</div>
      
      <button onClick={() => setActiveTab('gallery')}>Set Gallery Tab</button>
      <button onClick={() => setSelectedBreed('bulldog')}>Set Breed</button>
      <button onClick={() => setFetchCount(5)}>Set Count</button>
      <button onClick={() => setSelectedImageIndex(1)}>Set Image Index</button>
      <button onClick={() => fetchDogs()}>Fetch Dogs</button>
      <button onClick={() => fetchBreeds()}>Fetch Breeds</button>
      <button onClick={() => toggleFavorite(mockDog)}>Toggle Favorite</button>
    </div>
  );
}

describe('DogGalleryProvider', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseDogApi.mockReturnValue(mockApiReturn);
    mockUseDogFavorites.mockReturnValue(mockFavoritesReturn);
  });

  it('provides initial state correctly', () => {
    render(
      <DogGalleryProvider>
        <TestComponent />
      </DogGalleryProvider>,
    );

    expect(screen.getByTestId('active-tab')).toHaveTextContent('fetch');
    expect(screen.getByTestId('selected-breed')).toHaveTextContent('');
    expect(screen.getByTestId('fetch-count')).toHaveTextContent('3');
    expect(screen.getByTestId('selected-image-index')).toHaveTextContent('');
    expect(screen.getByTestId('dogs-count')).toHaveTextContent('1');
    expect(screen.getByTestId('breeds-count')).toHaveTextContent('2');
    expect(screen.getByTestId('loading')).toHaveTextContent('false');
    expect(screen.getByTestId('error')).toHaveTextContent('no-error');
    expect(screen.getByTestId('favorites-count')).toHaveTextContent('0');
  });

  it('updates active tab when setActiveTab is called', () => {
    render(
      <DogGalleryProvider>
        <TestComponent />
      </DogGalleryProvider>,
    );

    act(() => {
      screen.getByText('Set Gallery Tab').click();
    });

    expect(screen.getByTestId('active-tab')).toHaveTextContent('gallery');
  });

  it('updates selected breed when setSelectedBreed is called', () => {
    render(
      <DogGalleryProvider>
        <TestComponent />
      </DogGalleryProvider>,
    );

    act(() => {
      screen.getByText('Set Breed').click();
    });

    expect(screen.getByTestId('selected-breed')).toHaveTextContent('bulldog');
  });

  it('updates fetch count when setFetchCount is called', () => {
    render(
      <DogGalleryProvider>
        <TestComponent />
      </DogGalleryProvider>,
    );

    act(() => {
      screen.getByText('Set Count').click();
    });

    expect(screen.getByTestId('fetch-count')).toHaveTextContent('5');
  });

  it('updates selected image index when setSelectedImageIndex is called', () => {
    render(
      <DogGalleryProvider>
        <TestComponent />
      </DogGalleryProvider>,
    );

    act(() => {
      screen.getByText('Set Image Index').click();
    });

    expect(screen.getByTestId('selected-image-index')).toHaveTextContent('1');
  });

  it('calls fetchDogs with current state when fetchDogs is called', () => {
    render(
      <DogGalleryProvider>
        <TestComponent />
      </DogGalleryProvider>,
    );

    // Set some state first
    act(() => {
      screen.getByText('Set Breed').click();
      screen.getByText('Set Count').click();
    });

    act(() => {
      screen.getByText('Fetch Dogs').click();
    });

    expect(mockApiReturn.fetchDogs).toHaveBeenCalledWith('bulldog', 5);
  });

  it('calls fetchBreeds when fetchBreeds is called', () => {
    render(
      <DogGalleryProvider>
        <TestComponent />
      </DogGalleryProvider>,
    );

    act(() => {
      screen.getByText('Fetch Breeds').click();
    });

    expect(mockApiReturn.fetchBreeds).toHaveBeenCalledTimes(1);
  });

  it('calls toggleFavorite when toggleFavorite is called', () => {
    render(
      <DogGalleryProvider>
        <TestComponent />
      </DogGalleryProvider>,
    );

    act(() => {
      screen.getByText('Toggle Favorite').click();
    });

    expect(mockFavoritesReturn.toggleFavorite).toHaveBeenCalledWith(mockDog);
  });

  it('automatically fetches breeds when isOpen is true and breeds is empty', () => {
    // Reset to empty breeds
    const emptyBreedsReturn = { ...mockApiReturn, breeds: [] };
    mockUseDogApi.mockReturnValue(emptyBreedsReturn);

    render(
      <DogGalleryProvider isOpen>
        <TestComponent />
      </DogGalleryProvider>,
    );

    expect(emptyBreedsReturn.fetchBreeds).toHaveBeenCalledTimes(1);
  });

  it('does not fetch breeds when isOpen is false', () => {
    const emptyBreedsReturn = { ...mockApiReturn, breeds: [] };
    mockUseDogApi.mockReturnValue(emptyBreedsReturn);

    render(
      <DogGalleryProvider isOpen={false}>
        <TestComponent />
      </DogGalleryProvider>,
    );

    expect(emptyBreedsReturn.fetchBreeds).not.toHaveBeenCalled();
  });

  it('does not fetch breeds when breeds already exist', () => {
    render(
      <DogGalleryProvider isOpen>
        <TestComponent />
      </DogGalleryProvider>,
    );

    expect(mockApiReturn.fetchBreeds).not.toHaveBeenCalled();
  });

  it('throws error when useDogGallery is used outside provider', () => {
    const TestComponentOutside = () => {
      useDogGallery();
      return null;
    };

    // Suppress console.error for this test
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    
    expect(() => {
      render(<TestComponentOutside />);
    }).toThrow('useDogGallery must be used within a DogGalleryProvider');
    
    consoleSpy.mockRestore();
  });

  it('handles error state from API', () => {
    const errorApiReturn = { ...mockApiReturn, error: 'API Error', loading: true };
    mockUseDogApi.mockReturnValue(errorApiReturn);

    render(
      <DogGalleryProvider>
        <TestComponent />
      </DogGalleryProvider>,
    );

    expect(screen.getByTestId('error')).toHaveTextContent('API Error');
    expect(screen.getByTestId('loading')).toHaveTextContent('true');
  });

  it('provides favorites data correctly', () => {
    const favoritesReturn = { ...mockFavoritesReturn, favorites: [mockDog] };
    mockUseDogFavorites.mockReturnValue(favoritesReturn);

    render(
      <DogGalleryProvider>
        <TestComponent />
      </DogGalleryProvider>,
    );

    expect(screen.getByTestId('favorites-count')).toHaveTextContent('1');
  });
});