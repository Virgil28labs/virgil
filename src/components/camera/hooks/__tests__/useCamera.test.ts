/**
 * useCamera Hook Test Suite
 * 
 * Tests camera state management, permission handling, photo capture,
 * camera switching, and error scenarios. Critical hook for camera functionality.
 */

import { renderHook, act } from '@testing-library/react';
import { useCamera } from '../useCamera';
import { CameraUtils } from '../../utils/cameraUtils';

// Mock CameraUtils
jest.mock('../../utils/cameraUtils', () => ({
  CameraUtils: {
    isSecureContext: jest.fn(),
    isCameraSupported: jest.fn(),
    requestCameraPermission: jest.fn(),
    getAvailableCameras: jest.fn(),
    createCameraError: jest.fn(),
  },
}));

const mockCameraUtils = CameraUtils as jest.Mocked<typeof CameraUtils>;

// Mock camera ref
const mockCameraRef = {
  takePhoto: jest.fn(),
  switchCamera: jest.fn(),
};

describe('useCamera', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Default mock implementations
    mockCameraUtils.isSecureContext.mockReturnValue(true);
    mockCameraUtils.isCameraSupported.mockReturnValue(true);
    mockCameraUtils.requestCameraPermission.mockResolvedValue({ granted: true });
    mockCameraUtils.getAvailableCameras.mockResolvedValue([
      { deviceId: 'camera1', kind: 'videoinput', label: 'Front Camera', groupId: '' },
      { deviceId: 'camera2', kind: 'videoinput', label: 'Back Camera', groupId: '' },
    ] as MediaDeviceInfo[]);
    mockCameraUtils.createCameraError.mockReturnValue({
      type: 'browser',
      message: 'Test error',
      code: 'TEST_ERROR',
    });
  });

  describe('initial state', () => {
    it('should have correct initial state', () => {
      const { result } = renderHook(() => useCamera());

      expect(result.current.cameraState).toEqual({
        isActive: false,
        isCapturing: false,
        hasPermission: false,
        error: null,
        facingMode: 'user',
        numberOfCameras: 0,
        showGrid: true,
        timer: null,
        flashMode: 'off',
      });
    });

    it('should provide all necessary methods', () => {
      const { result } = renderHook(() => useCamera());

      expect(result.current).toHaveProperty('cameraRef');
      expect(result.current).toHaveProperty('cameraState');
      expect(result.current).toHaveProperty('initializeCamera');
      expect(result.current).toHaveProperty('capturePhoto');
      expect(result.current).toHaveProperty('switchCamera');
      expect(result.current).toHaveProperty('toggleFlash');
      expect(result.current).toHaveProperty('toggleGrid');
      expect(result.current).toHaveProperty('setTimer');
      expect(result.current).toHaveProperty('setFacingMode');
      expect(result.current).toHaveProperty('stopCamera');
      expect(result.current).toHaveProperty('clearError');
      expect(result.current).toHaveProperty('retryCamera');
    });
  });

  describe('initializeCamera', () => {
    it('should successfully initialize camera with permissions', async () => {
      const { result } = renderHook(() => useCamera());

      await act(async () => {
        await result.current.initializeCamera();
      });

      expect(mockCameraUtils.isSecureContext).toHaveBeenCalled();
      expect(mockCameraUtils.isCameraSupported).toHaveBeenCalled();
      expect(mockCameraUtils.requestCameraPermission).toHaveBeenCalled();
      expect(mockCameraUtils.getAvailableCameras).toHaveBeenCalled();

      expect(result.current.cameraState).toEqual(
        expect.objectContaining({
          isActive: true,
          hasPermission: true,
          numberOfCameras: 2,
          error: null,
        }),
      );
    });

    it('should handle insecure context error', async () => {
      mockCameraUtils.isSecureContext.mockReturnValue(false);
      const { result } = renderHook(() => useCamera());

      await act(async () => {
        await result.current.initializeCamera();
      });

      expect(result.current.cameraState).toEqual(
        expect.objectContaining({
          isActive: false,
          hasPermission: false,
          error: 'Test error',
        }),
      );
    });

    it('should handle unsupported camera error', async () => {
      mockCameraUtils.isCameraSupported.mockReturnValue(false);
      const { result } = renderHook(() => useCamera());

      await act(async () => {
        await result.current.initializeCamera();
      });

      expect(result.current.cameraState).toEqual(
        expect.objectContaining({
          isActive: false,
          hasPermission: false,
          error: 'Test error',
        }),
      );
    });

    it('should handle permission denied', async () => {
      mockCameraUtils.requestCameraPermission.mockResolvedValue({
        granted: false,
        error: {
          type: 'permission',
          message: 'Permission denied',
          code: 'PERMISSION_DENIED',
        },
      });

      const { result } = renderHook(() => useCamera());

      await act(async () => {
        await result.current.initializeCamera();
      });

      expect(result.current.cameraState).toEqual(
        expect.objectContaining({
          isActive: false,
          hasPermission: false,
          error: 'Permission denied',
        }),
      );
    });

    it('should handle permission denied without error details', async () => {
      mockCameraUtils.requestCameraPermission.mockResolvedValue({
        granted: false,
      });

      const { result } = renderHook(() => useCamera());

      await act(async () => {
        await result.current.initializeCamera();
      });

      expect(result.current.cameraState).toEqual(
        expect.objectContaining({
          isActive: false,
          hasPermission: false,
          error: 'Permission denied',
        }),
      );
    });

    it('should handle initialization errors', async () => {
      mockCameraUtils.requestCameraPermission.mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(() => useCamera());

      await act(async () => {
        await result.current.initializeCamera();
      });

      expect(result.current.cameraState).toEqual(
        expect.objectContaining({
          isActive: false,
          hasPermission: false,
          error: 'Test error',
        }),
      );
    });
  });

  describe('capturePhoto', () => {
    beforeEach(() => {
      // Set up camera ref mock
      mockCameraRef.takePhoto.mockReturnValue('data:image/jpeg;base64,test');
    });

    it('should capture photo successfully', async () => {
      const { result } = renderHook(() => useCamera());
      
      // Initialize camera first
      await act(async () => {
        await result.current.initializeCamera();
      });

      // Set camera ref
      result.current.cameraRef.current = mockCameraRef;

      let capturedPhoto: string | null = null;
      await act(async () => {
        capturedPhoto = await result.current.capturePhoto();
      });

      expect(mockCameraRef.takePhoto).toHaveBeenCalled();
      expect(capturedPhoto).toBe('data:image/jpeg;base64,test');
    });

    it('should return null if camera is not active', async () => {
      const { result } = renderHook(() => useCamera());

      let capturedPhoto: string | null = null;
      await act(async () => {
        capturedPhoto = await result.current.capturePhoto();
      });

      expect(capturedPhoto).toBeNull();
      expect(mockCameraRef.takePhoto).not.toHaveBeenCalled();
    });

    it('should return null if camera ref is not available', async () => {
      const { result } = renderHook(() => useCamera());
      
      // Initialize camera but don't set ref
      await act(async () => {
        await result.current.initializeCamera();
      });

      let capturedPhoto: string | null = null;
      await act(async () => {
        capturedPhoto = await result.current.capturePhoto();
      });

      expect(capturedPhoto).toBeNull();
    });

    it('should handle timer delay', async () => {
      const { result } = renderHook(() => useCamera());
      
      // Initialize camera and set timer
      await act(async () => {
        await result.current.initializeCamera();
        result.current.setTimer(1); // 1 second timer
      });

      result.current.cameraRef.current = mockCameraRef;

      const startTime = Date.now();
      let capturedPhoto: string | null = null;
      
      await act(async () => {
        capturedPhoto = await result.current.capturePhoto();
      });

      const endTime = Date.now();
      const elapsed = endTime - startTime;

      expect(elapsed).toBeGreaterThanOrEqual(1000); // Should wait at least 1 second
      expect(capturedPhoto).toBe('data:image/jpeg;base64,test');
    });

    it('should handle capture errors', async () => {
      const { result } = renderHook(() => useCamera());
      
      await act(async () => {
        await result.current.initializeCamera();
      });

      // Mock takePhoto to throw error
      mockCameraRef.takePhoto.mockImplementation(() => {
        throw new Error('Capture failed');
      });
      result.current.cameraRef.current = mockCameraRef;

      let capturedPhoto: string | null = null;
      await act(async () => {
        capturedPhoto = await result.current.capturePhoto();
      });

      expect(capturedPhoto).toBeNull();
      expect(result.current.cameraState.error).toBe('Test error');
    });

    it('should handle empty photo data', async () => {
      const { result } = renderHook(() => useCamera());
      
      await act(async () => {
        await result.current.initializeCamera();
      });

      mockCameraRef.takePhoto.mockReturnValue('');
      result.current.cameraRef.current = mockCameraRef;

      let capturedPhoto: string | null = null;
      await act(async () => {
        capturedPhoto = await result.current.capturePhoto();
      });

      expect(capturedPhoto).toBeNull();
      expect(result.current.cameraState.error).toBe('Test error');
    });

    it('should set capturing state during capture', async () => {
      const { result } = renderHook(() => useCamera());
      
      await act(async () => {
        await result.current.initializeCamera();
      });

      result.current.cameraRef.current = mockCameraRef;

      // Start capture (don't await to check intermediate state)
      const capturePromise = act(async () => {
        return result.current.capturePhoto();
      });

      // Check that capturing state is set
      expect(result.current.cameraState.isCapturing).toBe(true);

      await capturePromise;

      expect(result.current.cameraState.isCapturing).toBe(false);
    });
  });

  describe('switchCamera', () => {
    it('should switch camera successfully', async () => {
      const { result } = renderHook(() => useCamera());
      
      await act(async () => {
        await result.current.initializeCamera();
      });

      mockCameraRef.switchCamera.mockReturnValue('environment');
      result.current.cameraRef.current = mockCameraRef;

      await act(async () => {
        await result.current.switchCamera();
      });

      expect(mockCameraRef.switchCamera).toHaveBeenCalled();
      expect(result.current.cameraState.facingMode).toBe('environment');
    });

    it('should not switch if no camera ref', async () => {
      const { result } = renderHook(() => useCamera());

      await act(async () => {
        await result.current.switchCamera();
      });

      expect(mockCameraRef.switchCamera).not.toHaveBeenCalled();
    });

    it('should not switch if only one camera', async () => {
      mockCameraUtils.getAvailableCameras.mockResolvedValue([
        { deviceId: 'camera1', kind: 'videoinput', label: 'Front Camera', groupId: '' },
      ] as MediaDeviceInfo[]);

      const { result } = renderHook(() => useCamera());
      
      await act(async () => {
        await result.current.initializeCamera();
      });

      result.current.cameraRef.current = mockCameraRef;

      await act(async () => {
        await result.current.switchCamera();
      });

      expect(mockCameraRef.switchCamera).not.toHaveBeenCalled();
    });

    it('should handle switch camera errors', async () => {
      const { result } = renderHook(() => useCamera());
      
      await act(async () => {
        await result.current.initializeCamera();
      });

      mockCameraRef.switchCamera.mockImplementation(() => {
        throw new Error('Switch failed');
      });
      result.current.cameraRef.current = mockCameraRef;

      await act(async () => {
        await result.current.switchCamera();
      });

      expect(result.current.cameraState.error).toBe('Test error');
    });
  });

  describe('flash controls', () => {
    it('should toggle flash modes in sequence', () => {
      const { result } = renderHook(() => useCamera());

      // Initial state is 'off'
      expect(result.current.cameraState.flashMode).toBe('off');

      act(() => {
        result.current.toggleFlash();
      });
      expect(result.current.cameraState.flashMode).toBe('on');

      act(() => {
        result.current.toggleFlash();
      });
      expect(result.current.cameraState.flashMode).toBe('auto');

      act(() => {
        result.current.toggleFlash();
      });
      expect(result.current.cameraState.flashMode).toBe('off');
    });
  });

  describe('grid controls', () => {
    it('should toggle grid visibility', () => {
      const { result } = renderHook(() => useCamera());

      // Initial state is true
      expect(result.current.cameraState.showGrid).toBe(true);

      act(() => {
        result.current.toggleGrid();
      });
      expect(result.current.cameraState.showGrid).toBe(false);

      act(() => {
        result.current.toggleGrid();
      });
      expect(result.current.cameraState.showGrid).toBe(true);
    });
  });

  describe('timer controls', () => {
    it('should set timer value', () => {
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

  describe('facing mode controls', () => {
    it('should set facing mode', () => {
      const { result } = renderHook(() => useCamera());

      act(() => {
        result.current.setFacingMode('environment');
      });
      expect(result.current.cameraState.facingMode).toBe('environment');

      act(() => {
        result.current.setFacingMode('user');
      });
      expect(result.current.cameraState.facingMode).toBe('user');
    });
  });

  describe('camera controls', () => {
    it('should stop camera', () => {
      const { result } = renderHook(() => useCamera());

      // First initialize camera
      act(async () => {
        await result.current.initializeCamera();
      });

      act(() => {
        result.current.stopCamera();
      });

      expect(result.current.cameraState).toEqual(
        expect.objectContaining({
          isActive: false,
          isCapturing: false,
          error: null,
        }),
      );
    });

    it('should clear error', () => {
      const { result } = renderHook(() => useCamera());

      // Set error state
      act(() => {
        result.current.cameraState.error = 'Test error';
      });

      act(() => {
        result.current.clearError();
      });

      expect(result.current.cameraState.error).toBeNull();
    });

    it('should retry camera initialization', async () => {
      const { result } = renderHook(() => useCamera());

      await act(async () => {
        await result.current.retryCamera();
      });

      expect(mockCameraUtils.requestCameraPermission).toHaveBeenCalled();
      expect(result.current.cameraState.error).toBeNull();
    });
  });

  describe('cleanup', () => {
    it('should stop camera on unmount', () => {
      const { result, unmount } = renderHook(() => useCamera());

      // Initialize camera first
      act(async () => {
        await result.current.initializeCamera();
      });

      expect(result.current.cameraState.isActive).toBe(true);

      unmount();

      // Note: We can't test the cleanup directly since the component is unmounted
      // but the effect should call stopCamera()
    });
  });
});