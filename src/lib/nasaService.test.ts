/* eslint-disable no-console */
import { nasaService, ApodServiceError } from "./nasaService";
import { retryWithBackoff } from "./retryUtils";
import type { NasaApodResponse, ApodImage } from "../types/nasa.types";

// Mock retryWithBackoff
jest.mock("./retryUtils");
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

describe("NasaApodService", () => {
  const mockApodResponse: NasaApodResponse = {
    date: "2024-01-20",
    title: "Test APOD",
    explanation: "Test explanation",
    url: "https://example.com/test.jpg",
    hdurl: "https://example.com/test-hd.jpg",
    media_type: "image",
    copyright: "Test Copyright",
    concepts: ["space", "astronomy"],
  };

  const mockApodImage: ApodImage = {
    id: "2024-01-20",
    date: "2024-01-20",
    title: "Test APOD",
    explanation: "Test explanation",
    imageUrl: "https://example.com/test.jpg",
    hdImageUrl: "https://example.com/test-hd.jpg",
    mediaType: "image",
    copyright: "Test Copyright",
    concepts: ["space", "astronomy"],
    isHD: true,
    aspectRatio: undefined,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    // Clear cache before each test
    nasaService.clearCache();
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

  describe("getTodaysApod", () => {
    it("fetches today's APOD successfully", async () => {
      const today = new Date().toISOString().split("T")[0];
      const todayResponse = { ...mockApodResponse, date: today };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => todayResponse,
      } as Response);

      const result = await nasaService.getTodaysApod();

      expect(result.date).toBe(today);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining(`date=${today}`),
        expect.objectContaining({
          method: "GET",
          headers: {
            Accept: "application/json",
            "User-Agent": "Virgil-App/1.0",
          },
        }),
      );
    });
  });

  describe("getApodByDate", () => {
    it("fetches APOD for specific date successfully", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockApodResponse,
      } as Response);

      const result = await nasaService.getApodByDate("2024-01-20");

      expect(result).toEqual(mockApodImage);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("date=2024-01-20"),
        expect.any(Object),
      );
    });

    it("uses cached data when available", async () => {
      // First call to populate cache
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockApodResponse,
      } as Response);

      await nasaService.getApodByDate("2024-01-20");

      // Second call should use cache
      const result = await nasaService.getApodByDate("2024-01-20");

      expect(result).toEqual(mockApodImage);
      expect(mockFetch).toHaveBeenCalledTimes(1); // Only called once
    });

    it("refetches when cache expires", async () => {
      // First call
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockApodResponse,
      } as Response);

      await nasaService.getApodByDate("2024-01-20");

      // Fast-forward time by 11 minutes
      jest.spyOn(Date, "now").mockReturnValue(Date.now() + 11 * 60 * 1000);

      // Second call should refetch
      const updatedResponse = { ...mockApodResponse, title: "Updated APOD" };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => updatedResponse,
      } as Response);

      const result = await nasaService.getApodByDate("2024-01-20");

      expect(result.title).toBe("Updated APOD");
      expect(mockFetch).toHaveBeenCalledTimes(2);

      jest.spyOn(Date, "now").mockRestore();
    });

    it("throws error for invalid date format", async () => {
      await expect(nasaService.getApodByDate("invalid-date")).rejects.toThrow(
        "Invalid date format. Use YYYY-MM-DD",
      );
    });

    it("throws error for date before first APOD", async () => {
      await expect(nasaService.getApodByDate("1990-01-01")).rejects.toThrow(
        "Date must be between 1995-06-16 and today",
      );
    });

    it("throws error for future date", async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 1);
      const futureDateStr = futureDate.toISOString().split("T")[0];

      await expect(nasaService.getApodByDate(futureDateStr)).rejects.toThrow(
        "Date must be between 1995-06-16 and today",
      );
    });

    it("handles API errors", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: "Not Found",
        json: async () => ({ error: { message: "No data available" } }),
      } as Response);

      await expect(nasaService.getApodByDate("2024-01-20")).rejects.toThrow(
        ApodServiceError,
      );
    });
  });

  describe("getRandomApod", () => {
    it("fetches a random APOD", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockApodResponse,
      } as Response);

      const result = await nasaService.getRandomApod();

      expect(result).toBeDefined();
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("date="),
        expect.any(Object),
      );
    });
  });

  describe("getPreviousApod", () => {
    it("fetches previous day APOD", async () => {
      const prevResponse = { ...mockApodResponse, date: "2024-01-19" };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => prevResponse,
      } as Response);

      const result = await nasaService.getPreviousApod("2024-01-20");

      expect(result.date).toBe("2024-01-19");
    });

    it("throws error when no previous APOD available", async () => {
      await expect(nasaService.getPreviousApod("1995-06-16")).rejects.toThrow(
        "No previous APOD available",
      );
    });
  });

  describe("getNextApod", () => {
    it("fetches next day APOD", async () => {
      const nextResponse = { ...mockApodResponse, date: "2024-01-21" };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => nextResponse,
      } as Response);

      const result = await nasaService.getNextApod("2024-01-20");

      expect(result.date).toBe("2024-01-21");
    });

    it("throws error when trying to get future APOD", async () => {
      const today = new Date().toISOString().split("T")[0];

      await expect(nasaService.getNextApod(today)).rejects.toThrow(
        "No future APOD available",
      );
    });
  });

  describe("canNavigatePrevious", () => {
    it("returns true when previous date is available", () => {
      expect(nasaService.canNavigatePrevious("2024-01-20")).toBe(true);
    });

    it("returns false for first APOD date", () => {
      expect(nasaService.canNavigatePrevious("1995-06-16")).toBe(false);
    });
  });

  describe("canNavigateNext", () => {
    it("returns true when next date is available", () => {
      expect(nasaService.canNavigateNext("2020-01-20")).toBe(true);
    });

    it("returns false for today", () => {
      const today = new Date().toISOString().split("T")[0];
      expect(nasaService.canNavigateNext(today)).toBe(false);
    });
  });

  describe("downloadApod", () => {
    it("downloads image successfully", async () => {
      const mockBlob = new Blob(["test"]);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        blob: async () => mockBlob,
      } as Response);

      await nasaService.downloadApod(mockApodImage);

      expect(mockFetch).toHaveBeenCalledWith("https://example.com/test.jpg");
      expect(mockCreateObjectURL).toHaveBeenCalledWith(mockBlob);
      expect(mockCreateElement).toHaveBeenCalledWith("a");
      expect(mockClick).toHaveBeenCalled();
      expect(mockRevokeObjectURL).toHaveBeenCalledWith("blob:test-url");
    });

    it("downloads HD image when requested", async () => {
      const mockBlob = new Blob(["test"]);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        blob: async () => mockBlob,
      } as Response);

      await nasaService.downloadApod(mockApodImage, true);

      expect(mockFetch).toHaveBeenCalledWith("https://example.com/test-hd.jpg");
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

      await nasaService.downloadApod(mockApodImage, false, "custom.jpg");

      expect(link.download).toBe("custom.jpg");
    });

    it("throws error for video content", async () => {
      const videoApod = { ...mockApodImage, mediaType: "video" };

      await expect(nasaService.downloadApod(videoApod)).rejects.toThrow(
        "Cannot download video content",
      );
    });

    it("handles download failure", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
      } as Response);

      await expect(nasaService.downloadApod(mockApodImage)).rejects.toThrow(
        "Download failed",
      );
    });
  });

  describe("getShareData", () => {
    it("returns correct share data", () => {
      const shareData = nasaService.getShareData(mockApodImage);

      expect(shareData).toEqual({
        title: "Test APOD",
        text: "Test APOD - NASA Astronomy Picture of the Day for 2024-01-20",
        url: "https://apod.nasa.gov/apod/ap240120.html",
      });
    });
  });

  describe("copyApodLink", () => {
    it("copies link using clipboard API", async () => {
      mockWriteText.mockResolvedValueOnce(undefined);

      const result = await nasaService.copyApodLink(mockApodImage);

      expect(result).toBe(true);
      expect(mockWriteText).toHaveBeenCalledWith(
        "https://apod.nasa.gov/apod/ap240120.html",
      );
    });

    it("falls back to execCommand when clipboard API fails", async () => {
      mockWriteText.mockRejectedValueOnce(new Error("Clipboard API failed"));
      mockExecCommand.mockReturnValueOnce(true);

      const result = await nasaService.copyApodLink(mockApodImage);

      expect(result).toBe(true);
      expect(mockExecCommand).toHaveBeenCalledWith("copy");
    });

    it("returns false when both methods fail", async () => {
      mockWriteText.mockRejectedValueOnce(new Error("Clipboard API failed"));
      mockExecCommand.mockReturnValueOnce(false);

      const result = await nasaService.copyApodLink(mockApodImage);

      expect(result).toBe(false);
    });
  });

  describe("clearCache", () => {
    it("clears all cached data", async () => {
      // Populate cache
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockApodResponse,
      } as Response);

      await nasaService.getApodByDate("2024-01-20");

      // Clear cache
      nasaService.clearCache();

      // Check cache is empty
      const stats = nasaService.getCacheStats();
      expect(stats.size).toBe(0);
      expect(stats.entries).toHaveLength(0);
    });
  });

  describe("getCacheStats", () => {
    it("returns cache statistics", async () => {
      // Populate cache
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockApodResponse,
      } as Response);

      await nasaService.getApodByDate("2024-01-20");

      const stats = nasaService.getCacheStats();

      expect(stats.size).toBe(1);
      expect(stats.entries).toContain("apod-2024-01-20");
    });
  });

  describe("preloadAdjacentDates", () => {
    it("preloads previous and next dates", async () => {
      const prevResponse = { ...mockApodResponse, date: "2024-01-19" };
      const nextResponse = { ...mockApodResponse, date: "2024-01-21" };

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => prevResponse,
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => nextResponse,
        } as Response);

      await nasaService.preloadAdjacentDates("2024-01-20");

      // Give promises time to resolve
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(mockFetch).toHaveBeenCalledTimes(2);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("date=2024-01-19"),
        expect.any(Object),
      );
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("date=2024-01-21"),
        expect.any(Object),
      );
    });

    it("does not preload if already cached", async () => {
      // Populate cache first
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ ...mockApodResponse, date: "2024-01-19" }),
      } as Response);

      await nasaService.getApodByDate("2024-01-19");
      mockFetch.mockClear();

      // Try to preload - should not fetch again
      await nasaService.preloadAdjacentDates("2024-01-20");

      // Give promises time to resolve
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Should only fetch the next date (not the previous one which is cached)
      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("date=2024-01-21"),
        expect.any(Object),
      );
    });

    it("handles preload failures silently", async () => {
      mockFetch.mockRejectedValue(new Error("Network error"));

      // Should not throw
      await expect(
        nasaService.preloadAdjacentDates("2024-01-20"),
      ).resolves.toBeUndefined();
    });
  });

  describe("ApodServiceError", () => {
    it("creates error with status and code", () => {
      const error = new ApodServiceError("Test error", 404, "NOT_FOUND");

      expect(error.message).toBe("Test error");
      expect(error.status).toBe(404);
      expect(error.code).toBe("NOT_FOUND");
      expect(error.name).toBe("ApodServiceError");
    });
  });
});
