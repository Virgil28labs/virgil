import { renderHook, act } from "@testing-library/react";
import { useCamera } from "./useCamera";
import { CameraUtils } from "../utils/cameraUtils";

// Mock CameraUtils
jest.mock("../utils/cameraUtils");

const mockCameraUtils = CameraUtils as jest.Mocked<typeof CameraUtils>;

// Mock camera ref methods
const mockCameraRef = {
  takePhoto: jest.fn(),
  switchCamera: jest.fn(),
};

describe("useCamera", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Default mock implementations
    mockCameraUtils.isSecureContext.mockReturnValue(true);
    mockCameraUtils.isCameraSupported.mockReturnValue(true);
    mockCameraUtils.requestCameraPermission.mockResolvedValue({
      granted: true,
    });
    mockCameraUtils.getAvailableCameras.mockResolvedValue([
      { deviceId: "camera1", label: "Front Camera", kind: "videoinput", groupId: "g1" } as MediaDeviceInfo,
      { deviceId: "camera2", label: "Back Camera", kind: "videoinput", groupId: "g2" } as MediaDeviceInfo,
    ]);
    mockCameraUtils.createCameraError.mockImplementation((error: any) => ({
      type: "browser",
      message: error?.message || "Unknown error",
      code: "UNKNOWN_ERROR",
      details: error,
    }));

    // Reset camera ref mocks
    mockCameraRef.takePhoto.mockReturnValue("data:image/jpeg;base64,mockphoto");
    mockCameraRef.switchCamera.mockReturnValue("environment");
  });

  it("initializes with default state", () => {
    const { result } = renderHook(() => useCamera());

    expect(result.current.cameraState).toEqual({
      isActive: false,
      isCapturing: false,
      hasPermission: false,
      error: null,
      facingMode: "user",
      numberOfCameras: 0,
      showGrid: true,
      timer: null,
      flashMode: "off",
    });
    expect(result.current.cameraRef.current).toBeNull();
  });

  describe("initializeCamera", () => {
    it("successfully initializes camera with permission", async () => {
      const { result } = renderHook(() => useCamera());

      await act(async () => {
        await result.current.initializeCamera();
      });

      expect(mockCameraUtils.isSecureContext).toHaveBeenCalled();
      expect(mockCameraUtils.isCameraSupported).toHaveBeenCalled();
      expect(mockCameraUtils.requestCameraPermission).toHaveBeenCalled();
      expect(mockCameraUtils.getAvailableCameras).toHaveBeenCalled();

      expect(result.current.cameraState).toEqual({
        isActive: true,
        isCapturing: false,
        hasPermission: true,
        error: null,
        facingMode: "user",
        numberOfCameras: 2,
        showGrid: true,
        timer: null,
        flashMode: "off",
      });
    });

    it("handles insecure context error", async () => {
      mockCameraUtils.isSecureContext.mockReturnValue(false);

      const { result } = renderHook(() => useCamera());

      await act(async () => {
        await result.current.initializeCamera();
      });

      expect(result.current.cameraState.isActive).toBe(false);
      expect(result.current.cameraState.hasPermission).toBe(false);
      expect(result.current.cameraState.error).toBe("Camera requires HTTPS or localhost");
    });

    it("handles unsupported browser error", async () => {
      mockCameraUtils.isCameraSupported.mockReturnValue(false);

      const { result } = renderHook(() => useCamera());

      await act(async () => {
        await result.current.initializeCamera();
      });

      expect(result.current.cameraState.isActive).toBe(false);
      expect(result.current.cameraState.hasPermission).toBe(false);
      expect(result.current.cameraState.error).toBe("Camera is not supported in this browser");
    });

    it("handles permission denied", async () => {
      mockCameraUtils.requestCameraPermission.mockResolvedValue({
        granted: false,
        error: {
          type: "permission",
          message: "Camera permission denied",
          code: "PERMISSION_DENIED",
        },
      });

      const { result } = renderHook(() => useCamera());

      await act(async () => {
        await result.current.initializeCamera();
      });

      expect(result.current.cameraState.isActive).toBe(false);
      expect(result.current.cameraState.hasPermission).toBe(false);
      expect(result.current.cameraState.error).toBe("Camera permission denied");
    });

    it("handles permission error without message", async () => {
      mockCameraUtils.requestCameraPermission.mockResolvedValue({
        granted: false,
      });

      const { result } = renderHook(() => useCamera());

      await act(async () => {
        await result.current.initializeCamera();
      });

      expect(result.current.cameraState.error).toBe("Permission denied");
    });

    it("handles unexpected errors", async () => {
      const error = new Error("Unexpected error");
      mockCameraUtils.requestCameraPermission.mockRejectedValue(error);
      mockCameraUtils.createCameraError.mockReturnValue({
        type: "browser",
        message: "Camera error: Unexpected error",
        code: "UNKNOWN_ERROR",
        details: error,
      });

      const { result } = renderHook(() => useCamera());

      await act(async () => {
        await result.current.initializeCamera();
      });

      expect(result.current.cameraState.isActive).toBe(false);
      expect(result.current.cameraState.hasPermission).toBe(false);
      expect(result.current.cameraState.error).toBe("Camera error: Unexpected error");
    });
  });

  describe("capturePhoto", () => {
    it("captures photo successfully", async () => {
      const { result } = renderHook(() => useCamera());

      // Initialize camera first
      await act(async () => {
        await result.current.initializeCamera();
      });

      // Set camera ref
      act(() => {
        result.current.cameraRef.current = mockCameraRef;
      });

      const photoUrl = await act(async () => {
        return await result.current.capturePhoto();
      });

      expect(mockCameraRef.takePhoto).toHaveBeenCalled();
      expect(photoUrl).toBe("data:image/jpeg;base64,mockphoto");
    });

    it("returns null when camera is not active", async () => {
      const { result } = renderHook(() => useCamera());

      const photoUrl = await act(async () => {
        return await result.current.capturePhoto();
      });

      expect(photoUrl).toBeNull();
      expect(mockCameraRef.takePhoto).not.toHaveBeenCalled();
    });

    it("returns null when cameraRef is null", async () => {
      const { result } = renderHook(() => useCamera());

      // Initialize camera
      await act(async () => {
        await result.current.initializeCamera();
      });

      // Don't set cameraRef
      const photoUrl = await act(async () => {
        return await result.current.capturePhoto();
      });

      expect(photoUrl).toBeNull();
    });

    it("handles timer countdown", async () => {
      jest.useFakeTimers();
      const { result } = renderHook(() => useCamera());

      // Initialize camera and set timer
      await act(async () => {
        await result.current.initializeCamera();
      });
      
      act(() => {
        result.current.setTimer(3);
      });

      // Set camera ref
      act(() => {
        result.current.cameraRef.current = mockCameraRef;
      });

      // Start capture
      let capturePromise: Promise<string | null>;
      act(() => {
        capturePromise = result.current.capturePhoto();
      });

      // Check that capturing state is set
      expect(result.current.cameraState.isCapturing).toBe(true);

      // Fast-forward timer
      await act(async () => {
        jest.advanceTimersByTime(3000);
      });

      const photoUrl = await act(async () => await capturePromise!);

      expect(photoUrl).toBe("data:image/jpeg;base64,mockphoto");
      expect(result.current.cameraState.isCapturing).toBe(false);

      jest.useRealTimers();
    });

    it("handles takePhoto failure", async () => {
      const { result } = renderHook(() => useCamera());

      // Initialize camera
      await act(async () => {
        await result.current.initializeCamera();
      });

      // Set camera ref with failing takePhoto
      act(() => {
        result.current.cameraRef.current = {
          ...mockCameraRef,
          takePhoto: jest.fn().mockReturnValue(null),
        };
      });

      const photoUrl = await act(async () => {
        return await result.current.capturePhoto();
      });

      expect(photoUrl).toBeNull();
      expect(result.current.cameraState.error).toBe("Failed to capture photo");
      expect(result.current.cameraState.isCapturing).toBe(false);
    });

    it("handles errors during capture", async () => {
      const error = new Error("Camera malfunction");
      mockCameraUtils.createCameraError.mockReturnValue({
        type: "hardware",
        message: "Camera hardware error",
        code: "HARDWARE_ERROR",
        details: error,
      });

      const { result } = renderHook(() => useCamera());

      // Initialize camera
      await act(async () => {
        await result.current.initializeCamera();
      });

      // Set camera ref with throwing takePhoto
      act(() => {
        result.current.cameraRef.current = {
          ...mockCameraRef,
          takePhoto: jest.fn().mockImplementation(() => {
            throw error;
          }),
        };
      });

      const photoUrl = await act(async () => {
        return await result.current.capturePhoto();
      });

      expect(photoUrl).toBeNull();
      expect(result.current.cameraState.error).toBe("Camera hardware error");
      expect(result.current.cameraState.isCapturing).toBe(false);
    });
  });

  describe("switchCamera", () => {
    it("switches camera successfully", async () => {
      const { result } = renderHook(() => useCamera());

      // Initialize camera with multiple cameras
      await act(async () => {
        await result.current.initializeCamera();
      });

      // Set camera ref
      act(() => {
        result.current.cameraRef.current = mockCameraRef;
      });

      await act(async () => {
        await result.current.switchCamera();
      });

      expect(mockCameraRef.switchCamera).toHaveBeenCalled();
      expect(result.current.cameraState.facingMode).toBe("environment");
    });

    it("does nothing when only one camera", async () => {
      mockCameraUtils.getAvailableCameras.mockResolvedValue([
        { deviceId: "camera1", label: "Camera", kind: "videoinput", groupId: "g1" } as MediaDeviceInfo,
      ]);

      const { result } = renderHook(() => useCamera());

      // Initialize camera with single camera
      await act(async () => {
        await result.current.initializeCamera();
      });

      // Set camera ref
      act(() => {
        result.current.cameraRef.current = mockCameraRef;
      });

      await act(async () => {
        await result.current.switchCamera();
      });

      expect(mockCameraRef.switchCamera).not.toHaveBeenCalled();
    });

    it("does nothing when cameraRef is null", async () => {
      const { result } = renderHook(() => useCamera());

      await act(async () => {
        await result.current.switchCamera();
      });

      expect(mockCameraRef.switchCamera).not.toHaveBeenCalled();
    });

    it("handles switch camera error", async () => {
      const error = new Error("Switch failed");
      mockCameraRef.switchCamera.mockImplementation(() => {
        throw error;
      });
      mockCameraUtils.createCameraError.mockReturnValue({
        type: "hardware",
        message: "Failed to switch camera",
        code: "SWITCH_ERROR",
        details: error,
      });

      const { result } = renderHook(() => useCamera());

      // Initialize camera
      await act(async () => {
        await result.current.initializeCamera();
      });

      // Set camera ref
      act(() => {
        result.current.cameraRef.current = mockCameraRef;
      });

      await act(async () => {
        await result.current.switchCamera();
      });

      expect(result.current.cameraState.error).toBe("Failed to switch camera");
    });
  });

  describe("toggleFlash", () => {
    it("cycles through flash modes", () => {
      const { result } = renderHook(() => useCamera());

      // Initial state is "off"
      expect(result.current.cameraState.flashMode).toBe("off");

      // Toggle to "on"
      act(() => {
        result.current.toggleFlash();
      });
      expect(result.current.cameraState.flashMode).toBe("on");

      // Toggle to "auto"
      act(() => {
        result.current.toggleFlash();
      });
      expect(result.current.cameraState.flashMode).toBe("auto");

      // Toggle back to "off"
      act(() => {
        result.current.toggleFlash();
      });
      expect(result.current.cameraState.flashMode).toBe("off");
    });
  });

  describe("toggleGrid", () => {
    it("toggles grid display", () => {
      const { result } = renderHook(() => useCamera());

      // Initial state is true
      expect(result.current.cameraState.showGrid).toBe(true);

      // Toggle to false
      act(() => {
        result.current.toggleGrid();
      });
      expect(result.current.cameraState.showGrid).toBe(false);

      // Toggle back to true
      act(() => {
        result.current.toggleGrid();
      });
      expect(result.current.cameraState.showGrid).toBe(true);
    });
  });

  describe("setTimer", () => {
    it("sets timer value", () => {
      const { result } = renderHook(() => useCamera());

      act(() => {
        result.current.setTimer(5);
      });
      expect(result.current.cameraState.timer).toBe(5);

      act(() => {
        result.current.setTimer(null);
      });
      expect(result.current.cameraState.timer).toBeNull();
    });
  });

  describe("setFacingMode", () => {
    it("sets facing mode", () => {
      const { result } = renderHook(() => useCamera());

      act(() => {
        result.current.setFacingMode("environment");
      });
      expect(result.current.cameraState.facingMode).toBe("environment");

      act(() => {
        result.current.setFacingMode("user");
      });
      expect(result.current.cameraState.facingMode).toBe("user");
    });
  });

  describe("stopCamera", () => {
    it("stops camera and resets state", async () => {
      const { result } = renderHook(() => useCamera());

      // Initialize camera first
      await act(async () => {
        await result.current.initializeCamera();
      });

      // Stop camera
      act(() => {
        result.current.stopCamera();
      });

      expect(result.current.cameraState.isActive).toBe(false);
      expect(result.current.cameraState.isCapturing).toBe(false);
      expect(result.current.cameraState.error).toBeNull();
    });
  });

  describe("clearError", () => {
    it("clears error state", async () => {
      const { result } = renderHook(() => useCamera());

      // Set an error first
      mockCameraUtils.isSecureContext.mockReturnValue(false);
      await act(async () => {
        await result.current.initializeCamera();
      });

      expect(result.current.cameraState.error).not.toBeNull();

      // Clear error
      act(() => {
        result.current.clearError();
      });

      expect(result.current.cameraState.error).toBeNull();
    });
  });

  describe("retryCamera", () => {
    it("clears error and reinitializes camera", async () => {
      const { result } = renderHook(() => useCamera());

      // Fail first attempt
      mockCameraUtils.requestCameraPermission.mockResolvedValueOnce({
        granted: false,
      });

      await act(async () => {
        await result.current.initializeCamera();
      });

      expect(result.current.cameraState.error).not.toBeNull();
      expect(result.current.cameraState.isActive).toBe(false);

      // Fix the issue for retry
      mockCameraUtils.requestCameraPermission.mockResolvedValueOnce({
        granted: true,
      });

      // Retry
      await act(async () => {
        await result.current.retryCamera();
      });

      expect(result.current.cameraState.error).toBeNull();
      expect(result.current.cameraState.isActive).toBe(true);
    });
  });

  describe("cleanup on unmount", () => {
    it("stops camera when component unmounts", async () => {
      const { result, unmount } = renderHook(() => useCamera());

      // Initialize camera
      await act(async () => {
        await result.current.initializeCamera();
      });

      expect(result.current.cameraState.isActive).toBe(true);

      // Unmount
      unmount();

      // The state won't be accessible after unmount, but stopCamera should have been called
      // We can verify this by checking that the effect cleanup ran
    });
  });
});