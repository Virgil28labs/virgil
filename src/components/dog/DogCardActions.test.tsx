import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { DogCardActions } from './DogCardActions';
import { downloadImage, copyImageToClipboard } from './utils/imageUtils';
import type { DogImage } from '../../types';

// Mock the image utils
jest.mock('./utils/imageUtils', () => ({
  stopEvent: jest.fn(),
  downloadImage: jest.fn(),
  copyImageToClipboard: jest.fn(),
}));

const mockDownloadImage = downloadImage as jest.MockedFunction<typeof downloadImage>;
const mockCopyImageToClipboard = copyImageToClipboard as jest.MockedFunction<typeof copyImageToClipboard>;

const mockDog: DogImage = {
  id: 'test-1',
  url: 'https://example.com/dog.jpg',
  breed: 'golden-retriever',
};

describe('DogCardActions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders download and copy buttons', () => {
    render(<DogCardActions dog={mockDog} />);
    
    expect(screen.getByLabelText('Download image')).toBeInTheDocument();
    expect(screen.getByLabelText('Copy image')).toBeInTheDocument();
  });

  it('has proper CSS classes', () => {
    render(<DogCardActions dog={mockDog} />);
    
    expect(document.querySelector('.doggo-action-buttons')).toBeInTheDocument();
    expect(document.querySelectorAll('.doggo-action-btn')).toHaveLength(2);
  });

  it('downloads image when download button is clicked', async () => {
    mockDownloadImage.mockResolvedValueOnce();
    
    render(<DogCardActions dog={mockDog} />);
    
    fireEvent.click(screen.getByLabelText('Download image'));
    
    expect(mockDownloadImage).toHaveBeenCalledWith(mockDog.url, mockDog.breed);
    
    // Check for success feedback
    await waitFor(() => {
      expect(screen.getByText('✓')).toBeInTheDocument();
    });
  });

  it('copies image when copy button is clicked', async () => {
    mockCopyImageToClipboard.mockResolvedValueOnce(true);
    
    render(<DogCardActions dog={mockDog} />);
    
    fireEvent.click(screen.getByLabelText('Copy image'));
    
    expect(mockCopyImageToClipboard).toHaveBeenCalledWith(mockDog.url);
    
    // Check for success feedback
    await waitFor(() => {
      expect(screen.getByText('✓')).toBeInTheDocument();
    });
  });

  it('handles download error gracefully', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    mockDownloadImage.mockRejectedValueOnce(new Error('Download failed'));
    
    render(<DogCardActions dog={mockDog} />);
    
    fireEvent.click(screen.getByLabelText('Download image'));
    
    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith('Failed to download image:', expect.any(Error));
    });
    
    consoleSpy.mockRestore();
  });

  it('handles copy error gracefully', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    mockCopyImageToClipboard.mockRejectedValueOnce(new Error('Copy failed'));
    
    render(<DogCardActions dog={mockDog} />);
    
    fireEvent.click(screen.getByLabelText('Copy image'));
    
    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith('Failed to copy image:', expect.any(Error));
    });
    
    consoleSpy.mockRestore();
  });

  it('resets feedback states after timeout', async () => {
    jest.useFakeTimers();
    mockDownloadImage.mockResolvedValueOnce();
    
    render(<DogCardActions dog={mockDog} />);
    
    fireEvent.click(screen.getByLabelText('Download image'));
    
    await waitFor(() => {
      expect(screen.getByText('✓')).toBeInTheDocument();
    });
    
    // Fast-forward past the timeout
    jest.advanceTimersByTime(2000);
    
    await waitFor(() => {
      expect(screen.getByText('⬇️')).toBeInTheDocument();
    });
    
    jest.useRealTimers();
  });
});