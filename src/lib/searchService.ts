import type { SearchRequest, SearchResponse } from "../types/chat.types";
import { dedupeFetch } from "./requestDeduplication";

class SearchService {
  private baseUrl: string;

  constructor() {
    this.baseUrl =
      import.meta.env.VITE_LLM_API_URL || "http://localhost:5002/api/v1";
  }

  async search(request: SearchRequest): Promise<SearchResponse> {
    const response = await dedupeFetch(`${this.baseUrl}/search`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        errorData.error || `Search service error: ${response.status}`,
      );
    }

    const data = await response.json();

    if (!data.success) {
      throw new Error(data.error || "Search failed");
    }

    return data;
  }

  async checkHealth(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/search/health`);
      const data = await response.json();
      return data.status === "healthy";
    } catch (error) {
      console.error("Search health check failed:", error);
      return false;
    }
  }

  detectSearchIntent(message: string): boolean {
    const searchTriggers = [
      "search",
      "find",
      "lookup",
      "what is",
      "what are",
      "latest",
      "recent",
      "current",
      "news",
      "today",
      "now",
      "happening",
      "update",
      "information about",
      "tell me about",
      "research",
    ];

    const lowerMessage = message.toLowerCase();
    return searchTriggers.some((trigger) => lowerMessage.includes(trigger));
  }

  extractSearchQuery(message: string): string {
    // Remove common chat prefixes and search triggers - apply multiple times to handle chained prefixes
    let query = message.trim();
    let prevQuery = "";

    // Keep applying the regex until no more matches (handles "please find cats" -> "cats")
    while (query !== prevQuery) {
      prevQuery = query;
      query = query
        .replace(
          /^(can you search for |can you |could you |please |search for |search |find |lookup |tell me about |what is |what are |research )/i,
          "",
        )
        .trim();
    }

    // Remove trailing question marks
    query = query.replace(/\?$/, "");

    // Always return the extracted query, even if short
    return query;
  }

  formatSearchResults(searchResponse: SearchResponse): string {
    const { answer, results, query } = searchResponse;

    let formatted = `I searched for "${query}" and found:\n\n`;

    if (answer) {
      formatted += `**Summary:** ${answer}\n\n`;
    }

    if (results.length > 0) {
      formatted += `**Sources:**\n`;
      results.slice(0, 3).forEach((result, index) => {
        formatted += `${index + 1}. [${result.title}](${result.url})\n`;
        if (result.content) {
          formatted += `   ${result.content.substring(0, 120)}...\n`;
        }
        formatted += "\n";
      });
    }

    return formatted;
  }
}

export const searchService = new SearchService();
export default searchService;
