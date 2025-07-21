import { renderHook, act } from "@testing-library/react";
import { useDogFavorites } from "./useDogFavorites";
import type { DogImage } from "./useDogApi";

describe("useDogFavorites", () => {
  const mockDog1: DogImage = {
    url: "https://images.dog.ceo/breeds/akita/512.jpg",
    breed: "akita",
    id: "dog-1",
  };

  const mockDog2: DogImage = {
    url: "https://images.dog.ceo/breeds/beagle/123.jpg",
    breed: "beagle",
    id: "dog-2",
  };

  beforeEach(() => {
    // Clear localStorage
    localStorage.clear();
    jest.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe("initial state", () => {
    it("should initialize with empty favorites when localStorage is empty", () => {
      const { result } = renderHook(() => useDogFavorites());

      expect(result.current.favorites).toEqual([]);
    });

    it("should initialize with favorites from localStorage", () => {
      const storedFavorites = [mockDog1, mockDog2];
      localStorage.setItem(
        "virgil_dog_favorites",
        JSON.stringify(storedFavorites),
      );

      const { result } = renderHook(() => useDogFavorites());

      expect(result.current.favorites).toEqual(storedFavorites);
    });

    it("should handle invalid JSON in localStorage gracefully", () => {
      localStorage.setItem("virgil_dog_favorites", "invalid json");

      const { result } = renderHook(() => useDogFavorites());

      expect(result.current.favorites).toEqual([]);
      expect(console.error).toHaveBeenCalledWith(
        "Failed to parse favorites from localStorage:",
        expect.any(Error),
      );
    });

    it("should handle localStorage.getItem errors gracefully", () => {
      const mockGetItem = jest.spyOn(Storage.prototype, "getItem");
      mockGetItem.mockImplementation(() => {
        throw new Error("Storage error");
      });

      const { result } = renderHook(() => useDogFavorites());

      expect(result.current.favorites).toEqual([]);
      expect(console.error).toHaveBeenCalledWith(
        "Failed to parse favorites from localStorage:",
        expect.any(Error),
      );

      mockGetItem.mockRestore();
    });
  });

  describe("toggleFavorite", () => {
    it("should add a new favorite", () => {
      const { result } = renderHook(() => useDogFavorites());

      act(() => {
        result.current.toggleFavorite(mockDog1);
      });

      expect(result.current.favorites).toEqual([mockDog1]);
    });

    it("should remove an existing favorite", () => {
      localStorage.setItem("virgil_dog_favorites", JSON.stringify([mockDog1]));
      const { result } = renderHook(() => useDogFavorites());

      act(() => {
        result.current.toggleFavorite(mockDog1);
      });

      expect(result.current.favorites).toEqual([]);
    });

    it("should toggle multiple favorites correctly", () => {
      const { result } = renderHook(() => useDogFavorites());

      // Add first dog
      act(() => {
        result.current.toggleFavorite(mockDog1);
      });
      expect(result.current.favorites).toEqual([mockDog1]);

      // Add second dog
      act(() => {
        result.current.toggleFavorite(mockDog2);
      });
      expect(result.current.favorites).toEqual([mockDog1, mockDog2]);

      // Remove first dog
      act(() => {
        result.current.toggleFavorite(mockDog1);
      });
      expect(result.current.favorites).toEqual([mockDog2]);

      // Remove second dog
      act(() => {
        result.current.toggleFavorite(mockDog2);
      });
      expect(result.current.favorites).toEqual([]);
    });
  });

  describe("isFavorited", () => {
    it("should return true for favorited images", () => {
      localStorage.setItem("virgil_dog_favorites", JSON.stringify([mockDog1]));
      const { result } = renderHook(() => useDogFavorites());

      expect(result.current.isFavorited(mockDog1.url)).toBe(true);
    });

    it("should return false for non-favorited images", () => {
      localStorage.setItem("virgil_dog_favorites", JSON.stringify([mockDog1]));
      const { result } = renderHook(() => useDogFavorites());

      expect(result.current.isFavorited(mockDog2.url)).toBe(false);
    });

    it("should return false when favorites is empty", () => {
      const { result } = renderHook(() => useDogFavorites());

      expect(result.current.isFavorited(mockDog1.url)).toBe(false);
    });

    it("should update correctly after toggling favorites", () => {
      const { result } = renderHook(() => useDogFavorites());

      expect(result.current.isFavorited(mockDog1.url)).toBe(false);

      act(() => {
        result.current.toggleFavorite(mockDog1);
      });

      expect(result.current.isFavorited(mockDog1.url)).toBe(true);

      act(() => {
        result.current.toggleFavorite(mockDog1);
      });

      expect(result.current.isFavorited(mockDog1.url)).toBe(false);
    });
  });

  describe("localStorage persistence", () => {
    it("should save favorites to localStorage when adding", () => {
      const { result } = renderHook(() => useDogFavorites());

      act(() => {
        result.current.toggleFavorite(mockDog1);
      });

      const stored = localStorage.getItem("virgil_dog_favorites");
      expect(stored).toBe(JSON.stringify([mockDog1]));
    });

    it("should update localStorage when removing favorites", () => {
      localStorage.setItem(
        "virgil_dog_favorites",
        JSON.stringify([mockDog1, mockDog2]),
      );
      const { result } = renderHook(() => useDogFavorites());

      act(() => {
        result.current.toggleFavorite(mockDog1);
      });

      const stored = localStorage.getItem("virgil_dog_favorites");
      expect(stored).toBe(JSON.stringify([mockDog2]));
    });

    it("should handle localStorage.setItem errors gracefully", () => {
      const mockSetItem = jest.spyOn(Storage.prototype, "setItem");
      mockSetItem.mockImplementation(() => {
        throw new Error("Storage error");
      });

      const { result } = renderHook(() => useDogFavorites());

      act(() => {
        result.current.toggleFavorite(mockDog1);
      });

      expect(console.error).toHaveBeenCalledWith(
        "Failed to save favorites to localStorage:",
        expect.any(Error),
      );
      // The state should still update even if localStorage fails
      expect(result.current.favorites).toEqual([mockDog1]);

      mockSetItem.mockRestore();
    });
  });

  describe("multiple hook instances", () => {
    it("should share favorites between multiple hook instances", () => {
      const { result: result1 } = renderHook(() => useDogFavorites());

      // Add favorite in first instance
      act(() => {
        result1.current.toggleFavorite(mockDog1);
      });

      // Re-render second hook to pick up localStorage changes
      const { result: result3 } = renderHook(() => useDogFavorites());

      expect(result3.current.favorites).toEqual([mockDog1]);
      expect(result3.current.isFavorited(mockDog1.url)).toBe(true);
    });
  });
});
