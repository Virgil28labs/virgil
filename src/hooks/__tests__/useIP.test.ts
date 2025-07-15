import { renderHook, waitFor } from '@testing-library/react';
import { useIP } from '../useIP';
import { ipService } from '../../lib/ipService';

// Mock ipService
jest.mock('../../lib/ipService', () => ({
  ipService: {
    getIP: jest.fn()
  }
}));

describe('useIP', () => {
  const mockGetIP = ipService.getIP as jest.MockedFunction<typeof ipService.getIP>;
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  describe('initial state', () => {
    it('should start with loading true and ip null', () => {
      mockGetIP.mockImplementation(() => new Promise(() => {})); // Never resolves

      const { result } = renderHook(() => useIP());

      expect(result.current.loading).toBe(true);
      expect(result.current.ip).toBeNull();
    });
  });

  describe('successful IP fetch', () => {
    it('should fetch and set IP address', async () => {
      const mockIP = '192.168.1.100';
      mockGetIP.mockResolvedValue(mockIP);

      const { result } = renderHook(() => useIP());

      // Initial state
      expect(result.current.loading).toBe(true);
      expect(result.current.ip).toBeNull();

      // Wait for IP to be fetched
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.ip).toBe(mockIP);
      expect(mockGetIP).toHaveBeenCalledTimes(1);
    });

    it('should handle different IP formats', async () => {
      const mockIPv6 = '2001:0db8:85a3:0000:0000:8a2e:0370:7334';
      mockGetIP.mockResolvedValue(mockIPv6);

      const { result } = renderHook(() => useIP());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.ip).toBe(mockIPv6);
    });
  });

  describe('error handling', () => {
    it('should handle fetch errors gracefully', async () => {
      const mockError = new Error('Network error');
      mockGetIP.mockRejectedValue(mockError);

      const { result } = renderHook(() => useIP());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.ip).toBeNull();
      expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to fetch IP:', mockError);
    });

    it('should handle different error types', async () => {
      const mockError = { message: 'API limit exceeded', code: 429 };
      mockGetIP.mockRejectedValue(mockError);

      const { result } = renderHook(() => useIP());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.ip).toBeNull();
      expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to fetch IP:', mockError);
    });

    it('should handle null/undefined errors', async () => {
      mockGetIP.mockRejectedValue(undefined);

      const { result } = renderHook(() => useIP());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.ip).toBeNull();
      expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to fetch IP:', undefined);
    });
  });

  describe('lifecycle', () => {
    it('should only fetch IP once on mount', async () => {
      mockGetIP.mockResolvedValue('192.168.1.1');

      const { result, rerender } = renderHook(() => useIP());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(mockGetIP).toHaveBeenCalledTimes(1);

      // Rerender should not trigger another fetch
      rerender();

      expect(mockGetIP).toHaveBeenCalledTimes(1);
    });

    it('should handle component unmount during fetch', () => {
      let resolveFetch: (value: string) => void;
      mockGetIP.mockImplementation(() => 
        new Promise(resolve => {
          resolveFetch = resolve;
        })
      );

      const { result, unmount } = renderHook(() => useIP());

      expect(result.current.loading).toBe(true);

      // Unmount before fetch completes
      unmount();

      // Resolve after unmount - should not cause errors
      expect(() => {
        resolveFetch!('192.168.1.1');
      }).not.toThrow();
    });
  });

  describe('edge cases', () => {
    it('should handle empty string IP', async () => {
      mockGetIP.mockResolvedValue('');

      const { result } = renderHook(() => useIP());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.ip).toBe('');
    });

    it('should handle slow network responses', async () => {
      mockGetIP.mockImplementation(() => 
        new Promise(resolve => {
          setTimeout(() => resolve('192.168.1.1'), 1000);
        })
      );

      const { result } = renderHook(() => useIP());

      expect(result.current.loading).toBe(true);
      expect(result.current.ip).toBeNull();

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      }, { timeout: 2000 });

      expect(result.current.ip).toBe('192.168.1.1');
    });
  });
});