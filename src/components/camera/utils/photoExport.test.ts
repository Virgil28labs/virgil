import { PhotoExport } from "./photoExport";
import { PhotoStorage } from "./photoStorage";
import { CameraUtils } from "./cameraUtils";
import type { SavedPhoto, ExportOptions } from "../../../types/camera.types";

// Mock PhotoStorage and CameraUtils
jest.mock("./photoStorage");
jest.mock("./cameraUtils");

// Mock DOM elements
const mockLink = {
  href: "",
  download: "",
  click: jest.fn(),
  remove: jest.fn(),
};

// Mock document methods
document.createElement = jest.fn((tagName: string) => {
  if (tagName === "a") return mockLink as any;
  return {} as any;
});

document.body.appendChild = jest.fn();
document.body.removeChild = jest.fn();

// Mock URL methods
const mockCreateObjectURL = jest.fn(() => "blob:mock-url");
const mockRevokeObjectURL = jest.fn();
Object.defineProperty(window.URL, "createObjectURL", {
  value: mockCreateObjectURL,
});
Object.defineProperty(window.URL, "revokeObjectURL", {
  value: mockRevokeObjectURL,
});

// Mock fetch
global.fetch = jest.fn();

// Mock navigator.share
Object.defineProperty(navigator, "share", {
  value: jest.fn(),
  writable: true,
});

describe("PhotoExport", () => {
  const mockPhoto: SavedPhoto = {
    id: "photo-1",
    dataUrl: "data:image/jpeg;base64,test",
    timestamp: Date.now(),
    isFavorite: false,
    name: "Test Photo",
    size: 1024,
    width: 800,
    height: 600,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (CameraUtils.generatePhotoName as jest.Mock).mockReturnValue(
      "photo_20240101_120000.jpg",
    );
    (CameraUtils.downloadPhoto as jest.Mock).mockResolvedValue(undefined);
    (PhotoStorage.exportPhotos as jest.Mock).mockResolvedValue(
      JSON.stringify({ photos: [] }),
    );
    (PhotoStorage.importPhotos as jest.Mock).mockResolvedValue(1);
  });

  describe("exportAsJson", () => {
    it("exports photos as JSON", async () => {
      const photos = [mockPhoto];
      const options: ExportOptions = {
        format: "json",
        includeMetadata: true,
        compressionLevel: "medium",
      };

      (PhotoStorage.exportPhotos as jest.Mock).mockResolvedValueOnce(
        JSON.stringify({ photos }),
      );

      await PhotoExport.exportAsJson(photos, options);

      expect(PhotoStorage.exportPhotos).toHaveBeenCalledWith(photos);
      expect(mockCreateObjectURL).toHaveBeenCalledWith(expect.any(Blob));
      expect(mockLink.download).toBe(
        `virgil_photos_${expect.any(Number)}.json`,
      );
      expect(mockLink.click).toHaveBeenCalled();
      expect(mockRevokeObjectURL).toHaveBeenCalledWith("blob:mock-url");
    });

    it("uses custom filename when provided", async () => {
      const photos = [mockPhoto];
      const options: ExportOptions = {
        format: "json",
        includeMetadata: true,
        compressionLevel: "medium",
        filename: "custom_export.json",
      };

      await PhotoExport.exportAsJson(photos, options);

      expect(mockLink.download).toBe("custom_export.json");
    });

    it("handles export errors", async () => {
      (PhotoStorage.exportPhotos as jest.Mock).mockRejectedValueOnce(
        new Error("Export failed"),
      );

      await expect(
        PhotoExport.exportAsJson([mockPhoto], { format: "json" }),
      ).rejects.toThrow("Failed to export photos as JSON");
    });
  });

  describe("exportAsZip", () => {
    it("exports photos individually when zip not supported", async () => {
      const photos = [mockPhoto, { ...mockPhoto, id: "photo-2" }];
      const options: ExportOptions = {
        format: "zip",
        includeMetadata: true,
        compressionLevel: "medium",
      };

      await PhotoExport.exportAsZip(photos, options);

      expect(CameraUtils.downloadPhoto).toHaveBeenCalledTimes(2);
      expect(CameraUtils.downloadPhoto).toHaveBeenCalledWith(
        mockPhoto.dataUrl,
        "Test Photo",
      );
    });
  });

  describe("sharePhoto", () => {
    it("shares a single photo when Web Share API is supported", async () => {
      const mockResponse = {
        blob: jest
          .fn()
          .mockResolvedValue(new Blob(["test"], { type: "image/jpeg" })),
      };
      (global.fetch as jest.Mock).mockResolvedValueOnce(mockResponse);
      (navigator.share as jest.Mock).mockResolvedValueOnce(undefined);

      await PhotoExport.sharePhoto(mockPhoto);

      expect(fetch).toHaveBeenCalledWith(mockPhoto.dataUrl);
      expect(navigator.share).toHaveBeenCalledWith({
        files: [expect.any(File)],
        title: "Test Photo",
        text: "Check out this photo from Virgil Camera!",
      });
    });

    it("throws error when Web Share API not supported", async () => {
      Object.defineProperty(navigator, "share", {
        value: undefined,
        writable: true,
      });

      await expect(PhotoExport.sharePhoto(mockPhoto)).rejects.toThrow(
        "Web Share API not supported",
      );
    });
  });

  describe("shareMultiplePhotos", () => {
    it("shares multiple photos", async () => {
      const photos = [
        mockPhoto,
        { ...mockPhoto, id: "photo-2", name: "Photo 2" },
      ];
      const mockResponse = {
        blob: jest
          .fn()
          .mockResolvedValue(new Blob(["test"], { type: "image/jpeg" })),
      };
      (global.fetch as jest.Mock).mockResolvedValue(mockResponse);
      (navigator.share as jest.Mock).mockResolvedValueOnce(undefined);

      await PhotoExport.shareMultiplePhotos(photos);

      expect(fetch).toHaveBeenCalledTimes(2);
      expect(navigator.share).toHaveBeenCalledWith({
        files: expect.arrayContaining([expect.any(File), expect.any(File)]),
        title: "2 photos from Virgil Camera",
        text: "Check out these photos I took!",
      });
    });
  });

  describe("importFromJson", () => {
    it("imports photos from JSON", async () => {
      const jsonData = JSON.stringify({ photos: [mockPhoto] });

      const count = await PhotoExport.importFromJson(jsonData);

      expect(PhotoStorage.importPhotos).toHaveBeenCalledWith(jsonData);
      expect(count).toBe(1);
    });

    it("handles import errors", async () => {
      (PhotoStorage.importPhotos as jest.Mock).mockRejectedValueOnce(
        new Error("Import failed"),
      );

      await expect(PhotoExport.importFromJson("{}")).rejects.toThrow(
        "Failed to import photos from JSON",
      );
    });
  });

  describe("importFromFile", () => {
    it("imports photos from file", async () => {
      const fileContent = JSON.stringify({ photos: [mockPhoto] });
      const file = new File([fileContent], "photos.json", {
        type: "application/json",
      });

      const count = await PhotoExport.importFromFile(file);

      expect(PhotoStorage.importPhotos).toHaveBeenCalledWith(fileContent);
      expect(count).toBe(1);
    });

    it("handles file read errors", async () => {
      const file = new File(["invalid"], "photos.json", {
        type: "application/json",
      });
      (PhotoStorage.importPhotos as jest.Mock).mockRejectedValueOnce(
        new Error("Invalid JSON"),
      );

      await expect(PhotoExport.importFromFile(file)).rejects.toThrow(
        "Failed to import photos from file",
      );
    });
  });

  describe("validateExportOptions", () => {
    it("returns default options when empty", () => {
      const options = PhotoExport.validateExportOptions({});

      expect(options).toEqual({
        format: "json",
        includeMetadata: true,
        compressionLevel: "medium",
        filename: undefined,
      });
    });

    it("merges provided options with defaults", () => {
      const options = PhotoExport.validateExportOptions({
        format: "zip",
        compressionLevel: "high",
      });

      expect(options).toEqual({
        format: "zip",
        includeMetadata: true,
        compressionLevel: "high",
        filename: undefined,
      });
    });
  });

  describe("getExportPreview", () => {
    it("returns preview for JSON format", async () => {
      const photos = [
        { ...mockPhoto, size: 1000 },
        { ...mockPhoto, id: "photo-2", size: 2000 },
      ];
      const options: ExportOptions = {
        format: "json",
        includeMetadata: true,
        compressionLevel: "medium",
      };

      const preview = await PhotoExport.getExportPreview(photos, options);

      expect(preview).toEqual({
        photoCount: 2,
        totalSize: 3000,
        estimatedFileSize: 3300, // 10% overhead
        format: "json",
      });
    });

    it("returns preview for ZIP format with compression", async () => {
      const photos = [
        { ...mockPhoto, size: 1000 },
        { ...mockPhoto, id: "photo-2", size: 2000 },
      ];
      const options: ExportOptions = {
        format: "zip",
        includeMetadata: true,
        compressionLevel: "high",
      };

      const preview = await PhotoExport.getExportPreview(photos, options);

      expect(preview).toEqual({
        photoCount: 2,
        totalSize: 3000,
        estimatedFileSize: 2100, // 70% with high compression
        format: "zip",
      });
    });

    it("handles preview errors", async () => {
      const photos = [{ ...mockPhoto, size: undefined }];

      // This should not throw, it should handle missing sizes gracefully
      const preview = await PhotoExport.getExportPreview(photos, {
        format: "json",
      });
      expect(preview.totalSize).toBe(0);
    });
  });
});
