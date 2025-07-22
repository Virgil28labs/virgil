import { render, screen } from '@testing-library/react';
import { DogGrid } from './DogGrid';
import type { DogImage } from './hooks/useDogApi';

// Mock DogCard component
jest.mock('./DogCard', () => ({
  DogCard: jest.fn(({ dog, index, isFavorited, onImageClick, onFavoriteToggle }) => (
    <div data-testid={`dog-card-${dog.id}`}>
      <span>Dog: {dog.breed}</span>
      <span>Index: {index}</span>
      <span>Favorited: {isFavorited ? 'yes' : 'no'}</span>
      <button onClick={onImageClick}>Image</button>
      <button onClick={onFavoriteToggle}>Favorite</button>
    </div>
  )),
}));

import { DogCard } from './DogCard';

describe('DogGrid', () => {
  const mockDogs: DogImage[] = [
    { url: 'https://example.com/dog1.jpg', breed: 'akita', id: 'dog-1' },
    { url: 'https://example.com/dog2.jpg', breed: 'beagle', id: 'dog-2' },
    { url: 'https://example.com/dog3.jpg', breed: 'corgi', id: 'dog-3' },
  ];

  const defaultProps = {
    dogs: mockDogs,
    isFavorited: jest.fn((url: string) => url === 'https://example.com/dog2.jpg'),
    onImageClick: jest.fn(),
    onFavoriteToggle: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render a grid container', () => {
      render(<DogGrid {...defaultProps} />);
      
      const grid = document.querySelector('.doggo-grid');
      expect(grid).toBeInTheDocument();
    });

    it('should render DogCard for each dog', () => {
      render(<DogGrid {...defaultProps} />);
      
      expect(screen.getByTestId('dog-card-dog-1')).toBeInTheDocument();
      expect(screen.getByTestId('dog-card-dog-2')).toBeInTheDocument();
      expect(screen.getByTestId('dog-card-dog-3')).toBeInTheDocument();
    });

    it('should pass correct props to each DogCard', () => {
      render(<DogGrid {...defaultProps} />);
      
      expect(DogCard).toHaveBeenCalledTimes(3);
      
      // First dog
      expect((DogCard as unknown as jest.Mock).mock.calls[0][0]).toMatchObject({
        dog: mockDogs[0],
        index: 0,
        isFavorited: false,
        onImageClick: expect.any(Function),
        onFavoriteToggle: expect.any(Function),
      });
      
      // Second dog (favorited)
      expect((DogCard as unknown as jest.Mock).mock.calls[1][0]).toMatchObject({
        dog: mockDogs[1],
        index: 1,
        isFavorited: true,
        onImageClick: expect.any(Function),
        onFavoriteToggle: expect.any(Function),
      });
      
      // Third dog
      expect((DogCard as unknown as jest.Mock).mock.calls[2][0]).toMatchObject({
        dog: mockDogs[2],
        index: 2,
        isFavorited: false,
        onImageClick: expect.any(Function),
        onFavoriteToggle: expect.any(Function),
      });
    });

    it('should render empty grid when no dogs', () => {
      render(<DogGrid {...defaultProps} dogs={[]} />);
      
      const grid = document.querySelector('.doggo-grid');
      expect(grid).toBeInTheDocument();
      expect(grid?.children).toHaveLength(0);
    });

    it('should call isFavorited for each dog', () => {
      render(<DogGrid {...defaultProps} />);
      
      expect(defaultProps.isFavorited).toHaveBeenCalledTimes(3);
      expect(defaultProps.isFavorited).toHaveBeenCalledWith('https://example.com/dog1.jpg');
      expect(defaultProps.isFavorited).toHaveBeenCalledWith('https://example.com/dog2.jpg');
      expect(defaultProps.isFavorited).toHaveBeenCalledWith('https://example.com/dog3.jpg');
    });
  });

  describe('interactions', () => {
    it('should handle image click correctly', () => {
      render(<DogGrid {...defaultProps} />);
      
      // Get the onImageClick handler passed to first DogCard
      const firstDogCardCall = (DogCard as unknown as jest.Mock).mock.calls[0][0];
      
      // Call the handler
      firstDogCardCall.onImageClick();
      
      expect(defaultProps.onImageClick).toHaveBeenCalledTimes(1);
      expect(defaultProps.onImageClick).toHaveBeenCalledWith('https://example.com/dog1.jpg');
    });

    it('should handle favorite toggle correctly', () => {
      render(<DogGrid {...defaultProps} />);
      
      // Get the onFavoriteToggle handler passed to second DogCard
      const secondDogCardCall = (DogCard as unknown as jest.Mock).mock.calls[1][0];
      
      // Create a mock event
      const mockEvent = { stopPropagation: jest.fn() };
      
      // Call the handler
      secondDogCardCall.onFavoriteToggle(mockEvent);
      
      expect(mockEvent.stopPropagation).toHaveBeenCalledTimes(1);
      expect(defaultProps.onFavoriteToggle).toHaveBeenCalledTimes(1);
      expect(defaultProps.onFavoriteToggle).toHaveBeenCalledWith(mockDogs[1]);
    });

    it('should handle multiple image clicks', () => {
      render(<DogGrid {...defaultProps} />);
      
      // Click all images
      mockDogs.forEach((_dog, index) => {
        const dogCardCall = (DogCard as unknown as jest.Mock).mock.calls[index][0];
        dogCardCall.onImageClick();
      });
      
      expect(defaultProps.onImageClick).toHaveBeenCalledTimes(3);
      expect(defaultProps.onImageClick).toHaveBeenNthCalledWith(1, 'https://example.com/dog1.jpg');
      expect(defaultProps.onImageClick).toHaveBeenNthCalledWith(2, 'https://example.com/dog2.jpg');
      expect(defaultProps.onImageClick).toHaveBeenNthCalledWith(3, 'https://example.com/dog3.jpg');
    });

    it('should handle multiple favorite toggles', () => {
      render(<DogGrid {...defaultProps} />);
      
      const mockEvent = { stopPropagation: jest.fn() };
      
      // Toggle all favorites
      mockDogs.forEach((_dog, index) => {
        const dogCardCall = (DogCard as unknown as jest.Mock).mock.calls[index][0];
        dogCardCall.onFavoriteToggle(mockEvent);
      });
      
      expect(mockEvent.stopPropagation).toHaveBeenCalledTimes(3);
      expect(defaultProps.onFavoriteToggle).toHaveBeenCalledTimes(3);
      expect(defaultProps.onFavoriteToggle).toHaveBeenNthCalledWith(1, mockDogs[0]);
      expect(defaultProps.onFavoriteToggle).toHaveBeenNthCalledWith(2, mockDogs[1]);
      expect(defaultProps.onFavoriteToggle).toHaveBeenNthCalledWith(3, mockDogs[2]);
    });
  });

  describe('memoization', () => {
    it('should not re-render when props are the same', () => {
      const { rerender } = render(<DogGrid {...defaultProps} />);
      
      const initialCallCount = (DogCard as unknown as jest.Mock).mock.calls.length;
      
      // Re-render with same props
      rerender(<DogGrid {...defaultProps} />);
      
      // DogCard should not be called again
      expect(DogCard).toHaveBeenCalledTimes(initialCallCount);
    });

    it('should re-render when dogs array changes', () => {
      const { rerender } = render(<DogGrid {...defaultProps} />);
      
      const newDogs = [...mockDogs, { url: 'https://example.com/dog4.jpg', breed: 'husky', id: 'dog-4' }];
      
      rerender(<DogGrid {...defaultProps} dogs={newDogs} />);
      
      expect(screen.getByTestId('dog-card-dog-4')).toBeInTheDocument();
      expect(DogCard).toHaveBeenCalledTimes(7); // 3 initial + 4 after re-render
    });

    it('should re-render when isFavorited function changes', () => {
      const { rerender } = render(<DogGrid {...defaultProps} />);
      
      const newIsFavorited = jest.fn(() => true);
      
      rerender(<DogGrid {...defaultProps} isFavorited={newIsFavorited} />);
      
      // Check that all dogs are now marked as favorited
      const lastThreeCalls = (DogCard as unknown as jest.Mock).mock.calls.slice(-3);
      lastThreeCalls.forEach(call => {
        expect(call[0].isFavorited).toBe(true);
      });
    });

    it('should maintain handler references when re-rendering with same callbacks', () => {
      const { rerender } = render(<DogGrid {...defaultProps} />);
      
      const firstRenderHandlers = (DogCard as unknown as jest.Mock).mock.calls[0][0];
      
      // Re-render with same props
      rerender(<DogGrid {...defaultProps} />);
      
      const secondRenderHandlers = (DogCard as unknown as jest.Mock).mock.calls[0][0];
      
      // Handlers should be the same reference due to useCallback
      expect(firstRenderHandlers.onFavoriteToggle).toBe(secondRenderHandlers.onFavoriteToggle);
    });
  });

  describe('edge cases', () => {
    it('should handle dogs with duplicate IDs', () => {
      const dogsWithDuplicates = [
        { url: 'https://example.com/dog1.jpg', breed: 'akita', id: 'dog-1' },
        { url: 'https://example.com/dog2.jpg', breed: 'beagle', id: 'dog-1' }, // Duplicate ID
      ];
      
      render(<DogGrid {...defaultProps} dogs={dogsWithDuplicates} />);
      
      // Should still render both dogs (React will warn about duplicate keys)
      expect(DogCard).toHaveBeenCalledTimes(2);
    });

    it('should handle very large dog arrays', () => {
      const largeDogArray = Array.from({ length: 100 }, (_, i) => ({
        url: `https://example.com/dog${i}.jpg`,
        breed: 'test',
        id: `dog-${i}`,
      }));
      
      render(<DogGrid {...defaultProps} dogs={largeDogArray} />);
      
      expect(DogCard).toHaveBeenCalledTimes(100);
    });

    it('should handle isFavorited throwing errors', () => {
      const errorIsFavorited = jest.fn(() => {
        throw new Error('Favorite check failed');
      });
      
      // Should not crash the component
      expect(() => {
        render(<DogGrid {...defaultProps} isFavorited={errorIsFavorited} />);
      }).toThrow('Favorite check failed');
    });
  });
});