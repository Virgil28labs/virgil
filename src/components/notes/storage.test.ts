/**
 * Tests for IndexedDB storage layer for Notes application
 */

import { notesStorage } from "./storage";
import { Entry, NotesError, ErrorType, TagType, ActionType } from "./types";
import { STORAGE_CONFIG } from "./constants";

// Mock IndexedDB
const mockObjectStore = {
  add: jest.fn(),
  put: jest.fn(),
  delete: jest.fn(),
  clear: jest.fn(),
  getAll: jest.fn(),
  index: jest.fn(),
  createIndex: jest.fn(),
};

const mockTransaction = {
  objectStore: jest.fn(() => mockObjectStore),
  onerror: null,
  oncomplete: null,
};

const mockDb = {
  transaction: jest.fn(() => mockTransaction),
  objectStoreNames: {
    contains: jest.fn(),
  },
  createObjectStore: jest.fn(() => mockObjectStore),
  close: jest.fn(),
  onversionchange: null,
};

const mockOpenDbRequest = {
  result: mockDb,
  error: null,
  onsuccess: null,
  onerror: null,
  onupgradeneeded: null,
};

// Store original indexedDB
const originalIndexedDB = global.indexedDB;

// Mock indexedDB
beforeAll(() => {
  (global as any).indexedDB = {
    open: jest.fn(() => mockOpenDbRequest),
  };
});

afterAll(() => {
  (global as any).indexedDB = originalIndexedDB;
});

describe("NotesStorage", () => {
  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    // Reset the storage instance
    (notesStorage as any).db = null;
    (notesStorage as any).initPromise = null;
  });

  describe("init", () => {
    it("should initialize database successfully", async () => {
      const initPromise = notesStorage.init();

      // Wait for next tick to ensure promise is created
      await Promise.resolve();

      // Now trigger success
      mockOpenDbRequest.onsuccess?.();

      await initPromise;

      expect(global.indexedDB.open).toHaveBeenCalledWith(
        STORAGE_CONFIG.DB_NAME,
        STORAGE_CONFIG.DB_VERSION,
      );
    });

    it("should handle database open error", async () => {
      const dbError = new Error("Failed to open");
      mockOpenDbRequest.error = dbError;

      setTimeout(() => {
        mockOpenDbRequest.onerror?.();
      }, 0);

      await expect(notesStorage.init()).rejects.toThrow(NotesError);
      await expect(notesStorage.init()).rejects.toMatchObject({
        type: ErrorType.STORAGE_ERROR,
        message: "Failed to open database",
      });
    });

    it("should create object store on upgrade", async () => {
      mockDb.objectStoreNames.contains.mockReturnValue(false);

      const upgradeEvent = {
        target: { result: mockDb },
      };

      setTimeout(() => {
        mockOpenDbRequest.onupgradeneeded?.(upgradeEvent as any);
        mockOpenDbRequest.onsuccess?.();
      }, 0);

      await notesStorage.init();

      expect(mockDb.createObjectStore).toHaveBeenCalledWith(
        STORAGE_CONFIG.STORE_NAME,
        { keyPath: "id" },
      );
      expect(mockObjectStore.createIndex).toHaveBeenCalledWith(
        "timestamp",
        "timestamp",
        { unique: false },
      );
      expect(mockObjectStore.createIndex).toHaveBeenCalledWith("tags", "tags", {
        unique: false,
        multiEntry: true,
      });
    });

    it("should not create object store if it already exists", async () => {
      mockDb.objectStoreNames.contains.mockReturnValue(true);

      const upgradeEvent = {
        target: { result: mockDb },
      };

      setTimeout(() => {
        mockOpenDbRequest.onupgradeneeded?.(upgradeEvent as any);
        mockOpenDbRequest.onsuccess?.();
      }, 0);

      await notesStorage.init();

      expect(mockDb.createObjectStore).not.toHaveBeenCalled();
    });

    it("should prevent multiple simultaneous initialization", async () => {
      // Start two init calls
      const promise1 = notesStorage.init();
      const promise2 = notesStorage.init();

      // Resolve the first one
      mockOpenDbRequest.onsuccess?.();

      const result1 = await promise1;
      const result2 = await promise2;

      // Should only open DB once
      expect(global.indexedDB.open).toHaveBeenCalledTimes(1);
      expect(result1).toBe(result2);
    });

    it("should handle version change", async () => {
      const initPromise = notesStorage.init();
      await Promise.resolve();
      mockOpenDbRequest.onsuccess?.();
      await initPromise;

      // Simulate version change
      mockDb.onversionchange?.();

      expect(mockDb.close).toHaveBeenCalled();
      expect((notesStorage as any).db).toBeNull();
      expect((notesStorage as any).initPromise).toBeNull();
    });
  });

  describe("getAllEntries", () => {
    const mockEntries = [
      {
        id: "1",
        timestamp: "2024-01-01T12:00:00.000Z",
        content: "Test entry 1",
        tags: ["work"] as TagType[],
        actionType: "task" as ActionType,
        tasks: [],
        aiProcessed: false,
        isEdited: false,
      },
      {
        id: "2",
        timestamp: "2024-01-02T12:00:00.000Z",
        content: "Test entry 2",
        tags: ["health"] as TagType[],
        actionType: "note" as ActionType,
        tasks: [],
        aiProcessed: true,
        isEdited: true,
      },
    ];

    beforeEach(async () => {
      // Initialize the DB for these tests
      const initPromise = notesStorage.init();
      await Promise.resolve();
      mockOpenDbRequest.onsuccess?.();
      await initPromise;
    });

    it("should retrieve all entries successfully", async () => {
      mockObjectStore.getAll.mockReturnValue({
        result: mockEntries,
        onsuccess: null,
        onerror: null,
      });

      const getAllRequest = mockObjectStore.getAll();
      setTimeout(() => {
        getAllRequest.onsuccess?.();
      }, 0);

      const entries = await notesStorage.getAllEntries();

      expect(entries).toHaveLength(2);
      expect(entries[0].timestamp).toBeInstanceOf(Date);
      expect(entries[1].timestamp).toBeInstanceOf(Date);
      expect(mockDb.transaction).toHaveBeenCalledWith(
        [STORAGE_CONFIG.STORE_NAME],
        "readonly",
      );
    });

    it("should handle getAll error", async () => {
      const error = new Error("Failed to get entries");
      const getAllRequest = {
        result: null,
        error,
        onsuccess: null,
        onerror: null,
      };
      mockObjectStore.getAll.mockReturnValue(getAllRequest);

      const promise = notesStorage.getAllEntries();

      // Wait for next tick
      await Promise.resolve();

      // Trigger error
      getAllRequest.onerror?.();

      await expect(promise).rejects.toThrow(NotesError);
      await expect(promise).rejects.toMatchObject({
        type: ErrorType.STORAGE_ERROR,
        message: "Failed to retrieve entries",
      });
    });

    it("should initialize DB if not already initialized", async () => {
      // Reset DB state
      (notesStorage as any).db = null;
      (notesStorage as any).initPromise = null;

      mockObjectStore.getAll.mockReturnValue({
        result: [],
        onsuccess: null,
        onerror: null,
      });

      // Start getAllEntries which should trigger init
      const getAllPromise = notesStorage.getAllEntries();

      // Wait for init to be called
      await Promise.resolve();

      // Resolve the init
      mockOpenDbRequest.onsuccess?.();

      // Then resolve getAll
      const getAllRequest = mockObjectStore.getAll();
      getAllRequest.onsuccess?.();

      await getAllPromise;

      expect(global.indexedDB.open).toHaveBeenCalled();
    });
  });

  describe("addEntry", () => {
    const validEntry: Entry = {
      id: "123",
      timestamp: new Date("2024-01-01T12:00:00.000Z"),
      content: "Test content",
      tags: ["work"] as TagType[],
      actionType: "task" as ActionType,
      tasks: [],
      aiProcessed: false,
      isEdited: false,
    };

    beforeEach(async () => {
      // Initialize the DB for these tests
      const initPromise = notesStorage.init();
      await Promise.resolve();
      mockOpenDbRequest.onsuccess?.();
      await initPromise;
    });

    it("should add entry successfully", async () => {
      const addRequest = {
        onsuccess: null,
        onerror: null,
      };
      mockObjectStore.add.mockReturnValue(addRequest);

      setTimeout(() => {
        addRequest.onsuccess?.();
      }, 0);

      await notesStorage.addEntry(validEntry);

      expect(mockObjectStore.add).toHaveBeenCalledWith({
        ...validEntry,
        timestamp: validEntry.timestamp.toISOString(),
      });
      expect(mockDb.transaction).toHaveBeenCalledWith(
        [STORAGE_CONFIG.STORE_NAME],
        "readwrite",
      );
    });

    it("should validate entry before adding", async () => {
      const invalidEntry = { ...validEntry, id: "" };

      await expect(notesStorage.addEntry(invalidEntry)).rejects.toThrow(
        NotesError,
      );
      await expect(notesStorage.addEntry(invalidEntry)).rejects.toMatchObject({
        type: ErrorType.VALIDATION_ERROR,
        message: "Entry must have id and content",
      });

      const noContentEntry = { ...validEntry, content: "" };

      await expect(notesStorage.addEntry(noContentEntry)).rejects.toThrow(
        NotesError,
      );
      await expect(notesStorage.addEntry(noContentEntry)).rejects.toMatchObject(
        {
          type: ErrorType.VALIDATION_ERROR,
          message: "Entry must have id and content",
        },
      );
    });

    it("should handle add error", async () => {
      const error = new Error("Failed to add");
      const addRequest = {
        error,
        onsuccess: null,
        onerror: null,
      };
      mockObjectStore.add.mockReturnValue(addRequest);

      const promise = notesStorage.addEntry(validEntry);

      await Promise.resolve();
      addRequest.onerror?.();

      await expect(promise).rejects.toThrow(NotesError);
      await expect(promise).rejects.toMatchObject({
        type: ErrorType.STORAGE_ERROR,
        message: "Failed to add entry",
      });
    });
  });

  describe("updateEntry", () => {
    const validEntry: Entry = {
      id: "123",
      timestamp: new Date("2024-01-01T12:00:00.000Z"),
      content: "Updated content",
      tags: ["health"] as TagType[],
      actionType: "note" as ActionType,
      tasks: [],
      aiProcessed: true,
      isEdited: true,
    };

    beforeEach(async () => {
      // Initialize the DB for these tests
      const initPromise = notesStorage.init();
      await Promise.resolve();
      mockOpenDbRequest.onsuccess?.();
      await initPromise;
    });

    it("should update entry successfully", async () => {
      const putRequest = {
        onsuccess: null,
        onerror: null,
      };
      mockObjectStore.put.mockReturnValue(putRequest);

      setTimeout(() => {
        putRequest.onsuccess?.();
      }, 0);

      await notesStorage.updateEntry(validEntry);

      expect(mockObjectStore.put).toHaveBeenCalledWith({
        ...validEntry,
        timestamp: validEntry.timestamp.toISOString(),
      });
    });

    it("should handle update error", async () => {
      const error = new Error("Failed to update");
      const putRequest = {
        error,
        onsuccess: null,
        onerror: null,
      };
      mockObjectStore.put.mockReturnValue(putRequest);

      const promise = notesStorage.updateEntry(validEntry);

      await Promise.resolve();
      putRequest.onerror?.();

      await expect(promise).rejects.toThrow(NotesError);
      await expect(promise).rejects.toMatchObject({
        type: ErrorType.STORAGE_ERROR,
        message: "Failed to update entry",
      });
    });
  });

  describe("deleteEntry", () => {
    beforeEach(async () => {
      // Initialize the DB for these tests
      const initPromise = notesStorage.init();
      await Promise.resolve();
      mockOpenDbRequest.onsuccess?.();
      await initPromise;
    });

    it("should delete entry successfully", async () => {
      const deleteRequest = {
        onsuccess: null,
        onerror: null,
      };
      mockObjectStore.delete.mockReturnValue(deleteRequest);

      setTimeout(() => {
        deleteRequest.onsuccess?.();
      }, 0);

      await notesStorage.deleteEntry("123");

      expect(mockObjectStore.delete).toHaveBeenCalledWith("123");
    });

    it("should handle delete error", async () => {
      const error = new Error("Failed to delete");
      const deleteRequest = {
        error,
        onsuccess: null,
        onerror: null,
      };
      mockObjectStore.delete.mockReturnValue(deleteRequest);

      const promise = notesStorage.deleteEntry("123");

      await Promise.resolve();
      deleteRequest.onerror?.();

      await expect(promise).rejects.toThrow(NotesError);
      await expect(promise).rejects.toMatchObject({
        type: ErrorType.STORAGE_ERROR,
        message: "Failed to delete entry",
      });
    });
  });

  describe("searchEntries", () => {
    const mockEntries = [
      {
        id: "1",
        timestamp: "2024-01-01T12:00:00.000Z",
        content: "Work meeting notes",
        tags: ["work"] as TagType[],
        tasks: [],
        aiProcessed: false,
        isEdited: false,
      },
      {
        id: "2",
        timestamp: "2024-01-02T12:00:00.000Z",
        content: "Health checkup appointment",
        tags: ["health"] as TagType[],
        tasks: [],
        aiProcessed: false,
        isEdited: false,
      },
      {
        id: "3",
        timestamp: "2024-01-03T12:00:00.000Z",
        content: "Gym workout",
        tags: ["health", "growth"] as TagType[],
        tasks: [],
        aiProcessed: false,
        isEdited: false,
      },
    ];

    beforeEach(() => {
      mockOpenDbRequest.onsuccess?.();
      mockObjectStore.getAll.mockReturnValue({
        result: mockEntries,
        onsuccess: null,
        onerror: null,
      });
    });

    it("should search entries by content", async () => {
      const getAllRequest = mockObjectStore.getAll();
      setTimeout(() => {
        getAllRequest.onsuccess?.();
      }, 0);

      const results = await notesStorage.searchEntries("meeting");

      expect(results).toHaveLength(1);
      expect(results[0].content).toContain("meeting");
    });

    it("should search entries by tag", async () => {
      const getAllRequest = mockObjectStore.getAll();
      setTimeout(() => {
        getAllRequest.onsuccess?.();
      }, 0);

      const results = await notesStorage.searchEntries("health");

      expect(results).toHaveLength(2);
      expect(results[0].tags).toContain("health");
      expect(results[1].tags).toContain("health");
    });

    it("should handle case-insensitive search", async () => {
      const getAllRequest = mockObjectStore.getAll();
      setTimeout(() => {
        getAllRequest.onsuccess?.();
      }, 0);

      const results = await notesStorage.searchEntries("WORK");

      expect(results).toHaveLength(2); // 'work' in content and tag
    });

    it("should return empty array for no matches", async () => {
      const getAllRequest = mockObjectStore.getAll();
      setTimeout(() => {
        getAllRequest.onsuccess?.();
      }, 0);

      const results = await notesStorage.searchEntries("nonexistent");

      expect(results).toHaveLength(0);
    });
  });

  describe("getEntriesByTag", () => {
    const mockTaggedEntries = [
      {
        id: "1",
        timestamp: "2024-01-01T12:00:00.000Z",
        content: "Work task",
        tags: ["work"] as TagType[],
        tasks: [],
        aiProcessed: false,
        isEdited: false,
      },
      {
        id: "2",
        timestamp: "2024-01-02T12:00:00.000Z",
        content: "Another work task",
        tags: ["work"] as TagType[],
        tasks: [],
        aiProcessed: false,
        isEdited: false,
      },
    ];

    beforeEach(async () => {
      // Initialize the DB for these tests
      const initPromise = notesStorage.init();
      await Promise.resolve();
      mockOpenDbRequest.onsuccess?.();
      await initPromise;
    });

    it("should get entries by tag successfully", async () => {
      const mockIndex = {
        getAll: jest.fn(),
      };
      mockObjectStore.index.mockReturnValue(mockIndex);

      const getAllRequest = {
        result: mockTaggedEntries,
        onsuccess: null,
        onerror: null,
      };
      mockIndex.getAll.mockReturnValue(getAllRequest);

      setTimeout(() => {
        getAllRequest.onsuccess?.();
      }, 0);

      const entries = await notesStorage.getEntriesByTag("work");

      expect(entries).toHaveLength(2);
      expect(entries[0].timestamp).toBeInstanceOf(Date);
      expect(mockObjectStore.index).toHaveBeenCalledWith("tags");
      expect(mockIndex.getAll).toHaveBeenCalledWith("work");
    });

    it("should handle index error", async () => {
      const mockIndex = {
        getAll: jest.fn(),
      };
      mockObjectStore.index.mockReturnValue(mockIndex);

      const error = new Error("Index error");
      const getAllRequest = {
        error,
        result: null,
        onsuccess: null,
        onerror: null,
      };
      mockIndex.getAll.mockReturnValue(getAllRequest);

      const promise = notesStorage.getEntriesByTag("work");

      await Promise.resolve();
      getAllRequest.onerror?.();

      await expect(promise).rejects.toThrow(NotesError);
      await expect(promise).rejects.toMatchObject({
        type: ErrorType.STORAGE_ERROR,
        message: "Failed to get entries with tag: work",
      });
    });
  });

  describe("getEntriesByDateRange", () => {
    const mockEntries = [
      {
        id: "1",
        timestamp: "2024-01-01T12:00:00.000Z",
        content: "Entry 1",
        tags: [] as TagType[],
        tasks: [],
        aiProcessed: false,
        isEdited: false,
      },
      {
        id: "2",
        timestamp: "2024-01-15T12:00:00.000Z",
        content: "Entry 2",
        tags: [] as TagType[],
        tasks: [],
        aiProcessed: false,
        isEdited: false,
      },
      {
        id: "3",
        timestamp: "2024-02-01T12:00:00.000Z",
        content: "Entry 3",
        tags: [] as TagType[],
        tasks: [],
        aiProcessed: false,
        isEdited: false,
      },
    ];

    beforeEach(() => {
      mockOpenDbRequest.onsuccess?.();
      mockObjectStore.getAll.mockReturnValue({
        result: mockEntries,
        onsuccess: null,
        onerror: null,
      });
    });

    it("should get entries within date range", async () => {
      const getAllRequest = mockObjectStore.getAll();
      setTimeout(() => {
        getAllRequest.onsuccess?.();
      }, 0);

      const start = new Date("2024-01-10T00:00:00.000Z");
      const end = new Date("2024-01-31T23:59:59.999Z");

      const entries = await notesStorage.getEntriesByDateRange(start, end);

      expect(entries).toHaveLength(1);
      expect(entries[0].id).toBe("2");
    });

    it("should include boundary dates", async () => {
      const getAllRequest = mockObjectStore.getAll();
      setTimeout(() => {
        getAllRequest.onsuccess?.();
      }, 0);

      const start = new Date("2024-01-01T12:00:00.000Z");
      const end = new Date("2024-02-01T12:00:00.000Z");

      const entries = await notesStorage.getEntriesByDateRange(start, end);

      expect(entries).toHaveLength(3); // All entries are within or on boundaries
    });

    it("should return empty array for no matches", async () => {
      const getAllRequest = mockObjectStore.getAll();
      setTimeout(() => {
        getAllRequest.onsuccess?.();
      }, 0);

      const start = new Date("2025-01-01T00:00:00.000Z");
      const end = new Date("2025-12-31T23:59:59.999Z");

      const entries = await notesStorage.getEntriesByDateRange(start, end);

      expect(entries).toHaveLength(0);
    });
  });

  describe("clearAllEntries", () => {
    beforeEach(async () => {
      // Initialize the DB for these tests
      const initPromise = notesStorage.init();
      await Promise.resolve();
      mockOpenDbRequest.onsuccess?.();
      await initPromise;
    });

    it("should clear all entries successfully", async () => {
      const clearRequest = {
        onsuccess: null,
        onerror: null,
      };
      mockObjectStore.clear.mockReturnValue(clearRequest);

      setTimeout(() => {
        clearRequest.onsuccess?.();
      }, 0);

      await notesStorage.clearAllEntries();

      expect(mockObjectStore.clear).toHaveBeenCalled();
    });

    it("should handle clear error", async () => {
      const error = new Error("Failed to clear");
      const clearRequest = {
        error,
        onsuccess: null,
        onerror: null,
      };
      mockObjectStore.clear.mockReturnValue(clearRequest);

      const promise = notesStorage.clearAllEntries();

      await Promise.resolve();
      clearRequest.onerror?.();

      await expect(promise).rejects.toThrow(NotesError);
      await expect(promise).rejects.toMatchObject({
        type: ErrorType.STORAGE_ERROR,
        message: "Failed to clear entries",
      });
    });
  });

  describe.skip("error handling", () => {
    it("should properly wrap non-NotesError exceptions", async () => {
      (notesStorage as any).db = null;
      (notesStorage as any).initPromise = null;

      // Make init throw a generic error
      (global.indexedDB as any).open = jest.fn(() => {
        throw new Error("Generic error");
      });

      await expect(notesStorage.init()).rejects.toThrow(NotesError);
      await expect(notesStorage.init()).rejects.toMatchObject({
        type: ErrorType.STORAGE_ERROR,
        message: "Failed to initialize database",
      });
    });

    it("should preserve NotesError instances", async () => {
      const customError = new NotesError(
        ErrorType.VALIDATION_ERROR,
        "Custom validation error",
      );

      (notesStorage as any).ensureDb = jest.fn().mockRejectedValue(customError);

      // Get the promise but don't await it directly
      const promise = notesStorage.getAllEntries();

      // Now assert on the promise
      await expect(promise).rejects.toBe(customError);
    });
  });

  describe("database not available", () => {
    it("should throw error when DB is not available after init", async () => {
      (notesStorage as any).db = null;
      (notesStorage as any).initPromise = null;

      // Save the original result and set it to null temporarily
      const originalResult = mockOpenDbRequest.result;
      mockOpenDbRequest.result = null;

      const promise = notesStorage.getAllEntries();

      // Wait for init to be called
      await Promise.resolve();

      // Resolve init with null result
      mockOpenDbRequest.onsuccess?.();

      await expect(promise).rejects.toThrow(NotesError);
      await expect(promise).rejects.toMatchObject({
        type: ErrorType.STORAGE_ERROR,
        message: "Database not available",
      });

      // Restore original result
      mockOpenDbRequest.result = originalResult;
    });
  });
});
