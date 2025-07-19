import { logger } from "./logger";

describe("Logger", () => {
  // Store original console methods
  const originalConsole = {
    log: console.log,
    info: console.info,
    warn: console.warn,
    error: console.error,
  };

  // Store original NODE_ENV
  const originalNodeEnv = process.env.NODE_ENV;

  // Mock Date for consistent timestamps
  const mockDate = new Date("2024-01-01T12:00:00.000Z");
  const originalDate = global.Date;

  beforeEach(() => {
    // Mock console methods
    console.log = jest.fn();
    console.info = jest.fn();
    console.warn = jest.fn();
    console.error = jest.fn();

    // Mock Date
    global.Date = jest.fn(() => mockDate) as any;
    global.Date.now = originalDate.now;
    global.Date.parse = originalDate.parse;
    global.Date.UTC = originalDate.UTC;
  });

  afterEach(() => {
    // Restore console methods
    console.log = originalConsole.log;
    console.info = originalConsole.info;
    console.warn = originalConsole.warn;
    console.error = originalConsole.error;

    // Restore Date
    global.Date = originalDate;

    // Restore NODE_ENV
    process.env.NODE_ENV = originalNodeEnv;

    jest.clearAllMocks();
  });

  describe("development environment", () => {
    beforeEach(() => {
      process.env.NODE_ENV = "development";
      // Force re-creation of logger instance
      jest.resetModules();
    });

    it("should log debug messages in development", async () => {
      const { logger: devLogger } = await import("./logger");

      devLogger.debug("Debug message", { extra: "data" });

      expect(console.log).toHaveBeenCalledWith(
        "[2024-01-01T12:00:00.000Z] [DEBUG] Debug message",
        { extra: "data" },
      );
    });

    it("should log info messages in development", async () => {
      const { logger: devLogger } = await import("./logger");

      devLogger.info("Info message", { user: "test" });

      expect(console.info).toHaveBeenCalledWith(
        "[2024-01-01T12:00:00.000Z] [INFO] Info message",
        { user: "test" },
      );
    });

    it("should log warn messages in development", async () => {
      const { logger: devLogger } = await import("./logger");

      devLogger.warn("Warning message", { level: "high" });

      expect(console.warn).toHaveBeenCalledWith(
        "[2024-01-01T12:00:00.000Z] [WARN] Warning message",
        { level: "high" },
      );
    });

    it("should log error messages in development", async () => {
      const { logger: devLogger } = await import("./logger");
      const error = new Error("Test error");

      devLogger.error("Error occurred", error);

      expect(console.error).toHaveBeenCalledWith(
        "[2024-01-01T12:00:00.000Z] [ERROR] Error occurred",
        error,
      );
    });

    it("should handle logging without data parameter", async () => {
      const { logger: devLogger } = await import("./logger");

      devLogger.debug("Simple debug");
      devLogger.info("Simple info");
      devLogger.warn("Simple warn");
      devLogger.error("Simple error");

      expect(console.log).toHaveBeenCalledWith(
        "[2024-01-01T12:00:00.000Z] [DEBUG] Simple debug",
        "",
      );
      expect(console.info).toHaveBeenCalledWith(
        "[2024-01-01T12:00:00.000Z] [INFO] Simple info",
        "",
      );
      expect(console.warn).toHaveBeenCalledWith(
        "[2024-01-01T12:00:00.000Z] [WARN] Simple warn",
        "",
      );
      expect(console.error).toHaveBeenCalledWith(
        "[2024-01-01T12:00:00.000Z] [ERROR] Simple error",
        "",
      );
    });
  });

  describe("production environment", () => {
    beforeEach(() => {
      process.env.NODE_ENV = "production";
      // Force re-creation of logger instance
      jest.resetModules();
    });

    it("should not log debug messages in production", async () => {
      const { logger: prodLogger } = await import("./logger");

      prodLogger.debug("Debug message", { data: "test" });

      expect(console.log).not.toHaveBeenCalled();
    });

    it("should not log info messages in production", async () => {
      const { logger: prodLogger } = await import("./logger");

      prodLogger.info("Info message", { data: "test" });

      expect(console.info).not.toHaveBeenCalled();
    });

    it("should log warn messages in production", async () => {
      const { logger: prodLogger } = await import("./logger");

      prodLogger.warn("Warning message", { severity: "medium" });

      expect(console.warn).toHaveBeenCalledWith(
        "[2024-01-01T12:00:00.000Z] [WARN] Warning message",
        { severity: "medium" },
      );
    });

    it("should log error messages in production", async () => {
      const { logger: prodLogger } = await import("./logger");
      const error = new Error("Production error");

      prodLogger.error("Error in production", error);

      expect(console.error).toHaveBeenCalledWith(
        "[2024-01-01T12:00:00.000Z] [ERROR] Error in production",
        error,
      );
    });

    it("should not send to error tracking service in test environment", async () => {
      const { logger: prodLogger } = await import("./logger");
      const error = new Error("Test error");

      prodLogger.error("Error occurred", error);

      // Just verify it was logged, not sent to external service
      expect(console.error).toHaveBeenCalled();
    });
  });

  describe("test environment", () => {
    beforeEach(() => {
      process.env.NODE_ENV = "test";
      // Force re-creation of logger instance
      jest.resetModules();
    });

    it("should only log warn and error in test environment", async () => {
      const { logger: testLogger } = await import("./logger");

      testLogger.debug("Debug");
      testLogger.info("Info");
      testLogger.warn("Warn");
      testLogger.error("Error");

      expect(console.log).not.toHaveBeenCalled();
      expect(console.info).not.toHaveBeenCalled();
      expect(console.warn).toHaveBeenCalled();
      expect(console.error).toHaveBeenCalled();
    });
  });

  describe("edge cases", () => {
    beforeEach(() => {
      process.env.NODE_ENV = "development";
      jest.resetModules();
    });

    it("should handle null and undefined data", async () => {
      const { logger: devLogger } = await import("./logger");

      devLogger.info("Null data", null);
      devLogger.info("Undefined data", undefined);

      expect(console.info).toHaveBeenCalledWith(
        "[2024-01-01T12:00:00.000Z] [INFO] Null data",
        null,
      );
      expect(console.info).toHaveBeenCalledWith(
        "[2024-01-01T12:00:00.000Z] [INFO] Undefined data",
        undefined,
      );
    });

    it("should handle circular references", async () => {
      const { logger: devLogger } = await import("./logger");

      const circular: any = { name: "test" };
      circular.self = circular;

      devLogger.info("Circular", circular);

      expect(console.info).toHaveBeenCalledWith(
        "[2024-01-01T12:00:00.000Z] [INFO] Circular",
        circular,
      );
    });

    it("should handle arrays and objects", async () => {
      const { logger: devLogger } = await import("./logger");

      const array = [1, 2, 3];
      const object = { a: 1, b: 2 };

      devLogger.debug("Array", array);
      devLogger.info("Object", object);

      expect(console.log).toHaveBeenCalledWith(
        "[2024-01-01T12:00:00.000Z] [DEBUG] Array",
        array,
      );
      expect(console.info).toHaveBeenCalledWith(
        "[2024-01-01T12:00:00.000Z] [INFO] Object",
        object,
      );
    });

    it("should handle error objects with stack traces", async () => {
      const { logger: devLogger } = await import("./logger");

      const error = new Error("Test error");
      error.stack = "Error: Test error\n    at Test.suite (test.js:1:1)";

      devLogger.error("Stack trace test", error);

      expect(console.error).toHaveBeenCalledWith(
        "[2024-01-01T12:00:00.000Z] [ERROR] Stack trace test",
        error,
      );
    });

    it("should handle very long messages", async () => {
      const { logger: devLogger } = await import("./logger");

      const longMessage = "A".repeat(1000);
      devLogger.info(longMessage);

      expect(console.info).toHaveBeenCalledWith(
        expect.stringContaining(longMessage),
        "",
      );
    });

    it("should handle special characters in messages", async () => {
      const { logger: devLogger } = await import("./logger");

      const specialMessage =
        "Special chars: \n\t\r \"quotes\" 'single' `backticks`";
      devLogger.warn(specialMessage);

      expect(console.warn).toHaveBeenCalledWith(
        expect.stringContaining(specialMessage),
        "",
      );
    });
  });

  describe("timestamp formatting", () => {
    it("should use ISO string format for timestamps", async () => {
      process.env.NODE_ENV = "development";
      jest.resetModules();
      const { logger: devLogger } = await import("./logger");

      // Test with different times
      const testDates = [
        new Date("2024-12-31T23:59:59.999Z"),
        new Date("2024-01-01T00:00:00.000Z"),
        new Date("2024-06-15T13:30:45.123Z"),
      ];

      testDates.forEach((date, index) => {
        global.Date = jest.fn(() => date) as any;
        devLogger.info(`Message ${index}`);

        expect(console.info).toHaveBeenCalledWith(
          `[${date.toISOString()}] [INFO] Message ${index}`,
          "",
        );
      });
    });
  });

  describe("concurrent logging", () => {
    it("should handle rapid sequential logging", async () => {
      process.env.NODE_ENV = "development";
      jest.resetModules();
      const { logger: devLogger } = await import("./logger");

      // Simulate rapid logging
      for (let i = 0; i < 100; i++) {
        devLogger.debug(`Debug ${i}`);
        devLogger.info(`Info ${i}`);
        devLogger.warn(`Warn ${i}`);
        devLogger.error(`Error ${i}`);
      }

      expect(console.log).toHaveBeenCalledTimes(100);
      expect(console.info).toHaveBeenCalledTimes(100);
      expect(console.warn).toHaveBeenCalledTimes(100);
      expect(console.error).toHaveBeenCalledTimes(100);
    });
  });

  describe("real-world scenarios", () => {
    beforeEach(() => {
      process.env.NODE_ENV = "development";
      jest.resetModules();
    });

    it("should log API request/response cycle", async () => {
      const { logger: devLogger } = await import("./logger");

      // Request
      devLogger.debug("API Request", {
        method: "GET",
        url: "/api/users",
        headers: { Authorization: "Bearer token" },
      });

      // Response
      devLogger.info("API Response", {
        status: 200,
        data: { users: ["user1", "user2"] },
      });

      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining("[DEBUG] API Request"),
        expect.objectContaining({
          method: "GET",
          url: "/api/users",
        }),
      );

      expect(console.info).toHaveBeenCalledWith(
        expect.stringContaining("[INFO] API Response"),
        expect.objectContaining({
          status: 200,
        }),
      );
    });

    it("should log error with context", async () => {
      const { logger: devLogger } = await import("./logger");

      const error = new Error("Database connection failed");
      devLogger.error("Failed to fetch user data", {
        error,
        userId: "123",
        operation: "getUserProfile",
        timestamp: Date.now(),
      });

      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining("[ERROR] Failed to fetch user data"),
        expect.objectContaining({
          error,
          userId: "123",
          operation: "getUserProfile",
        }),
      );
    });

    it("should log performance metrics", async () => {
      const { logger: devLogger } = await import("./logger");

      const startTime = performance.now();
      // Simulate some work
      const endTime = performance.now();

      devLogger.debug("Performance metrics", {
        operation: "dataProcessing",
        duration: endTime - startTime,
        itemsProcessed: 1000,
        throughput: 1000 / ((endTime - startTime) / 1000),
      });

      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining("[DEBUG] Performance metrics"),
        expect.objectContaining({
          operation: "dataProcessing",
          itemsProcessed: 1000,
        }),
      );
    });
  });
});
