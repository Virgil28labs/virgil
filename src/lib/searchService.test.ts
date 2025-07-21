import { searchService } from "./searchService";
import { dedupeFetch } from "./requestDeduplication";
import type { SearchRequest, SearchResponse } from "../types/chat.types";

// Mock requestDeduplication
jest.mock("./requestDeduplication", () => ({
  dedupeFetch: jest.fn(),
}));

const mockDedupeFetch = dedupeFetch as jest.MockedFunction<typeof dedupeFetch>;

describe("SearchService", () => {
  const originalEnv = import.meta.env;
  const mockSearchResponse: SearchResponse = {
    success: true,
    query: "test query",
    answer: "This is a test answer",
    results: [
      {
        title: "Test Result 1",
        url: "https://example.com/1",
        content:
          "This is the first test result with some content that is quite long and should be truncated when displayed",
      },
      {
        title: "Test Result 2",
        url: "https://example.com/2",
        content: "Second test result",
      },
      {
        title: "Test Result 3",
        url: "https://example.com/3",
        content: "Third test result",
      },
    ],
  };

  beforeEach(() => {
    jest.clearAllMocks();
    import.meta.env = {
      ...originalEnv,
      VITE_LLM_API_URL: "http://test-api.com/api/v1",
    };
    // Reset searchService baseUrl
    (searchService as any).baseUrl = "http://test-api.com/api/v1";
  });

  afterEach(() => {
    import.meta.env = originalEnv;
  });

  describe("constructor", () => {
    it("should use VITE_LLM_API_URL from environment", () => {
      expect((searchService as any).baseUrl).toBe("http://test-api.com/api/v1");
    });

    it("should use default URL when environment variable is not set", () => {
      import.meta.env.VITE_LLM_API_URL = "";
      const newService = new (searchService.constructor as any)();
      expect(newService.baseUrl).toBe("http://localhost:5002/api/v1");
    });
  });

  describe("search", () => {
    it("should perform search successfully", async () => {
      const searchRequest: SearchRequest = {
        query: "test query",
        options: {
          maxResults: 5,
        },
      };

      mockDedupeFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockSearchResponse,
      } as Response);

      const result = await searchService.search(searchRequest);

      expect(result).toEqual(mockSearchResponse);
      expect(mockDedupeFetch).toHaveBeenCalledWith(
        "http://test-api.com/api/v1/search",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(searchRequest),
        },
      );
    });

    it("should handle HTTP error with error message", async () => {
      const searchRequest: SearchRequest = { query: "test" };
      const errorMessage = "Rate limit exceeded";

      mockDedupeFetch.mockResolvedValueOnce({
        ok: false,
        status: 429,
        json: async () => ({ error: errorMessage }),
      } as Response);

      await expect(searchService.search(searchRequest)).rejects.toThrow(
        errorMessage,
      );
    });

    it("should handle HTTP error without error message", async () => {
      const searchRequest: SearchRequest = { query: "test" };

      mockDedupeFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => {
          throw new Error("JSON parse error");
        },
      } as Response);

      await expect(searchService.search(searchRequest)).rejects.toThrow(
        "Search service error: 500",
      );
    });

    it("should handle unsuccessful response", async () => {
      const searchRequest: SearchRequest = { query: "test" };
      const errorResponse = {
        success: false,
        error: "Search engine unavailable",
      };

      mockDedupeFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => errorResponse,
      } as Response);

      await expect(searchService.search(searchRequest)).rejects.toThrow(
        "Search engine unavailable",
      );
    });

    it("should handle unsuccessful response without error message", async () => {
      const searchRequest: SearchRequest = { query: "test" };
      const errorResponse = {
        success: false,
      };

      mockDedupeFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => errorResponse,
      } as Response);

      await expect(searchService.search(searchRequest)).rejects.toThrow(
        "Search failed",
      );
    });

    it("should handle network errors", async () => {
      const searchRequest: SearchRequest = { query: "test" };

      mockDedupeFetch.mockRejectedValueOnce(new Error("Network error"));

      await expect(searchService.search(searchRequest)).rejects.toThrow(
        "Network error",
      );
    });
  });

  describe("checkHealth", () => {
    const originalFetch = global.fetch;

    beforeEach(() => {
      global.fetch = jest.fn();
    });

    afterEach(() => {
      global.fetch = originalFetch;
    });

    it("should return true when service is healthy", async () => {
      const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;
      mockFetch.mockResolvedValueOnce({
        json: async () => ({ status: "healthy" }),
      } as Response);

      const result = await searchService.checkHealth();

      expect(result).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith(
        "http://test-api.com/api/v1/search/health",
      );
    });

    it("should return false when service is unhealthy", async () => {
      const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;
      mockFetch.mockResolvedValueOnce({
        json: async () => ({ status: "unhealthy" }),
      } as Response);

      const result = await searchService.checkHealth();

      expect(result).toBe(false);
    });

    it("should return false when health check fails", async () => {
      const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;
      mockFetch.mockRejectedValueOnce(new Error("Network error"));

      const consoleSpy = jest.spyOn(console, "error").mockImplementation();

      const result = await searchService.checkHealth();

      expect(result).toBe(false);
      expect(consoleSpy).toHaveBeenCalledWith(
        "Search health check failed:",
        expect.any(Error),
      );

      consoleSpy.mockRestore();
    });

    it("should handle invalid JSON response", async () => {
      const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;
      mockFetch.mockResolvedValueOnce({
        json: async () => {
          throw new Error("Invalid JSON");
        },
      } as Response);

      const consoleSpy = jest.spyOn(console, "error").mockImplementation();

      const result = await searchService.checkHealth();

      expect(result).toBe(false);
      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });
  });

  describe("detectSearchIntent", () => {
    it("should detect search intent with search triggers", () => {
      const searchMessages = [
        "search for cats",
        "find information about dogs",
        "lookup weather",
        "what is quantum computing",
        "what are the latest news",
        "tell me about React",
        "research machine learning",
        "current events",
        "update on the stock market",
        "information about TypeScript",
      ];

      searchMessages.forEach((message) => {
        expect(searchService.detectSearchIntent(message)).toBe(true);
      });
    });

    it("should not detect search intent without triggers", () => {
      const nonSearchMessages = [
        "hello",
        "how are you?",
        "write a poem",
        "calculate 2 + 2",
        "good morning",
      ];

      nonSearchMessages.forEach((message) => {
        expect(searchService.detectSearchIntent(message)).toBe(false);
      });
    });

    it("should be case insensitive", () => {
      expect(searchService.detectSearchIntent("SEARCH for something")).toBe(
        true,
      );
      expect(searchService.detectSearchIntent("What Is This")).toBe(true);
      expect(searchService.detectSearchIntent("FIND INFO")).toBe(true);
    });

    it("should detect triggers within sentences", () => {
      expect(
        searchService.detectSearchIntent("I want to search for recipes"),
      ).toBe(true);
      expect(
        searchService.detectSearchIntent(
          "Can you find the nearest restaurant?",
        ),
      ).toBe(true);
      expect(
        searchService.detectSearchIntent(
          "Please tell me about quantum physics",
        ),
      ).toBe(true);
    });
  });

  describe("extractSearchQuery", () => {
    it("should remove common prefixes", () => {
      expect(searchService.extractSearchQuery("search for cats")).toBe("cats");
      expect(searchService.extractSearchQuery("find dogs")).toBe("dogs");
      expect(searchService.extractSearchQuery("lookup weather")).toBe(
        "weather",
      );
      expect(searchService.extractSearchQuery("tell me about React")).toBe(
        "React",
      );
      expect(searchService.extractSearchQuery("what is TypeScript")).toBe(
        "TypeScript",
      );
      expect(
        searchService.extractSearchQuery("research machine learning"),
      ).toBe("machine learning");
    });

    it("should remove question marks", () => {
      expect(searchService.extractSearchQuery("what is React?")).toBe("React");
      expect(searchService.extractSearchQuery("can you search for cats?")).toBe(
        "cats",
      );
    });

    it("should handle case insensitive prefixes", () => {
      expect(searchService.extractSearchQuery("Can You search for dogs")).toBe(
        "dogs",
      );
      expect(searchService.extractSearchQuery("PLEASE find cats")).toBe("cats");
      expect(searchService.extractSearchQuery("What Are cookies")).toBe(
        "cookies",
      );
    });

    it("should preserve original message if query too short", () => {
      expect(searchService.extractSearchQuery("search")).toBe("search");
      expect(searchService.extractSearchQuery("find it")).toBe("it");
      expect(searchService.extractSearchQuery("search a")).toBe("a");
    });

    it("should handle messages without prefixes", () => {
      expect(searchService.extractSearchQuery("quantum computing")).toBe(
        "quantum computing",
      );
      expect(searchService.extractSearchQuery("React hooks")).toBe(
        "React hooks",
      );
    });

    it("should handle multiple spaces", () => {
      expect(searchService.extractSearchQuery("search for cats")).toBe("cats");
      expect(searchService.extractSearchQuery("find dogs")).toBe("dogs");
    });
  });

  describe("formatSearchResults", () => {
    it("should format search results with answer and sources", () => {
      const formatted = searchService.formatSearchResults(mockSearchResponse);

      expect(formatted).toContain('I searched for "test query" and found:');
      expect(formatted).toContain("**Summary:** This is a test answer");
      expect(formatted).toContain("**Sources:**");
      expect(formatted).toContain("1. [Test Result 1](https://example.com/1)");
      expect(formatted).toContain("2. [Test Result 2](https://example.com/2)");
      expect(formatted).toContain("3. [Test Result 3](https://example.com/3)");
    });

    it("should truncate long content", () => {
      const formatted = searchService.formatSearchResults(mockSearchResponse);

      // First result has long content
      expect(formatted).toContain(
        "This is the first test result with some content that is quite long and should be truncated when displayed...",
      );
      expect(formatted).not.toContain("truncated when displayed in full");
    });

    it("should format results without answer", () => {
      const responseWithoutAnswer: SearchResponse = {
        ...mockSearchResponse,
        answer: undefined,
      };

      const formatted = searchService.formatSearchResults(
        responseWithoutAnswer,
      );

      expect(formatted).not.toContain("**Summary:**");
      expect(formatted).toContain("**Sources:**");
    });

    it("should handle empty results", () => {
      const emptyResponse: SearchResponse = {
        success: true,
        query: "test query",
        answer: "No results found",
        results: [],
      };

      const formatted = searchService.formatSearchResults(emptyResponse);

      expect(formatted).toContain('I searched for "test query" and found:');
      expect(formatted).toContain("**Summary:** No results found");
      expect(formatted).not.toContain("**Sources:**");
    });

    it("should limit to 3 sources", () => {
      const manyResults: SearchResponse = {
        ...mockSearchResponse,
        results: [
          ...mockSearchResponse.results,
          {
            title: "Result 4",
            url: "https://example.com/4",
            content: "Fourth",
          },
          { title: "Result 5", url: "https://example.com/5", content: "Fifth" },
        ],
      };

      const formatted = searchService.formatSearchResults(manyResults);

      expect(formatted).toContain("1. [Test Result 1]");
      expect(formatted).toContain("2. [Test Result 2]");
      expect(formatted).toContain("3. [Test Result 3]");
      expect(formatted).not.toContain("4. [Result 4]");
      expect(formatted).not.toContain("5. [Result 5]");
    });

    it("should handle results without content", () => {
      const resultsWithoutContent: SearchResponse = {
        ...mockSearchResponse,
        results: [{ title: "No Content", url: "https://example.com/nc" }],
      };

      const formatted = searchService.formatSearchResults(
        resultsWithoutContent,
      );

      expect(formatted).toContain("1. [No Content](https://example.com/nc)");
      expect(formatted).not.toContain("...");
    });
  });

  describe("edge cases", () => {
    it("should handle very long queries", () => {
      const longQuery = "a".repeat(1000);
      const extracted = searchService.extractSearchQuery(
        `search for ${longQuery}`,
      );
      expect(extracted).toBe(longQuery);
    });

    it("should handle special characters in search", () => {
      expect(searchService.detectSearchIntent("search for C++")).toBe(true);
      expect(searchService.extractSearchQuery("find @#$%")).toBe("@#$%");
    });

    it("should handle empty message", () => {
      expect(searchService.detectSearchIntent("")).toBe(false);
      expect(searchService.extractSearchQuery("")).toBe("");
    });

    it("should handle undefined in formatSearchResults", () => {
      const incompleteResponse = {
        success: true,
        query: "test",
        results: [
          {
            title: undefined as any,
            url: "https://example.com",
            content: null as any,
          },
        ],
      } as SearchResponse;

      const formatted = searchService.formatSearchResults(incompleteResponse);
      expect(formatted).toContain("[undefined](https://example.com)");
    });
  });
});
