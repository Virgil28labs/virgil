/* eslint-disable no-console */
import { giphyService, GiphyServiceError } from "./giphyService";
import { dedupeFetch } from "./requestDeduplication";
import { retryWithBackoff } from "./retryUtils";
import type {
  GiphyApiResponse,
  GiphyGif,
  GiphyImage,
} from "../types/giphy.types";

// Mock dedupeFetch and retryWithBackoff
jest.mock("./requestDeduplication");
jest.mock("./retryUtils");
const mockDedupeFetch = dedupeFetch as jest.MockedFunction<typeof dedupeFetch>;
const mockRetryWithBackoff = retryWithBackoff as jest.MockedFunction<
  typeof retryWithBackoff
>;

// Mock fetch
global.fetch = jest.fn();
const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;

// Mock console methods
const originalConsole = {
  warn: console.warn,
  error: console.error,
};

// Mock DOM methods
const mockCreateElement = jest.fn();
const mockAppendChild = jest.fn();
const mockRemoveChild = jest.fn();
const mockClick = jest.fn();
const mockCreateObjectURL = jest.fn();
const mockRevokeObjectURL = jest.fn();

// Mock navigator
const mockWriteText = jest.fn();
const mockExecCommand = jest.fn();

Object.defineProperty(window, "URL", {
  value: {
    createObjectURL: mockCreateObjectURL,
    revokeObjectURL: mockRevokeObjectURL,
  },
});

Object.defineProperty(navigator, "clipboard", {
  value: {
    writeText: mockWriteText,
  },
});

Object.defineProperty(document, "execCommand", {
  value: mockExecCommand,
});

describe("GiphyService", () => {
  const mockGiphyGif: GiphyGif = {
    id: "test-gif-id",
    title: "Test GIF",
    url: "https://giphy.com/test-gif",
    rating: "pg",
    username: "testuser",
    source: "https://example.com",
    tags: ["test", "gif"],
    images: {
      original: {
        url: "https://media.giphy.com/original.gif",
        width: "500",
        height: "300",
        size: "1000000",
        mp4: "https://media.giphy.com/original.mp4",
        mp4_size: "500000",
        webp: "https://media.giphy.com/original.webp",
        webp_size: "300000",
        frames: "60",
        hash: "hash123",
      },
      fixed_height: {
        url: "https://media.giphy.com/fixed_height.gif",
        width: "356",
        height: "200",
        size: "500000",
        mp4: "https://media.giphy.com/fixed_height.mp4",
        mp4_size: "200000",
        webp: "https://media.giphy.com/fixed_height.webp",
        webp_size: "150000",
      },
      fixed_height_still: {
        url: "https://media.giphy.com/fixed_height_still.gif",
        width: "356",
        height: "200",
        size: "20000",
      },
      downsized: {
        url: "https://media.giphy.com/downsized.gif",
        width: "250",
        height: "140",
        size: "100000",
      },
      downsized_still: {
        url: "https://media.giphy.com/downsized_still.gif",
        width: "250",
        height: "140",
        size: "10000",
      },
    },
    user: {
      avatar_url: "https://media.giphy.com/avatar.png",
      banner_image: "https://media.giphy.com/banner.png",
      banner_url: "https://media.giphy.com/banner_url",
      profile_url: "https://giphy.com/testuser",
      username: "testuser",
      display_name: "Test User",
      description: "Test user description",
      instagram_url: "https://instagram.com/testuser",
      website_url: "https://testuser.com",
      is_verified: true,
    },
  };

  const mockGiphyImage: GiphyImage = {
    id: "test-gif-id",
    url: "https://media.giphy.com/fixed_height.gif",
    webpUrl: "https://media.giphy.com/fixed_height.webp",
    previewUrl: "https://media.giphy.com/fixed_height_still.gif",
    originalUrl: "https://media.giphy.com/original.gif",
    title: "Test GIF",
    rating: "pg",
    width: 356,
    height: 200,
    username: "testuser",
    user: mockGiphyGif.user,
    source: "https://example.com",
    tags: ["test", "gif"],
  };

  beforeEach(() => {
    jest.clearAllMocks();
    // Clear cache before each test
    (giphyService as any).cache.clear();
    // Mock console methods
    console.warn = jest.fn();
    console.error = jest.fn();

    // Reset DOM mocks
    mockCreateElement.mockReturnValue({
      href: "",
      download: "",
      click: mockClick,
      value: "",
      select: jest.fn(),
    } as any);

    document.createElement = mockCreateElement;
    document.body.appendChild = mockAppendChild;
    document.body.removeChild = mockRemoveChild;

    // Reset URL mocks
    mockCreateObjectURL.mockReturnValue("blob:test-url");

    // Mock retryWithBackoff to immediately call the function
    mockRetryWithBackoff.mockImplementation(async (fn) => fn());
  });

  afterEach(() => {
    // Restore console
    console.warn = originalConsole.warn;
    console.error = originalConsole.error;
  });

  describe("searchGifs", () => {
    it("searches for GIFs successfully", async () => {
      const mockResponse: GiphyApiResponse = {
        data: [mockGiphyGif],
        pagination: {
          total_count: 100,
          count: 1,
          offset: 0,
        },
        meta: {
          status: 200,
          msg: "OK",
          response_id: "test-response-id",
        },
      };

      mockDedupeFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockResponse,
      } as Response);

      const result = await giphyService.searchGifs({ q: "test", limit: 10 });

      expect(result.gifs).toHaveLength(1);
      expect(result.gifs[0]).toEqual(mockGiphyImage);
      expect(result.totalCount).toBe(100);
      expect(result.hasMore).toBe(true);
      expect(mockDedupeFetch).toHaveBeenCalledWith(
        expect.stringContaining("q=test&limit=10"),
        expect.objectContaining({
          method: "GET",
          headers: {
            Accept: "application/json",
            "User-Agent": "Virgil-App/1.0",
          },
          timeout: 10000,
        }),
      );
    });

    it("uses cached data when available", async () => {
      const mockResponse: GiphyApiResponse = {
        data: [mockGiphyGif],
        pagination: {
          total_count: 100,
          count: 1,
          offset: 0,
        },
        meta: {
          status: 200,
          msg: "OK",
          response_id: "test-response-id",
        },
      };

      mockDedupeFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockResponse,
      } as Response);

      // First call to populate cache
      await giphyService.searchGifs({ q: "test" });

      // Second call should use cache
      const result = await giphyService.searchGifs({ q: "test" });

      expect(result.gifs).toHaveLength(1);
      expect(mockDedupeFetch).toHaveBeenCalledTimes(1); // Only called once
    });

    it("calculates hasMore correctly", async () => {
      const mockResponse: GiphyApiResponse = {
        data: [mockGiphyGif],
        pagination: {
          total_count: 10,
          count: 1,
          offset: 9,
        },
        meta: {
          status: 200,
          msg: "OK",
          response_id: "test-response-id",
        },
      };

      mockDedupeFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockResponse,
      } as Response);

      const result = await giphyService.searchGifs({ q: "test", offset: 9 });

      expect(result.hasMore).toBe(false); // offset (9) + count (1) = total (10)
    });

    it("handles API errors", async () => {
      mockDedupeFetch.mockResolvedValueOnce({
        ok: false,
        status: 403,
        statusText: "Forbidden",
        json: async () => ({ message: "Invalid API key" }),
      } as Response);

      await expect(giphyService.searchGifs({ q: "test" })).rejects.toThrow(
        GiphyServiceError,
      );
    });

    it("handles invalid response format", async () => {
      mockDedupeFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ data: null }),
      } as Response);

      await expect(giphyService.searchGifs({ q: "test" })).rejects.toThrow(
        "Invalid response format from Giphy API",
      );
    });

    it("throws error when API key is not configured", async () => {
      // Mock the private method to simulate missing API key
      const originalMakeRequest = (giphyService as any).makeGiphyRequest;
      (giphyService as any).makeGiphyRequest = jest
        .fn()
        .mockRejectedValue(
          new GiphyServiceError("Giphy API key not configured"),
        );

      await expect(giphyService.searchGifs({ q: "test" })).rejects.toThrow(
        "Giphy API key not configured",
      );

      // Restore original method
      (giphyService as any).makeGiphyRequest = originalMakeRequest;
    });
  });

  describe("getTrendingGifs", () => {
    it("fetches trending GIFs successfully", async () => {
      const mockResponse: GiphyApiResponse = {
        data: [mockGiphyGif, mockGiphyGif],
        pagination: {
          total_count: 100,
          count: 2,
          offset: 0,
        },
        meta: {
          status: 200,
          msg: "OK",
          response_id: "test-response-id",
        },
      };

      mockDedupeFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockResponse,
      } as Response);

      const result = await giphyService.getTrendingGifs({ limit: 2 });

      expect(result.gifs).toHaveLength(2);
      expect(result.hasMore).toBe(true); // 2 results with limit 2 indicates more available
    });

    it("uses cached trending data", async () => {
      const mockResponse: GiphyApiResponse = {
        data: [mockGiphyGif],
        pagination: {
          total_count: 100,
          count: 1,
          offset: 0,
        },
        meta: {
          status: 200,
          msg: "OK",
          response_id: "test-response-id",
        },
      };

      mockDedupeFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockResponse,
      } as Response);

      // First call to populate cache
      await giphyService.getTrendingGifs();

      // Second call should use cache
      const result = await giphyService.getTrendingGifs();

      expect(result.gifs).toHaveLength(1);
      expect(mockDedupeFetch).toHaveBeenCalledTimes(1);
    });

    it("handles trending API errors", async () => {
      mockDedupeFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: "Internal Server Error",
      } as Response);

      await expect(giphyService.getTrendingGifs()).rejects.toThrow(
        GiphyServiceError,
      );
    });
  });

  describe("downloadGif", () => {
    it("downloads GIF successfully", async () => {
      const mockBlob = new Blob(["test"]);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        blob: async () => mockBlob,
      } as Response);

      await giphyService.downloadGif(mockGiphyImage);

      expect(mockFetch).toHaveBeenCalledWith(
        "https://media.giphy.com/original.gif",
      );
      expect(mockCreateObjectURL).toHaveBeenCalledWith(mockBlob);
      expect(mockCreateElement).toHaveBeenCalledWith("a");
      expect(mockClick).toHaveBeenCalled();
      expect(mockRevokeObjectURL).toHaveBeenCalledWith("blob:test-url");
    });

    it("uses custom filename when provided", async () => {
      const mockBlob = new Blob(["test"]);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        blob: async () => mockBlob,
      } as Response);

      const link = { href: "", download: "", click: mockClick };
      mockCreateElement.mockReturnValueOnce(link as any);

      await giphyService.downloadGif(mockGiphyImage, "custom.gif");

      expect(link.download).toBe("custom.gif");
    });

    it("handles download failure", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
      } as Response);

      await expect(giphyService.downloadGif(mockGiphyImage)).rejects.toThrow(
        "Download failed",
      );
    });
  });

  describe("copyGifUrl", () => {
    it("copies URL using clipboard API", async () => {
      mockWriteText.mockResolvedValueOnce(undefined);

      const result = await giphyService.copyGifUrl(mockGiphyImage);

      expect(result).toBe(true);
      expect(mockWriteText).toHaveBeenCalledWith(
        "https://media.giphy.com/original.gif",
      );
    });

    it("falls back to execCommand when clipboard API fails", async () => {
      mockWriteText.mockRejectedValueOnce(new Error("Clipboard API failed"));
      mockExecCommand.mockReturnValueOnce(true);

      const result = await giphyService.copyGifUrl(mockGiphyImage);

      expect(result).toBe(true);
      expect(mockExecCommand).toHaveBeenCalledWith("copy");
    });

    it("returns false when both methods fail", async () => {
      mockWriteText.mockRejectedValueOnce(new Error("Clipboard API failed"));
      mockExecCommand.mockReturnValueOnce(false);

      const result = await giphyService.copyGifUrl(mockGiphyImage);

      expect(result).toBe(false);
    });
  });

  describe("getShareUrl", () => {
    it("returns correct share URL", () => {
      const shareUrl = giphyService.getShareUrl(mockGiphyImage);

      expect(shareUrl).toBe("https://giphy.com/gifs/test-gif-id");
    });
  });

  describe("transformGiphyGif", () => {
    it("handles missing image properties gracefully", () => {
      const minimalGif: GiphyGif = {
        id: "minimal-id",
        title: "",
        url: "https://giphy.com/minimal",
        rating: "g",
        images: {},
        tags: [],
      };

      const transformed = (giphyService as any).transformGiphyGif(minimalGif);

      expect(transformed.id).toBe("minimal-id");
      expect(transformed.url).toBe("https://giphy.com/minimal");
      expect(transformed.title).toBe("Untitled GIF");
      expect(transformed.width).toBe(0);
      expect(transformed.height).toBe(0);
    });
  });

  describe("GiphyServiceError", () => {
    it("creates error with status and code", () => {
      const error = new GiphyServiceError("Test error", 404, "NOT_FOUND");

      expect(error.message).toBe("Test error");
      expect(error.status).toBe(404);
      expect(error.code).toBe("NOT_FOUND");
      expect(error.name).toBe("GiphyServiceError");
    });
  });
});
