import type { SavedPhoto, ExportOptions } from '../../../types/camera.types';
import { CameraUtils } from './cameraUtils';
import { PhotoStorage } from './photoStorage';
import { timeService } from '../../../services/TimeService';

export class PhotoExport {
  static async exportAsJson(photos: SavedPhoto[], options: ExportOptions): Promise<void> {
    try {
      const exportData = await PhotoStorage.exportPhotos(photos);
      const filename = options.filename || `virgil_photos_${timeService.getTimestamp()}.json`;
      
      const blob = new Blob([exportData], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exporting as JSON:', error);
      throw new Error('Failed to export photos as JSON');
    }
  }

  static async exportAsZip(photos: SavedPhoto[], options: ExportOptions): Promise<void> {
    try {
      // For now, we'll create a simple implementation
      // In production, you might want to use a library like JSZip
      const exportData = {
        photos: photos.map(photo => ({
          ...photo,
          dataUrl: options.includeMetadata ? photo.dataUrl : undefined,
        })),
        metadata: options.includeMetadata ? {
          exportDate: timeService.toISOString(),
          totalPhotos: photos.length,
          favoriteCount: photos.filter(p => p.isFavorite).length,
        } : undefined,
      };
      
      const jsonData = JSON.stringify(exportData, null, 2);
      const filename = options.filename || `virgil_photos_${timeService.getTimestamp()}.json`;
      
      const blob = new Blob([jsonData], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exporting as ZIP:', error);
      throw new Error('Failed to export photos as ZIP');
    }
  }

  static async exportSinglePhoto(photo: SavedPhoto): Promise<void> {
    try {
      const filename = photo.name || CameraUtils.generatePhotoName(photo.timestamp);
      await CameraUtils.downloadPhoto(photo.dataUrl, filename);
    } catch (error) {
      console.error('Error exporting single photo:', error);
      throw new Error('Failed to export photo');
    }
  }

  static async exportMultiplePhotos(photos: SavedPhoto[]): Promise<void> {
    try {
      for (const photo of photos) {
        const filename = photo.name || CameraUtils.generatePhotoName(photo.timestamp);
        await CameraUtils.downloadPhoto(photo.dataUrl, filename);
        
        // Add a small delay to avoid overwhelming the browser
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    } catch (error) {
      console.error('Error exporting multiple photos:', error);
      throw new Error('Failed to export photos');
    }
  }

  static async shareSinglePhoto(photo: SavedPhoto): Promise<void> {
    try {
      const filename = photo.name || CameraUtils.generatePhotoName(photo.timestamp);
      await CameraUtils.sharePhoto(photo.dataUrl, filename);
    } catch (error) {
      console.error('Error sharing photo:', error);
      throw new Error('Failed to share photo');
    }
  }

  static async shareMultiplePhotos(photos: SavedPhoto[]): Promise<void> {
    if (!navigator.share) {
      throw new Error('Web Share API not supported');
    }

    try {
      const files: File[] = [];
      
      for (const photo of photos) {
        const response = await fetch(photo.dataUrl);
        const blob = await response.blob();
        const filename = photo.name || CameraUtils.generatePhotoName(photo.timestamp);
        const file = new File([blob], filename, { type: 'image/jpeg' });
        files.push(file);
      }

      await navigator.share({
        files,
        title: `${photos.length} photos from Virgil Camera`,
        text: 'Check out these photos I took!',
      });
    } catch (error) {
      console.error('Error sharing multiple photos:', error);
      throw new Error('Failed to share photos');
    }
  }

  static async importFromJson(jsonData: string): Promise<number> {
    try {
      return await PhotoStorage.importPhotos(jsonData);
    } catch (error) {
      console.error('Error importing from JSON:', error);
      throw new Error('Failed to import photos from JSON');
    }
  }

  static async importFromFile(file: File): Promise<number> {
    try {
      const text = await file.text();
      return await this.importFromJson(text);
    } catch (error) {
      console.error('Error importing from file:', error);
      throw new Error('Failed to import photos from file');
    }
  }

  static validateExportOptions(options: Partial<ExportOptions>): ExportOptions {
    return {
      format: options.format || 'json',
      includeMetadata: options.includeMetadata ?? true,
      compressionLevel: options.compressionLevel || 'medium',
      filename: options.filename || undefined,
    };
  }

  static async getExportPreview(photos: SavedPhoto[], options: ExportOptions): Promise<{
    photoCount: number
    totalSize: number
    estimatedFileSize: number
    format: string
  }> {
    try {
      const totalSize = photos.reduce((sum, photo) => sum + (photo.size || 0), 0);
      
      // Estimate export file size based on format and options
      let estimatedFileSize = totalSize;
      
      if (options.format === 'json') {
        // JSON adds metadata overhead
        estimatedFileSize = Math.round(totalSize * 1.1);
      } else if (options.format === 'zip') {
        // ZIP compression
        const compressionRatio = options.compressionLevel === 'high' ? 0.7 : 
          options.compressionLevel === 'medium' ? 0.8 : 0.9;
        estimatedFileSize = Math.round(totalSize * compressionRatio);
      }
      
      return {
        photoCount: photos.length,
        totalSize,
        estimatedFileSize,
        format: options.format,
      };
    } catch (error) {
      console.error('Error getting export preview:', error);
      throw new Error('Failed to generate export preview');
    }
  }
}