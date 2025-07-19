import { processEntryWithAI, shouldProcessContent } from "./aiService";
import { LLMService } from "../../services/llm";
import { detectTags, detectActionType } from "./utils/tagPatterns";
import { extractFallbackTasks } from "./utils/taskUtils";
import { NotesError, ErrorType } from "./types";
import { AI_CONFIG } from "./constants";

// Mock dependencies
jest.mock("../../services/llm");
jest.mock("./utils/tagPatterns");
jest.mock("./utils/taskUtils");

const mockLLMService = LLMService as jest.MockedClass<typeof LLMService>;
const mockDetectTags = detectTags as jest.MockedFunction<typeof detectTags>;
const mockDetectActionType = detectActionType as jest.MockedFunction<
  typeof detectActionType
>;
const mockExtractFallbackTasks = extractFallbackTasks as jest.MockedFunction<
  typeof extractFallbackTasks
>;

describe("aiService", () => {
  let mockComplete: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup LLMService mock
    mockComplete = jest.fn();
    mockLLMService.prototype.complete = mockComplete;

    // Setup fallback mocks
    mockDetectTags.mockReturnValue(["personal"]);
    mockDetectActionType.mockReturnValue("note");
    mockExtractFallbackTasks.mockReturnValue([]);
  });

  describe("processEntryWithAI", () => {
    it("processes entry successfully with AI", async () => {
      const mockResponse = {
        content: JSON.stringify({
          tags: ["work", "personal"],
          actionType: "task",
          tasks: ["Complete project report", "Review budget"],
          mood: "positive",
        }),
        model: "test-model",
        usage: { promptTokens: 100, completionTokens: 50, totalTokens: 150 },
      };

      mockComplete.mockResolvedValueOnce(mockResponse);

      const result = await processEntryWithAI(
        "Need to complete project report and review budget for Q4",
      );

      expect(result).toEqual({
        tags: ["work", "personal"],
        actionType: "task",
        tasks: ["Complete project report", "Review budget"],
        mood: "positive",
      });

      expect(mockComplete).toHaveBeenCalledWith({
        messages: [
          {
            role: "user",
            content: expect.stringContaining("Need to complete project report"),
          },
        ],
        model: AI_CONFIG.MODEL,
        temperature: AI_CONFIG.TEMPERATURE,
        maxTokens: AI_CONFIG.MAX_TOKENS,
        systemPrompt: expect.stringContaining("You are an AI assistant"),
      });
    });

    it("returns null for empty content", async () => {
      const result = await processEntryWithAI("");
      expect(result).toBeNull();
      expect(mockComplete).not.toHaveBeenCalled();
    });

    it("returns null for whitespace-only content", async () => {
      const result = await processEntryWithAI("   \n\t  ");
      expect(result).toBeNull();
      expect(mockComplete).not.toHaveBeenCalled();
    });

    it("validates and limits tags to 2", async () => {
      const mockResponse = {
        content: JSON.stringify({
          tags: ["work", "personal", "health", "finance"],
          actionType: "task",
          tasks: ["Task 1"],
        }),
        model: "test-model",
        usage: { promptTokens: 100, completionTokens: 50, totalTokens: 150 },
      };

      mockComplete.mockResolvedValueOnce(mockResponse);

      const result = await processEntryWithAI("Multiple domain task");

      expect(result?.tags).toHaveLength(2);
      expect(result?.tags).toEqual(["work", "personal"]);
    });

    it("filters out non-string tasks", async () => {
      const mockResponse = {
        content: JSON.stringify({
          tags: ["work"],
          actionType: "task",
          tasks: ["Valid task", null, 123, "Another task", undefined],
        }),
        model: "test-model",
        usage: { promptTokens: 100, completionTokens: 50, totalTokens: 150 },
      };

      mockComplete.mockResolvedValueOnce(mockResponse);

      const result = await processEntryWithAI("Mixed task types");

      expect(result?.tasks).toEqual(["Valid task", "Another task"]);
    });

    it("validates mood values", async () => {
      const mockResponse = {
        content: JSON.stringify({
          tags: ["personal"],
          actionType: "reflect",
          tasks: [],
          mood: "invalid-mood",
        }),
        model: "test-model",
        usage: { promptTokens: 100, completionTokens: 50, totalTokens: 150 },
      };

      mockComplete.mockResolvedValueOnce(mockResponse);

      const result = await processEntryWithAI("Reflection entry");

      expect(result?.mood).toBeUndefined();
    });

    it("retries on transient failures", async () => {
      // First attempt fails with network error
      mockComplete.mockRejectedValueOnce(new Error("Network error"));

      // Second attempt succeeds
      const mockResponse = {
        content: JSON.stringify({
          tags: ["work"],
          actionType: "task",
          tasks: ["Complete task"],
        }),
        model: "test-model",
        usage: { promptTokens: 100, completionTokens: 50, totalTokens: 150 },
      };
      mockComplete.mockResolvedValueOnce(mockResponse);

      const result = await processEntryWithAI("Complete important task");

      expect(result).toEqual({
        tags: ["work"],
        actionType: "task",
        tasks: ["Complete task"],
      });
      expect(mockComplete).toHaveBeenCalledTimes(2);
    });

    it("uses fallback after max retries", async () => {
      // All attempts fail
      mockComplete.mockRejectedValue(new Error("Network error"));

      const result = await processEntryWithAI("Fallback test content");

      expect(result).toEqual({
        tags: ["personal"],
        actionType: "note",
        tasks: [],
      });
      expect(mockComplete).toHaveBeenCalledTimes(AI_CONFIG.MAX_RETRIES);
      expect(mockDetectTags).toHaveBeenCalledWith("Fallback test content");
      expect(mockDetectActionType).toHaveBeenCalledWith(
        "Fallback test content",
      );
      expect(mockExtractFallbackTasks).toHaveBeenCalledWith(
        "Fallback test content",
      );
    });

    it("does not retry on validation errors", async () => {
      mockComplete.mockRejectedValueOnce(
        new NotesError(ErrorType.VALIDATION_ERROR, "Invalid input"),
      );

      const result = await processEntryWithAI("Invalid content");

      expect(result).toEqual({
        tags: ["personal"],
        actionType: "note",
        tasks: [],
      });
      expect(mockComplete).toHaveBeenCalledTimes(1);
    });

    it("does not retry on AI service errors", async () => {
      mockComplete.mockRejectedValueOnce(
        new NotesError(ErrorType.AI_SERVICE_ERROR, "AI service failed"),
      );

      const result = await processEntryWithAI("AI error content");

      expect(result).toEqual({
        tags: ["personal"],
        actionType: "note",
        tasks: [],
      });
      expect(mockComplete).toHaveBeenCalledTimes(1);
    });

    it("handles invalid JSON response", async () => {
      const mockResponse = {
        content: "Invalid JSON {broken}",
        model: "test-model",
        usage: { promptTokens: 100, completionTokens: 50, totalTokens: 150 },
      };

      mockComplete.mockResolvedValueOnce(mockResponse);

      const result = await processEntryWithAI("Invalid JSON test");

      expect(result).toEqual({
        tags: ["personal"],
        actionType: "note",
        tasks: [],
      });
    });

    it("handles missing required fields in AI response", async () => {
      const mockResponse = {
        content: JSON.stringify({
          tags: ["work"],
          // Missing actionType and tasks
        }),
        model: "test-model",
        usage: { promptTokens: 100, completionTokens: 50, totalTokens: 150 },
      };

      mockComplete.mockResolvedValueOnce(mockResponse);

      const result = await processEntryWithAI("Missing fields test");

      expect(result).toEqual({
        tags: ["personal"],
        actionType: "note",
        tasks: [],
      });
    });

    it("handles non-array tags and tasks", async () => {
      const mockResponse = {
        content: JSON.stringify({
          tags: "work", // Should be array
          actionType: "task",
          tasks: "Complete task", // Should be array
        }),
        model: "test-model",
        usage: { promptTokens: 100, completionTokens: 50, totalTokens: 150 },
      };

      mockComplete.mockResolvedValueOnce(mockResponse);

      const result = await processEntryWithAI("Invalid structure test");

      expect(result).toEqual({
        tags: ["personal"],
        actionType: "note",
        tasks: [],
      });
    });

    it("includes delay between retries", async () => {
      jest.useFakeTimers();

      // First attempt fails
      mockComplete.mockRejectedValueOnce(new Error("Network error"));

      // Second attempt succeeds
      const mockResponse = {
        content: JSON.stringify({
          tags: ["work"],
          actionType: "task",
          tasks: [],
        }),
        model: "test-model",
        usage: { promptTokens: 100, completionTokens: 50, totalTokens: 150 },
      };
      mockComplete.mockResolvedValueOnce(mockResponse);

      const promise = processEntryWithAI("Retry with delay");

      // Fast-forward first retry delay
      jest.advanceTimersByTime(AI_CONFIG.RETRY_DELAY);

      const result = await promise;

      expect(result?.tags).toEqual(["work"]);
      expect(mockComplete).toHaveBeenCalledTimes(2);

      jest.useRealTimers();
    });
  });

  describe("shouldProcessContent", () => {
    it("returns true for valid content", () => {
      expect(shouldProcessContent("This is a valid note entry")).toBe(true);
      expect(shouldProcessContent("Complete task 123")).toBe(true);
      expect(
        shouldProcessContent("A" + "B".repeat(AI_CONFIG.MIN_CONTENT_LENGTH)),
      ).toBe(true);
    });

    it("returns false for content too short", () => {
      expect(shouldProcessContent("Hi")).toBe(false);
      expect(shouldProcessContent("a")).toBe(false);
      expect(shouldProcessContent("")).toBe(false);
    });

    it("returns false for whitespace only", () => {
      expect(shouldProcessContent("   ")).toBe(false);
      expect(shouldProcessContent("\n\n\n")).toBe(false);
      expect(shouldProcessContent("\t\t")).toBe(false);
    });

    it("returns false for special characters only", () => {
      expect(shouldProcessContent("!!!")).toBe(false);
      expect(shouldProcessContent("...")).toBe(false);
      expect(shouldProcessContent("---")).toBe(false);
      expect(shouldProcessContent("@#$%^&*()")).toBe(false);
    });

    it("returns true for content with alphanumeric characters", () => {
      expect(shouldProcessContent("!!! Important !!!")).toBe(true);
      expect(shouldProcessContent("Task #1")).toBe(true);
      expect(shouldProcessContent("--- Note ---")).toBe(true);
    });
  });

  describe("buildSystemPrompt", () => {
    it("includes all tag descriptions", async () => {
      const mockResponse = {
        content: JSON.stringify({
          tags: ["work"],
          actionType: "task",
          tasks: [],
        }),
        model: "test-model",
        usage: { promptTokens: 100, completionTokens: 50, totalTokens: 150 },
      };

      mockComplete.mockResolvedValueOnce(mockResponse);

      await processEntryWithAI("Test prompt building");

      const systemPrompt = mockComplete.mock.calls[0][0].systemPrompt;

      expect(systemPrompt).toContain("work:");
      expect(systemPrompt).toContain("personal:");
      expect(systemPrompt).toContain("health:");
      expect(systemPrompt).toContain("finance:");
      expect(systemPrompt).toContain("learning:");
      expect(systemPrompt).toContain("social:");
      expect(systemPrompt).toContain("creative:");
      expect(systemPrompt).toContain("travel:");
    });

    it("includes all action type descriptions", async () => {
      const mockResponse = {
        content: JSON.stringify({
          tags: ["work"],
          actionType: "task",
          tasks: [],
        }),
        model: "test-model",
        usage: { promptTokens: 100, completionTokens: 50, totalTokens: 150 },
      };

      mockComplete.mockResolvedValueOnce(mockResponse);

      await processEntryWithAI("Test action types");

      const systemPrompt = mockComplete.mock.calls[0][0].systemPrompt;

      expect(systemPrompt).toContain("task:");
      expect(systemPrompt).toContain("note:");
      expect(systemPrompt).toContain("idea:");
      expect(systemPrompt).toContain("goal:");
      expect(systemPrompt).toContain("reflect:");
    });
  });
});
