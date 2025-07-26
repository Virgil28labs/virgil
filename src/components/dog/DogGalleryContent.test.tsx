import { render, screen } from '@testing-library/react';
import { DogGalleryContent } from './DogGalleryContent';
import { useDogGallery } from './hooks/useDogGallery';
import type { DogImage, DogGalleryContextType } from '../../types';

// Mock the components
interface FetchControlsProps {
  onFetch: () => void;
  onBreedChange: (breed: string) => void;
  onCountChange: (count: number) => void;
}

jest.mock('./FetchControls', () => ({
  FetchControls: ({ onFetch, onBreedChange, onCountChange }: FetchControlsProps) => (
    <div data-testid="fetch-controls">
      <button onClick={onFetch}>Fetch</button>
      <button onClick={() => onBreedChange('bulldog')}>Change Breed</button>
      <button onClick={() => onCountChange(5)}>Change Count</button>
    </div>
  ),
}));

interface DogGridProps {
  dogs: DogImage[];
  onImageClick: (url: string) => void;
  onFavoriteToggle: (dog: DogImage) => void;
}

jest.mock('./DogGrid', () => ({
  DogGrid: ({ dogs, onImageClick, onFavoriteToggle }: DogGridProps) => (
    <div data-testid="dog-grid">
      {dogs.map((dog: DogImage) => (
        <div key={dog.id} data-testid={`dog-${dog.id}`}>
          <button onClick={() => onImageClick(dog.url)}>Image</button>
          <button onClick={() => onFavoriteToggle(dog)}>Favorite</button>
        </div>
      ))}
    </div>
  ),
}));

interface DogImageStatesProps {
  loading: boolean;
  error: string | null;
  dogsCount: number;
  activeTab: string;
  onSwitchToFetch?: () => void;
}

jest.mock('./DogImageStates', () => ({
  DogImageStates: ({ loading, error, dogsCount, activeTab, onSwitchToFetch }: DogImageStatesProps) => (
    <div data-testid="dog-image-states">
      <div data-testid="loading">{loading.toString()}</div>
      <div data-testid="error">{error || 'no-error'}</div>
      <div data-testid="dogs-count">{dogsCount}</div>
      <div data-testid="active-tab">{activeTab}</div>
      {onSwitchToFetch && <button onClick={onSwitchToFetch}>Switch to Fetch</button>}
    </div>
  ),
}));

jest.mock('./hooks/useDogGallery', () => ({
  useDogGallery: jest.fn(),
}));

const mockUseDogGallery = useDogGallery as jest.MockedFunction<typeof useDogGallery>;

const mockDog: DogImage = {
  id: 'test-1',
  url: 'https://example.com/dog.jpg',
  breed: 'golden-retriever',
};

const mockContextValue: DogGalleryContextType = {
  state: {
    activeTab: 'fetch',
    selectedBreed: '',
    fetchCount: 3,
    selectedImageIndex: null,
  },
  dogs: [mockDog],
  breeds: ['golden-retriever', 'bulldog'],
  loading: false,
  error: null,
  favorites: [],
  setActiveTab: jest.fn(),
  setSelectedBreed: jest.fn(),
  setFetchCount: jest.fn(),
  setSelectedImageIndex: jest.fn(),
  fetchDogs: jest.fn(),
  fetchBreeds: jest.fn(),
  isFavorited: jest.fn().mockReturnValue(false),
  toggleFavorite: jest.fn(),
};

describe('DogGalleryContent', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseDogGallery.mockReturnValue(mockContextValue);
  });

  it('renders DogImageStates component with correct props', () => {
    render(<DogGalleryContent />);

    expect(screen.getByTestId('dog-image-states')).toBeInTheDocument();
    expect(screen.getByTestId('loading')).toHaveTextContent('false');
    expect(screen.getByTestId('error')).toHaveTextContent('no-error');
    expect(screen.getByTestId('dogs-count')).toHaveTextContent('1');
    expect(screen.getByTestId('active-tab')).toHaveTextContent('fetch');
  });

  it('shows FetchControls when activeTab is fetch', () => {
    render(<DogGalleryContent />);

    expect(screen.getByTestId('fetch-controls')).toBeInTheDocument();
  });

  it('hides FetchControls when activeTab is gallery', () => {
    const galleryContextValue = {
      ...mockContextValue,
      state: { ...mockContextValue.state, activeTab: 'gallery' as const },
    };
    mockUseDogGallery.mockReturnValue(galleryContextValue);

    render(<DogGalleryContent />);

    expect(screen.queryByTestId('fetch-controls')).not.toBeInTheDocument();
  });

  it('shows DogGrid when there are dogs and not loading', () => {
    render(<DogGalleryContent />);

    expect(screen.getByTestId('dog-grid')).toBeInTheDocument();
    expect(screen.getByTestId('dog-test-1')).toBeInTheDocument();
  });

  it('hides DogGrid when loading', () => {
    const loadingContextValue = {
      ...mockContextValue,
      loading: true,
    };
    mockUseDogGallery.mockReturnValue(loadingContextValue);

    render(<DogGalleryContent />);

    expect(screen.queryByTestId('dog-grid')).not.toBeInTheDocument();
  });

  it('hides DogGrid when no dogs', () => {
    const noDogContextValue = {
      ...mockContextValue,
      dogs: [],
    };
    mockUseDogGallery.mockReturnValue(noDogContextValue);

    render(<DogGalleryContent />);

    expect(screen.queryByTestId('dog-grid')).not.toBeInTheDocument();
  });

  it('displays favorites when activeTab is gallery', () => {
    const galleryContextValue = {
      ...mockContextValue,
      state: { ...mockContextValue.state, activeTab: 'gallery' as const },
      favorites: [mockDog],
    };
    mockUseDogGallery.mockReturnValue(galleryContextValue);

    render(<DogGalleryContent />);

    expect(screen.getByTestId('dog-grid')).toBeInTheDocument();
    expect(screen.getByTestId('dogs-count')).toHaveTextContent('1');
  });

  it('provides switch to fetch button when in gallery tab', () => {
    const galleryContextValue = {
      ...mockContextValue,
      state: { ...mockContextValue.state, activeTab: 'gallery' as const },
      dogs: [],
      favorites: [],
    };
    mockUseDogGallery.mockReturnValue(galleryContextValue);

    render(<DogGalleryContent />);

    expect(screen.getByText('Switch to Fetch')).toBeInTheDocument();
  });

  it('does not provide switch to fetch button when in fetch tab', () => {
    const fetchContextValue = {
      ...mockContextValue,
      dogs: [],
      favorites: [],
    };
    mockUseDogGallery.mockReturnValue(fetchContextValue);

    render(<DogGalleryContent />);

    expect(screen.queryByText('Switch to Fetch')).not.toBeInTheDocument();
  });

  it('calls setSelectedImageIndex when image is clicked', () => {
    render(<DogGalleryContent />);

    screen.getByText('Image').click();

    expect(mockContextValue.setSelectedImageIndex).toHaveBeenCalledWith(0);
  });

  it('calls toggleFavorite when favorite button is clicked', () => {
    render(<DogGalleryContent />);

    screen.getByText('Favorite').click();

    expect(mockContextValue.toggleFavorite).toHaveBeenCalledWith(mockDog);
  });

  it('calls fetchDogs when fetch button is clicked', () => {
    render(<DogGalleryContent />);

    screen.getByText('Fetch').click();

    expect(mockContextValue.fetchDogs).toHaveBeenCalledTimes(1);
  });

  it('calls setActiveTab when switch to fetch is clicked', () => {
    const galleryContextValue = {
      ...mockContextValue,
      state: { ...mockContextValue.state, activeTab: 'gallery' as const },
      dogs: [],
      favorites: [],
    };
    mockUseDogGallery.mockReturnValue(galleryContextValue);

    render(<DogGalleryContent />);

    screen.getByText('Switch to Fetch').click();

    expect(mockContextValue.setActiveTab).toHaveBeenCalledWith('fetch');
  });

  it('handles image click with correct index calculation', () => {
    const multiDogsContext = {
      ...mockContextValue,
      dogs: [
        { id: 'dog-1', url: 'url-1', breed: 'breed-1' },
        { id: 'dog-2', url: 'url-2', breed: 'breed-2' },
        { id: 'dog-3', url: 'url-3', breed: 'breed-3' },
      ],
    };
    mockUseDogGallery.mockReturnValue(multiDogsContext);

    render(<DogGalleryContent />);

    // Click the second dog (index 1)
    const images = screen.getAllByText('Image');
    images[1].click();

    expect(mockContextValue.setSelectedImageIndex).toHaveBeenCalledWith(1);
  });
});
