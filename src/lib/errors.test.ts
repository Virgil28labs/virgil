import {
  AppError,
  ValidationError,
  NetworkError,
  AuthError,
  NotFoundError,
  RateLimitError,
  handleError,
  isAppError,
  getErrorMessage,
  logError,
} from "./errors";

describe("Error Classes", () => {
  describe("AppError", () => {
    it("should create AppError with all properties", () => {
      const error = new AppError("Test error", "TEST_ERROR", 500, {
        extra: "data",
      });

      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(AppError);
      expect(error.message).toBe("Test error");
      expect(error.code).toBe("TEST_ERROR");
      expect(error.statusCode).toBe(500);
      expect(error.details).toEqual({ extra: "data" });
      expect(error.name).toBe("AppError");
    });

    it("should create AppError without optional properties", () => {
      const error = new AppError("Test error", "TEST_ERROR");

      expect(error.message).toBe("Test error");
      expect(error.code).toBe("TEST_ERROR");
      expect(error.statusCode).toBeUndefined();
      expect(error.details).toBeUndefined();
    });

    it("should have proper prototype chain", () => {
      const error = new AppError("Test", "TEST");

      expect(error instanceof Error).toBe(true);
      expect(error instanceof AppError).toBe(true);
      expect(error.constructor).toBe(AppError);
    });

    it("should have stack trace", () => {
      const error = new AppError("Test", "TEST");
      expect(error.stack).toBeDefined();
      expect(error.stack).toContain("AppError");
    });
  });

  describe("ValidationError", () => {
    it("should create ValidationError with correct properties", () => {
      const error = new ValidationError("Invalid input", { field: "email" });

      expect(error).toBeInstanceOf(ValidationError);
      expect(error).toBeInstanceOf(AppError);
      expect(error.message).toBe("Invalid input");
      expect(error.code).toBe("VALIDATION_ERROR");
      expect(error.statusCode).toBe(400);
      expect(error.details).toEqual({ field: "email" });
      expect(error.name).toBe("ValidationError");
    });

    it("should create ValidationError without details", () => {
      const error = new ValidationError("Invalid input");

      expect(error.details).toBeUndefined();
    });
  });

  describe("NetworkError", () => {
    it("should create NetworkError with correct properties", () => {
      const error = new NetworkError("Connection failed", { timeout: 5000 });

      expect(error).toBeInstanceOf(NetworkError);
      expect(error).toBeInstanceOf(AppError);
      expect(error.message).toBe("Connection failed");
      expect(error.code).toBe("NETWORK_ERROR");
      expect(error.statusCode).toBe(503);
      expect(error.details).toEqual({ timeout: 5000 });
      expect(error.name).toBe("NetworkError");
    });
  });

  describe("AuthError", () => {
    it("should create AuthError with correct properties", () => {
      const error = new AuthError("Unauthorized", { userId: "123" });

      expect(error).toBeInstanceOf(AuthError);
      expect(error).toBeInstanceOf(AppError);
      expect(error.message).toBe("Unauthorized");
      expect(error.code).toBe("AUTH_ERROR");
      expect(error.statusCode).toBe(401);
      expect(error.details).toEqual({ userId: "123" });
      expect(error.name).toBe("AuthError");
    });
  });

  describe("NotFoundError", () => {
    it("should create NotFoundError with correct properties", () => {
      const error = new NotFoundError("Resource not found", {
        resourceId: "abc",
      });

      expect(error).toBeInstanceOf(NotFoundError);
      expect(error).toBeInstanceOf(AppError);
      expect(error.message).toBe("Resource not found");
      expect(error.code).toBe("NOT_FOUND");
      expect(error.statusCode).toBe(404);
      expect(error.details).toEqual({ resourceId: "abc" });
      expect(error.name).toBe("NotFoundError");
    });
  });

  describe("RateLimitError", () => {
    it("should create RateLimitError with correct properties", () => {
      const error = new RateLimitError("Too many requests", { retryAfter: 60 });

      expect(error).toBeInstanceOf(RateLimitError);
      expect(error).toBeInstanceOf(AppError);
      expect(error.message).toBe("Too many requests");
      expect(error.code).toBe("RATE_LIMIT");
      expect(error.statusCode).toBe(429);
      expect(error.details).toEqual({ retryAfter: 60 });
      expect(error.name).toBe("RateLimitError");
    });
  });
});

describe("handleError", () => {
  it("should return AppError instances as-is", () => {
    const appError = new AppError("Test", "TEST", 500);
    const result = handleError(appError);

    expect(result).toBe(appError);
  });

  it("should return subclass instances as-is", () => {
    const validationError = new ValidationError("Invalid");
    const result = handleError(validationError);

    expect(result).toBe(validationError);
  });

  it("should convert AbortError to AppError", () => {
    const abortError = new Error("Aborted");
    abortError.name = "AbortError";

    const result = handleError(abortError);

    expect(result).toBeInstanceOf(AppError);
    expect(result.message).toBe("Request was cancelled");
    expect(result.code).toBe("ABORT_ERROR");
  });

  it("should convert fetch errors to NetworkError", () => {
    const fetchError = new Error("Failed to fetch data");
    const result = handleError(fetchError);

    expect(result).toBeInstanceOf(NetworkError);
    expect(result.message).toBe("Failed to fetch data");
    expect(result.code).toBe("NETWORK_ERROR");
    expect(result.statusCode).toBe(503);
  });

  it("should convert generic errors to AppError", () => {
    const genericError = new Error("Something went wrong");
    const result = handleError(genericError);

    expect(result).toBeInstanceOf(AppError);
    expect(result.message).toBe("Something went wrong");
    expect(result.code).toBe("UNKNOWN_ERROR");
  });

  it("should handle string errors", () => {
    const result = handleError("String error");

    expect(result).toBeInstanceOf(AppError);
    expect(result.message).toBe("An unexpected error occurred");
    expect(result.code).toBe("UNKNOWN_ERROR");
    expect(result.statusCode).toBe(500);
    expect(result.details).toBe("String error");
  });

  it("should handle null/undefined errors", () => {
    const nullResult = handleError(null);
    expect(nullResult).toBeInstanceOf(AppError);
    expect(nullResult.message).toBe("An unexpected error occurred");
    expect(nullResult.details).toBeNull();

    const undefinedResult = handleError(undefined);
    expect(undefinedResult).toBeInstanceOf(AppError);
    expect(undefinedResult.message).toBe("An unexpected error occurred");
    expect(undefinedResult.details).toBeUndefined();
  });

  it("should handle object errors", () => {
    const objError = { error: "Something bad", code: 123 };
    const result = handleError(objError);

    expect(result).toBeInstanceOf(AppError);
    expect(result.message).toBe("An unexpected error occurred");
    expect(result.code).toBe("UNKNOWN_ERROR");
    expect(result.details).toEqual(objError);
  });

  it("should handle number errors", () => {
    const result = handleError(404);

    expect(result).toBeInstanceOf(AppError);
    expect(result.message).toBe("An unexpected error occurred");
    expect(result.details).toBe(404);
  });
});

describe("isAppError", () => {
  it("should return true for AppError instances", () => {
    const error = new AppError("Test", "TEST");
    expect(isAppError(error)).toBe(true);
  });

  it("should return true for AppError subclass instances", () => {
    expect(isAppError(new ValidationError("Test"))).toBe(true);
    expect(isAppError(new NetworkError("Test"))).toBe(true);
    expect(isAppError(new AuthError("Test"))).toBe(true);
    expect(isAppError(new NotFoundError("Test"))).toBe(true);
    expect(isAppError(new RateLimitError("Test"))).toBe(true);
  });

  it("should return false for non-AppError instances", () => {
    expect(isAppError(new Error("Test"))).toBe(false);
    expect(isAppError("string")).toBe(false);
    expect(isAppError(123)).toBe(false);
    expect(isAppError(null)).toBe(false);
    expect(isAppError(undefined)).toBe(false);
    expect(isAppError({})).toBe(false);
    expect(isAppError([])).toBe(false);
  });
});

describe("getErrorMessage", () => {
  it("should extract message from Error instances", () => {
    expect(getErrorMessage(new Error("Test error"))).toBe("Test error");
    expect(getErrorMessage(new AppError("App error", "TEST"))).toBe(
      "App error",
    );
    expect(getErrorMessage(new ValidationError("Validation error"))).toBe(
      "Validation error",
    );
  });

  it("should return string errors as-is", () => {
    expect(getErrorMessage("String error message")).toBe(
      "String error message",
    );
    expect(getErrorMessage("")).toBe("");
  });

  it("should return default message for non-string/non-error values", () => {
    expect(getErrorMessage(null)).toBe("An unexpected error occurred");
    expect(getErrorMessage(undefined)).toBe("An unexpected error occurred");
    expect(getErrorMessage(123)).toBe("An unexpected error occurred");
    expect(getErrorMessage({})).toBe("An unexpected error occurred");
    expect(getErrorMessage([])).toBe("An unexpected error occurred");
    expect(getErrorMessage(true)).toBe("An unexpected error occurred");
  });
});

describe("logError", () => {
  let consoleErrorSpy: jest.SpyInstance;
  const originalEnv = process.env.NODE_ENV;

  beforeEach(() => {
    consoleErrorSpy = jest.spyOn(console, "error").mockImplementation();
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
    process.env.NODE_ENV = originalEnv;
  });

  describe("in development", () => {
    beforeEach(() => {
      process.env.NODE_ENV = "development";
    });

    it("should log AppError with context", () => {
      const error = new AppError("Test error", "TEST_ERROR", 500, {
        extra: "data",
      });
      logError(error, "TestContext");

      expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "[TestContext] AppError: Test error",
        expect.objectContaining({
          code: "TEST_ERROR",
          details: { extra: "data" },
          stack: expect.any(String),
        }),
      );
    });

    it("should log error without context", () => {
      const error = new Error("Generic error");
      logError(error);

      expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "AppError: Generic error",
        expect.objectContaining({
          code: "UNKNOWN_ERROR",
          details: undefined,
          stack: expect.any(String),
        }),
      );
    });

    it("should handle non-error values", () => {
      logError("String error", "Context");

      expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "[Context] AppError: An unexpected error occurred",
        expect.objectContaining({
          code: "UNKNOWN_ERROR",
          details: "String error",
        }),
      );
    });

    it("should handle network errors specially", () => {
      const error = new Error("Failed to fetch resource");
      logError(error);

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "NetworkError: Failed to fetch resource",
        expect.objectContaining({
          code: "NETWORK_ERROR",
        }),
      );
    });
  });

  describe("in production", () => {
    beforeEach(() => {
      process.env.NODE_ENV = "production";
    });

    it("should not log errors in production", () => {
      const error = new AppError("Test error", "TEST_ERROR");
      logError(error, "TestContext");

      expect(consoleErrorSpy).not.toHaveBeenCalled();
    });
  });

  describe("in test environment", () => {
    beforeEach(() => {
      process.env.NODE_ENV = "test";
    });

    it("should not log errors in test environment", () => {
      const error = new Error("Test error");
      logError(error);

      expect(consoleErrorSpy).not.toHaveBeenCalled();
    });
  });
});

describe("Error integration scenarios", () => {
  it("should handle API error flow", () => {
    // Simulate API error
    const apiError = new Error("API request failed");
    const handled = handleError(apiError);

    expect(isAppError(handled)).toBe(true);
    expect(getErrorMessage(handled)).toBe("API request failed");
  });

  it("should handle validation error flow", () => {
    // Simulate form validation
    const validationError = new ValidationError("Email is required", {
      field: "email",
    });
    const handled = handleError(validationError);

    expect(handled).toBe(validationError);
    expect(handled.statusCode).toBe(400);
    expect(getErrorMessage(handled)).toBe("Email is required");
  });

  it("should handle auth error flow", () => {
    // Simulate auth failure
    const authError = new AuthError("Session expired");
    const message = getErrorMessage(authError);

    expect(isAppError(authError)).toBe(true);
    expect(authError.statusCode).toBe(401);
    expect(message).toBe("Session expired");
  });

  it("should handle unknown error types", () => {
    // Simulate unexpected error
    const weirdError = Symbol("error");
    const handled = handleError(weirdError);

    expect(isAppError(handled)).toBe(true);
    expect(handled.code).toBe("UNKNOWN_ERROR");
    expect(handled.details).toBe(weirdError);
  });
});
