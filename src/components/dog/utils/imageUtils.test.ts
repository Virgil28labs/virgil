import { stopEvent, downloadImage, copyImageToClipboard } from './imageUtils';

describe('imageUtils', () => {
  describe('stopEvent', () => {
    it('should prevent default and stop propagation', () => {
      const mockEvent = {
        preventDefault: jest.fn(),
        stopPropagation: jest.fn(),
      } as unknown as Event;

      stopEvent(mockEvent);

      expect(mockEvent.preventDefault).toHaveBeenCalledTimes(1);
      expect(mockEvent.stopPropagation).toHaveBeenCalledTimes(1);
    });
  });

  describe('downloadImage', () => {
    let createElementSpy: jest.SpyInstance;
    let appendChildSpy: jest.SpyInstance;
    let removeChildSpy: jest.SpyInstance;
    let mockAnchor: HTMLAnchorElement;
    let revokeObjectURLSpy: jest.SpyInstance;

    beforeEach(() => {
      // Mock fetch
      global.fetch = jest.fn();
      
      // Mock URL methods
      global.URL.createObjectURL = jest.fn().mockReturnValue('blob:mock-url');
      global.URL.revokeObjectURL = jest.fn();
      revokeObjectURLSpy = jest.spyOn(URL, 'revokeObjectURL');

      // Mock DOM methods
      mockAnchor = {
        href: '',
        download: '',
        click: jest.fn(),
      } as unknown as HTMLAnchorElement;

      createElementSpy = jest.spyOn(document, 'createElement').mockReturnValue(mockAnchor);
      appendChildSpy = jest.spyOn(document.body, 'appendChild').mockImplementation();
      removeChildSpy = jest.spyOn(document.body, 'removeChild').mockImplementation();
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('should download image successfully', async () => {
      const mockBlob = new Blob(['mock image data'], { type: 'image/jpeg' });
      const mockResponse = {
        blob: jest.fn().mockResolvedValue(mockBlob),
      }
      ;(global.fetch as jest.Mock).mockResolvedValue(mockResponse);

      const url = 'https://example.com/dog.jpg';
      const breed = 'akita';

      await downloadImage(url, breed);

      // Verify fetch was called
      expect(global.fetch).toHaveBeenCalledWith(url);
      expect(mockResponse.blob).toHaveBeenCalled();

      // Verify object URL was created
      expect(URL.createObjectURL).toHaveBeenCalledWith(mockBlob);

      // Verify anchor element was configured correctly
      expect(createElementSpy).toHaveBeenCalledWith('a');
      expect(mockAnchor.href).toBe('blob:mock-url');
      expect(mockAnchor.download).toMatch(/^doggo-akita-\d+\.jpg$/);

      // Verify DOM manipulation
      expect(appendChildSpy).toHaveBeenCalledWith(mockAnchor);
      expect(mockAnchor.click).toHaveBeenCalled();
      expect(removeChildSpy).toHaveBeenCalledWith(mockAnchor);

      // Verify cleanup
      expect(revokeObjectURLSpy).toHaveBeenCalledWith('blob:mock-url');
    });

    it('should handle fetch errors', async () => {
      (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

      await expect(downloadImage('https://example.com/dog.jpg', 'beagle'))
        .rejects.toThrow('Network error');
    });
  });

  describe('copyImageToClipboard', () => {
    let mockCanvas: HTMLCanvasElement;
    let mockContext: CanvasRenderingContext2D;
    let mockImage: HTMLImageElement;
    let createElementSpy: jest.SpyInstance;

    beforeEach(() => {
      // Mock Image constructor
      mockImage = {
        crossOrigin: '',
        onload: null,
        onerror: null,
        src: '',
        width: 100,
        height: 100,
      } as unknown as HTMLImageElement;

      global.Image = jest.fn().mockImplementation(() => mockImage) as unknown as typeof Image;

      // Mock canvas
      mockContext = {
        drawImage: jest.fn(),
      } as unknown as CanvasRenderingContext2D;

      mockCanvas = {
        width: 0,
        height: 0,
        getContext: jest.fn().mockReturnValue(mockContext),
        toBlob: jest.fn(),
      } as unknown as HTMLCanvasElement;

      createElementSpy = jest.spyOn(document, 'createElement').mockReturnValue(mockCanvas);

      // Mock clipboard API
      Object.defineProperty(navigator, 'clipboard', {
        value: {
          write: jest.fn(),
          writeText: jest.fn(),
        },
        writable: true,
      });

      global.ClipboardItem = jest.fn() as unknown as typeof ClipboardItem;
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('should copy image to clipboard successfully', async () => {
      const mockBlob = new Blob(['image data'], { type: 'image/png' });
      
      // Mock image loading
      mockImage.onload = null;
      setTimeout(() => {
        if (mockImage.onload) mockImage.onload({} as Event);
      }, 0)

      // Mock canvas.toBlob
      ;(mockCanvas.toBlob as jest.Mock).mockImplementation((callback) => {
        callback(mockBlob);
      })

      // Mock clipboard write
      ;(navigator.clipboard.write as jest.Mock).mockResolvedValue(undefined);

      const url = 'https://example.com/dog.jpg';
      const result = await copyImageToClipboard(url);

      expect(result).toBe(true);

      // Verify image setup
      expect(mockImage.crossOrigin).toBe('anonymous');
      expect(mockImage.src).toBe(url);

      // Verify canvas operations
      expect(createElementSpy).toHaveBeenCalledWith('canvas');
      expect(mockCanvas.width).toBe(100);
      expect(mockCanvas.height).toBe(100);
      expect(mockContext.drawImage).toHaveBeenCalledWith(mockImage, 0, 0);

      // Verify clipboard write
      expect(navigator.clipboard.write).toHaveBeenCalledWith([
        expect.any(ClipboardItem),
      ]);
    });

    it('should fallback to URL copy when clipboard API is not available', async () => {
      // Remove clipboard write support
      delete (navigator.clipboard as unknown as { write?: unknown }).write;
      global.ClipboardItem = undefined as unknown as typeof ClipboardItem;

      // Mock image loading
      setTimeout(() => {
        if (mockImage.onload) mockImage.onload({} as Event);
      }, 0);

      // Mock canvas.toBlob
      const mockBlob = new Blob(['image data'], { type: 'image/png' })
      ;(mockCanvas.toBlob as jest.Mock).mockImplementation((callback) => {
        callback(mockBlob);
      })

      ;(navigator.clipboard.writeText as jest.Mock).mockResolvedValue(undefined);

      const url = 'https://example.com/dog.jpg';
      const result = await copyImageToClipboard(url);

      expect(result).toBe(false);
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(url);
    });

    it('should handle image load errors', async () => {
      // Mock image loading error
      setTimeout(() => {
        if (mockImage.onerror) mockImage.onerror({} as Event);
      }, 0)

      ;(navigator.clipboard.writeText as jest.Mock).mockResolvedValue(undefined);

      const url = 'https://example.com/dog.jpg';
      const result = await copyImageToClipboard(url);

      expect(result).toBe(false);
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(url);
    });

    it('should handle canvas context error', async () => {
      // Mock canvas context failure
      ;(mockCanvas.getContext as jest.Mock).mockReturnValue(null);

      // Mock image loading
      setTimeout(() => {
        if (mockImage.onload) mockImage.onload({} as Event);
      }, 0)

      ;(navigator.clipboard.writeText as jest.Mock).mockResolvedValue(undefined);

      const url = 'https://example.com/dog.jpg';
      const result = await copyImageToClipboard(url);

      expect(result).toBe(false);
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(url);
    });

    it('should handle blob creation failure', async () => {
      // Mock image loading
      setTimeout(() => {
        if (mockImage.onload) mockImage.onload({} as Event);
      }, 0)

      // Mock canvas.toBlob failure
      ;(mockCanvas.toBlob as jest.Mock).mockImplementation((callback) => {
        callback(null);
      })

      ;(navigator.clipboard.writeText as jest.Mock).mockResolvedValue(undefined);

      const url = 'https://example.com/dog.jpg';
      const result = await copyImageToClipboard(url);

      expect(result).toBe(false);
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(url);
    });

    it('should handle clipboard write error', async () => {
      const mockBlob = new Blob(['image data'], { type: 'image/png' });
      
      // Mock image loading
      setTimeout(() => {
        if (mockImage.onload) mockImage.onload({} as Event);
      }, 0)

      // Mock canvas.toBlob
      ;(mockCanvas.toBlob as jest.Mock).mockImplementation((callback) => {
        callback(mockBlob);
      })

      // Mock clipboard write failure
      ;(navigator.clipboard.write as jest.Mock).mockRejectedValue(new Error('Clipboard error'))
      ;(navigator.clipboard.writeText as jest.Mock).mockResolvedValue(undefined);

      const url = 'https://example.com/dog.jpg';
      const result = await copyImageToClipboard(url);

      expect(result).toBe(false);
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(url);
    });

    it('should handle final fallback error gracefully', async () => {
      // Mock image loading error
      setTimeout(() => {
        if (mockImage.onerror) mockImage.onerror({} as Event);
      }, 0)

      // Mock clipboard writeText failure
      ;(navigator.clipboard.writeText as jest.Mock).mockRejectedValue(new Error('Clipboard error'));

      const url = 'https://example.com/dog.jpg';
      
      await expect(copyImageToClipboard(url)).rejects.toThrow('Clipboard error');
    });
  });
});