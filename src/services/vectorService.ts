interface VectorSearchResult {
  id: string;
  content: string;
  similarity: number;
}

class VectorService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:5002';
  }

  async store(content: string): Promise<string> {
    try {
      const response = await fetch(`${this.baseUrl}/api/v1/vector/store`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ content }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to store memory');
      }

      const data = await response.json();
      return data.id;
    } catch (error) {
      console.error('Vector store error:', error);
      throw error;
    }
  }

  async search(query: string, limit: number = 10): Promise<VectorSearchResult[]> {
    try {
      const response = await fetch(`${this.baseUrl}/api/v1/vector/search`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query, limit }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to search memories');
      }

      const data = await response.json();
      return data.results || [];
    } catch (error) {
      console.error('Vector search error:', error);
      throw error;
    }
  }

  async isHealthy(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/api/v1/vector/health`);
      const data = await response.json();
      return data.healthy || false;
    } catch (error) {
      console.error('Vector health check error:', error);
      return false;
    }
  }

  async getCount(): Promise<number> {
    try {
      const response = await fetch(`${this.baseUrl}/api/v1/vector/count`);
      const data = await response.json();
      return data.count || 0;
    } catch (error) {
      console.error('Vector count error:', error);
      return 0;
    }
  }
}

export const vectorService = new VectorService();
export type { VectorSearchResult };