const request = require("supertest");
const express = require("express");
const { createLLMRouter } = require("../llm");

// Mock dependencies
jest.mock("../../middleware/validation");
jest.mock("../../middleware/cache");
jest.mock("express-rate-limit", () => {
  return jest.fn(() => (req, res, next) => next());
});

const {
  validateRequest,
  validateBatchRequest,
} = require("../../middleware/validation");
const { cacheMiddleware } = require("../../middleware/cache");

describe("LLM Routes", () => {
  let app;
  let mockLLMProxy;
  let mockRequestQueue;

  beforeEach(() => {
    app = express();
    app.use(express.json());

    // Set up mock implementations
    mockLLMProxy = {
      complete: jest.fn(),
      completeStream: jest.fn(),
      getAvailableModels: jest.fn(),
      countTokens: jest.fn(),
    };

    mockRequestQueue = {
      add: jest.fn((fn) => fn()),
    };

    // Mock middleware
    validateRequest.mockImplementation((req, res, next) => next());
    validateBatchRequest.mockImplementation((req, res, next) => next());
    cacheMiddleware.mockImplementation((req, res, next) => {
      res.locals = { cached: false };
      next();
    });

    // Create router with mocked dependencies
    const llmRouter = createLLMRouter(mockLLMProxy, mockRequestQueue);
    app.use("/api/v1/llm", llmRouter);

    // Reset mocks
    jest.clearAllMocks();
  });

  describe("POST /api/v1/llm/complete", () => {
    it("should complete a text generation request", async () => {
      const mockResponse = {
        id: "completion-123",
        content: "This is a generated response",
        model: "gpt-4o-mini",
        usage: {
          prompt_tokens: 10,
          completion_tokens: 5,
          total_tokens: 15,
        },
      };

      mockLLMProxy.complete.mockResolvedValue(mockResponse);

      const response = await request(app)
        .post("/api/v1/llm/complete")
        .send({
          messages: [{ role: "user", content: "Hello" }],
          model: "gpt-4o-mini",
          temperature: 0.7,
        })
        .expect("Content-Type", /json/)
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: mockResponse,
        usage: mockResponse.usage,
        cached: false,
      });

      expect(mockLLMProxy.complete).toHaveBeenCalledWith({
        messages: [{ role: "user", content: "Hello" }],
        model: "gpt-4o-mini",
        temperature: 0.7,
        maxTokens: 256,
        systemPrompt: null,
        context: {},
        provider: "openai",
      });
    });

    it("should use default values when not provided", async () => {
      mockLLMProxy.complete.mockResolvedValue({ content: "Response" });

      await request(app)
        .post("/api/v1/llm/complete")
        .send({
          messages: [{ role: "user", content: "Test" }],
        })
        .expect(200);

      expect(mockLLMProxy.complete).toHaveBeenCalledWith(
        expect.objectContaining({
          model: "gpt-4o-mini",
          temperature: 0.7,
          maxTokens: 256,
          provider: "openai",
        }),
      );
    });

    it("should include system prompt when provided", async () => {
      mockLLMProxy.complete.mockResolvedValue({ content: "Response" });

      await request(app)
        .post("/api/v1/llm/complete")
        .send({
          messages: [{ role: "user", content: "Test" }],
          systemPrompt: "You are a helpful assistant",
        })
        .expect(200);

      expect(mockLLMProxy.complete).toHaveBeenCalledWith(
        expect.objectContaining({
          systemPrompt: "You are a helpful assistant",
        }),
      );
    });

    it("should add request to queue", async () => {
      mockLLMProxy.complete.mockResolvedValue({ content: "Response" });

      await request(app)
        .post("/api/v1/llm/complete")
        .send({
          messages: [{ role: "user", content: "Test" }],
        })
        .expect(200);

      expect(mockRequestQueue.add).toHaveBeenCalled();
    });

    it("should indicate when response is cached", async () => {
      // Create a new app with updated cache middleware
      const testApp = express();
      testApp.use(express.json());

      // Mock cache middleware to set cached: true
      cacheMiddleware.mockImplementation((req, res, next) => {
        res.locals = { cached: true };
        next();
      });

      mockLLMProxy.complete.mockResolvedValue({ content: "Cached response" });

      // Create a new router instance
      const testRouter = createLLMRouter(mockLLMProxy, mockRequestQueue);
      testApp.use("/api/v1/llm", testRouter);

      const response = await request(testApp)
        .post("/api/v1/llm/complete")
        .send({
          messages: [{ role: "user", content: "Test" }],
        })
        .expect(200);

      expect(response.body.cached).toBe(true);
    });

    it("should handle errors properly", async () => {
      const errorMiddleware = (err, req, res) => {
        res.status(500).json({ error: err.message });
      };
      app.use(errorMiddleware);

      mockLLMProxy.complete.mockRejectedValue(new Error("LLM service error"));

      const response = await request(app)
        .post("/api/v1/llm/complete")
        .send({
          messages: [{ role: "user", content: "Test" }],
        })
        .expect(500);

      expect(response.body).toEqual({
        error: "LLM service error",
      });
    });
  });

  describe("POST /api/v1/llm/stream", () => {
    it("should stream a text generation response", async () => {
      const mockStream = async function* () {
        yield { content: "Hello" };
        yield { content: " world" };
        yield { content: "!" };
      };

      mockLLMProxy.completeStream.mockResolvedValue(mockStream());

      const response = await request(app)
        .post("/api/v1/llm/stream")
        .send({
          messages: [{ role: "user", content: "Say hello" }],
        })
        .expect("Content-Type", /text\/event-stream/)
        .expect(200);

      const responseText = response.text;
      expect(responseText).toContain('data: {"content":"Hello"}');
      expect(responseText).toContain('data: {"content":" world"}');
      expect(responseText).toContain('data: {"content":"!"}');
      expect(responseText).toContain("data: [DONE]");
    });

    it("should handle stream errors", async () => {
      const mockStream = async function* () {
        yield { content: "Start" };
        throw new Error("Stream error");
      };

      mockLLMProxy.completeStream.mockResolvedValue(mockStream());

      const response = await request(app)
        .post("/api/v1/llm/stream")
        .send({
          messages: [{ role: "user", content: "Test" }],
        })
        .expect(200);

      expect(response.text).toContain('data: {"error":"Stream error"}');
    });
  });

  describe("POST /api/v1/llm/batch", () => {
    it("should process batch requests", async () => {
      const mockResponses = [
        { id: "1", content: "Response 1" },
        { id: "2", content: "Response 2" },
      ];

      mockLLMProxy.complete
        .mockResolvedValueOnce(mockResponses[0])
        .mockResolvedValueOnce(mockResponses[1]);

      const response = await request(app)
        .post("/api/v1/llm/batch")
        .send({
          requests: [
            { messages: [{ role: "user", content: "Question 1" }] },
            { messages: [{ role: "user", content: "Question 2" }] },
          ],
        })
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: mockResponses,
      });

      expect(mockLLMProxy.complete).toHaveBeenCalledTimes(2);
    });

    it("should handle individual request failures in batch", async () => {
      mockLLMProxy.complete
        .mockResolvedValueOnce({ content: "Success" })
        .mockRejectedValueOnce(new Error("Request failed"));

      const response = await request(app)
        .post("/api/v1/llm/batch")
        .send({
          requests: [
            { messages: [{ role: "user", content: "Good request" }] },
            { messages: [{ role: "user", content: "Bad request" }] },
          ],
        })
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: [{ content: "Success" }, { error: "Request failed" }],
      });
    });

    it("should return 400 for empty requests", async () => {
      const response = await request(app)
        .post("/api/v1/llm/batch")
        .send({ requests: [] })
        .expect(400);

      expect(response.body).toEqual({
        error: "Requests array must not be empty",
      });
    });

    it("should return 400 for invalid requests format", async () => {
      const response = await request(app)
        .post("/api/v1/llm/batch")
        .send({ requests: "not an array" })
        .expect(400);

      expect(response.body).toEqual({
        error: "Requests must be an array",
      });
    });

    it("should limit batch size to 10 requests", async () => {
      const requests = Array(11).fill({
        messages: [{ role: "user", content: "Test" }],
      });

      const response = await request(app)
        .post("/api/v1/llm/batch")
        .send({ requests })
        .expect(400);

      expect(response.body).toEqual({
        error: "Batch size cannot exceed 10 requests",
      });
    });
  });

  describe("GET /api/v1/llm/models", () => {
    it("should return available models", async () => {
      const mockModels = {
        openai: ["gpt-4o-mini", "gpt-3.5-turbo", "gpt-4"],
        anthropic: ["claude-3-haiku", "claude-3-sonnet", "claude-3-opus"],
      };

      mockLLMProxy.getAvailableModels.mockResolvedValue(mockModels);

      const response = await request(app).get("/api/v1/llm/models").expect(200);

      expect(response.body).toEqual({
        success: true,
        data: mockModels,
      });
    });

    it("should handle errors when fetching models", async () => {
      const errorMiddleware = (err, req, res) => {
        res.status(500).json({ error: err.message });
      };
      app.use(errorMiddleware);

      mockLLMProxy.getAvailableModels.mockRejectedValue(
        new Error("Service unavailable"),
      );

      const response = await request(app).get("/api/v1/llm/models").expect(500);

      expect(response.body).toEqual({
        error: "Service unavailable",
      });
    });
  });

  describe("POST /api/v1/llm/tokenize", () => {
    it("should count tokens in text", async () => {
      // countTokens uses text.length / 4, so for 'This is a sample text to tokenize' (34 chars) = 9 tokens
      mockLLMProxy.countTokens.mockResolvedValue(9);

      const response = await request(app)
        .post("/api/v1/llm/tokenize")
        .send({
          text: "This is a sample text to tokenize",
          model: "gpt-4o-mini",
        })
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: {
          text: "This is a sample text to tokenize",
          model: "gpt-4o-mini",
          tokenCount: 9,
        },
      });

      expect(mockLLMProxy.countTokens).toHaveBeenCalledWith(
        "This is a sample text to tokenize",
        "gpt-4o-mini",
      );
    });

    it("should use default model when not specified", async () => {
      // 'Test text' (9 chars) / 4 = 3 tokens (rounded up)
      mockLLMProxy.countTokens.mockResolvedValue(3);

      await request(app)
        .post("/api/v1/llm/tokenize")
        .send({ text: "Test text" })
        .expect(200);

      expect(mockLLMProxy.countTokens).toHaveBeenCalledWith(
        "Test text",
        "gpt-4o-mini",
      );
    });

    it("should return 400 when text is missing", async () => {
      const response = await request(app)
        .post("/api/v1/llm/tokenize")
        .send({ model: "gpt-4" })
        .expect(400);

      expect(response.body).toEqual({
        error: "Text is required",
      });
    });
  });

  describe("Rate Limiting", () => {
    it("should apply rate limiting middleware", () => {
      // Clear the mock to test fresh
      const rateLimit = require("express-rate-limit");
      rateLimit.mockClear();

      // Create a new router which should call rateLimit
      createLLMRouter();

      expect(rateLimit).toHaveBeenCalled();
    });
  });
});
