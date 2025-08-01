/**
 * TimezoneSearch Test Suite
 * 
 * Tests the timezone search component including:
 * - Search functionality
 * - Keyboard navigation
 * - Suggestion filtering
 * - Popular timezones display  
 * - Accessibility features
 * - Clear search functionality
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TimezoneSearch } from '../TimezoneSearch';
import { searchTimezones, getPopularTimezones } from '../timezoneData';

// Mock timezone data
jest.mock('../timezoneData');

const mockSearchTimezones = searchTimezones as jest.MockedFunction<typeof searchTimezones>;
const mockGetPopularTimezones = getPopularTimezones as jest.MockedFunction<typeof getPopularTimezones>;

describe('TimezoneSearch', () => {
  const mockOnSelect = jest.fn();

  const mockTimezones = [
    {
      timezone: 'America/New_York',
      city: 'New York',
      country: 'United States',
      region: 'Eastern',
      popular: true,
      searchTerms: ['new york', 'nyc', 'eastern', 'est'],
    },
    {
      timezone: 'America/Los_Angeles',
      city: 'Los Angeles', 
      country: 'United States',
      region: 'Pacific',
      popular: true,
      searchTerms: ['los angeles', 'la', 'pacific', 'pst'],
    },
    {
      timezone: 'Europe/London',
      city: 'London',
      country: 'United Kingdom',
      region: 'GMT',
      popular: true,
      searchTerms: ['london', 'uk', 'britain', 'gmt'],
    },
    {
      timezone: 'Asia/Tokyo',
      city: 'Tokyo',
      country: 'Japan',
      region: 'JST',
      popular: false,
      searchTerms: ['tokyo', 'japan', 'jst'],
    },
  ];

  const defaultProps = {
    onSelect: mockOnSelect,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetPopularTimezones.mockReturnValue(mockTimezones.filter(tz => tz.popular));
    mockSearchTimezones.mockReturnValue([]);
  });

  describe('rendering', () => {
    it('should render search input with default placeholder', () => {
      render(<TimezoneSearch {...defaultProps} />);

      expect(screen.getByPlaceholderText('Search cities or countries...')).toBeInTheDocument();
      expect(screen.getByRole('combobox')).toBeInTheDocument();
    });

    it('should render with custom placeholder', () => {
      render(<TimezoneSearch {...defaultProps} placeholder="Find timezone" />);

      expect(screen.getByPlaceholderText('Find timezone')).toBeInTheDocument();
    });

    it('should render with custom className', () => {
      const { container } = render(<TimezoneSearch {...defaultProps} className="custom-search" />);

      expect(container.querySelector('.timezone-search')).toHaveClass('custom-search');
    });

    it('should render search icon', () => {
      render(<TimezoneSearch {...defaultProps} />);

      expect(screen.getByText('🔍')).toBeInTheDocument();
    });

    it('should auto-focus input when autoFocus is true', () => {
      render(<TimezoneSearch {...defaultProps} autoFocus />);

      expect(screen.getByRole('combobox')).toHaveFocus();
    });

    it('should not auto-focus input when autoFocus is false', () => {
      render(<TimezoneSearch {...defaultProps} autoFocus={false} />);

      expect(screen.getByRole('combobox')).not.toHaveFocus();
    });
  });

  describe('popular timezones display', () => {
    it('should show popular timezones when input is empty', async () => {
      render(<TimezoneSearch {...defaultProps} />);

      const input = screen.getByRole('combobox');
      await userEvent.click(input);

      expect(screen.getByRole('listbox')).toBeInTheDocument();
      expect(screen.getByText('New York')).toBeInTheDocument();
      expect(screen.getByText('Los Angeles')).toBeInTheDocument();
      expect(screen.getByText('London')).toBeInTheDocument();
    });

    it('should show popular badge for popular timezones', async () => {
      render(<TimezoneSearch {...defaultProps} />);

      const input = screen.getByRole('combobox');
      await userEvent.click(input);

      const popularBadges = screen.getAllByText('Popular');
      expect(popularBadges).toHaveLength(3); // New York, Los Angeles, London
    });

    it('should show country and region information', async () => {
      render(<TimezoneSearch {...defaultProps} />);

      const input = screen.getByRole('combobox');
      await userEvent.click(input);

      expect(screen.getByText('United States')).toBeInTheDocument();
      expect(screen.getByText('Eastern')).toBeInTheDocument();
      expect(screen.getByText('Pacific')).toBeInTheDocument();
    });
  });

  describe('search functionality', () => {
    it('should update query on input change', async () => {
      render(<TimezoneSearch {...defaultProps} />);

      const input = screen.getByRole('combobox');
      await userEvent.type(input, 'tokyo');

      expect(input).toHaveValue('tokyo');
      expect(mockSearchTimezones).toHaveBeenCalledWith('tokyo', 8);
    });

    it('should show search results when typing', async () => {
      mockSearchTimezones.mockReturnValue([mockTimezones[3]]); // Tokyo

      render(<TimezoneSearch {...defaultProps} />);

      const input = screen.getByRole('combobox');
      await userEvent.type(input, 'tokyo');

      expect(screen.getByText('Tokyo')).toBeInTheDocument();
      expect(screen.getByText('Japan')).toBeInTheDocument();
    });

    it('should show "No timezones found" when no results', async () => {
      mockSearchTimezones.mockReturnValue([]);

      render(<TimezoneSearch {...defaultProps} />);

      const input = screen.getByRole('combobox');
      await userEvent.type(input, 'nonexistent');

      expect(screen.getByText('No timezones found')).toBeInTheDocument();
    });

    it('should filter out excluded timezones', async () => {
      render(
        <TimezoneSearch 
          {...defaultProps} 
          excludeTimezones={['America/New_York']}
        />,
      );

      const input = screen.getByRole('combobox');
      await userEvent.click(input);

      expect(screen.queryByText('New York')).not.toBeInTheDocument();
      expect(screen.getByText('Los Angeles')).toBeInTheDocument();
      expect(screen.getByText('London')).toBeInTheDocument();
    });
  });

  describe('clear search functionality', () => {
    it('should show clear button when query is not empty', async () => {
      render(<TimezoneSearch {...defaultProps} />);

      const input = screen.getByRole('combobox');
      await userEvent.type(input, 'test');

      expect(screen.getByLabelText('Clear search')).toBeInTheDocument();
      expect(screen.getByText('✕')).toBeInTheDocument();
    });

    it('should not show clear button when query is empty', () => {
      render(<TimezoneSearch {...defaultProps} />);

      expect(screen.queryByLabelText('Clear search')).not.toBeInTheDocument();
    });

    it('should clear query and focus input on clear button click', async () => {
      render(<TimezoneSearch {...defaultProps} />);

      const input = screen.getByRole('combobox');
      await userEvent.type(input, 'test');

      const clearButton = screen.getByLabelText('Clear search');
      await userEvent.click(clearButton);

      expect(input).toHaveValue('');
      expect(input).toHaveFocus();
    });
  });

  describe('keyboard navigation', () => {
    beforeEach(() => {
      mockSearchTimezones.mockReturnValue(mockTimezones.slice(0, 3));
    });

    it('should navigate down with ArrowDown key', async () => {
      render(<TimezoneSearch {...defaultProps} />);

      const input = screen.getByRole('combobox');
      await userEvent.type(input, 'test');

      fireEvent.keyDown(input, { key: 'ArrowDown' });

      const firstOption = screen.getByRole('option', { selected: true });
      expect(firstOption).toHaveTextContent('New York');
    });

    it('should navigate up with ArrowUp key', async () => {
      render(<TimezoneSearch {...defaultProps} />);

      const input = screen.getByRole('combobox');
      await userEvent.type(input, 'test');

      // Go to first item
      fireEvent.keyDown(input, { key: 'ArrowDown' });
      // Go to last item (wraps around)
      fireEvent.keyDown(input, { key: 'ArrowUp' });

      const lastOption = screen.getByRole('option', { selected: true });
      expect(lastOption).toHaveTextContent('London');
    });

    it('should wrap navigation at beginning and end', async () => {
      render(<TimezoneSearch {...defaultProps} />);

      const input = screen.getByRole('combobox');
      await userEvent.type(input, 'test');

      // Navigate to last item
      fireEvent.keyDown(input, { key: 'ArrowDown' }); // First
      fireEvent.keyDown(input, { key: 'ArrowDown' }); // Second  
      fireEvent.keyDown(input, { key: 'ArrowDown' }); // Third
      fireEvent.keyDown(input, { key: 'ArrowDown' }); // Wrap to first

      const firstOption = screen.getByRole('option', { selected: true });
      expect(firstOption).toHaveTextContent('New York');
    });

    it('should select timezone on Enter key', async () => {
      render(<TimezoneSearch {...defaultProps} />);

      const input = screen.getByRole('combobox');
      await userEvent.type(input, 'test');

      fireEvent.keyDown(input, { key: 'ArrowDown' }); // Select first
      fireEvent.keyDown(input, { key: 'Enter' });

      expect(mockOnSelect).toHaveBeenCalledWith('America/New_York');
      expect(input).toHaveValue('');
    });

    it('should close suggestions on Escape key', async () => {
      render(<TimezoneSearch {...defaultProps} />);

      const input = screen.getByRole('combobox');
      await userEvent.type(input, 'test');

      expect(screen.getByRole('listbox')).toBeInTheDocument();

      fireEvent.keyDown(input, { key: 'Escape' });

      expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    });

    it('should close suggestions on Tab key', async () => {
      render(<TimezoneSearch {...defaultProps} />);

      const input = screen.getByRole('combobox');
      await userEvent.type(input, 'test');

      expect(screen.getByRole('listbox')).toBeInTheDocument();

      fireEvent.keyDown(input, { key: 'Tab' });

      await waitFor(() => {
        expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
      });
    });

    it('should do nothing on other keys', async () => {
      render(<TimezoneSearch {...defaultProps} />);

      const input = screen.getByRole('combobox');
      await userEvent.type(input, 'test');

      fireEvent.keyDown(input, { key: 'Space' });

      // Should not affect navigation or selection
      expect(screen.queryByRole('option', { selected: true })).not.toBeInTheDocument();
    });
  });

  describe('mouse interactions', () => {
    beforeEach(() => {
      mockSearchTimezones.mockReturnValue(mockTimezones.slice(0, 2));
    });

    it('should select timezone on click', async () => {
      render(<TimezoneSearch {...defaultProps} />);

      const input = screen.getByRole('combobox');
      await userEvent.type(input, 'test');

      const option = screen.getByText('New York');
      await userEvent.click(option);

      expect(mockOnSelect).toHaveBeenCalledWith('America/New_York');
      expect(input).toHaveValue('');
    });

    it('should highlight option on mouse enter', async () => {
      render(<TimezoneSearch {...defaultProps} />);

      const input = screen.getByRole('combobox');
      await userEvent.type(input, 'test');

      const option = screen.getByText('Los Angeles').closest('li')!;
      fireEvent.mouseEnter(option);

      expect(option).toHaveClass('selected');
      expect(option).toHaveAttribute('aria-selected', 'true');
    });
  });

  describe('focus and blur handling', () => {
    it('should show suggestions on focus', async () => {
      render(<TimezoneSearch {...defaultProps} />);

      const input = screen.getByRole('combobox');
      await userEvent.click(input);

      expect(screen.getByRole('listbox')).toBeInTheDocument();
    });

    it('should hide suggestions on blur with delay', async () => {
      render(<TimezoneSearch {...defaultProps} />);

      const input = screen.getByRole('combobox');
      await userEvent.click(input);

      expect(screen.getByRole('listbox')).toBeInTheDocument();

      fireEvent.blur(input);

      // Should still be visible immediately
      expect(screen.getByRole('listbox')).toBeInTheDocument();

      // Should be hidden after delay
      await waitFor(() => {
        expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
      }, { timeout: 200 });
    });
  });

  describe('accessibility', () => {
    it('should have proper ARIA attributes', () => {
      render(<TimezoneSearch {...defaultProps} />);

      const input = screen.getByRole('combobox');
      expect(input).toHaveAttribute('aria-label', 'Search for timezone by city or country');
      expect(input).toHaveAttribute('aria-autocomplete', 'list');
      expect(input).toHaveAttribute('aria-expanded', 'false');
    });

    it('should update aria-expanded when suggestions are shown', async () => {
      render(<TimezoneSearch {...defaultProps} />);

      const input = screen.getByRole('combobox');
      await userEvent.click(input);

      expect(input).toHaveAttribute('aria-expanded', 'true');
    });

    it('should set aria-activedescendant when navigating', async () => {
      mockSearchTimezones.mockReturnValue(mockTimezones.slice(0, 2));
      render(<TimezoneSearch {...defaultProps} />);

      const input = screen.getByRole('combobox');
      await userEvent.type(input, 'test');

      fireEvent.keyDown(input, { key: 'ArrowDown' });

      expect(input).toHaveAttribute('aria-activedescendant', 'timezone-suggestion-0');
    });

    it('should have proper listbox role and label', async () => {
      render(<TimezoneSearch {...defaultProps} />);

      const input = screen.getByRole('combobox');
      await userEvent.click(input);

      const listbox = screen.getByRole('listbox');
      expect(listbox).toHaveAttribute('aria-label', 'Timezone suggestions');
    });

    it('should have proper option roles and selection states', async () => {
      mockSearchTimezones.mockReturnValue(mockTimezones.slice(0, 2));
      render(<TimezoneSearch {...defaultProps} />);

      const input = screen.getByRole('combobox');
      await userEvent.type(input, 'test');

      const options = screen.getAllByRole('option');
      expect(options).toHaveLength(2);
      
      options.forEach(option => {
        expect(option).toHaveAttribute('aria-selected', 'false');
      });
    });

    it('should update aria-selected when navigating', async () => {
      mockSearchTimezones.mockReturnValue(mockTimezones.slice(0, 2));
      render(<TimezoneSearch {...defaultProps} />);

      const input = screen.getByRole('combobox');
      await userEvent.type(input, 'test');

      fireEvent.keyDown(input, { key: 'ArrowDown' });

      const selectedOption = screen.getByRole('option', { selected: true });
      expect(selectedOption).toHaveAttribute('aria-selected', 'true');
    });
  });

  describe('memoization', () => {
    it('should be memoized', () => {
      const { rerender } = render(<TimezoneSearch {...defaultProps} />);
      const firstRender = screen.getByRole('combobox');

      rerender(<TimezoneSearch {...defaultProps} />);
      const secondRender = screen.getByRole('combobox');

      // Should be the same instance due to memo
      expect(firstRender).toBe(secondRender);
    });

    it('should re-render when props change', () => {
      const { rerender } = render(<TimezoneSearch {...defaultProps} />);
      expect(screen.getByPlaceholderText('Search cities or countries...')).toBeInTheDocument();

      rerender(<TimezoneSearch {...defaultProps} placeholder="New placeholder" />);
      expect(screen.getByPlaceholderText('New placeholder')).toBeInTheDocument();
    });
  });

  describe('edge cases', () => {
    it('should handle empty search results gracefully', async () => {
      mockSearchTimezones.mockReturnValue([]);
      mockGetPopularTimezones.mockReturnValue([]);

      render(<TimezoneSearch {...defaultProps} />);

      const input = screen.getByRole('combobox');
      await userEvent.click(input);

      expect(screen.getByText('No timezones found')).toBeInTheDocument();
    });

    it('should handle keyboard navigation with no results', async () => {
      mockSearchTimezones.mockReturnValue([]);

      render(<TimezoneSearch {...defaultProps} />);

      const input = screen.getByRole('combobox');
      await userEvent.type(input, 'nonexistent');

      // Should not throw error
      fireEvent.keyDown(input, { key: 'ArrowDown' });
      fireEvent.keyDown(input, { key: 'Enter' });

      expect(mockOnSelect).not.toHaveBeenCalled();
    });

    it('should handle selection with invalid index gracefully', async () => {
      mockSearchTimezones.mockReturnValue(mockTimezones.slice(0, 1));

      render(<TimezoneSearch {...defaultProps} />);

      const input = screen.getByRole('combobox');
      await userEvent.type(input, 'test');

      // Try to navigate beyond available options
      fireEvent.keyDown(input, { key: 'ArrowDown' }); // Select first
      fireEvent.keyDown(input, { key: 'ArrowDown' }); // Wrap to first again

      fireEvent.keyDown(input, { key: 'Enter' });

      expect(mockOnSelect).toHaveBeenCalledWith('America/New_York');
    });

    it('should handle rapid typing without errors', async () => {
      render(<TimezoneSearch {...defaultProps} />);

      const input = screen.getByRole('combobox');
      
      // Rapid typing simulation
      await userEvent.type(input, 'tokyo', { delay: 1 });

      expect(input).toHaveValue('tokyo');
      expect(mockSearchTimezones).toHaveBeenCalledWith('tokyo', 8);
    });
  });
});