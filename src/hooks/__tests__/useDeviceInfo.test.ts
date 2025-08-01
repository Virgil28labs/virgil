/**
 * useDeviceInfo Hook Tests
 * 
 * Tests the device information hook including:
 * - Device and browser detection from user agent
 * - Hardware information collection (CPU, memory, battery)
 * - Network information and connection status
 * - Display and screen information
 * - Permission status checking and requesting
 * - Session tracking and time calculations
 * - Event listeners and cleanup
 * - Storage quota and browser features
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { useDeviceInfo } from '../useDeviceInfo';
import { timeService } from '../../services/TimeService';

// Mock dependencies
jest.mock('../../services/TimeService', () => ({
  timeService: {
    getTimestamp: jest.fn(),
    getCurrentDateTime: jest.fn(),  
    formatTimeToLocal: jest.fn(),
  },
}));

const mockTimeService = timeService as jest.Mocked<typeof timeService>;

// Mock browser APIs
const mockNavigator = {
  userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  onLine: true,
  language: 'en-US',
  cookieEnabled: true,
  doNotTrack: null,
  hardwareConcurrency: 8,
  permissions: {
    query: jest.fn(),
  },
  geolocation: {
    getCurrentPosition: jest.fn(),
  },
  mediaDevices: {
    getUserMedia: jest.fn(),
  },
  clipboard: {
    readText: jest.fn(),
  },
  storage: {
    estimate: jest.fn(),
  },
  getBattery: jest.fn(),
  deviceMemory: 8,
  connection: {
    effectiveType: '4g',
    downlink: 10,
    rtt: 100,
  },
};

const mockScreen = {
  width: 1920,
  height: 1080,
};

const mockWindow = {
  innerWidth: 1200,
  innerHeight: 800,
  devicePixelRatio: 2,
  matchMedia: jest.fn(),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
};

const mockDocument = {
  hidden: false,
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
};

const mockNotification = {
  requestPermission: jest.fn(),
};

const mockIntl = {
  DateTimeFormat: jest.fn().mockReturnValue({
    resolvedOptions: () => ({ timeZone: 'America/New_York' }),
  }),
};

// Setup global mocks
Object.defineProperty(global, 'navigator', {
  value: mockNavigator,
  writable: true,
});

Object.defineProperty(global, 'screen', {
  value: mockScreen,
  writable: true,
});

// Setup window properties
Object.assign(global.window || {}, mockWindow);

Object.defineProperty(global, 'document', {
  value: mockDocument,
  writable: true,
});

Object.defineProperty(global, 'Notification', {
  value: mockNotification,
  writable: true,
});

Object.defineProperty(global, 'Intl', {
  value: mockIntl,
  writable: true,
});

describe('useDeviceInfo', () => {
  const mockTimestamp = 1640995200000;
  const mockDateTime = new Date(mockTimestamp);
  const mockFormattedTime = '2022-01-01 12:00:00';

  const mockIpLocation: { city?: string; ip?: string } = {
    city: 'New York',
    ip: '192.168.1.1',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();

    // Setup time service mocks
    mockTimeService.getTimestamp.mockReturnValue(mockTimestamp);
    mockTimeService.getCurrentDateTime.mockReturnValue(mockDateTime);
    mockTimeService.formatTimeToLocal.mockReturnValue(mockFormattedTime);

    // Setup browser API mocks
    mockNavigator.permissions.query.mockResolvedValue({ state: 'granted' } as any);
    mockNavigator.storage.estimate.mockResolvedValue({ quota: 1073741824 }); // 1GB
    mockNavigator.getBattery.mockResolvedValue({ level: 0.8, charging: true });
    mockWindow.matchMedia.mockReturnValue({ matches: false } as any);
    mockNotification.requestPermission.mockResolvedValue('granted');

    // Clear timers
    jest.clearAllTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('Initialization', () => {
    it('should initialize with null device info', () => {
      const { result } = renderHook(() => useDeviceInfo());

      expect(result.current.deviceInfo).toBeNull();
      expect(result.current.permissions).toEqual({
        geolocation: 'unknown',
        camera: 'unknown',
        microphone: 'unknown',
        notifications: 'unknown',
        clipboard: 'unknown',
      });
    });

    it('should collect device information on mount', async () => {
      const { result } = renderHook(() => useDeviceInfo(mockIpLocation));

      await waitFor(() => {
        expect(result.current.deviceInfo).not.toBeNull();
      });

      const deviceInfo = result.current.deviceInfo!;
      expect(deviceInfo.location).toBe('New York');
      expect(deviceInfo.ip).toBe('192.168.1.1');
      expect(deviceInfo.device).toContain('Mac');
      expect(deviceInfo.browser).toContain('Chrome');
      expect(deviceInfo.os).toContain('macOS');
    });

    it('should check all permissions on mount', async () => {
      renderHook(() => useDeviceInfo());

      await waitFor(() => {
        expect(mockNavigator.permissions.query).toHaveBeenCalledTimes(5);
      });

      expect(mockNavigator.permissions.query).toHaveBeenCalledWith({ name: 'geolocation' });
      expect(mockNavigator.permissions.query).toHaveBeenCalledWith({ name: 'camera' });
      expect(mockNavigator.permissions.query).toHaveBeenCalledWith({ name: 'microphone' });
      expect(mockNavigator.permissions.query).toHaveBeenCalledWith({ name: 'notifications' });
      expect(mockNavigator.permissions.query).toHaveBeenCalledWith({ name: 'clipboard-read' });
    });
  });

  describe('Device and browser detection', () => {
    it('should parse Chrome on macOS correctly', async () => {
      const { result } = renderHook(() => useDeviceInfo());

      await waitFor(() => {
        expect(result.current.deviceInfo).not.toBeNull();
      });

      const deviceInfo = result.current.deviceInfo!;
      expect(deviceInfo.device).toBe('Mac');
      expect(deviceInfo.browser).toContain('Chrome');
      expect(deviceInfo.os).toContain('macOS');
    });

    it('should parse Safari on macOS correctly', async () => {
      mockNavigator.userAgent = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Safari/605.1.15';

      const { result } = renderHook(() => useDeviceInfo());

      await waitFor(() => {
        expect(result.current.deviceInfo).not.toBeNull();
      });

      const deviceInfo = result.current.deviceInfo!;
      expect(deviceInfo.browser).toContain('Safari');
    });

    it('should parse Firefox correctly', async () => {
      mockNavigator.userAgent = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:120.0) Gecko/20100101 Firefox/120.0';

      const { result } = renderHook(() => useDeviceInfo());

      await waitFor(() => {
        expect(result.current.deviceInfo).not.toBeNull();
      });

      const deviceInfo = result.current.deviceInfo!;
      expect(deviceInfo.browser).toContain('Firefox');
    });

    it('should parse Edge correctly', async () => {
      mockNavigator.userAgent = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0';

      const { result } = renderHook(() => useDeviceInfo());

      await waitFor(() => {
        expect(result.current.deviceInfo).not.toBeNull();
      });

      const deviceInfo = result.current.deviceInfo!;
      expect(deviceInfo.browser).toContain('Edge');
    });

    it('should parse Windows correctly', async () => {
      mockNavigator.userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

      const { result } = renderHook(() => useDeviceInfo());

      await waitFor(() => {
        expect(result.current.deviceInfo).not.toBeNull();
      });

      const deviceInfo = result.current.deviceInfo!;
      expect(deviceInfo.device).toBe('Windows PC');
      expect(deviceInfo.os).toContain('Windows');
    });

    it('should parse mobile devices correctly', async () => {
      mockNavigator.userAgent = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';

      const { result } = renderHook(() => useDeviceInfo());

      await waitFor(() => {
        expect(result.current.deviceInfo).not.toBeNull();
      });

      const deviceInfo = result.current.deviceInfo!;
      expect(deviceInfo.device).toBe('iPhone');
      expect(deviceInfo.os).toContain('iOS');
    });

    it('should handle unknown user agents', async () => {
      mockNavigator.userAgent = 'Unknown Browser';

      const { result } = renderHook(() => useDeviceInfo());

      await waitFor(() => {
        expect(result.current.deviceInfo).not.toBeNull();
      });

      const deviceInfo = result.current.deviceInfo!;
      expect(deviceInfo.device).toBe('Unknown Device');
      expect(deviceInfo.os).toBe('Unknown OS');
      expect(deviceInfo.browser).toBe('Unknown Browser');
    });
  });

  describe('Hardware information', () => {
    it('should collect CPU and memory information', async () => {
      const { result } = renderHook(() => useDeviceInfo());

      await waitFor(() => {
        expect(result.current.deviceInfo).not.toBeNull();
      });

      const deviceInfo = result.current.deviceInfo!;
      expect(deviceInfo.cpu).toBe(8);
      expect(deviceInfo.memory).toBe('8 GB');
    });

    it('should handle missing hardware information', async () => {
      mockNavigator.hardwareConcurrency = 0;
      (mockNavigator as any).deviceMemory = undefined;

      const { result } = renderHook(() => useDeviceInfo());

      await waitFor(() => {
        expect(result.current.deviceInfo).not.toBeNull();
      });

      const deviceInfo = result.current.deviceInfo!;
      expect(deviceInfo.cpu).toBe('N/A');
      expect(deviceInfo.memory).toBe('N/A');
    });

    it('should collect battery information', async () => {
      const { result } = renderHook(() => useDeviceInfo());

      await waitFor(() => {
        expect(result.current.deviceInfo).not.toBeNull();
      });

      const deviceInfo = result.current.deviceInfo!;
      expect(deviceInfo.batteryLevel).toBe(80); // 0.8 * 100
      expect(deviceInfo.batteryCharging).toBe(true);
    });

    it('should handle missing battery API', async () => {
      (mockNavigator as any).getBattery = undefined;

      const { result } = renderHook(() => useDeviceInfo());

      await waitFor(() => {
        expect(result.current.deviceInfo).not.toBeNull();
      });

      const deviceInfo = result.current.deviceInfo!;
      expect(deviceInfo.batteryLevel).toBeNull();
      expect(deviceInfo.batteryCharging).toBeNull();
    });

    it('should handle battery API errors', async () => {
      mockNavigator.getBattery.mockRejectedValue(new Error('Battery API error'));

      const { result } = renderHook(() => useDeviceInfo());

      await waitFor(() => {
        expect(result.current.deviceInfo).not.toBeNull();
      });

      const deviceInfo = result.current.deviceInfo!;
      expect(deviceInfo.batteryLevel).toBeNull();
      expect(deviceInfo.batteryCharging).toBeNull();
    });
  });

  describe('Display and screen information', () => {
    it('should collect screen and window information', async () => {
      const { result } = renderHook(() => useDeviceInfo());

      await waitFor(() => {
        expect(result.current.deviceInfo).not.toBeNull();
      });

      const deviceInfo = result.current.deviceInfo!;
      expect(deviceInfo.screen).toBe('1920×1080');
      expect(deviceInfo.windowSize).toBe('1200×800');
      expect(deviceInfo.pixelRatio).toBe(2);
    });

    it('should detect color scheme preference', async () => {
      mockWindow.matchMedia.mockReturnValue({ matches: true } as any);

      const { result } = renderHook(() => useDeviceInfo());

      await waitFor(() => {
        expect(result.current.deviceInfo).not.toBeNull();
      });

      const deviceInfo = result.current.deviceInfo!;
      expect(deviceInfo.colorScheme).toBe('dark');
    });

    it('should default to light color scheme', async () => {
      mockWindow.matchMedia.mockReturnValue({ matches: false } as any);

      const { result } = renderHook(() => useDeviceInfo());

      await waitFor(() => {
        expect(result.current.deviceInfo).not.toBeNull();
      });

      const deviceInfo = result.current.deviceInfo!;
      expect(deviceInfo.colorScheme).toBe('light');
    });
  });

  describe('Network information', () => {
    it('should collect network connection information', async () => {
      const { result } = renderHook(() => useDeviceInfo());

      await waitFor(() => {
        expect(result.current.deviceInfo).not.toBeNull();
      });

      const deviceInfo = result.current.deviceInfo!;
      expect(deviceInfo.online).toBe(true);
      expect(deviceInfo.networkType).toBe('4g');
      expect(deviceInfo.downlink).toBe('10 Mbps');
      expect(deviceInfo.rtt).toBe('100 ms');
    });

    it('should handle missing connection information', async () => {
      (mockNavigator as any).connection = undefined;

      const { result } = renderHook(() => useDeviceInfo());

      await waitFor(() => {
        expect(result.current.deviceInfo).not.toBeNull();
      });

      const deviceInfo = result.current.deviceInfo!;
      expect(deviceInfo.networkType).toBe('Unknown');
      expect(deviceInfo.downlink).toBe('N/A');
      expect(deviceInfo.rtt).toBe('N/A');
    });

    it('should handle Mozilla connection API', async () => {
      (mockNavigator as any).connection = undefined;
      (mockNavigator as any).mozConnection = {
        effectiveType: '3g',
        downlink: 5,
        rtt: 200,
      };

      const { result } = renderHook(() => useDeviceInfo());

      await waitFor(() => {
        expect(result.current.deviceInfo).not.toBeNull();
      });

      const deviceInfo = result.current.deviceInfo!;
      expect(deviceInfo.networkType).toBe('3g');
      expect(deviceInfo.downlink).toBe('5 Mbps');
      expect(deviceInfo.rtt).toBe('200 ms');
    });

    it('should handle WebKit connection API', async () => {
      (mockNavigator as any).connection = undefined;
      (mockNavigator as any).webkitConnection = {
        effectiveType: '2g',
        downlink: 1,
        rtt: 500,
      };

      const { result } = renderHook(() => useDeviceInfo());

      await waitFor(() => {
        expect(result.current.deviceInfo).not.toBeNull();
      });

      const deviceInfo = result.current.deviceInfo!;
      expect(deviceInfo.networkType).toBe('2g');
      expect(deviceInfo.downlink).toBe('1 Mbps');
      expect(deviceInfo.rtt).toBe('500 ms');
    });
  });

  describe('Session and time information', () => {
    it('should track session duration', async () => {
      const startTime = mockTimestamp;
      const currentTime = mockTimestamp + 30000; // 30 seconds later

      mockTimeService.getTimestamp
        .mockReturnValueOnce(startTime) // Session start
        .mockReturnValue(currentTime); // Current time

      const { result } = renderHook(() => useDeviceInfo());

      await waitFor(() => {
        expect(result.current.deviceInfo).not.toBeNull();
      });

      const deviceInfo = result.current.deviceInfo!;
      expect(deviceInfo.sessionDuration).toBe(30); // 30 seconds
    });

    it('should collect time and language information', async () => {
      const { result } = renderHook(() => useDeviceInfo());

      await waitFor(() => {
        expect(result.current.deviceInfo).not.toBeNull();
      });

      const deviceInfo = result.current.deviceInfo!;
      expect(deviceInfo.localTime).toBe(mockFormattedTime);
      expect(deviceInfo.timezone).toBe('America/New_York');
      expect(deviceInfo.language).toBe('en-US');
    });

    it('should track document visibility', async () => {
      const { result } = renderHook(() => useDeviceInfo());

      await waitFor(() => {
        expect(result.current.deviceInfo).not.toBeNull();
      });

      const deviceInfo = result.current.deviceInfo!;
      expect(deviceInfo.tabVisible).toBe(true);
    });

    it('should handle hidden document', async () => {
      mockDocument.hidden = true;

      const { result } = renderHook(() => useDeviceInfo());

      await waitFor(() => {
        expect(result.current.deviceInfo).not.toBeNull();
      });

      const deviceInfo = result.current.deviceInfo!;
      expect(deviceInfo.tabVisible).toBe(false);
    });
  });

  describe('Storage and browser features', () => {
    it('should collect storage quota information', async () => {
      const { result } = renderHook(() => useDeviceInfo());

      await waitFor(() => {
        expect(result.current.deviceInfo).not.toBeNull();
      });

      const deviceInfo = result.current.deviceInfo!;
      expect(deviceInfo.storageQuota).toBe('1.0 GB');
    });

    it('should handle missing storage API', async () => {
      (mockNavigator as any).storage = undefined;

      const { result } = renderHook(() => useDeviceInfo());

      await waitFor(() => {
        expect(result.current.deviceInfo).not.toBeNull();
      });

      const deviceInfo = result.current.deviceInfo!;
      expect(deviceInfo.storageQuota).toBe('N/A');
    });

    it('should handle storage API errors', async () => {
      mockNavigator.storage.estimate.mockRejectedValue(new Error('Storage API error'));

      const { result } = renderHook(() => useDeviceInfo());

      await waitFor(() => {
        expect(result.current.deviceInfo).not.toBeNull();
      });

      const deviceInfo = result.current.deviceInfo!;
      expect(deviceInfo.storageQuota).toBe('N/A');
    });

    it('should collect browser feature information', async () => {
      const { result } = renderHook(() => useDeviceInfo());

      await waitFor(() => {
        expect(result.current.deviceInfo).not.toBeNull();
      });

      const deviceInfo = result.current.deviceInfo!;
      expect(deviceInfo.cookiesEnabled).toBe(true);
      expect(deviceInfo.doNotTrack).toBeNull();
    });
  });

  describe('Permission handling', () => {
    it('should check all permissions', async () => {
      const { result } = renderHook(() => useDeviceInfo());

      await waitFor(() => {
        expect(result.current.permissions.geolocation).toBe('granted');
        expect(result.current.permissions.camera).toBe('granted');
        expect(result.current.permissions.microphone).toBe('granted');
        expect(result.current.permissions.notifications).toBe('granted');
        expect(result.current.permissions.clipboard).toBe('granted');
      });
    });

    it('should handle permission check errors', async () => {
      mockNavigator.permissions.query.mockRejectedValue(new Error('Permission error'));

      const { result } = renderHook(() => useDeviceInfo());

      await waitFor(() => {
        expect(result.current.permissions.geolocation).toBe('unknown');
      });
    });

    it('should handle missing permissions API', async () => {
      (mockNavigator as any).permissions = undefined;

      const { result } = renderHook(() => useDeviceInfo());

      await waitFor(() => {
        expect(result.current.permissions.geolocation).toBe('unknown');
      });
    });

    it('should request geolocation permission', async () => {
      const { result } = renderHook(() => useDeviceInfo());

      await act(async () => {
        await result.current.requestPermission('geolocation');
      });

      expect(mockNavigator.geolocation.getCurrentPosition).toHaveBeenCalled();
    });

    it('should request camera permission', async () => {
      const { result } = renderHook(() => useDeviceInfo());

      await act(async () => {
        await result.current.requestPermission('camera');
      });

      expect(mockNavigator.mediaDevices.getUserMedia).toHaveBeenCalledWith({ video: true });
    });

    it('should request microphone permission', async () => {
      const { result } = renderHook(() => useDeviceInfo());

      await act(async () => {
        await result.current.requestPermission('microphone');
      });

      expect(mockNavigator.mediaDevices.getUserMedia).toHaveBeenCalledWith({ audio: true });
    });

    it('should request notification permission', async () => {
      const { result } = renderHook(() => useDeviceInfo());

      await act(async () => {
        await result.current.requestPermission('notifications');
      });

      expect(mockNotification.requestPermission).toHaveBeenCalled();
    });

    it('should request clipboard permission', async () => {
      const { result } = renderHook(() => useDeviceInfo());

      await act(async () => {
        await result.current.requestPermission('clipboard');
      });

      expect(mockNavigator.clipboard.readText).toHaveBeenCalled();
    });

    it('should handle permission request failures', async () => {
      mockNavigator.mediaDevices.getUserMedia.mockRejectedValue(new Error('Permission denied'));

      const { result } = renderHook(() => useDeviceInfo());

      await act(async () => {
        await result.current.requestPermission('camera');
      });

      // Should still check permissions after failure
      expect(mockNavigator.permissions.query).toHaveBeenCalled();
    });
  });

  describe('Event listeners and updates', () => {
    it('should setup event listeners on mount', () => {
      renderHook(() => useDeviceInfo());

      expect(mockWindow.addEventListener).toHaveBeenCalledWith('online', expect.any(Function));
      expect(mockWindow.addEventListener).toHaveBeenCalledWith('offline', expect.any(Function));
      expect(mockWindow.addEventListener).toHaveBeenCalledWith('resize', expect.any(Function));
      expect(mockDocument.addEventListener).toHaveBeenCalledWith('visibilitychange', expect.any(Function));
    });

    it('should update device info on online/offline events', async () => {
      const { result } = renderHook(() => useDeviceInfo());

      await waitFor(() => {
        expect(result.current.deviceInfo).not.toBeNull();
      });

      // Simulate offline event
      mockNavigator.onLine = false;
      const onlineHandler = mockWindow.addEventListener.mock.calls.find(
        call => call[0] === 'offline',
      )?.[1];

      act(() => {
        onlineHandler();
      });

      await waitFor(() => {
        expect(result.current.deviceInfo!.online).toBe(false);
      });
    });

    it('should update device info on visibility change', async () => {
      const { result } = renderHook(() => useDeviceInfo());

      await waitFor(() => {
        expect(result.current.deviceInfo).not.toBeNull();
      });

      // Simulate visibility change
      mockDocument.hidden = true;
      const visibilityHandler = mockDocument.addEventListener.mock.calls.find(
        call => call[0] === 'visibilitychange',
      )?.[1];

      act(() => {
        visibilityHandler();
      });

      await waitFor(() => {
        expect(result.current.deviceInfo!.tabVisible).toBe(false);
      });
    });

    it('should update device info on window resize', async () => {
      const { result } = renderHook(() => useDeviceInfo());

      await waitFor(() => {
        expect(result.current.deviceInfo).not.toBeNull();
      });

      // Simulate window resize
      mockWindow.innerWidth = 800;
      mockWindow.innerHeight = 600;
      const resizeHandler = mockWindow.addEventListener.mock.calls.find(
        call => call[0] === 'resize',
      )?.[1];

      act(() => {
        resizeHandler();
      });

      await waitFor(() => {
        expect(result.current.deviceInfo!.windowSize).toBe('800×600');
      });
    });

    it('should update device info periodically', async () => {
      const { result } = renderHook(() => useDeviceInfo());

      await waitFor(() => {
        expect(result.current.deviceInfo).not.toBeNull();
      });

      const initialSessionDuration = result.current.deviceInfo!.sessionDuration;

      // Fast-forward time
      act(() => {
        jest.advanceTimersByTime(5000); // 5 seconds
      });

      await waitFor(() => {
        expect(result.current.deviceInfo!.sessionDuration).toBeGreaterThan(initialSessionDuration);
      });
    });

    it('should cleanup event listeners on unmount', () => {
      const { unmount } = renderHook(() => useDeviceInfo());

      unmount();

      expect(mockWindow.removeEventListener).toHaveBeenCalledWith('online', expect.any(Function));
      expect(mockWindow.removeEventListener).toHaveBeenCalledWith('offline', expect.any(Function));
      expect(mockWindow.removeEventListener).toHaveBeenCalledWith('resize', expect.any(Function));
      expect(mockDocument.removeEventListener).toHaveBeenCalledWith('visibilitychange', expect.any(Function));
    });
  });

  describe('Utility functions', () => {
    it('should format bytes correctly', async () => {
      // Test through storage quota
      mockNavigator.storage.estimate.mockResolvedValue({ quota: 0 });

      const { result } = renderHook(() => useDeviceInfo());

      await waitFor(() => {
        expect(result.current.deviceInfo).not.toBeNull();
      });

      expect(result.current.deviceInfo!.storageQuota).toBe('0 B');
    });

    it('should format large byte values', async () => {
      // Test different byte sizes
      const testCases = [
        { quota: 1024, expected: '1.0 KB' },
        { quota: 1048576, expected: '1.0 MB' },
        { quota: 1073741824, expected: '1.0 GB' },
        { quota: 1099511627776, expected: '1.0 TB' },
      ];

      for (const testCase of testCases) {
        mockNavigator.storage.estimate.mockResolvedValue({ quota: testCase.quota });

        const { result } = renderHook(() => useDeviceInfo());

        await waitFor(() => {
          expect(result.current.deviceInfo).not.toBeNull();
        });

        expect(result.current.deviceInfo!.storageQuota).toBe(testCase.expected);
      }
    });
  });

  describe('IP location handling', () => {
    it('should use provided IP location', async () => {
      const customLocation = { city: 'San Francisco', ip: '10.0.0.1' };

      const { result } = renderHook(() => useDeviceInfo(customLocation));

      await waitFor(() => {
        expect(result.current.deviceInfo).not.toBeNull();
      });

      const deviceInfo = result.current.deviceInfo!;
      expect(deviceInfo.location).toBe('San Francisco');
      expect(deviceInfo.ip).toBe('10.0.0.1');
    });

    it('should handle missing IP location gracefully', async () => {
      const { result } = renderHook(() => useDeviceInfo());

      await waitFor(() => {
        expect(result.current.deviceInfo).not.toBeNull();
      });

      const deviceInfo = result.current.deviceInfo!;
      expect(deviceInfo.location).toBe('Unknown');
      expect(deviceInfo.ip).toBe('N/A');
    });

    it('should update when IP location changes', async () => {
      let currentIpLocation: { city?: string; ip?: string } | undefined = undefined;
      
      const { result, rerender } = renderHook(
        () => useDeviceInfo(currentIpLocation),
      );

      await waitFor(() => {
        expect(result.current.deviceInfo).not.toBeNull();
      });

      expect(result.current.deviceInfo!.location).toBe('Unknown');

      // Update with new location  
      currentIpLocation = mockIpLocation;
      rerender();

      await waitFor(() => {
        expect(result.current.deviceInfo!.location).toBe('New York');
      });
    });
  });
});