import { storage, STORAGE_KEYS } from "./storage";
import { logger } from "./logger";

// Mock logger
jest.mock("./logger", () => ({
  logger: {
    error: jest.fn(),
  },
}));

// Helper to access private properties for testing
const getFullKey = (key: string) => "virgil_" + key;

describe("Storage", () => {
  // Store original localStorage for restoration
  const originalLocalStorage = global.localStorage;

  beforeEach(() => {
    // Clear localStorage and all mocks
    localStorage.clear();
    jest.clearAllMocks();

    // Reset Date.now for consistent timestamps
    jest.spyOn(Date, "now").mockReturnValue(1000000);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  afterAll(() => {
    // Restore original localStorage
    global.localStorage = originalLocalStorage;
  });

  describe("set", () => {
    it("should store simple values", () => {
      expect(storage.set("test", "value")).toBe(true);

      const stored = JSON.parse(localStorage.getItem(getFullKey("test"))!);
      expect(stored.value).toBe("value");
      expect(stored.timestamp).toBe(1000000);
      expect(stored.expiresAt).toBeUndefined();
    });

    it("should store complex objects", () => {
      const complexObj = {
        user: { id: 1, name: "Test" },
        settings: { theme: "dark", notifications: true },
        array: [1, 2, 3],
      };

      expect(storage.set("complex", complexObj)).toBe(true);

      const stored = JSON.parse(localStorage.getItem(getFullKey("complex"))!);
      expect(stored.value).toEqual(complexObj);
    });

    it("should store with expiration", () => {
      expect(storage.set("expiring", "value", 30)).toBe(true); // 30 minutes

      const stored = JSON.parse(localStorage.getItem(getFullKey("expiring"))!);
      expect(stored.value).toBe("value");
      expect(stored.expiresAt).toBe(1000000 + 30 * 60 * 1000);
    });

    it("should handle storage quota exceeded", () => {
      const mockSetItem = jest.spyOn(Storage.prototype, "setItem");
      mockSetItem.mockImplementation(() => {
        throw new Error("QuotaExceededError");
      });

      expect(storage.set("test", "value")).toBe(false);
      expect(logger.error).toHaveBeenCalledWith(
        "Failed to set item in localStorage: test",
        expect.any(Error),
      );
    });

    it("should handle circular references gracefully", () => {
      const circular: any = { a: 1 };
      circular.self = circular;

      expect(storage.set("circular", circular)).toBe(false);
      expect(logger.error).toHaveBeenCalled();
    });

    it("should handle null and undefined values", () => {
      expect(storage.set("null", null)).toBe(true);
      expect(storage.set("undefined", undefined)).toBe(true);

      expect(storage.get("null")).toBeNull();
      expect(storage.get("undefined")).toBeUndefined();
    });
  });

  describe("get", () => {
    it("should retrieve stored values", () => {
      storage.set("test", "value");
      expect(storage.get("test")).toBe("value");
    });

    it("should return default value for missing keys", () => {
      expect(storage.get("missing")).toBeNull();
      expect(storage.get("missing", "default")).toBe("default");
    });

    it("should handle expired items", () => {
      storage.set("expiring", "value", 30); // 30 minutes

      // Fast forward time past expiration
      jest.spyOn(Date, "now").mockReturnValue(1000000 + 31 * 60 * 1000);

      expect(storage.get("expiring")).toBeNull();
      expect(storage.has("expiring")).toBe(false); // Should be removed
    });

    it("should handle corrupted data", () => {
      localStorage.setItem(getFullKey("corrupted"), "not valid json");

      expect(storage.get("corrupted", "default")).toBe("default");
      expect(logger.error).toHaveBeenCalledWith(
        "Failed to get item from localStorage: corrupted",
        expect.any(Error),
      );
    });

    it("should handle localStorage errors", () => {
      const mockGetItem = jest.spyOn(Storage.prototype, "getItem");
      mockGetItem.mockImplementation(() => {
        throw new Error("SecurityError");
      });

      expect(storage.get("test", "fallback")).toBe("fallback");
      expect(logger.error).toHaveBeenCalled();
    });

    it("should handle items without timestamp", () => {
      // Simulate old format without timestamp
      localStorage.setItem(
        getFullKey("old"),
        JSON.stringify({ value: "oldValue" }),
      );

      expect(storage.get("old")).toBe("oldValue");
    });
  });

  describe("remove", () => {
    it("should remove items", () => {
      storage.set("test", "value");
      expect(storage.has("test")).toBe(true);

      expect(storage.remove("test")).toBe(true);
      expect(storage.has("test")).toBe(false);
    });

    it("should handle removal of non-existent items", () => {
      expect(storage.remove("nonexistent")).toBe(true);
    });

    it("should handle localStorage errors", () => {
      const mockRemoveItem = jest.spyOn(Storage.prototype, "removeItem");
      mockRemoveItem.mockImplementation(() => {
        throw new Error("SecurityError");
      });

      expect(storage.remove("test")).toBe(false);
      expect(logger.error).toHaveBeenCalledWith(
        "Failed to remove item from localStorage: test",
        expect.any(Error),
      );
    });
  });

  describe("clear", () => {
    it("should clear only app-prefixed items", () => {
      // Set up mixed storage
      storage.set("app1", "value1");
      storage.set("app2", "value2");
      localStorage.setItem("other_key", "other_value");
      localStorage.setItem("virgil_keep", "should be removed");

      expect(storage.clear()).toBe(true);

      expect(storage.has("app1")).toBe(false);
      expect(storage.has("app2")).toBe(false);
      expect(localStorage.getItem("other_key")).toBe("other_value");
      expect(localStorage.getItem("virgil_keep")).toBeNull();
    });

    it("should handle errors during clear", () => {
      storage.set("test", "value");

      const mockRemoveItem = jest.spyOn(Storage.prototype, "removeItem");
      mockRemoveItem.mockImplementation(() => {
        throw new Error("SecurityError");
      });

      expect(storage.clear()).toBe(false);
      expect(logger.error).toHaveBeenCalledWith(
        "Failed to clear localStorage",
        expect.any(Error),
      );
    });
  });

  describe("has", () => {
    it("should check item existence", () => {
      expect(storage.has("test")).toBe(false);

      storage.set("test", "value");
      expect(storage.has("test")).toBe(true);

      storage.remove("test");
      expect(storage.has("test")).toBe(false);
    });

    it("should work with expired items", () => {
      storage.set("expiring", "value", -1); // Already expired

      // Item exists but is expired
      expect(storage.has("expiring")).toBe(true);

      // Getting it will remove it
      storage.get("expiring");
      expect(storage.has("expiring")).toBe(false);
    });
  });

  describe("keys", () => {
    it("should return all app keys", () => {
      storage.set("key1", "value1");
      storage.set("key2", "value2");
      storage.set("key3", "value3");
      localStorage.setItem("other_key", "value");

      const keys = storage.keys();
      expect(keys).toHaveLength(3);
      expect(keys).toContain("key1");
      expect(keys).toContain("key2");
      expect(keys).toContain("key3");
    });

    it("should return empty array when no keys exist", () => {
      expect(storage.keys()).toEqual([]);
    });
  });

  describe("getSize", () => {
    it("should calculate size of stored item", () => {
      storage.set("test", "hello world");

      const size = storage.getSize("test");
      expect(size).toBeGreaterThan(0);
      // Should include JSON wrapper overhead
      expect(size).toBeGreaterThan("hello world".length);
    });

    it("should return 0 for non-existent items", () => {
      expect(storage.getSize("nonexistent")).toBe(0);
    });

    it("should handle large objects", () => {
      const largeArray = new Array(1000).fill("test data");
      storage.set("large", largeArray);

      const size = storage.getSize("large");
      expect(size).toBeGreaterThan(1000 * "test data".length);
    });
  });

  describe("getTotalSize", () => {
    it("should calculate total size of all items", () => {
      storage.set("item1", "value1");
      storage.set("item2", { data: "value2" });
      storage.set("item3", [1, 2, 3, 4, 5]);

      const totalSize = storage.getTotalSize();
      const individualSizes =
        storage.getSize("item1") +
        storage.getSize("item2") +
        storage.getSize("item3");

      expect(totalSize).toBe(individualSizes);
      expect(totalSize).toBeGreaterThan(0);
    });

    it("should return 0 when storage is empty", () => {
      expect(storage.getTotalSize()).toBe(0);
    });

    it("should only count app-prefixed items", () => {
      storage.set("app", "value");
      localStorage.setItem("other", "should not count");

      const totalSize = storage.getTotalSize();
      expect(totalSize).toBe(storage.getSize("app"));
    });
  });

  describe("STORAGE_KEYS", () => {
    it("should have all expected keys", () => {
      expect(STORAGE_KEYS.USER_PROFILE).toBe("userProfile");
      expect(STORAGE_KEYS.FAVORITE_DOGS).toBe("favoriteDogs");
      expect(STORAGE_KEYS.NOTES).toBe("notes");
      expect(STORAGE_KEYS.NOTE_CATEGORIES).toBe("noteCategories");
      expect(STORAGE_KEYS.HABITS).toBe("habits");
      expect(STORAGE_KEYS.USER_TIMEZONE).toBe("userTimezone");
      expect(STORAGE_KEYS.WEATHER_UNIT).toBe("weatherUnit");
      expect(STORAGE_KEYS.THEME).toBe("theme");
      expect(STORAGE_KEYS.LANGUAGE).toBe("language");
      expect(STORAGE_KEYS.CAMERA_PERMISSION).toBe("cameraPermission");
      expect(STORAGE_KEYS.LOCATION_PERMISSION).toBe("locationPermission");
      expect(STORAGE_KEYS.NOTIFICATION_PERMISSION).toBe(
        "notificationPermission",
      );
    });

    it("should be immutable", () => {
      expect(() => {
        // @ts-expect-error - Testing runtime immutability
        STORAGE_KEYS.USER_PROFILE = "changed";
      }).toThrow();
    });
  });

  describe("edge cases and integration", () => {
    it("should handle rapid get/set operations", () => {
      for (let i = 0; i < 100; i++) {
        storage.set(`key${i}`, i);
      }

      for (let i = 0; i < 100; i++) {
        expect(storage.get(`key${i}`)).toBe(i);
      }

      expect(storage.keys()).toHaveLength(100);
    });

    it("should handle concurrent expiration", () => {
      // Set multiple items with same expiration
      const now = Date.now();
      jest.spyOn(Date, "now").mockReturnValue(now);

      storage.set("exp1", "value1", 10);
      storage.set("exp2", "value2", 10);
      storage.set("exp3", "value3", 20);

      // Fast forward 15 minutes
      jest.spyOn(Date, "now").mockReturnValue(now + 15 * 60 * 1000);

      expect(storage.get("exp1")).toBeNull();
      expect(storage.get("exp2")).toBeNull();
      expect(storage.get("exp3")).toBe("value3");
    });

    it("should work with all JavaScript types", () => {
      const testCases = [
        { key: "string", value: "hello" },
        { key: "number", value: 42 },
        { key: "boolean", value: true },
        { key: "null", value: null },
        { key: "undefined", value: undefined },
        { key: "array", value: [1, 2, 3] },
        { key: "object", value: { a: 1, b: 2 } },
        { key: "date", value: new Date().toISOString() },
      ];

      testCases.forEach(({ key, value }) => {
        expect(storage.set(key, value)).toBe(true);
        expect(storage.get(key)).toEqual(value);
      });
    });

    it("should handle storage events from other tabs", () => {
      // Simulate storage event from another tab
      const event = new StorageEvent("storage", {
        key: getFullKey("external"),
        newValue: JSON.stringify({
          value: "from other tab",
          timestamp: Date.now(),
        }),
        storageArea: localStorage,
      });

      window.dispatchEvent(event);

      // Should be able to read the value
      expect(storage.get("external")).toBe("from other tab");
    });
  });

  describe("real-world scenarios", () => {
    it("should handle user preferences workflow", () => {
      // Save user preferences
      const preferences = {
        theme: "dark",
        language: "en",
        notifications: true,
      };

      storage.set(STORAGE_KEYS.THEME, preferences.theme);
      storage.set(STORAGE_KEYS.LANGUAGE, preferences.language);

      // Retrieve preferences
      expect(storage.get(STORAGE_KEYS.THEME)).toBe("dark");
      expect(storage.get(STORAGE_KEYS.LANGUAGE)).toBe("en");

      // Update preference
      storage.set(STORAGE_KEYS.THEME, "light");
      expect(storage.get(STORAGE_KEYS.THEME)).toBe("light");
    });

    it("should handle caching with expiration", () => {
      // Cache API response for 5 minutes
      const apiResponse = {
        data: [1, 2, 3],
        timestamp: Date.now(),
      };

      storage.set("api_cache", apiResponse, 5);

      // Should retrieve within expiration
      expect(storage.get("api_cache")).toEqual(apiResponse);

      // Should expire after time
      jest.spyOn(Date, "now").mockReturnValue(Date.now() + 6 * 60 * 1000);
      expect(storage.get("api_cache")).toBeNull();
    });

    it("should handle quota management", () => {
      const sizes = [];

      // Fill storage with data
      for (let i = 0; i < 10; i++) {
        const data = new Array(100).fill(`data${i}`);
        storage.set(`quota${i}`, data);
        sizes.push(storage.getSize(`quota${i}`));
      }

      const totalSize = storage.getTotalSize();
      expect(totalSize).toBe(sizes.reduce((a, b) => a + b, 0));

      // Clean up old data when needed
      if (totalSize > 50000) {
        // 50KB threshold
        const oldKeys = storage.keys().filter((k) => k.startsWith("quota"));
        oldKeys.slice(0, 5).forEach((k) => storage.remove(k));
      }
    });
  });
});
