import React, { useEffect, useState, useCallback, memo } from 'react';
import { Camera } from 'react-camera-pro';
import type { CameraControlsProps } from '../../types/camera.types';
import { useCamera } from './hooks/useCamera';
import styles from './Camera.module.css';

interface CameraInterfaceProps {
  onPhotoCapture: (dataUrl: string) => Promise<void>
  onError: (error: string) => void
  className?: string
}

const CameraControls: React.FC<CameraControlsProps> = ({
  onCapture,
  onSwitchCamera,
  onToggleFlash,
  onToggleGrid,
  onSetTimer,
  cameraState,
  disabled = false,
}) => {
  const [isCountingDown, setIsCountingDown] = useState(false);
  const [countdown, setCountdown] = useState(0);

  const handleCapture = useCallback(async () => {
    if (disabled || isCountingDown) return;

    if (cameraState.timer) {
      setIsCountingDown(true);
      setCountdown(cameraState.timer);

      // Start countdown
      const interval = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            clearInterval(interval);
            setIsCountingDown(false);
            onCapture();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      onCapture();
    }
  }, [disabled, isCountingDown, cameraState.timer, onCapture]);

  const handleTimerClick = useCallback(() => {
    const timerOptions = [null, 3, 5, 10];
    const currentIndex = timerOptions.indexOf(cameraState.timer);
    const nextIndex = (currentIndex + 1) % timerOptions.length;
    onSetTimer(timerOptions[nextIndex]);
  }, [cameraState.timer, onSetTimer]);

  return (
    <div className="camera-controls">
      {/* Timer Display */}
      {isCountingDown && (
        <div className="camera-countdown">
          <div className="countdown-circle">
            <span className="countdown-number">{countdown}</span>
          </div>
        </div>
      )}

      {/* Bottom Controls */}
      <div className="camera-controls-bottom">
        {/* Flash Toggle */}
        <button
          className={`camera-control-btn flash-btn ${cameraState.flashMode !== 'off' ? 'active' : ''}`}
          onClick={onToggleFlash}
          disabled={disabled}
          title={`Flash: ${cameraState.flashMode}`}
        >
          <span className={styles.cameraControlIcon}>
            {cameraState.flashMode === 'off' ? '🔦' :
              cameraState.flashMode === 'on' ? '⚡' : '🔄'}
          </span>
        </button>

        {/* Capture Button */}
        <button
          className={`camera-capture-btn ${cameraState.isCapturing || isCountingDown ? 'capturing' : ''}`}
          onClick={handleCapture}
          disabled={disabled || cameraState.isCapturing || isCountingDown}
          title="Take Photo"
        >
          <div className="capture-btn-inner">
            {cameraState.isCapturing ? (
              <div className="capture-spinner" />
            ) : (
              <div className="capture-btn-ring" />
            )}
          </div>
        </button>

        {/* Camera Switch */}
        <button
          className={`camera-control-btn switch-btn ${cameraState.numberOfCameras <= 1 ? 'disabled' : ''}`}
          onClick={onSwitchCamera}
          disabled={disabled || cameraState.numberOfCameras <= 1}
          title="Switch Camera"
        >
          <span className={styles.cameraControlIcon}>🔄</span>
        </button>
      </div>

      {/* Top Controls */}
      <div className="camera-controls-top">
        {/* Timer Button */}
        <button
          className={`camera-control-btn timer-btn ${cameraState.timer ? 'active' : ''}`}
          onClick={handleTimerClick}
          disabled={disabled || isCountingDown}
          title={`Timer: ${cameraState.timer ? `${cameraState.timer}s` : 'Off'}`}
        >
          <span className={styles.cameraControlIcon}>
            {cameraState.timer ? `⏱️${cameraState.timer}` : '⏱️'}
          </span>
        </button>

        {/* Grid Toggle */}
        <button
          className={`camera-control-btn grid-btn ${cameraState.showGrid ? 'active' : ''}`}
          onClick={onToggleGrid}
          disabled={disabled}
          title="Toggle Grid"
        >
          <span className={styles.cameraControlIcon}>⚏</span>
        </button>
      </div>
    </div>
  );
};

export const CameraInterface = memo(function CameraInterface({
  onPhotoCapture,
  onError,
  className = '',
}: CameraInterfaceProps) {
  const {
    cameraRef,
    cameraState,
    initializeCamera,
    capturePhoto,
    switchCamera,
    toggleFlash,
    toggleGrid,
    setTimer,
    retryCamera,
  } = useCamera();

  const [isInitialized, setIsInitialized] = useState(false);

  // Initialize camera on mount
  useEffect(() => {
    let isMounted = true;

    const init = async () => {
      await initializeCamera();
      if (isMounted) {
        setIsInitialized(true);
      }
    };

    init();

    return () => {
      isMounted = false;
    };
  }, [initializeCamera]);

  // Handle camera errors
  useEffect(() => {
    if (cameraState.error) {
      onError(cameraState.error || 'Unknown camera error');
    }
  }, [cameraState.error, onError]);

  const handleCapture = useCallback(async () => {
    try {
      const dataUrl = await capturePhoto();
      if (dataUrl) {
        await onPhotoCapture(dataUrl);
      }
    } catch (_error) {
      onError('Failed to capture photo');
    }
  }, [capturePhoto, onPhotoCapture, onError]);

  const handleNumberOfCameras = useCallback((_numberOfCameras: number) => {
    // This callback is called by react-camera-pro
    // We don't need to do anything here as the camera state is managed by useCamera
  }, []);

  if (!isInitialized) {
    return (
      <div className={`camera-interface loading ${className}`}>
        <div className="camera-loading">
          <div className="loading-spinner" />
          <p>Initializing camera...</p>
        </div>
      </div>
    );
  }

  if (cameraState.error) {
    return (
      <div className={`camera-interface error ${className}`}>
        <div className="camera-error">
          <div className="error-icon">📷</div>
          <h3>Camera Error</h3>
          <p>{cameraState.error || 'Unknown camera error'}</p>
          <button
            className="retry-btn"
            onClick={retryCamera}
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!cameraState.hasPermission) {
    return (
      <div className={`camera-interface permission ${className}`}>
        <div className="camera-permission">
          <div className="permission-icon">🔐</div>
          <h3>Camera Permission Required</h3>
          <p>Please allow camera access to take photos</p>
          <button
            className="permission-btn"
            onClick={initializeCamera}
          >
            Enable Camera
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`camera-interface active ${className}`}>
      <div className="camera-viewport">
        <Camera
          ref={cameraRef}
          facingMode={cameraState.facingMode}
          aspectRatio="cover"
          numberOfCamerasCallback={handleNumberOfCameras}
          errorMessages={{
            noCameraAccessible: 'No camera found. Please connect a camera.',
            permissionDenied: 'Camera permission denied. Please allow camera access.',
            switchCamera: 'Cannot switch camera. Only one camera available.',
            canvas: 'Canvas not supported in this browser.',
          }}
        />

        {/* Grid Overlay */}
        {cameraState.showGrid && (
          <div className="camera-grid">
            <div className="grid-line grid-line-vertical" style={{ left: '33.33%' }} />
            <div className="grid-line grid-line-vertical" style={{ left: '66.67%' }} />
            <div className="grid-line grid-line-horizontal" style={{ top: '33.33%' }} />
            <div className="grid-line grid-line-horizontal" style={{ top: '66.67%' }} />
          </div>
        )}
      </div>

      <CameraControls
        onCapture={handleCapture}
        onSwitchCamera={switchCamera}
        onToggleFlash={toggleFlash}
        onToggleGrid={toggleGrid}
        onSetTimer={setTimer}
        cameraState={cameraState}
        disabled={cameraState.isCapturing}
      />
    </div>
  );
});
