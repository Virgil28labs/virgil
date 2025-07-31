import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FetchControls } from '../FetchControls';

describe('FetchControls', () => {
  const mockBreeds = ['akita', 'beagle', 'corgi', 'dalmatian'];

  const defaultProps = {
    selectedBreed: '',
    fetchCount: 1,
    breeds: mockBreeds,
    loading: false,
    onBreedChange: jest.fn(),
    onCountChange: jest.fn(),
    onFetch: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render all control elements', () => {
      render(<FetchControls {...defaultProps} />);

      expect(screen.getByLabelText('Breed:')).toBeInTheDocument();
      expect(screen.getByLabelText('Count:')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Fetch' })).toBeInTheDocument();
    });

    it('should render breed select with options', () => {
      render(<FetchControls {...defaultProps} />);

      const breedSelect = screen.getByLabelText('Breed:') as HTMLSelectElement;

      // Should have default + all breeds
      expect(breedSelect.options).toHaveLength(mockBreeds.length + 1);

      // Check default option
      expect(breedSelect.options[0].value).toBe('');
      expect(breedSelect.options[0].text).toBe('Random Mix');

      // Check breed options
      mockBreeds.forEach((breed, index) => {
        expect(breedSelect.options[index + 1].value).toBe(breed);
        expect(breedSelect.options[index + 1].text).toBe(
          breed.charAt(0).toUpperCase() + breed.slice(1),
        );
      });
    });

    it('should render count select with options 1-9', () => {
      render(<FetchControls {...defaultProps} />);

      const countSelect = screen.getByLabelText('Count:') as HTMLSelectElement;

      expect(countSelect.options).toHaveLength(9);

      for (let i = 1; i <= 9; i++) {
        expect(countSelect.options[i - 1].value).toBe(i.toString());
        expect(countSelect.options[i - 1].text).toBe(i.toString());
      }
    });

    it('should show selected breed', () => {
      render(<FetchControls {...defaultProps} selectedBreed="beagle" />);

      const breedSelect = screen.getByLabelText('Breed:') as HTMLSelectElement;
      expect(breedSelect.value).toBe('beagle');
    });

    it('should show selected count', () => {
      render(<FetchControls {...defaultProps} fetchCount={5} />);

      const countSelect = screen.getByLabelText('Count:') as HTMLSelectElement;
      expect(countSelect.value).toBe('5');
    });

    it('should disable fetch button when loading', () => {
      render(<FetchControls {...defaultProps} loading />);

      const fetchButton = screen.getByRole('button');
      expect(fetchButton).toBeDisabled();
      expect(fetchButton).toHaveTextContent('Fetching...');
    });

    it('should enable fetch button when not loading', () => {
      render(<FetchControls {...defaultProps} loading={false} />);

      const fetchButton = screen.getByRole('button');
      expect(fetchButton).toBeEnabled();
      expect(fetchButton).toHaveTextContent('Fetch');
    });

    it('should handle empty breeds array', () => {
      render(<FetchControls {...defaultProps} breeds={[]} />);

      const breedSelect = screen.getByLabelText('Breed:') as HTMLSelectElement;

      // Should only have the default option
      expect(breedSelect.options).toHaveLength(1);
      expect(breedSelect.options[0].text).toBe('Random Mix');
    });
  });

  describe('interactions', () => {
    it('should call onBreedChange when breed is selected', async () => {
      const user = userEvent.setup();
      render(<FetchControls {...defaultProps} />);

      const breedSelect = screen.getByLabelText('Breed:');

      await user.selectOptions(breedSelect, 'corgi');

      expect(defaultProps.onBreedChange).toHaveBeenCalledTimes(1);
      expect(defaultProps.onBreedChange).toHaveBeenCalledWith('corgi');
    });

    it('should call onBreedChange when selecting random mix', async () => {
      const user = userEvent.setup();
      render(<FetchControls {...defaultProps} selectedBreed="akita" />);

      const breedSelect = screen.getByLabelText('Breed:');

      await user.selectOptions(breedSelect, '');

      expect(defaultProps.onBreedChange).toHaveBeenCalledWith('');
    });

    it('should call onCountChange with number when count is selected', async () => {
      const user = userEvent.setup();
      render(<FetchControls {...defaultProps} />);

      const countSelect = screen.getByLabelText('Count:');

      await user.selectOptions(countSelect, '7');

      expect(defaultProps.onCountChange).toHaveBeenCalledTimes(1);
      expect(defaultProps.onCountChange).toHaveBeenCalledWith(7);
    });

    it('should call onFetch when fetch button is clicked', async () => {
      const user = userEvent.setup();
      render(<FetchControls {...defaultProps} />);

      const fetchButton = screen.getByRole('button', { name: 'Fetch' });

      await user.click(fetchButton);

      expect(defaultProps.onFetch).toHaveBeenCalledTimes(1);
    });

    it('should not call onFetch when button is disabled', async () => {
      const user = userEvent.setup();
      render(<FetchControls {...defaultProps} loading />);

      const fetchButton = screen.getByRole('button', { name: 'Fetching...' });

      await user.click(fetchButton);

      expect(defaultProps.onFetch).not.toHaveBeenCalled();
    });
  });

  describe('accessibility', () => {
    it('should have proper labels', () => {
      render(<FetchControls {...defaultProps} />);

      expect(screen.getByLabelText('Breed:')).toHaveAttribute('id', 'breed-select');
      expect(screen.getByLabelText('Count:')).toHaveAttribute('id', 'count-select');
    });

    it('should have proper form structure', () => {
      render(<FetchControls {...defaultProps} />);

      const controls = document.querySelector('.doggo-fetch-controls');
      expect(controls).toBeInTheDocument();

      const controlGroups = document.querySelectorAll('.doggo-control-group');
      expect(controlGroups).toHaveLength(2);
    });
  });

  describe('memoization', () => {
    it('should not re-render when props are the same', () => {
      const { rerender } = render(<FetchControls {...defaultProps} />);

      const breedSelect = screen.getByLabelText('Breed:');
      const originalSelect = breedSelect;

      // Re-render with same props
      rerender(<FetchControls {...defaultProps} />);

      // Should be the same element instance
      expect(screen.getByLabelText('Breed:')).toBe(originalSelect);
    });

    it('should re-render when selectedBreed changes', () => {
      const { rerender } = render(<FetchControls {...defaultProps} />);

      expect(screen.getByLabelText('Breed:')).toHaveValue('');

      rerender(<FetchControls {...defaultProps} selectedBreed="akita" />);

      expect(screen.getByLabelText('Breed:')).toHaveValue('akita');
    });

    it('should re-render when fetchCount changes', () => {
      const { rerender } = render(<FetchControls {...defaultProps} />);

      expect(screen.getByLabelText('Count:')).toHaveValue('1');

      rerender(<FetchControls {...defaultProps} fetchCount={9} />);

      expect(screen.getByLabelText('Count:')).toHaveValue('9');
    });

    it('should re-render when loading state changes', () => {
      const { rerender } = render(<FetchControls {...defaultProps} />);

      expect(screen.getByRole('button')).toHaveTextContent('Fetch');

      rerender(<FetchControls {...defaultProps} loading />);

      expect(screen.getByRole('button')).toHaveTextContent('Fetching...');
    });

    it('should re-render when breeds array changes', () => {
      const { rerender } = render(<FetchControls {...defaultProps} />);

      const breedSelect = screen.getByLabelText('Breed:') as HTMLSelectElement;
      expect(breedSelect.options).toHaveLength(5); // 1 default + 4 breeds

      const newBreeds = [...mockBreeds, 'husky'];
      rerender(<FetchControls {...defaultProps} breeds={newBreeds} />);

      expect(breedSelect.options).toHaveLength(6);
    });
  });

  describe('edge cases', () => {
    it('should handle breed names with special characters', () => {
      const specialBreeds = ['golden-retriever', 'jack_russell', 'saint bernard'];
      render(<FetchControls {...defaultProps} breeds={specialBreeds} />);

      const breedSelect = screen.getByLabelText('Breed:') as HTMLSelectElement;

      expect(breedSelect.options[1].value).toBe('golden-retriever');
      expect(breedSelect.options[1].text).toBe('Golden-retriever');
    });

    it('should handle very long breed lists', () => {
      const manyBreeds = Array.from({ length: 100 }, (_, i) => `breed${i}`);
      render(<FetchControls {...defaultProps} breeds={manyBreeds} />);

      const breedSelect = screen.getByLabelText('Breed:') as HTMLSelectElement;
      expect(breedSelect.options).toHaveLength(101); // 1 default + 100 breeds
    });

    it('should handle rapid button clicks', async () => {
      const user = userEvent.setup();
      render(<FetchControls {...defaultProps} />);

      const fetchButton = screen.getByRole('button');

      // Click multiple times rapidly
      await user.click(fetchButton);
      await user.click(fetchButton);
      await user.click(fetchButton);

      // Should still call onFetch for each click
      expect(defaultProps.onFetch).toHaveBeenCalledTimes(3);
    });

    it('should handle invalid fetchCount gracefully', () => {
      // Force an invalid count through props
      render(<FetchControls {...defaultProps} fetchCount={15 as unknown as 1 | 5 | 10} />);

      const countSelect = screen.getByLabelText('Count:') as HTMLSelectElement;
      // When an invalid value is provided to a controlled select,
      // the browser defaults to the first available option
      expect(countSelect.value).toBe('1');
    });
  });
});
