/**
 * downloadUtils Test Suite
 * 
 * Tests utilities for downloading images across different components.
 * These utilities are used by dashboard adapters for image download functionality.
 */

import { downloadImage, copyImageUrl, type DownloadableImage } from '../downloadUtils';
import { logger } from '../../lib/logger';
import { dashboardContextService } from '../../services/DashboardContextService';

// Mock dependencies
jest.mock('../../lib/logger', () => ({
  logger: {
    error: jest.fn(),
  },
}));

jest.mock('../../services/DashboardContextService', () => ({
  dashboardContextService: {
    getLocalDate: jest.fn(() => '2024-01-20'),
  },
}));

// Mock global fetch
const mockFetch = jest.fn() as jest.MockedFunction<typeof fetch>;
global.fetch = mockFetch;

// Mock URL methods
const mockCreateObjectURL = jest.fn();
const mockRevokeObjectURL = jest.fn();
Object.defineProperty(global.URL, 'createObjectURL', {
  value: mockCreateObjectURL,
  writable: true,
});
Object.defineProperty(global.URL, 'revokeObjectURL', {
  value: mockRevokeObjectURL,
  writable: true,
});

// Mock document methods
const mockLink = {
  href: '',
  download: '',
  click: jest.fn(),
};

const mockTextArea = {
  value: '',
  style: {} as CSSStyleDeclaration,
  select: jest.fn(),
};

const mockCreateElement = jest.fn();
const mockAppendChild = jest.fn();
const mockRemoveChild = jest.fn();

Object.defineProperty(document, 'createElement', {
  value: mockCreateElement,
});

Object.defineProperty(document.body, 'appendChild', {
  value: mockAppendChild,
});

Object.defineProperty(document.body, 'removeChild', {
  value: mockRemoveChild,
});

// Mock execCommand for clipboard fallback
Object.defineProperty(document, 'execCommand', {
  value: jest.fn(() => true),
});

// Mock navigator.clipboard
const mockWriteText = jest.fn();
Object.defineProperty(navigator, 'clipboard', {
  value: {
    writeText: mockWriteText,
  },
});

describe('downloadUtils', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCreateObjectURL.mockReturnValue('blob:mock-url');
    mockCreateElement.mockImplementation((tagName: string) => {
      if (tagName === 'a') return mockLink;
      if (tagName === 'textarea') return mockTextArea;
      return {};
    });
  });

  describe('downloadImage', () => {
    const mockImage: DownloadableImage = {
      url: 'https://example.com/image.jpg',
      title: 'Test Image',
      date: '2024-01-20',
      description: 'A test image',
    };

    beforeEach(() => {
      const mockBlob = new Blob(['mock image data'], { type: 'image/jpeg' });
      mockFetch.mockResolvedValue({
        ok: true,
        blob: () => Promise.resolve(mockBlob),
      } as Response);
    });

    it('downloads image with correct filename', async () => {
      await downloadImage(mockImage, 'test-prefix');

      expect(mockFetch).toHaveBeenCalledWith(mockImage.url);
      expect(mockCreateObjectURL).toHaveBeenCalledWith(expect.any(Blob));
      expect(mockCreateElement).toHaveBeenCalledWith('a');
      expect(mockLink.href).toBe('blob:mock-url');
      expect(mockLink.download).toBe('test-prefix-2024-01-20-test-image.jpg');
      expect(mockLink.click).toHaveBeenCalled();
      expect(mockAppendChild).toHaveBeenCalledWith(mockLink);
      expect(mockRemoveChild).toHaveBeenCalledWith(mockLink);
      expect(mockRevokeObjectURL).toHaveBeenCalledWith('blob:mock-url');
    });

    it('handles image without title', async () => {
      const imageWithoutTitle = { ...mockImage, title: undefined };
      
      await downloadImage(imageWithoutTitle, 'test-prefix');

      expect(mockLink.download).toBe('test-prefix-2024-01-20-image.jpg');
    });

    it('handles image without date', async () => {
      const imageWithoutDate = { ...mockImage, date: undefined };
      
      await downloadImage(imageWithoutDate, 'test-prefix');

      expect(dashboardContextService.getLocalDate).toHaveBeenCalled();
      expect(mockLink.download).toBe('test-prefix-2024-01-20-test-image.jpg');
    });

    it('sanitizes title for filename', async () => {
      const imageWithSpecialChars = {
        ...mockImage,
        title: 'Test Image!@#$%^&*()+={}[]|\\:";\'<>?,./~`',
      };
      
      await downloadImage(imageWithSpecialChars, 'test-prefix');

      expect(mockLink.download).toBe('test-prefix-2024-01-20-test-image------------------------------.jpg');
    });

    it('extracts correct file extension from URL', async () => {
      const imageWithPng = { ...mockImage, url: 'https://example.com/image.png?param=value' };
      
      await downloadImage(imageWithPng, 'test-prefix');

      expect(mockLink.download).toBe('test-prefix-2024-01-20-test-image.png');
    });

    it('defaults to jpg extension when none found', async () => {
      const imageWithoutExtension = { ...mockImage, url: 'https://example.com/image' };
      
      await downloadImage(imageWithoutExtension, 'test-prefix');

      expect(mockLink.download).toBe('test-prefix-2024-01-20-test-image.com/image');
    });

    it('handles fetch errors', async () => {
      const fetchError = new Error('Network error');
      mockFetch.mockRejectedValue(fetchError);

      await expect(downloadImage(mockImage, 'test-prefix')).rejects.toThrow(
        'Failed to download image. Please try again.',
      );

      expect(logger.error).toHaveBeenCalledWith(
        'Failed to download image',
        fetchError,
        {
          component: 'downloadUtils',
          action: 'downloadImage',
          metadata: { imageUrl: mockImage.url, title: mockImage.title },
        },
      );
    });

    it('handles blob creation errors', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        blob: () => Promise.reject(new Error('Blob error')),
      } as Response);

      await expect(downloadImage(mockImage, 'test-prefix')).rejects.toThrow(
        'Failed to download image. Please try again.',
      );
    });

    it('handles URL creation errors', async () => {
      mockCreateObjectURL.mockImplementation(() => {
        throw new Error('URL creation failed');
      });

      await expect(downloadImage(mockImage, 'test-prefix')).rejects.toThrow(
        'Failed to download image. Please try again.',
      );
    });
  });

  describe('copyImageUrl', () => {
    const testUrl = 'https://example.com/image.jpg';

    it('copies URL to clipboard using modern API', async () => {
      mockWriteText.mockResolvedValue(undefined);

      await copyImageUrl(testUrl);

      expect(mockWriteText).toHaveBeenCalledWith(testUrl);
    });

    it('falls back to execCommand when clipboard API fails', async () => {
      mockWriteText.mockRejectedValue(new Error('Clipboard API not available'));

      await copyImageUrl(testUrl);

      expect(mockCreateElement).toHaveBeenCalledWith('textarea');
      expect(mockTextArea.value).toBe(testUrl);
      expect(mockTextArea.style.position).toBe('fixed');
      expect(mockTextArea.style.left).toBe('-999999px');
      expect(mockAppendChild).toHaveBeenCalledWith(mockTextArea);
      expect(mockTextArea.select).toHaveBeenCalled();
      expect(document.execCommand).toHaveBeenCalledWith('copy');
      expect(mockRemoveChild).toHaveBeenCalledWith(mockTextArea);
    });

  });

  describe('Edge Cases', () => {
    it('handles complex URL with multiple query parameters', async () => {
      const complexImage: DownloadableImage = {
        url: 'https://example.com/path/to/image.webp?size=large&format=webp&quality=80',
        title: 'Complex Image',
        date: '2024-01-20',
      };

      const mockBlob = new Blob(['mock image data'], { type: 'image/webp' });
      mockFetch.mockResolvedValue({
        ok: true,
        blob: () => Promise.resolve(mockBlob),
      } as Response);

      await downloadImage(complexImage, 'test-prefix');

      expect(mockLink.download).toBe('test-prefix-2024-01-20-complex-image.webp');
    });

    it('handles very long titles', async () => {
      const longTitleImage: DownloadableImage = {
        url: 'https://example.com/image.jpg',
        title: 'A'.repeat(200), // Very long title
        date: '2024-01-20',
      };

      const mockBlob = new Blob(['mock image data'], { type: 'image/jpeg' });
      mockFetch.mockResolvedValue({
        ok: true,
        blob: () => Promise.resolve(mockBlob),
      } as Response);

      await downloadImage(longTitleImage, 'test-prefix');

      expect(mockLink.download).toBe(`test-prefix-2024-01-20-${'a'.repeat(200)}.jpg`);
    });

    it('handles empty URL in copyImageUrl', async () => {
      mockWriteText.mockResolvedValue(undefined);

      await copyImageUrl('');

      expect(mockWriteText).toHaveBeenCalledWith('');
    });
  });
});