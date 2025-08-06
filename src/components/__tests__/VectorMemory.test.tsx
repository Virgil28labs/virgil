/**
 * VectorMemory Test Suite
 * 
 * Tests the vector memory component including:
 * - Component rendering and state management
 * - Text input and button interactions
 * - Store functionality with success/error handling
 * - Search functionality with results display
 * - Health check functionality
 * - Memory count display and updates
 * - Loading states and error messages
 * - Search result formatting and similarity display
 * - Edge cases and error scenarios
 */

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { VectorMemory } from '../VectorMemory';
import { vectorService } from '../../services/vectorService';
import { logger } from '../../lib/logger';
import type { VectorSearchResult } from '../../services/vectorService';

// Mock dependencies
jest.mock('../../services/vectorService');
jest.mock('../../lib/logger');

const mockVectorService = vectorService as jest.Mocked<typeof vectorService>;
const mockLogger = logger as jest.Mocked<typeof logger>;

describe('VectorMemory', () => {
  const mockSearchResults: VectorSearchResult[] = [
    {
      id: 'vec-1',
      content: 'This is the first test memory',
      similarity: 0.95,
    },
    {
      id: 'vec-2',
      content: 'This is another similar memory',
      similarity: 0.87,
    },
    {
      id: 'vec-3',
      content: 'A third related memory',
      similarity: 0.72,
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Default mock implementations
    mockVectorService.getCount.mockResolvedValue(42);
    mockVectorService.store.mockResolvedValue('new-vec-id');
    mockVectorService.search.mockResolvedValue(mockSearchResults);
    mockVectorService.isHealthy.mockResolvedValue(true);
  });

  describe('rendering', () => {
    it('should render the component with title', () => {
      render(<VectorMemory />);
      
      expect(screen.getByText('Semantic Memory')).toBeInTheDocument();
    });

    it('should render textarea for input', () => {
      render(<VectorMemory />);
      
      const textarea = screen.getByPlaceholderText('Enter text to store or search...');
      expect(textarea).toBeInTheDocument();
      expect(textarea).not.toBeDisabled();
    });

    it('should render all action buttons', () => {
      render(<VectorMemory />);
      
      expect(screen.getByRole('button', { name: 'Store Text' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Search Similar' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Health Check' })).toBeInTheDocument();
    });

    it('should render help text', () => {
      render(<VectorMemory />);
      
      expect(screen.getByText(/This component tests the Supabase vector memory integration/)).toBeInTheDocument();
    });

    it('should load and display memory count on mount', async () => {
      render(<VectorMemory />);
      
      await waitFor(() => {
        expect(screen.getByText('Total stored memories: 42')).toBeInTheDocument();
      });
      
      expect(mockVectorService.getCount).toHaveBeenCalledTimes(1);
    });

    it('should have proper styling classes', () => {
      render(<VectorMemory />);
      
      const container = screen.getByText('Semantic Memory').parentElement;
      expect(container).toHaveClass('bg-white', 'rounded-lg', 'shadow-lg', 'p-6');
    });
  });

  describe('text input', () => {
    it('should update textarea value on input', async () => {
      const user = userEvent.setup();
      render(<VectorMemory />);
      
      const textarea = screen.getByPlaceholderText('Enter text to store or search...');
      await user.type(textarea, 'Test input text');
      
      expect(textarea).toHaveValue('Test input text');
    });

    it('should clear textarea after successful store', async () => {
      const user = userEvent.setup();
      render(<VectorMemory />);
      
      const textarea = screen.getByPlaceholderText('Enter text to store or search...');
      await user.type(textarea, 'Text to store');
      
      const storeButton = screen.getByRole('button', { name: 'Store Text' });
      await user.click(storeButton);
      
      await waitFor(() => {
        expect(textarea).toHaveValue('');
      });
    });

    it('should not clear textarea after search', async () => {
      const user = userEvent.setup();
      render(<VectorMemory />);
      
      const textarea = screen.getByPlaceholderText('Enter text to store or search...');
      await user.type(textarea, 'Search query');
      
      const searchButton = screen.getByRole('button', { name: 'Search Similar' });
      await user.click(searchButton);
      
      await waitFor(() => {
        expect(textarea).toHaveValue('Search query');
      });
    });

    it('should disable textarea while loading', async () => {
      const user = userEvent.setup();
      mockVectorService.store.mockImplementation(() => new Promise(resolve => setTimeout(() => resolve('id'), 100)));
      
      render(<VectorMemory />);
      
      const textarea = screen.getByPlaceholderText('Enter text to store or search...');
      await user.type(textarea, 'Test');
      
      const storeButton = screen.getByRole('button', { name: 'Store Text' });
      await user.click(storeButton);
      
      expect(textarea).toBeDisabled();
      
      await waitFor(() => {
        expect(textarea).not.toBeDisabled();
      });
    });
  });

  describe('store functionality', () => {
    it('should disable store button when text is empty', () => {
      render(<VectorMemory />);
      
      const storeButton = screen.getByRole('button', { name: 'Store Text' });
      expect(storeButton).toBeDisabled();
    });

    it('should enable store button when text is entered', async () => {
      const user = userEvent.setup();
      render(<VectorMemory />);
      
      const textarea = screen.getByPlaceholderText('Enter text to store or search...');
      await user.type(textarea, 'Some text');
      
      const storeButton = screen.getByRole('button', { name: 'Store Text' });
      expect(storeButton).not.toBeDisabled();
    });

    it('should call vectorService.store on button click', async () => {
      const user = userEvent.setup();
      render(<VectorMemory />);
      
      const textarea = screen.getByPlaceholderText('Enter text to store or search...');
      await user.type(textarea, 'Text to store');
      
      const storeButton = screen.getByRole('button', { name: 'Store Text' });
      await user.click(storeButton);
      
      expect(mockVectorService.store).toHaveBeenCalledWith('Text to store');
    });

    it('should show success message after store', async () => {
      const user = userEvent.setup();
      render(<VectorMemory />);
      
      const textarea = screen.getByPlaceholderText('Enter text to store or search...');
      await user.type(textarea, 'Test memory');
      
      const storeButton = screen.getByRole('button', { name: 'Store Text' });
      await user.click(storeButton);
      
      await waitFor(() => {
        expect(screen.getByText('✅ Stored successfully with ID: new-vec-id')).toBeInTheDocument();
      });
    });

    it('should refresh memory count after store', async () => {
      const user = userEvent.setup();
      mockVectorService.getCount.mockResolvedValueOnce(42).mockResolvedValueOnce(43);
      
      render(<VectorMemory />);
      
      await waitFor(() => {
        expect(screen.getByText('Total stored memories: 42')).toBeInTheDocument();
      });
      
      const textarea = screen.getByPlaceholderText('Enter text to store or search...');
      await user.type(textarea, 'New memory');
      
      const storeButton = screen.getByRole('button', { name: 'Store Text' });
      await user.click(storeButton);
      
      await waitFor(() => {
        expect(screen.getByText('Total stored memories: 43')).toBeInTheDocument();
      });
      
      expect(mockVectorService.getCount).toHaveBeenCalledTimes(2);
    });

    it('should handle store error', async () => {
      const user = userEvent.setup();
      mockVectorService.store.mockRejectedValue(new Error('Store failed'));
      
      render(<VectorMemory />);
      
      const textarea = screen.getByPlaceholderText('Enter text to store or search...');
      await user.type(textarea, 'Test');
      
      const storeButton = screen.getByRole('button', { name: 'Store Text' });
      await user.click(storeButton);
      
      await waitFor(() => {
        expect(screen.getByText('❌ Store failed: Store failed')).toBeInTheDocument();
      });
      
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Store failed',
        expect.any(Error),
        expect.objectContaining({
          component: 'VectorMemory',
          action: 'handleStore',
          metadata: { textLength: 4 },
        }),
      );
    });

    it('should show loading state during store', async () => {
      const user = userEvent.setup();
      mockVectorService.store.mockImplementation(() => new Promise(resolve => setTimeout(() => resolve('id'), 100)));
      
      render(<VectorMemory />);
      
      const textarea = screen.getByPlaceholderText('Enter text to store or search...');
      await user.type(textarea, 'Test');
      
      const storeButton = screen.getByRole('button', { name: 'Store Text' });
      await user.click(storeButton);
      
      expect(storeButton).toHaveTextContent('Processing...');
      expect(storeButton).toBeDisabled();
      
      await waitFor(() => {
        expect(storeButton).toHaveTextContent('Store Text');
        expect(storeButton).not.toBeDisabled();
      });
    });

    it('should not store whitespace-only text', async () => {
      const user = userEvent.setup();
      render(<VectorMemory />);
      
      const textarea = screen.getByPlaceholderText('Enter text to store or search...');
      await user.type(textarea, '   ');
      
      const storeButton = screen.getByRole('button', { name: 'Store Text' });
      expect(storeButton).toBeDisabled();
    });
  });

  describe('search functionality', () => {
    it('should disable search button when text is empty', () => {
      render(<VectorMemory />);
      
      const searchButton = screen.getByRole('button', { name: 'Search Similar' });
      expect(searchButton).toBeDisabled();
    });

    it('should enable search button when text is entered', async () => {
      const user = userEvent.setup();
      render(<VectorMemory />);
      
      const textarea = screen.getByPlaceholderText('Enter text to store or search...');
      await user.type(textarea, 'Search query');
      
      const searchButton = screen.getByRole('button', { name: 'Search Similar' });
      expect(searchButton).not.toBeDisabled();
    });

    it('should call vectorService.search on button click', async () => {
      const user = userEvent.setup();
      render(<VectorMemory />);
      
      const textarea = screen.getByPlaceholderText('Enter text to store or search...');
      await user.type(textarea, 'Find similar');
      
      const searchButton = screen.getByRole('button', { name: 'Search Similar' });
      await user.click(searchButton);
      
      expect(mockVectorService.search).toHaveBeenCalledWith('Find similar', 10);
    });

    it('should display search results', async () => {
      const user = userEvent.setup();
      render(<VectorMemory />);
      
      const textarea = screen.getByPlaceholderText('Enter text to store or search...');
      await user.type(textarea, 'Search query');
      
      const searchButton = screen.getByRole('button', { name: 'Search Similar' });
      await user.click(searchButton);
      
      await waitFor(() => {
        expect(screen.getByText('Search Results:')).toBeInTheDocument();
        expect(screen.getByText('This is the first test memory')).toBeInTheDocument();
        expect(screen.getByText('This is another similar memory')).toBeInTheDocument();
        expect(screen.getByText('A third related memory')).toBeInTheDocument();
      });
    });

    it('should display similarity percentages', async () => {
      const user = userEvent.setup();
      render(<VectorMemory />);
      
      const textarea = screen.getByPlaceholderText('Enter text to store or search...');
      await user.type(textarea, 'Search');
      
      const searchButton = screen.getByRole('button', { name: 'Search Similar' });
      await user.click(searchButton);
      
      await waitFor(() => {
        expect(screen.getByText('Similarity: 95.0%')).toBeInTheDocument();
        expect(screen.getByText('Similarity: 87.0%')).toBeInTheDocument();
        expect(screen.getByText('Similarity: 72.0%')).toBeInTheDocument();
      });
    });

    it('should display result numbers', async () => {
      const user = userEvent.setup();
      render(<VectorMemory />);
      
      const textarea = screen.getByPlaceholderText('Enter text to store or search...');
      await user.type(textarea, 'Search');
      
      const searchButton = screen.getByRole('button', { name: 'Search Similar' });
      await user.click(searchButton);
      
      await waitFor(() => {
        expect(screen.getByText('#1')).toBeInTheDocument();
        expect(screen.getByText('#2')).toBeInTheDocument();
        expect(screen.getByText('#3')).toBeInTheDocument();
      });
    });

    it('should show success message with result count', async () => {
      const user = userEvent.setup();
      render(<VectorMemory />);
      
      const textarea = screen.getByPlaceholderText('Enter text to store or search...');
      await user.type(textarea, 'Search');
      
      const searchButton = screen.getByRole('button', { name: 'Search Similar' });
      await user.click(searchButton);
      
      await waitFor(() => {
        expect(screen.getByText('Found 3 similar memories')).toBeInTheDocument();
      });
    });

    it('should clear previous results before new search', async () => {
      const user = userEvent.setup();
      render(<VectorMemory />);
      
      // First search
      const textarea = screen.getByPlaceholderText('Enter text to store or search...');
      await user.type(textarea, 'First search');
      await user.click(screen.getByRole('button', { name: 'Search Similar' }));
      
      await waitFor(() => {
        expect(screen.getByText('This is the first test memory')).toBeInTheDocument();
      });
      
      // Second search with no results
      mockVectorService.search.mockResolvedValueOnce([]);
      await user.clear(textarea);
      await user.type(textarea, 'Second search');
      await user.click(screen.getByRole('button', { name: 'Search Similar' }));
      
      await waitFor(() => {
        expect(screen.queryByText('This is the first test memory')).not.toBeInTheDocument();
        expect(screen.getByText('Found 0 similar memories')).toBeInTheDocument();
      });
    });

    it('should handle search error', async () => {
      const user = userEvent.setup();
      mockVectorService.search.mockRejectedValue(new Error('Search failed'));
      
      render(<VectorMemory />);
      
      const textarea = screen.getByPlaceholderText('Enter text to store or search...');
      await user.type(textarea, 'Search');
      
      const searchButton = screen.getByRole('button', { name: 'Search Similar' });
      await user.click(searchButton);
      
      await waitFor(() => {
        expect(screen.getByText('❌ Search failed: Search failed')).toBeInTheDocument();
      });
      
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Search failed',
        expect.any(Error),
        expect.objectContaining({
          component: 'VectorMemory',
          action: 'handleSearch',
          metadata: { queryLength: 6 },
        }),
      );
    });

    it('should show loading state during search', async () => {
      const user = userEvent.setup();
      mockVectorService.search.mockImplementation(() => new Promise(resolve => setTimeout(() => resolve(mockSearchResults), 100)));
      
      render(<VectorMemory />);
      
      const textarea = screen.getByPlaceholderText('Enter text to store or search...');
      await user.type(textarea, 'Search');
      
      const searchButton = screen.getByRole('button', { name: 'Search Similar' });
      await user.click(searchButton);
      
      expect(searchButton).toHaveTextContent('Processing...');
      expect(searchButton).toBeDisabled();
      
      await waitFor(() => {
        expect(searchButton).toHaveTextContent('Search Similar');
        expect(searchButton).not.toBeDisabled();
      });
    });

    it('should handle empty search results', async () => {
      const user = userEvent.setup();
      mockVectorService.search.mockResolvedValue([]);
      
      render(<VectorMemory />);
      
      const textarea = screen.getByPlaceholderText('Enter text to store or search...');
      await user.type(textarea, 'No matches');
      
      const searchButton = screen.getByRole('button', { name: 'Search Similar' });
      await user.click(searchButton);
      
      await waitFor(() => {
        expect(screen.getByText('Found 0 similar memories')).toBeInTheDocument();
        expect(screen.queryByText('Search Results:')).not.toBeInTheDocument();
      });
    });
  });

  describe('health check functionality', () => {
    it('should call isHealthy on button click', async () => {
      const user = userEvent.setup();
      render(<VectorMemory />);
      
      const healthButton = screen.getByRole('button', { name: 'Health Check' });
      await user.click(healthButton);
      
      expect(mockVectorService.isHealthy).toHaveBeenCalled();
    });

    it('should show healthy message', async () => {
      const user = userEvent.setup();
      render(<VectorMemory />);
      
      const healthButton = screen.getByRole('button', { name: 'Health Check' });
      await user.click(healthButton);
      
      await waitFor(() => {
        expect(screen.getByText('✅ Vector service is healthy!')).toBeInTheDocument();
      });
    });

    it('should show unhealthy message', async () => {
      const user = userEvent.setup();
      mockVectorService.isHealthy.mockResolvedValue(false);
      
      render(<VectorMemory />);
      
      const healthButton = screen.getByRole('button', { name: 'Health Check' });
      await user.click(healthButton);
      
      await waitFor(() => {
        expect(screen.getByText('❌ Vector service is not healthy')).toBeInTheDocument();
      });
    });

    it('should handle health check error', async () => {
      const user = userEvent.setup();
      mockVectorService.isHealthy.mockRejectedValue(new Error('Connection failed'));
      
      render(<VectorMemory />);
      
      const healthButton = screen.getByRole('button', { name: 'Health Check' });
      await user.click(healthButton);
      
      await waitFor(() => {
        expect(screen.getByText('❌ Health check failed: Connection failed')).toBeInTheDocument();
      });
    });

    it('should disable health button during check', async () => {
      const user = userEvent.setup();
      mockVectorService.isHealthy.mockImplementation(() => new Promise(resolve => setTimeout(() => resolve(true), 100)));
      
      render(<VectorMemory />);
      
      const healthButton = screen.getByRole('button', { name: 'Health Check' });
      await user.click(healthButton);
      
      expect(healthButton).toBeDisabled();
      
      await waitFor(() => {
        expect(healthButton).not.toBeDisabled();
      });
    });
  });

  describe('message display', () => {
    it('should apply success styling for success messages', async () => {
      const user = userEvent.setup();
      render(<VectorMemory />);
      
      const textarea = screen.getByPlaceholderText('Enter text to store or search...');
      await user.type(textarea, 'Test');
      
      const storeButton = screen.getByRole('button', { name: 'Store Text' });
      await user.click(storeButton);
      
      await waitFor(() => {
        const message = screen.getByText(/✅ Stored successfully/);
        expect(message.parentElement).toHaveClass('bg-green-100', 'text-green-700');
      });
    });

    it('should apply error styling for error messages', async () => {
      const user = userEvent.setup();
      mockVectorService.store.mockRejectedValue(new Error('Failed'));
      
      render(<VectorMemory />);
      
      const textarea = screen.getByPlaceholderText('Enter text to store or search...');
      await user.type(textarea, 'Test');
      
      const storeButton = screen.getByRole('button', { name: 'Store Text' });
      await user.click(storeButton);
      
      await waitFor(() => {
        const message = screen.getByText(/❌ Store failed/);
        expect(message.parentElement).toHaveClass('bg-red-100', 'text-red-700');
      });
    });

    it('should apply info styling for other messages', async () => {
      const user = userEvent.setup();
      render(<VectorMemory />);
      
      const textarea = screen.getByPlaceholderText('Enter text to store or search...');
      await user.type(textarea, 'Search');
      
      const searchButton = screen.getByRole('button', { name: 'Search Similar' });
      await user.click(searchButton);
      
      await waitFor(() => {
        const message = screen.getByText('Found 3 similar memories');
        expect(message.parentElement).toHaveClass('bg-blue-100', 'text-blue-700');
      });
    });

    it('should clear message on new action', async () => {
      const user = userEvent.setup();
      render(<VectorMemory />);
      
      // First action - store
      const textarea = screen.getByPlaceholderText('Enter text to store or search...');
      await user.type(textarea, 'Store this');
      await user.click(screen.getByRole('button', { name: 'Store Text' }));
      
      await waitFor(() => {
        expect(screen.getByText(/✅ Stored successfully/)).toBeInTheDocument();
      });
      
      // Second action - search
      await user.clear(textarea);
      await user.type(textarea, 'Search this');
      await user.click(screen.getByRole('button', { name: 'Search Similar' }));
      
      await waitFor(() => {
        expect(screen.queryByText(/✅ Stored successfully/)).not.toBeInTheDocument();
        expect(screen.getByText('Found 3 similar memories')).toBeInTheDocument();
      });
    });
  });

  describe('edge cases', () => {
    it('should handle very long text input', async () => {
      const user = userEvent.setup();
      const longText = 'A'.repeat(1000);
      
      render(<VectorMemory />);
      
      const textarea = screen.getByPlaceholderText('Enter text to store or search...');
      await user.type(textarea, longText);
      
      expect(textarea).toHaveValue(longText);
      
      const storeButton = screen.getByRole('button', { name: 'Store Text' });
      await user.click(storeButton);
      
      expect(mockVectorService.store).toHaveBeenCalledWith(longText);
    });

    it('should handle special characters in text', async () => {
      const user = userEvent.setup();
      const specialText = 'Test with "quotes" & <special> characters!';
      
      render(<VectorMemory />);
      
      const textarea = screen.getByPlaceholderText('Enter text to store or search...');
      await user.type(textarea, specialText);
      
      const storeButton = screen.getByRole('button', { name: 'Store Text' });
      await user.click(storeButton);
      
      expect(mockVectorService.store).toHaveBeenCalledWith(specialText);
    });

    it('should handle rapid button clicks', async () => {
      const user = userEvent.setup();
      render(<VectorMemory />);
      
      const textarea = screen.getByPlaceholderText('Enter text to store or search...');
      await user.type(textarea, 'Test');
      
      const storeButton = screen.getByRole('button', { name: 'Store Text' });
      
      // Click multiple times rapidly
      await user.click(storeButton);
      await user.click(storeButton);
      await user.click(storeButton);
      
      // Should only call store once due to loading state
      expect(mockVectorService.store).toHaveBeenCalledTimes(1);
    });

    it('should handle null memory count gracefully', async () => {
      mockVectorService.getCount.mockResolvedValue(Promise.resolve(0));
      
      render(<VectorMemory />);
      
      await waitFor(() => {
        expect(screen.getByText('Total stored memories: 0')).toBeInTheDocument();
      });
    });

    it('should handle search results with missing fields', async () => {
      const user = userEvent.setup();
      const incompleteResults: VectorSearchResult[] = [
        {
          id: 'vec-1',
          content: 'Content without similarity',
          similarity: 0,
        },
      ];
      
      mockVectorService.search.mockResolvedValue(incompleteResults);
      
      render(<VectorMemory />);
      
      const textarea = screen.getByPlaceholderText('Enter text to store or search...');
      await user.type(textarea, 'Search');
      
      const searchButton = screen.getByRole('button', { name: 'Search Similar' });
      await user.click(searchButton);
      
      await waitFor(() => {
        expect(screen.getByText('Content without similarity')).toBeInTheDocument();
        expect(screen.getByText('Similarity: NaN%')).toBeInTheDocument();
      });
    });

    it('should handle concurrent operations gracefully', async () => {
      const user = userEvent.setup();
      mockVectorService.store.mockImplementation(() => new Promise(resolve => setTimeout(() => resolve('id'), 200)));
      mockVectorService.search.mockImplementation(() => new Promise(resolve => setTimeout(() => resolve([]), 200)));
      
      render(<VectorMemory />);
      
      const textarea = screen.getByPlaceholderText('Enter text to store or search...');
      await user.type(textarea, 'Test');
      
      const storeButton = screen.getByRole('button', { name: 'Store Text' });
      const searchButton = screen.getByRole('button', { name: 'Search Similar' });
      
      // Try to click both buttons
      await user.click(storeButton);
      await user.click(searchButton);
      
      // Search button should be disabled while store is processing
      expect(searchButton).toBeDisabled();
      
      await waitFor(() => {
        expect(storeButton).not.toBeDisabled();
        expect(searchButton).not.toBeDisabled();
      });
    });
  });

  describe('styling and layout', () => {
    it('should have proper container styling', () => {
      render(<VectorMemory />);
      
      const outerContainer = screen.getByText('Semantic Memory').closest('.p-6');
      expect(outerContainer).toHaveClass('p-6', 'max-w-4xl', 'mx-auto');
    });

    it('should style result items with hover effect', async () => {
      const user = userEvent.setup();
      render(<VectorMemory />);
      
      const textarea = screen.getByPlaceholderText('Enter text to store or search...');
      await user.type(textarea, 'Search');
      
      const searchButton = screen.getByRole('button', { name: 'Search Similar' });
      await user.click(searchButton);
      
      await waitFor(() => {
        const resultItem = screen.getByText('This is the first test memory').parentElement;
        expect(resultItem).toHaveClass('border', 'border-gray-200', 'rounded-md', 'p-4', 'bg-gray-50', 'hover:bg-gray-100', 'transition-colors');
      });
    });

    it('should have proper button styling', () => {
      render(<VectorMemory />);
      
      const storeButton = screen.getByRole('button', { name: 'Store Text' });
      expect(storeButton).toHaveClass('px-4', 'py-2', 'bg-blue-500', 'text-white', 'rounded-md');
      
      const searchButton = screen.getByRole('button', { name: 'Search Similar' });
      expect(searchButton).toHaveClass('px-4', 'py-2', 'bg-green-500', 'text-white', 'rounded-md');
      
      const healthButton = screen.getByRole('button', { name: 'Health Check' });
      expect(healthButton).toHaveClass('px-4', 'py-2', 'bg-gray-500', 'text-white', 'rounded-md');
    });

    it('should apply disabled styling to buttons', () => {
      render(<VectorMemory />);
      
      const storeButton = screen.getByRole('button', { name: 'Store Text' });
      expect(storeButton).toHaveClass('disabled:bg-gray-300', 'disabled:cursor-not-allowed');
    });
  });
});