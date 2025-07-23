import type { 
  GiphyApiResponse, 
  GiphyGif, 
  GiphyImage, 
  GiphySearchParams, 
  GiphyTrendingParams,
} from '../types/giphy.types';
import { dedupeFetch } from './requestDeduplication';
import { retryWithBackoff } from './retryUtils';

// Environment-configurable API settings
const GIPHY_API_KEY = import.meta.env.VITE_GIPHY_API_KEY;
const GIPHY_API_BASE = import.meta.env.VITE_GIPHY_API_URL || 'https://api.giphy.com/v1';
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

class GiphyService {
  private cache: Map<string, { data: any; timestamp: number }> = new Map();
  private defaultParams = {
    limit: 25,
    rating: 'pg' as const,
    fmt: 'json' as const,
  };

  constructor() {
    if (!GIPHY_API_KEY || GIPHY_API_KEY === 'your_giphy_api_key_here') {
      console.warn('Giphy API key not configured. Please add VITE_GIPHY_API_KEY to your .env file');
    }
  }

  /**
   * Convert Giphy API GIF object to our simplified format
   */
  private transformGiphyGif(gif: GiphyGif): GiphyImage {
    const images = gif.images;
    
    return {
      id: gif.id,
      url: images.fixed_height?.url || images.downsized?.url || gif.url,
      webpUrl: images.fixed_height?.webp || images.downsized?.url || gif.url,
      previewUrl: images.fixed_height_still?.url || images.downsized_still?.url || gif.url,
      originalUrl: images.original?.url || gif.url,
      title: gif.title || 'Untitled GIF',
      rating: gif.rating,
      width: parseInt(images.fixed_height?.width || images.downsized?.width || '0'),
      height: parseInt(images.fixed_height?.height || images.downsized?.height || '0'),
      username: gif.username || undefined,
      user: gif.user,
      source: gif.source || undefined,
      tags: gif.tags,
    };
  }

  /**
   * Make authenticated API request to Giphy
   */
  private async makeGiphyRequest(endpoint: string, params: Record<string, any> = {}): Promise<Response> {
    if (!GIPHY_API_KEY || GIPHY_API_KEY === 'your_giphy_api_key_here') {
      throw new GiphyServiceError('Giphy API key not configured');
    }

    const url = new URL(`${GIPHY_API_BASE}${endpoint}`);
    
    // Add API key and merge with default params
    const allParams = {
      api_key: GIPHY_API_KEY,
      ...this.defaultParams,
      ...params,
    };

    // Add parameters to URL
    Object.entries(allParams).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        url.searchParams.append(key, String(value));
      }
    });

    try {
      const response = await retryWithBackoff(
        async () => {
          const res = await dedupeFetch(url.toString(), {
            method: 'GET',
            headers: {
              'Accept': 'application/json',
              'User-Agent': 'Virgil-App/1.0',
            },
          });

          if (!res.ok) {
            let errorMessage = 'Giphy API request failed';
            try {
              const errorData = await res.json();
              errorMessage = errorData.message || errorData.error || `HTTP ${res.status}`;
            } catch {
              errorMessage = `HTTP ${res.status}: ${res.statusText}`;
            }
            
            throw new GiphyServiceError(errorMessage, res.status);
          }
          
          return res;
        },
        {
          maxRetries: 2,
          initialDelay: 1000,
          onRetry: (attempt, error) => {
            console.warn(`Giphy API retry ${attempt}:`, error.message);
          },
        },
      );

      return response;
    } catch (error) {
      if (error instanceof GiphyServiceError) {
        throw error;
      }
      throw new GiphyServiceError(`Failed to connect to Giphy API: ${error}`);
    }
  }

  /**
   * Search for GIFs by query
   */
  async searchGifs(params: GiphySearchParams): Promise<{ gifs: GiphyImage[]; totalCount: number; hasMore: boolean }> {
    const cacheKey = `search-${JSON.stringify(params)}`;
    
    // Check cache first
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      return cached.data;
    }

    try {
      const response = await this.makeGiphyRequest('/gifs/search', params);
      const data: GiphyApiResponse = await response.json();

      if (!data.data || !Array.isArray(data.data)) {
        throw new GiphyServiceError('Invalid response format from Giphy API');
      }

      const gifs = data.data.map(gif => this.transformGiphyGif(gif));
      const totalCount = data.pagination?.total_count || 0;
      const hasMore = (params.offset || 0) + gifs.length < totalCount;

      const result = { gifs, totalCount, hasMore };

      // Cache the result
      this.cache.set(cacheKey, {
        data: result,
        timestamp: Date.now(),
      });

      return result;
    } catch (error) {
      if (error instanceof GiphyServiceError) {
        throw error;
      }
      throw new GiphyServiceError(`Search failed: ${error}`);
    }
  }

  /**
   * Get trending GIFs
   */
  async getTrendingGifs(params: GiphyTrendingParams = {}): Promise<{ gifs: GiphyImage[]; hasMore: boolean }> {
    const cacheKey = `trending-${JSON.stringify(params)}`;
    
    // Check cache first
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      return cached.data;
    }

    try {
      const response = await this.makeGiphyRequest('/gifs/trending', params);
      const data: GiphyApiResponse = await response.json();

      if (!data.data || !Array.isArray(data.data)) {
        throw new GiphyServiceError('Invalid response format from Giphy API');
      }

      const gifs = data.data.map(gif => this.transformGiphyGif(gif));
      const hasMore = gifs.length === (params.limit || this.defaultParams.limit);

      const result = { gifs, hasMore };

      // Cache the result
      this.cache.set(cacheKey, {
        data: result,
        timestamp: Date.now(),
      });

      return result;
    } catch (error) {
      if (error instanceof GiphyServiceError) {
        throw error;
      }
      throw new GiphyServiceError(`Trending fetch failed: ${error}`);
    }
  }



  /**
   * Download GIF to device
   */
  async downloadGif(gif: GiphyImage, filename?: string): Promise<void> {
    try {
      const response = await fetch(gif.originalUrl);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch GIF: ${response.status}`);
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = filename || `giphy-${gif.id}.gif`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      window.URL.revokeObjectURL(url);
    } catch (error) {
      throw new GiphyServiceError(`Download failed: ${error}`);
    }
  }

  /**
   * Copy GIF URL to clipboard
   */
  async copyGifUrl(gif: GiphyImage): Promise<boolean> {
    try {
      await navigator.clipboard.writeText(gif.originalUrl);
      return true;
    } catch (error) {
      console.warn('Clipboard write failed:', error);
      
      // Fallback: try to copy using execCommand (deprecated but still works in some browsers)
      try {
        const textArea = document.createElement('textarea');
        textArea.value = gif.originalUrl;
        document.body.appendChild(textArea);
        textArea.select();
        const success = document.execCommand('copy');
        document.body.removeChild(textArea);
        return success;
      } catch {
        return false;
      }
    }
  }

  /**
   * Share GIF (returns share URL)
   */
  getShareUrl(gif: GiphyImage): string {
    return `https://giphy.com/gifs/${gif.id}`;
  }




}

// Custom error class for Giphy service
class GiphyServiceError extends Error {
  constructor(message: string, public status?: number, public code?: string) {
    super(message);
    this.name = 'GiphyServiceError';
  }
}

// Export singleton instance
export const giphyService = new GiphyService();
export { GiphyServiceError };