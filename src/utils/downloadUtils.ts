/**
 * Shared utility functions for downloading images across different components
 */

import { logger } from '../lib/logger';
import { dashboardContextService } from '../services/DashboardContextService';

export interface DownloadableImage {
  url: string;
  title?: string;
  date?: string;
  description?: string;
}

/**
 * Downloads an image from a URL with proper filename
 * @param image - The image object containing URL and metadata
 * @param filenamePrefix - Prefix for the downloaded file (e.g., 'nasa-apod', 'dog', 'giphy')
 */
export async function downloadImage(image: DownloadableImage, filenamePrefix: string): Promise<void> {
  try {
    // Fetch the image
    const response = await fetch(image.url);
    const blob = await response.blob();

    // Create object URL
    const blobUrl = URL.createObjectURL(blob);

    // Generate filename
    const extension = image.url.split('.').pop()?.split('?')[0] || 'jpg';
    const safeTitle = image.title?.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase() || 'image';
    const dateStr = image.date || dashboardContextService.getLocalDate();
    const filename = `${filenamePrefix}-${dateStr}-${safeTitle}.${extension}`;

    // Create download link
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = filename;

    // Trigger download
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Cleanup
    URL.revokeObjectURL(blobUrl);
  } catch (error) {
    logger.error('Failed to download image', error as Error, {
      component: 'downloadUtils',
      action: 'downloadImage',
      metadata: { imageUrl: image.url, title: image.title },
    });
    throw new Error('Failed to download image. Please try again.');
  }
}

/**
 * Copies image URL to clipboard
 * @param url - The image URL to copy
 */
export async function copyImageUrl(url: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(url);
  } catch (_error) {
    // Fallback for older browsers
    const textArea = document.createElement('textarea');
    textArea.value = url;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    document.body.appendChild(textArea);
    textArea.select();
    document.execCommand('copy');
    document.body.removeChild(textArea);
  }
}
