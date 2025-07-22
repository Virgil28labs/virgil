/**
 * Shared utility functions for downloading images across different components
 */

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
    const dateStr = image.date || new Date().toISOString().split('T')[0];
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
    console.error('Failed to download image:', error);
    throw new Error('Failed to download image. Please try again.');
  }
}

/**
 * Downloads multiple images as a zip file
 * @param images - Array of images to download
 * @param zipFilename - Name for the zip file
 */
export async function downloadImagesAsZip(_images: DownloadableImage[], _zipFilename: string): Promise<void> {
  // This would require a zip library like JSZip
  // For now, throw an error indicating this feature needs implementation
  throw new Error('Bulk download feature is not yet implemented');
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