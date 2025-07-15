import { ipService } from '../ipService';
import { dedupeFetch } from '../requestDeduplication';

// Mock requestDeduplication
jest.mock('../requestDeduplication', () => ({
  dedupeFetch: jest.fn()
}));

describe('ipService', () => {
  const mockDedupeFetch = dedupeFetch as jest.MockedFunction<typeof dedupeFetch>;
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  describe('getIP', () => {
    it('should successfully fetch IP address', async () => {
      const mockIP = '192.168.1.100';
      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue({ ip: mockIP })
      };
      mockDedupeFetch.mockResolvedValue(mockResponse as any);

      const result = await ipService.getIP();

      expect(result).toBe(mockIP);
      expect(mockDedupeFetch).toHaveBeenCalledWith('https://api.ipify.org?format=json');
    });

    it('should handle different IP formats', async () => {
      const mockIPv6 = '2001:0db8:85a3:0000:0000:8a2e:0370:7334';
      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue({ ip: mockIPv6 })
      };
      mockDedupeFetch.mockResolvedValue(mockResponse as any);

      const result = await ipService.getIP();

      expect(result).toBe(mockIPv6);
    });

    it('should throw error when response is not ok', async () => {
      const mockResponse = {
        ok: false,
        status: 500,
        statusText: 'Internal Server Error'
      };
      mockDedupeFetch.mockResolvedValue(mockResponse as any);

      await expect(ipService.getIP()).rejects.toThrow('Failed to fetch IP address');
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Failed to get IP address:', 
        expect.any(Error)
      );
    });

    it('should handle network errors', async () => {
      const networkError = new Error('Network error');
      mockDedupeFetch.mockRejectedValue(networkError);

      await expect(ipService.getIP()).rejects.toThrow('Network error');
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Failed to get IP address:', 
        networkError
      );
    });

    it('should handle JSON parsing errors', async () => {
      const mockResponse = {
        ok: true,
        json: jest.fn().mockRejectedValue(new Error('Invalid JSON'))
      };
      mockDedupeFetch.mockResolvedValue(mockResponse as any);

      await expect(ipService.getIP()).rejects.toThrow('Invalid JSON');
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Failed to get IP address:', 
        expect.any(Error)
      );
    });

    it('should handle unexpected response format', async () => {
      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue({ unexpected: 'format' })
      };
      mockDedupeFetch.mockResolvedValue(mockResponse as any);

      const result = await ipService.getIP();

      // Will return undefined if the 'ip' field is missing
      expect(result).toBeUndefined();
    });
  });
});