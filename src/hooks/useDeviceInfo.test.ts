import { renderHook, act, waitFor } from "@testing-library/react";
import { useDeviceInfo } from "./useDeviceInfo";

// Mock navigator properties
const mockNavigator = {
  userAgent:
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
  onLine: true,
  language: "en-US",
  cookieEnabled: true,
  doNotTrack: "1",
  hardwareConcurrency: 8,
  deviceMemory: 16,
  connection: {
    effectiveType: "4g",
    downlink: 10,
    rtt: 50,
  },
  permissions: {
    query: jest.fn(),
  },
  getBattery: jest.fn(),
  storage: {
    estimate: jest.fn(),
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
};

// Mock screen
const mockScreen = {
  width: 1920,
  height: 1080,
};

// Mock window properties
const mockWindow = {
  devicePixelRatio: 2,
  innerWidth: 1024,
  innerHeight: 768,
  matchMedia: jest.fn(),
};

// Mock document
const mockDocument = {
  hidden: false,
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
};

// Mock Notification
const mockNotification = {
  requestPermission: jest.fn(),
};

// Mock Intl
const mockIntl = {
  DateTimeFormat: jest.fn(() => ({
    resolvedOptions: () => ({ timeZone: "America/New_York" }),
  })),
};

describe("useDeviceInfo", () => {
  const originalNavigator = global.navigator;
  const originalScreen = global.screen;
  const originalWindow = global.window;
  const originalDocument = global.document;
  const originalNotification = global.Notification;
  const originalIntl = global.Intl;

  beforeEach(() => {
    // Setup mocks
    Object.defineProperty(global, "navigator", {
      value: mockNavigator,
      writable: true,
    });
    Object.defineProperty(global, "screen", {
      value: mockScreen,
      writable: true,
    });
    Object.defineProperty(global, "window", {
      value: { ...originalWindow, ...mockWindow },
      writable: true,
    });
    Object.defineProperty(global, "document", {
      value: { ...originalDocument, ...mockDocument },
      writable: true,
    });
    Object.defineProperty(global, "Notification", {
      value: mockNotification,
      writable: true,
    });
    Object.defineProperty(global, "Intl", {
      value: mockIntl,
      writable: true,
    });

    // Reset all mocks
    jest.clearAllMocks();

    // Setup default mock implementations
    mockWindow.matchMedia.mockReturnValue({ matches: false });
    mockNavigator.permissions.query.mockResolvedValue({ state: "prompt" });
    mockNavigator.getBattery.mockResolvedValue({
      level: 0.85,
      charging: true,
    });
    mockNavigator.storage.estimate.mockResolvedValue({
      quota: 1073741824, // 1GB
    });
  });

  afterEach(() => {
    // Restore original values
    Object.defineProperty(global, "navigator", {
      value: originalNavigator,
      writable: true,
    });
    Object.defineProperty(global, "screen", {
      value: originalScreen,
      writable: true,
    });
    Object.defineProperty(global, "window", {
      value: originalWindow,
      writable: true,
    });
    Object.defineProperty(global, "document", {
      value: originalDocument,
      writable: true,
    });
    Object.defineProperty(global, "Notification", {
      value: originalNotification,
      writable: true,
    });
    Object.defineProperty(global, "Intl", {
      value: originalIntl,
      writable: true,
    });
  });

  it("collects device information", async () => {
    const { result } = renderHook(() => useDeviceInfo());

    await waitFor(() => {
      expect(result.current.deviceInfo).not.toBeNull();
    });

    const deviceInfo = result.current.deviceInfo!;

    expect(deviceInfo.device).toBe("Mac");
    expect(deviceInfo.os).toContain("macOS");
    expect(deviceInfo.browser).toContain("Chrome");
    expect(deviceInfo.screen).toBe("1920×1080");
    expect(deviceInfo.pixelRatio).toBe(2);
    expect(deviceInfo.windowSize).toBe("1024×768");
    expect(deviceInfo.cpu).toBe(8);
    expect(deviceInfo.memory).toBe("16 GB");
    expect(deviceInfo.online).toBe(true);
    expect(deviceInfo.networkType).toBe("4g");
    expect(deviceInfo.downlink).toBe("10 Mbps");
    expect(deviceInfo.rtt).toBe("50 ms");
    expect(deviceInfo.language).toBe("en-US");
    expect(deviceInfo.cookiesEnabled).toBe(true);
    expect(deviceInfo.doNotTrack).toBe("1");
    expect(deviceInfo.timezone).toBe("America/New_York");
  });

  it("detects color scheme", async () => {
    mockWindow.matchMedia.mockReturnValue({ matches: true });

    const { result } = renderHook(() => useDeviceInfo());

    await waitFor(() => {
      expect(result.current.deviceInfo).not.toBeNull();
    });

    expect(result.current.deviceInfo!.colorScheme).toBe("dark");
  });

  it("uses IP location when provided", async () => {
    const ipLocation = { city: "New York", ip: "192.168.1.1" };
    const { result } = renderHook(() => useDeviceInfo(ipLocation));

    await waitFor(() => {
      expect(result.current.deviceInfo).not.toBeNull();
    });

    expect(result.current.deviceInfo!.location).toBe("New York");
    expect(result.current.deviceInfo!.ip).toBe("192.168.1.1");
  });

  it("handles missing battery API", async () => {
    mockNavigator.getBattery = undefined;

    const { result } = renderHook(() => useDeviceInfo());

    await waitFor(() => {
      expect(result.current.deviceInfo).not.toBeNull();
    });

    expect(result.current.deviceInfo!.batteryLevel).toBeNull();
    expect(result.current.deviceInfo!.batteryCharging).toBeNull();
  });

  it("handles missing storage API", async () => {
    mockNavigator.storage = undefined;

    const { result } = renderHook(() => useDeviceInfo());

    await waitFor(() => {
      expect(result.current.deviceInfo).not.toBeNull();
    });

    expect(result.current.deviceInfo!.storageQuota).toBe("N/A");
  });

  it("handles missing connection API", async () => {
    mockNavigator.connection = undefined;

    const { result } = renderHook(() => useDeviceInfo());

    await waitFor(() => {
      expect(result.current.deviceInfo).not.toBeNull();
    });

    expect(result.current.deviceInfo!.networkType).toBe("Unknown");
    expect(result.current.deviceInfo!.downlink).toBe("N/A");
    expect(result.current.deviceInfo!.rtt).toBe("N/A");
  });

  it("handles missing hardware info", async () => {
    mockNavigator.hardwareConcurrency = undefined;
    mockNavigator.deviceMemory = undefined;

    const { result } = renderHook(() => useDeviceInfo());

    await waitFor(() => {
      expect(result.current.deviceInfo).not.toBeNull();
    });

    expect(result.current.deviceInfo!.cpu).toBe("N/A");
    expect(result.current.deviceInfo!.memory).toBe("N/A");
  });

  it("detects Firefox browser", async () => {
    mockNavigator.userAgent =
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15) Gecko/20100101 Firefox/89.0";

    const { result } = renderHook(() => useDeviceInfo());

    await waitFor(() => {
      expect(result.current.deviceInfo).not.toBeNull();
    });

    expect(result.current.deviceInfo!.browser).toContain("Firefox");
  });

  it("detects Safari browser", async () => {
    mockNavigator.userAgent =
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.1 Safari/605.1.15";

    const { result } = renderHook(() => useDeviceInfo());

    await waitFor(() => {
      expect(result.current.deviceInfo).not.toBeNull();
    });

    expect(result.current.deviceInfo!.browser).toContain("Safari");
  });

  it("detects Edge browser", async () => {
    mockNavigator.userAgent =
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36 Edg/91.0.864.59";

    const { result } = renderHook(() => useDeviceInfo());

    await waitFor(() => {
      expect(result.current.deviceInfo).not.toBeNull();
    });

    expect(result.current.deviceInfo!.browser).toContain("Edge");
  });

  it("detects Windows OS", async () => {
    mockNavigator.userAgent =
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36";

    const { result } = renderHook(() => useDeviceInfo());

    await waitFor(() => {
      expect(result.current.deviceInfo).not.toBeNull();
    });

    expect(result.current.deviceInfo!.os).toContain("Windows");
    expect(result.current.deviceInfo!.device).toBe("Windows PC");
  });

  it("detects Android device", async () => {
    mockNavigator.userAgent =
      "Mozilla/5.0 (Linux; Android 11; SM-G991B) AppleWebKit/537.36";

    const { result } = renderHook(() => useDeviceInfo());

    await waitFor(() => {
      expect(result.current.deviceInfo).not.toBeNull();
    });

    expect(result.current.deviceInfo!.os).toContain("Android");
    expect(result.current.deviceInfo!.device).toBe("Android Device");
  });

  it("detects iPhone", async () => {
    mockNavigator.userAgent =
      "Mozilla/5.0 (iPhone; CPU iPhone OS 14_6 like Mac OS X) AppleWebKit/605.1.15";

    const { result } = renderHook(() => useDeviceInfo());

    await waitFor(() => {
      expect(result.current.deviceInfo).not.toBeNull();
    });

    expect(result.current.deviceInfo!.device).toBe("iPhone");
  });

  it("checks permissions", async () => {
    mockNavigator.permissions.query
      .mockResolvedValueOnce({ state: "granted" }) // geolocation
      .mockResolvedValueOnce({ state: "denied" }) // camera
      .mockResolvedValueOnce({ state: "prompt" }) // microphone
      .mockResolvedValueOnce({ state: "granted" }) // notifications
      .mockResolvedValueOnce({ state: "prompt" }); // clipboard

    const { result } = renderHook(() => useDeviceInfo());

    await waitFor(() => {
      expect(result.current.permissions.geolocation).toBe("granted");
    });

    expect(result.current.permissions.camera).toBe("denied");
    expect(result.current.permissions.microphone).toBe("prompt");
    expect(result.current.permissions.notifications).toBe("granted");
    expect(result.current.permissions.clipboard).toBe("prompt");
  });

  it("handles missing permissions API", async () => {
    mockNavigator.permissions = undefined;

    const { result } = renderHook(() => useDeviceInfo());

    await waitFor(() => {
      expect(result.current.permissions.geolocation).toBe("unknown");
    });

    expect(result.current.permissions.camera).toBe("unknown");
    expect(result.current.permissions.microphone).toBe("unknown");
    expect(result.current.permissions.notifications).toBe("unknown");
    expect(result.current.permissions.clipboard).toBe("unknown");
  });

  it("requests geolocation permission", async () => {
    const { result } = renderHook(() => useDeviceInfo());

    await act(async () => {
      await result.current.requestPermission("geolocation");
    });

    expect(mockNavigator.geolocation.getCurrentPosition).toHaveBeenCalled();
  });

  it("requests camera permission", async () => {
    const { result } = renderHook(() => useDeviceInfo());

    await act(async () => {
      await result.current.requestPermission("camera");
    });

    expect(mockNavigator.mediaDevices.getUserMedia).toHaveBeenCalledWith({
      video: true,
    });
  });

  it("requests microphone permission", async () => {
    const { result } = renderHook(() => useDeviceInfo());

    await act(async () => {
      await result.current.requestPermission("microphone");
    });

    expect(mockNavigator.mediaDevices.getUserMedia).toHaveBeenCalledWith({
      audio: true,
    });
  });

  it("requests notification permission", async () => {
    const { result } = renderHook(() => useDeviceInfo());

    await act(async () => {
      await result.current.requestPermission("notifications");
    });

    expect(mockNotification.requestPermission).toHaveBeenCalled();
  });

  it("requests clipboard permission", async () => {
    const { result } = renderHook(() => useDeviceInfo());

    await act(async () => {
      await result.current.requestPermission("clipboard");
    });

    expect(mockNavigator.clipboard.readText).toHaveBeenCalled();
  });

  it("handles permission request failures", async () => {
    mockNavigator.mediaDevices.getUserMedia.mockRejectedValue(
      new Error("Permission denied"),
    );

    const { result } = renderHook(() => useDeviceInfo());

    await act(async () => {
      await result.current.requestPermission("camera");
    });

    // Should still check permissions even if request fails
    expect(mockNavigator.permissions.query).toHaveBeenCalled();
  });

  it("updates on online/offline events", async () => {
    const { result } = renderHook(() => useDeviceInfo());

    await waitFor(() => {
      expect(result.current.deviceInfo).not.toBeNull();
    });

    // Simulate offline
    act(() => {
      mockNavigator.onLine = false;
      window.dispatchEvent(new Event("offline"));
    });

    await waitFor(() => {
      expect(result.current.deviceInfo!.online).toBe(false);
    });

    // Simulate online
    act(() => {
      mockNavigator.onLine = true;
      window.dispatchEvent(new Event("online"));
    });

    await waitFor(() => {
      expect(result.current.deviceInfo!.online).toBe(true);
    });
  });

  it("updates on visibility change", async () => {
    const { result } = renderHook(() => useDeviceInfo());

    await waitFor(() => {
      expect(result.current.deviceInfo).not.toBeNull();
    });

    // Simulate tab hidden
    act(() => {
      mockDocument.hidden = true;
      document.dispatchEvent(new Event("visibilitychange"));
    });

    await waitFor(() => {
      expect(result.current.deviceInfo!.tabVisible).toBe(false);
    });

    // Simulate tab visible
    act(() => {
      mockDocument.hidden = false;
      document.dispatchEvent(new Event("visibilitychange"));
    });

    await waitFor(() => {
      expect(result.current.deviceInfo!.tabVisible).toBe(true);
    });
  });

  it("updates on window resize", async () => {
    const { result } = renderHook(() => useDeviceInfo());

    await waitFor(() => {
      expect(result.current.deviceInfo).not.toBeNull();
    });

    // Simulate resize
    act(() => {
      mockWindow.innerWidth = 1280;
      mockWindow.innerHeight = 800;
      window.dispatchEvent(new Event("resize"));
    });

    await waitFor(() => {
      expect(result.current.deviceInfo!.windowSize).toBe("1280×800");
    });
  });

  it("updates session duration", async () => {
    jest.useFakeTimers();

    const { result } = renderHook(() => useDeviceInfo());

    await waitFor(() => {
      expect(result.current.deviceInfo).not.toBeNull();
    });

    expect(result.current.deviceInfo!.sessionDuration).toBe(0);

    // Advance time by 5 seconds
    act(() => {
      jest.advanceTimersByTime(5000);
    });

    await waitFor(() => {
      expect(result.current.deviceInfo!.sessionDuration).toBe(5);
    });

    jest.useRealTimers();
  });

  it("cleans up event listeners on unmount", () => {
    const addEventListenerSpy = jest.spyOn(window, "addEventListener");
    const removeEventListenerSpy = jest.spyOn(window, "removeEventListener");
    const documentAddEventListenerSpy = jest.spyOn(
      document,
      "addEventListener",
    );
    const documentRemoveEventListenerSpy = jest.spyOn(
      document,
      "removeEventListener",
    );

    const { unmount } = renderHook(() => useDeviceInfo());

    expect(addEventListenerSpy).toHaveBeenCalledWith(
      "online",
      expect.any(Function),
    );
    expect(addEventListenerSpy).toHaveBeenCalledWith(
      "offline",
      expect.any(Function),
    );
    expect(addEventListenerSpy).toHaveBeenCalledWith(
      "resize",
      expect.any(Function),
    );
    expect(documentAddEventListenerSpy).toHaveBeenCalledWith(
      "visibilitychange",
      expect.any(Function),
    );

    unmount();

    expect(removeEventListenerSpy).toHaveBeenCalledWith(
      "online",
      expect.any(Function),
    );
    expect(removeEventListenerSpy).toHaveBeenCalledWith(
      "offline",
      expect.any(Function),
    );
    expect(removeEventListenerSpy).toHaveBeenCalledWith(
      "resize",
      expect.any(Function),
    );
    expect(documentRemoveEventListenerSpy).toHaveBeenCalledWith(
      "visibilitychange",
      expect.any(Function),
    );

    addEventListenerSpy.mockRestore();
    removeEventListenerSpy.mockRestore();
    documentAddEventListenerSpy.mockRestore();
    documentRemoveEventListenerSpy.mockRestore();
  });
});
