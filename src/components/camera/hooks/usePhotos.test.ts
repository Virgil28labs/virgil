import { renderHook, act } from "@testing-library/react";
import { usePhotos } from "./usePhotos";
import { PhotoStorage } from "../utils/photoStorage";
import { CameraUtils } from "../utils/cameraUtils";
import type { SavedPhoto } from "../../../types/camera.types";

// Mock the photo storage and camera utilities
jest.mock("../utils/photoStorage");
jest.mock("../utils/cameraUtils");

describe("usePhotos", () => {
  const mockPhotos: SavedPhoto[] = [
    {
      id: "photo-1",
      dataUrl: "data:image/jpeg;base64,test1",
      timestamp: Date.now() - 1000,
      isFavorite: false,
      name: "Photo One",
      size: 1024,
    },
    {
      id: "photo-2",
      dataUrl: "data:image/jpeg;base64,test2",
      timestamp: Date.now() - 2000,
      isFavorite: true,
      name: "Photo Two",
      size: 2048,
    },
    {
      id: "photo-3",
      dataUrl: "data:image/jpeg;base64,test3",
      timestamp: Date.now() - 3000,
      isFavorite: false,
      name: "Photo Three",
      size: 3072,
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    (PhotoStorage.initialize as jest.Mock).mockResolvedValue(undefined);
    (PhotoStorage.getAllPhotos as jest.Mock).mockResolvedValue(mockPhotos);
    (PhotoStorage.getFavoritePhotos as jest.Mock).mockResolvedValue([
      mockPhotos[1],
    ]);
    (PhotoStorage.savePhoto as jest.Mock).mockResolvedValue({
      id: "new-photo",
      dataUrl: "data:image/jpeg;base64,new",
      timestamp: Date.now(),
      isFavorite: false,
    });
    (PhotoStorage.deletePhoto as jest.Mock).mockResolvedValue(true);
    (PhotoStorage.deletePhotos as jest.Mock).mockResolvedValue(2);
    (PhotoStorage.toggleFavorite as jest.Mock).mockResolvedValue(true);
    (CameraUtils.downloadPhoto as jest.Mock).mockResolvedValue(undefined);
    (CameraUtils.sharePhoto as jest.Mock).mockResolvedValue(undefined);
    (CameraUtils.generatePhotoName as jest.Mock).mockReturnValue(
      "photo_20240101_120000.jpg",
    );
  });

  it("initializes with default state", async () => {
    const { result } = renderHook(() => usePhotos());

    // The hook loads photos on mount, so we need to wait
    await act(async () => {
      // Wait for automatic load to complete
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(result.current.photos).toEqual(mockPhotos);
    expect(result.current.favorites).toEqual([mockPhotos[1]]);
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it("loads photos on mount", async () => {
    const { result } = renderHook(() => usePhotos());

    await act(async () => {
      await result.current.loadPhotos();
    });

    expect(PhotoStorage.getAllPhotos).toHaveBeenCalled();
    expect(PhotoStorage.getFavoritePhotos).toHaveBeenCalled();
    expect(result.current.photos).toEqual(mockPhotos);
    expect(result.current.favorites).toEqual([mockPhotos[1]]);
    expect(result.current.loading).toBe(false);
  });

  it("handles error when loading photos fails", async () => {
    const error = new Error("Failed to load");
    (PhotoStorage.getAllPhotos as jest.Mock).mockRejectedValueOnce(error);
    (PhotoStorage.getFavoritePhotos as jest.Mock).mockResolvedValue([]);

    const { result } = renderHook(() => usePhotos());

    // Wait for initial load to fail
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(result.current.error).toBe("Failed to load");
    expect(result.current.photos).toEqual([]);
    expect(result.current.loading).toBe(false);
  });

  it("saves a new photo", async () => {
    const { result } = renderHook(() => usePhotos());

    const newPhoto = await act(async () => {
      return await result.current.savePhoto(
        "data:image/jpeg;base64,newphoto",
        "New Photo",
      );
    });

    expect(PhotoStorage.savePhoto).toHaveBeenCalledWith({
      dataUrl: "data:image/jpeg;base64,newphoto",
      timestamp: expect.any(Number),
      isFavorite: false,
      name: "New Photo",
    });
    expect(newPhoto).toEqual({
      id: "new-photo",
      dataUrl: "data:image/jpeg;base64,new",
      timestamp: expect.any(Number),
      isFavorite: false,
    });
  });

  it("handles error when saving photo fails", async () => {
    (PhotoStorage.savePhoto as jest.Mock).mockRejectedValueOnce(
      new Error("Save failed"),
    );

    const { result } = renderHook(() => usePhotos());

    const newPhoto = await act(async () => {
      return await result.current.savePhoto("data:image/jpeg;base64,error");
    });

    expect(newPhoto).toBeNull();
    expect(result.current.error).toBe("Save failed");
  });

  it("deletes a photo", async () => {
    const { result } = renderHook(() => usePhotos());

    // Load photos first
    await act(async () => {
      await result.current.loadPhotos();
    });

    const success = await act(async () => {
      return await result.current.deletePhoto("photo-1");
    });

    expect(PhotoStorage.deletePhoto).toHaveBeenCalledWith("photo-1");
    expect(success).toBe(true);
  });

  it("handles error when deleting photo fails", async () => {
    (PhotoStorage.deletePhoto as jest.Mock).mockRejectedValueOnce(
      new Error("Delete failed"),
    );

    const { result } = renderHook(() => usePhotos());

    const success = await act(async () => {
      return await result.current.deletePhoto("photo-1");
    });

    expect(success).toBe(false);
    expect(result.current.error).toBe("Delete failed");
  });

  it("deletes multiple photos", async () => {
    const { result } = renderHook(() => usePhotos());

    const deletedCount = await act(async () => {
      return await result.current.deletePhotos(["photo-1", "photo-2"]);
    });

    expect(PhotoStorage.deletePhotos).toHaveBeenCalledWith([
      "photo-1",
      "photo-2",
    ]);
    expect(deletedCount).toBe(2);
  });

  it("toggles photo favorite status", async () => {
    const { result } = renderHook(() => usePhotos());

    // Load photos first
    await act(async () => {
      await result.current.loadPhotos();
    });

    const success = await act(async () => {
      return await result.current.toggleFavorite("photo-1");
    });

    expect(PhotoStorage.toggleFavorite).toHaveBeenCalledWith("photo-1");
    expect(success).toBe(true);
  });

  it("gets photo by id", async () => {
    const { result } = renderHook(() => usePhotos());

    // Load photos first
    await act(async () => {
      await result.current.loadPhotos();
    });

    const photo = result.current.getPhotoById("photo-2");
    expect(photo).toEqual(mockPhotos[1]);

    const notFound = result.current.getPhotoById("non-existent");
    expect(notFound).toBeNull();
  });

  it("searches photos by name", async () => {
    const { result } = renderHook(() => usePhotos());

    // Load photos first
    await act(async () => {
      await result.current.loadPhotos();
    });

    const searchResults = result.current.searchPhotos("two");
    expect(searchResults).toEqual([mockPhotos[1]]);

    const noResults = result.current.searchPhotos("xyz");
    expect(noResults).toEqual([]);
  });

  it("sorts photos by date", async () => {
    const { result } = renderHook(() => usePhotos());

    // Load photos first
    await act(async () => {
      await result.current.loadPhotos();
    });

    const sortedAsc = result.current.sortPhotos(mockPhotos, "date", "asc");
    expect(sortedAsc[0].id).toBe("photo-3"); // Oldest first

    const sortedDesc = result.current.sortPhotos(mockPhotos, "date", "desc");
    expect(sortedDesc[0].id).toBe("photo-1"); // Newest first
  });

  it("sorts photos by name", async () => {
    const { result } = renderHook(() => usePhotos());

    const sortedAsc = result.current.sortPhotos(mockPhotos, "name", "asc");
    expect(sortedAsc[0].id).toBe("photo-1"); // Photo One

    const sortedDesc = result.current.sortPhotos(mockPhotos, "name", "desc");
    expect(sortedDesc[0].id).toBe("photo-2"); // Photo Two
  });

  it("sorts photos by size", async () => {
    const { result } = renderHook(() => usePhotos());

    const sortedAsc = result.current.sortPhotos(mockPhotos, "size", "asc");
    expect(sortedAsc[0].id).toBe("photo-1"); // Smallest

    const sortedDesc = result.current.sortPhotos(mockPhotos, "size", "desc");
    expect(sortedDesc[0].id).toBe("photo-3"); // Largest
  });

  it("clears error", async () => {
    const { result } = renderHook(() => usePhotos());

    // Create an error first
    (PhotoStorage.getAllPhotos as jest.Mock).mockRejectedValueOnce(
      new Error("Test error"),
    );
    await act(async () => {
      await result.current.loadPhotos();
    });

    expect(result.current.error).toBeTruthy();

    act(() => {
      result.current.clearError();
    });

    expect(result.current.error).toBeNull();
  });

  it("downloads a single photo", async () => {
    const { result } = renderHook(() => usePhotos());

    // Load photos first
    await act(async () => {
      await result.current.loadPhotos();
    });

    const success = await act(async () => {
      return await result.current.downloadPhoto(mockPhotos[0]);
    });

    expect(CameraUtils.downloadPhoto).toHaveBeenCalledWith(
      mockPhotos[0].dataUrl,
      "Photo One",
    );
    expect(success).toBe(true);
  });

  it("shares a photo", async () => {
    const { result } = renderHook(() => usePhotos());

    // Load photos first
    await act(async () => {
      await result.current.loadPhotos();
    });

    const success = await act(async () => {
      return await result.current.sharePhoto(mockPhotos[0]);
    });

    expect(CameraUtils.sharePhoto).toHaveBeenCalledWith(
      mockPhotos[0].dataUrl,
      "Photo One",
    );
    expect(success).toBe(true);
  });

  it("handles error when downloading photo fails", async () => {
    (CameraUtils.downloadPhoto as jest.Mock).mockRejectedValueOnce(
      new Error("Download failed"),
    );

    const { result } = renderHook(() => usePhotos());

    // Load photos first
    await act(async () => {
      await result.current.loadPhotos();
    });

    const success = await act(async () => {
      return await result.current.downloadPhoto(mockPhotos[0]);
    });

    expect(success).toBe(false);
    expect(result.current.error).toBe("Download failed");
  });

  it("clears all photos", async () => {
    (PhotoStorage.clearAllPhotos as jest.Mock).mockResolvedValue(undefined);

    const { result } = renderHook(() => usePhotos());

    // Load photos first
    await act(async () => {
      await result.current.loadPhotos();
    });

    expect(result.current.photos).toHaveLength(3);

    const success = await act(async () => {
      return await result.current.clearAllPhotos();
    });

    expect(PhotoStorage.clearAllPhotos).toHaveBeenCalled();
    expect(success).toBe(true);
    expect(result.current.photos).toEqual([]);
    expect(result.current.favorites).toEqual([]);
  });

  it("updates a photo", async () => {
    const updatedPhoto = { ...mockPhotos[0], name: "Updated Photo" };
    (PhotoStorage.updatePhoto as jest.Mock).mockResolvedValue(updatedPhoto);

    const { result } = renderHook(() => usePhotos());

    // Load photos first
    await act(async () => {
      await result.current.loadPhotos();
    });

    const updated = await act(async () => {
      return await result.current.updatePhoto("photo-1", {
        name: "Updated Photo",
      });
    });

    expect(PhotoStorage.updatePhoto).toHaveBeenCalledWith("photo-1", {
      name: "Updated Photo",
    });
    expect(updated).toEqual(updatedPhoto);
    expect(result.current.photos[0].name).toBe("Updated Photo");
  });
});
