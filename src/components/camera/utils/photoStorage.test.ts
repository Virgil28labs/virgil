import { PhotoStorage } from "./photoStorage";
import { CameraUtils } from "./cameraUtils";
import type { SavedPhoto } from "../../../types/camera.types";

// Mock CameraUtils
jest.mock("./cameraUtils");

// Mock localStorage
const mockLocalStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
  length: 0,
  key: jest.fn(),
};

Object.defineProperty(window, "localStorage", {
  value: mockLocalStorage,
  writable: true,
});

describe("PhotoStorage", () => {
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
    // Reset the mock implementation for setItem to not throw by default
    mockLocalStorage.setItem.mockImplementation(() => {});
    mockLocalStorage.getItem.mockReturnValue(null);
    (CameraUtils.generatePhotoId as jest.Mock).mockReturnValue("generated-id");
    (CameraUtils.calculateDataUrlSize as jest.Mock).mockReturnValue(1024);
    (CameraUtils.getImageDimensions as jest.Mock).mockResolvedValue({
      width: 800,
      height: 600,
    });
  });

  describe("initialize", () => {
    it("initializes storage successfully", async () => {
      await PhotoStorage.initialize();

      // Should be called for migration and cleanup
      expect(mockLocalStorage.getItem).toHaveBeenCalled();
    });

    it("handles initialization errors gracefully", async () => {
      mockLocalStorage.getItem.mockImplementation(() => {
        throw new Error("Storage error");
      });

      // Should not throw
      await expect(PhotoStorage.initialize()).resolves.not.toThrow();
    });
  });

  describe("savePhoto", () => {
    it("saves a new photo", async () => {
      const photoToSave = {
        dataUrl: mockPhoto.dataUrl,
        timestamp: mockPhoto.timestamp,
        isFavorite: false,
        name: "New Photo",
      };

      const savedPhoto = await PhotoStorage.savePhoto(photoToSave);

      expect(savedPhoto).toEqual({
        ...photoToSave,
        id: "generated-id",
        size: 1024,
        width: 800,
        height: 600,
      });

      expect(CameraUtils.generatePhotoId).toHaveBeenCalled();
      expect(CameraUtils.calculateDataUrlSize).toHaveBeenCalledWith(
        photoToSave.dataUrl,
      );
      expect(CameraUtils.getImageDimensions).toHaveBeenCalledWith(
        photoToSave.dataUrl,
      );
      expect(mockLocalStorage.setItem).toHaveBeenCalled();
    });

    it("handles save errors", async () => {
      mockLocalStorage.setItem.mockImplementation(() => {
        throw new Error("Storage full");
      });

      await expect(
        PhotoStorage.savePhoto({
          dataUrl: mockPhoto.dataUrl,
          timestamp: mockPhoto.timestamp,
          isFavorite: false,
        }),
      ).rejects.toThrow("Failed to save photo");
    });
  });

  describe("getAllPhotos", () => {
    it("returns empty array when no photos exist", async () => {
      mockLocalStorage.getItem.mockReturnValue(null);

      const photos = await PhotoStorage.getAllPhotos();

      expect(photos).toEqual([]);
    });

    it("returns sorted photos", async () => {
      const photos = [
        { ...mockPhoto, id: "1", timestamp: 1000 },
        { ...mockPhoto, id: "2", timestamp: 3000 },
        { ...mockPhoto, id: "3", timestamp: 2000 },
      ];

      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(photos));

      const result = await PhotoStorage.getAllPhotos();

      expect(result[0].id).toBe("2"); // Newest first
      expect(result[1].id).toBe("3");
      expect(result[2].id).toBe("1"); // Oldest last
    });

    it("handles corrupted data gracefully", async () => {
      mockLocalStorage.getItem.mockReturnValue("invalid json");

      const photos = await PhotoStorage.getAllPhotos();
      expect(photos).toEqual([]);
    });
  });

  describe("getFavoritePhotos", () => {
    it("returns only favorite photos", async () => {
      const photos = [
        { ...mockPhoto, id: "1", isFavorite: false },
        { ...mockPhoto, id: "2", isFavorite: true },
        { ...mockPhoto, id: "3", isFavorite: true },
      ];

      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(photos));

      const favorites = await PhotoStorage.getFavoritePhotos();

      expect(favorites).toHaveLength(2);
      expect(favorites[0].id).toBe("2");
      expect(favorites[1].id).toBe("3");
    });

    it("returns empty array when no favorites", async () => {
      const photos = [
        { ...mockPhoto, id: "1", isFavorite: false },
        { ...mockPhoto, id: "2", isFavorite: false },
      ];

      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(photos));

      const favorites = await PhotoStorage.getFavoritePhotos();

      expect(favorites).toEqual([]);
    });
  });

  describe("getPhotoById", () => {
    it("returns photo by id", async () => {
      const photos = [mockPhoto];
      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(photos));

      const photo = await PhotoStorage.getPhotoById("photo-1");

      expect(photo).toEqual(mockPhoto);
    });

    it("returns null for non-existent photo", async () => {
      mockLocalStorage.getItem.mockReturnValue(JSON.stringify([]));

      const photo = await PhotoStorage.getPhotoById("non-existent");

      expect(photo).toBeNull();
    });
  });

  describe("updatePhoto", () => {
    it("updates existing photo", async () => {
      const photos = [mockPhoto];
      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(photos));

      const updated = await PhotoStorage.updatePhoto("photo-1", {
        name: "Updated Name",
      });

      expect(updated).toEqual({ ...mockPhoto, name: "Updated Name" });
      // setItem is called with the stringified array, need to parse and check
      const savedPhotos = JSON.parse(mockLocalStorage.setItem.mock.calls[0][1]);
      expect(savedPhotos[0].name).toBe("Updated Name");
    });

    it("returns null for non-existent photo", async () => {
      mockLocalStorage.getItem.mockReturnValue(JSON.stringify([]));

      const updated = await PhotoStorage.updatePhoto("non-existent", {
        name: "Updated",
      });

      expect(updated).toBeNull();
      expect(mockLocalStorage.setItem).not.toHaveBeenCalled();
    });
  });

  describe("deletePhoto", () => {
    it("deletes a photo", async () => {
      const photos = [mockPhoto, { ...mockPhoto, id: "photo-2" }];
      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(photos));

      const success = await PhotoStorage.deletePhoto("photo-1");

      expect(success).toBe(true);
      expect(mockLocalStorage.setItem).toHaveBeenCalled();

      // Find the setItem call that updates the photos
      const setItemCalls = mockLocalStorage.setItem.mock.calls;
      const photosCall = setItemCalls.find(
        (call) => call[0] === "virgil_camera_photos",
      );
      expect(photosCall).toBeDefined();

      const savedData = JSON.parse(photosCall[1]);
      expect(savedData).toHaveLength(1);
      expect(savedData[0].id).toBe("photo-2");
    });

    it("returns false for non-existent photo", async () => {
      mockLocalStorage.getItem.mockReturnValue(JSON.stringify([]));

      const success = await PhotoStorage.deletePhoto("non-existent");

      expect(success).toBe(false);
    });
  });

  describe("deletePhotos", () => {
    it("deletes multiple photos", async () => {
      const photos = [
        { ...mockPhoto, id: "photo-1" },
        { ...mockPhoto, id: "photo-2" },
        { ...mockPhoto, id: "photo-3" },
      ];
      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(photos));

      const deletedCount = await PhotoStorage.deletePhotos([
        "photo-1",
        "photo-3",
      ]);

      expect(deletedCount).toBe(2);

      const setItemCalls = mockLocalStorage.setItem.mock.calls;
      const photosCall = setItemCalls.find(
        (call) => call[0] === "virgil_camera_photos",
      );
      expect(photosCall).toBeDefined();

      const savedData = JSON.parse(photosCall[1]);
      expect(savedData).toHaveLength(1);
      expect(savedData[0].id).toBe("photo-2");
    });

    it("handles partial deletion", async () => {
      const photos = [
        { ...mockPhoto, id: "photo-1" },
        { ...mockPhoto, id: "photo-2" },
      ];
      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(photos));

      const deletedCount = await PhotoStorage.deletePhotos([
        "photo-1",
        "non-existent",
      ]);

      expect(deletedCount).toBe(1);
    });
  });

  describe("toggleFavorite", () => {
    it("toggles favorite status on", async () => {
      const photos = [{ ...mockPhoto, isFavorite: false }];
      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(photos));

      const newStatus = await PhotoStorage.toggleFavorite("photo-1");

      expect(newStatus).toBe(true);

      const savedData = JSON.parse(mockLocalStorage.setItem.mock.calls[0][1]);
      expect(savedData[0].isFavorite).toBe(true);
    });

    it("toggles favorite status off", async () => {
      const photos = [{ ...mockPhoto, isFavorite: true }];
      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(photos));

      const newStatus = await PhotoStorage.toggleFavorite("photo-1");

      expect(newStatus).toBe(false);
    });

    it("returns false for non-existent photo", async () => {
      mockLocalStorage.getItem.mockReturnValue(JSON.stringify([]));

      const result = await PhotoStorage.toggleFavorite("non-existent");
      expect(result).toBe(false);
    });
  });

  describe("clearAllPhotos", () => {
    it("removes all photos from storage", async () => {
      const photos = [mockPhoto, { ...mockPhoto, id: "photo-2" }];
      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(photos));

      await PhotoStorage.clearAllPhotos();

      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith(
        "virgil_camera_photos",
      );
    });
  });

  describe("getStorageInfo", () => {
    it("returns storage information", async () => {
      const photos = [
        { ...mockPhoto, size: 1024 },
        { ...mockPhoto, id: "photo-2", size: 2048 },
      ];
      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(photos));

      const info = await PhotoStorage.getStorageInfo();

      expect(info).toEqual({
        totalPhotos: 2,
        totalSize: 3072,
        maxSize: 50 * 1024 * 1024, // 50MB default
        usedPercentage: expect.any(Number),
        favoriteCount: 0,
      });
    });

    it("handles empty storage", async () => {
      mockLocalStorage.getItem.mockReturnValue(null);

      const info = await PhotoStorage.getStorageInfo();

      expect(info).toEqual({
        totalPhotos: 0,
        totalSize: 0,
        maxSize: 50 * 1024 * 1024, // 50MB default
        usedPercentage: 0,
        favoriteCount: 0,
      });
    });
  });

  describe("exportPhotos", () => {
    it("exports all photos", async () => {
      const photos = [mockPhoto];
      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(photos));

      const exported = await PhotoStorage.exportPhotos(photos);

      const exportedData = JSON.parse(exported);
      expect(exportedData).toEqual({
        version: "1.0.0",
        timestamp: expect.any(Number),
        photos: photos,
        totalPhotos: 1,
        totalSize: 1024,
      });
    });
  });

  describe("importPhotos", () => {
    it("imports photos from valid JSON", async () => {
      const importData = {
        version: "1.0.0",
        exportDate: new Date().toISOString(),
        photos: [mockPhoto],
      };

      mockLocalStorage.getItem.mockReturnValue(JSON.stringify([]));

      const imported = await PhotoStorage.importPhotos(
        JSON.stringify(importData),
      );

      expect(imported).toBe(1);
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        "virgil_camera_photos",
        JSON.stringify([mockPhoto]),
      );
    });

    it("handles invalid import data", async () => {
      const invalidData = "invalid json";

      await expect(PhotoStorage.importPhotos(invalidData)).rejects.toThrow();
    });
  });
});
