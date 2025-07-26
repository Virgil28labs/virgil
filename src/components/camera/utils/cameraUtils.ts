import type { CameraError, CameraSettings } from '../../../types/camera.types';
import { timeService } from '../../../services/TimeService';
import { logger } from '../../../lib/logger';

export class CameraUtils {
  static async checkCameraPermission(): Promise<boolean> {
    try {
      const result = await navigator.permissions.query({ name: 'camera' as PermissionName });
      return result.state === 'granted';
    } catch (_error) {
      logger.warn('Permission API not supported, checking via getUserMedia', {
        component: 'CameraUtils',
        action: 'checkCameraPermission',
      });
      return false;
    }
  }

  static async requestCameraPermission(): Promise<{ granted: boolean; error?: CameraError }> {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      // Stop the stream immediately after permission check
      stream.getTracks().forEach(track => track.stop());
      return { granted: true };
    } catch (error) {
      return {
        granted: false,
        error: this.createCameraError(error),
      };
    }
  }

  static createCameraError(error: unknown): CameraError {
    const errorObj = error as Error;
    const errorName = errorObj?.name || 'Unknown';
    const errorMessage = errorObj?.message || 'Unknown error';

    switch (errorName) {
      case 'NotAllowedError':
        return {
          type: 'permission',
          message: 'Camera permission was denied. Please allow camera access and try again.',
          code: 'PERMISSION_DENIED',
          details: error,
        };
      case 'NotFoundError':
        return {
          type: 'hardware',
          message: 'No camera device found. Please connect a camera and try again.',
          code: 'NO_CAMERA',
          details: error,
        };
      case 'NotReadableError':
        return {
          type: 'hardware',
          message: 'Camera is already in use by another application.',
          code: 'CAMERA_IN_USE',
          details: error,
        };
      case 'OverconstrainedError':
        return {
          type: 'hardware',
          message: 'Camera settings are not supported by your device.',
          code: 'UNSUPPORTED_CONSTRAINTS',
          details: error,
        };
      case 'NotSupportedError':
        return {
          type: 'browser',
          message: 'Camera is not supported in this browser.',
          code: 'BROWSER_NOT_SUPPORTED',
          details: error,
        };
      case 'SecurityError':
        return {
          type: 'browser',
          message: 'Camera access is not allowed on insecure connections. Please use HTTPS.',
          code: 'INSECURE_CONTEXT',
          details: error,
        };
      default:
        return {
          type: 'browser',
          message: `Camera error: ${errorMessage}`,
          code: 'UNKNOWN_ERROR',
          details: error,
        };
    }
  }

  static async getAvailableCameras(): Promise<MediaDeviceInfo[]> {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      return devices.filter(device => device.kind === 'videoinput');
    } catch (_error) {
      logger.error('Error enumerating camera devices', _error instanceof Error ? _error : new Error(String(_error)), {
        component: 'CameraUtils',
        action: 'enumerateCameras',
      });
      return [];
    }
  }

  static generatePhotoId(): string {
    return `photo_${timeService.getTimestamp()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  static compressImage(dataUrl: string, quality: number = 0.8): Promise<string> {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();

      img.onload = () => {
        canvas.width = img.width;
        canvas.height = img.height;
        ctx?.drawImage(img, 0, 0);
        
        const compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
        resolve(compressedDataUrl);
      };

      img.src = dataUrl;
    });
  }

  static getImageDimensions(dataUrl: string): Promise<{ width: number; height: number }> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      
      img.onload = () => {
        resolve({
          width: img.naturalWidth,
          height: img.naturalHeight,
        });
      };
      
      img.onerror = reject;
      img.src = dataUrl;
    });
  }

  static calculateDataUrlSize(dataUrl: string): number {
    // Remove data URL prefix and calculate base64 size
    const base64 = dataUrl.split(',')[1];
    return Math.round((base64.length * 3) / 4);
  }

  static formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  static getOptimalVideoConstraints(facingMode: 'user' | 'environment'): MediaTrackConstraints {
    return {
      facingMode,
      width: { ideal: 1920, max: 1920 },
      height: { ideal: 1080, max: 1080 },
      frameRate: { ideal: 30, max: 30 },
    };
  }

  static isSecureContext(): boolean {
    return window.isSecureContext || location.protocol === 'https:' || location.hostname === 'localhost';
  }

  static isCameraSupported(): boolean {
    return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
  }

  static getDefaultSettings(): CameraSettings {
    return {
      resolution: 'high',
      aspectRatio: 'cover',
      quality: 0.8,
      facingMode: 'user',
      enableFlash: false,
      enableGrid: true,
      enableTimer: false,
      autoSave: true,
      maxPhotos: 100,
    };
  }

  static validateSettings(settings: Partial<CameraSettings>): CameraSettings {
    const defaults = this.getDefaultSettings();
    
    return {
      resolution: settings.resolution || defaults.resolution,
      aspectRatio: settings.aspectRatio || defaults.aspectRatio,
      quality: Math.max(0.1, Math.min(1, settings.quality || defaults.quality)),
      facingMode: settings.facingMode || defaults.facingMode,
      enableFlash: settings.enableFlash ?? defaults.enableFlash,
      enableGrid: settings.enableGrid ?? defaults.enableGrid,
      enableTimer: settings.enableTimer ?? defaults.enableTimer,
      autoSave: settings.autoSave ?? defaults.autoSave,
      maxPhotos: Math.max(1, Math.min(1000, settings.maxPhotos || defaults.maxPhotos)),
    };
  }

  static async downloadPhoto(dataUrl: string, filename: string = 'photo.jpg'): Promise<void> {
    try {
      const link = document.createElement('a');
      link.download = filename;
      link.href = dataUrl;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (_error) {
      logger.error('Error downloading photo', _error instanceof Error ? _error : new Error(String(_error)), {
        component: 'CameraUtils',
        action: 'downloadPhoto',
      });
      throw new Error('Failed to download photo');
    }
  }

  static async sharePhoto(dataUrl: string, filename: string = 'photo.jpg'): Promise<void> {
    if (!navigator.share) {
      throw new Error('Web Share API not supported');
    }

    try {
      // Convert data URL to blob
      const response = await fetch(dataUrl);
      const blob = await response.blob();
      const file = new File([blob], filename, { type: 'image/jpeg' });

      await navigator.share({
        files: [file],
        title: 'Photo from Virgil Camera',
        text: 'Check out this photo I took!',
      });
    } catch (_error) {
      logger.error('Error sharing photo', _error instanceof Error ? _error : new Error(String(_error)), {
        component: 'CameraUtils',
        action: 'sharePhoto',
      });
      throw new Error('Failed to share photo');
    }
  }

  static formatTimestamp(timestamp: number): string {
    const date = timeService.fromTimestamp(timestamp);
    const now = timeService.getCurrentDateTime();
    const diff = now.getTime() - date.getTime(); // eslint-disable-line no-restricted-syntax
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);

    if (days > 0) {
      return `${days} day${days > 1 ? 's' : ''} ago`;
    } else if (hours > 0) {
      return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    } else {
      const minutes = Math.floor(diff / (1000 * 60));
      return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    }
  }

  static generatePhotoName(timestamp: number): string {
    const date = timeService.fromTimestamp(timestamp);
    const year = timeService.getYear(date);
    const month = String(timeService.getMonth(date)).padStart(2, '0');
    const day = String(timeService.getDay(date)).padStart(2, '0');
    const hours = String(timeService.getHours(date)).padStart(2, '0');
    const minutes = String(timeService.getMinutes(date)).padStart(2, '0');
    const seconds = String(timeService.getSeconds(date)).padStart(2, '0');
    
    return `Virgil_${year}${month}${day}_${hours}${minutes}${seconds}.jpg`;
  }
}