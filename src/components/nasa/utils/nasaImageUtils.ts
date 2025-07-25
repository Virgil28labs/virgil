import type { ApodImage } from '../../../types/nasa.types';
import type { MouseEvent, SyntheticEvent } from 'react';
import { downloadImage } from '../../../utils/downloadUtils';
import { logger } from '../../../lib/logger';
import { timeService } from '../../../services/TimeService';

// Common event handler for stopping propagation
export const stopEvent = (e: MouseEvent | SyntheticEvent) => {
  e.preventDefault();
  e.stopPropagation();
};

// Download APOD image utility
export const downloadApodImage = async (
  apod: ApodImage, 
  quality: 'standard' | 'hd' = 'standard',
): Promise<void> => {
  // Choose URL based on quality preference and availability
  const imageUrl = quality === 'hd' && apod.hdImageUrl 
    ? apod.hdImageUrl 
    : apod.imageUrl;

  // For videos, we can't download directly - open in new tab
  if (apod.mediaType === 'video') {
    window.open(imageUrl, '_blank');
    return;
  }

  try {
    await downloadImage({
      url: imageUrl,
      title: apod.title,
      date: apod.date,
    }, 'nasa-apod');
  } catch (_error) {
    // If download fails, open image in new tab as fallback
    window.open(imageUrl, '_blank');
  }
};

// Copy APOD image to clipboard
export const copyApodToClipboard = async (apod: ApodImage): Promise<boolean> => {
  try {
    // For videos, copy the URL
    if (apod.mediaType === 'video') {
      await navigator.clipboard.writeText(apod.imageUrl);
      return false; // Indicates URL was copied, not image
    }

    // Try to copy the image itself
    const img = new Image();
    img.crossOrigin = 'anonymous';
    
    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = reject;
      img.src = apod.imageUrl;
    });
    
    const canvas = document.createElement('canvas');
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Could not get canvas context');
    
    ctx.drawImage(img, 0, 0);
    
    // Convert to blob
    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (blob) resolve(blob);
        else reject(new Error('Failed to create blob'));
      }, 'image/png');
    });
    
    // Try to copy image
    if (navigator.clipboard && window.ClipboardItem) {
      await navigator.clipboard.write([
        new ClipboardItem({
          'image/png': blob,
        }),
      ]);
      return true; // Image copied successfully
    } else {
      // Fallback to URL copy
      await navigator.clipboard.writeText(apod.imageUrl);
      return false; // URL copied instead
    }
  } catch (_error) {
    // Final fallback - copy URL
    await navigator.clipboard.writeText(apod.imageUrl);
    return false; // URL copied instead
  }
};

// Share APOD using Web Share API
export const shareApod = async (apod: ApodImage): Promise<boolean> => {
  const shareData = {
    title: `NASA APOD: ${apod.title}`,
    text: `Check out today's NASA Astronomy Picture of the Day: "${apod.title}" from ${timeService.formatDateToLocal(apod.date)}`,
    url: `https://apod.nasa.gov/apod/ap${apod.date.substring(2).replace(/-/g, '')}.html`,
  };

  try {
    if (navigator.share && navigator.canShare && navigator.canShare(shareData)) {
      await navigator.share(shareData);
      return true;
    }
  } catch (_error) {
    // User cancelled or error occurred
    logger.error('Share failed', _error as Error, {
      component: 'nasaImageUtils',
      action: 'shareApod',
      metadata: { apodTitle: apod.title },
    });
  }

  // Fallback: copy share text to clipboard
  const shareText = `${shareData.title}\n${shareData.text}\n${shareData.url}`;
  await navigator.clipboard.writeText(shareText);
  return false; // Indicates fallback was used
};

// Copy APOD URL to clipboard
export const copyApodUrl = async (apod: ApodImage): Promise<void> => {
  const apodUrl = `https://apod.nasa.gov/apod/ap${apod.date.substring(2).replace(/-/g, '')}.html`;
  await navigator.clipboard.writeText(apodUrl);
};