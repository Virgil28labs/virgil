const express = require('express');
const rateLimit = require('express-rate-limit');
const { LLMProxy } = require('../services/llmProxy');
const { RequestQueue } = require('../services/queue');
const { validateRequest, validateBatchRequest } = require('../middleware/validation');
const { cacheMiddleware } = require('../middleware/cache');
const { asyncHandler, ValidationError: _ValidationError } = require('../lib/errors');

// Factory function for creating router with injected dependencies
function createLLMRouter(llmProxyInstance, requestQueueInstance) {
  const router = express.Router();

  // Use provided instances or create new ones
  const llmProxy = llmProxyInstance || new LLMProxy();
  const requestQueue = requestQueueInstance || new RequestQueue();

  // Specific rate limiter for LLM endpoints
  const llmLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 20, // Limit each IP to 20 LLM requests per minute
    message: 'Too many LLM requests, please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
    skip: req => req.user?.isPremium, // Skip rate limiting for premium users
  });

  // Apply rate limiting to all LLM routes
  router.use(llmLimiter);

  /**
 * POST /api/v1/llm/complete
 * Standard text completion endpoint
 */
  router.post('/complete', validateRequest, cacheMiddleware, asyncHandler(async (req, res) => {
    const {
      messages,
      model = process.env.VITE_DEFAULT_MODEL || 'gpt-4o-mini',
      temperature = 0.7,
      maxTokens = 256,
      systemPrompt = null,
      context = {},
      provider = 'openai',
    } = req.body;

    // Add to queue for better performance
    const result = await requestQueue.add(async () => llmProxy.complete({
      messages,
      model,
      temperature,
      maxTokens,
      systemPrompt,
      context,
      provider,
    }));

    res.json({
      success: true,
      data: result,
      usage: result.usage,
      cached: res.locals.cached || false,
    });
  }));

  /**
 * POST /api/v1/llm/stream
 * Streaming completion endpoint
 */
  router.post('/stream', validateRequest, asyncHandler(async (req, res) => {
    const {
      messages,
      model = process.env.VITE_DEFAULT_MODEL || 'gpt-4o-mini',
      temperature = 0.7,
      maxTokens = 256,
      systemPrompt = null,
      context = {},
      provider = 'openai',
    } = req.body;

    // Set up SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no'); // Disable Nginx buffering

    // Stream the response
    const stream = await llmProxy.completeStream({
      messages,
      model,
      temperature,
      maxTokens,
      systemPrompt,
      context,
      provider,
    });

    for await (const chunk of stream) {
      // Send SSE formatted data
      res.write(`data: ${JSON.stringify(chunk)}\n\n`);

      // Check if client is still connected
      if (res.writableEnded) {
        break;
      }
    }

    // Send completion signal
    res.write('data: [DONE]\n\n');
    res.end();
  }));

  /**
 * POST /api/v1/llm/batch
 * Batch completion endpoint for multiple requests
 */
  router.post('/batch', validateBatchRequest, asyncHandler(async (req, res) => {
    const { requests } = req.body;

    // Process all requests in parallel
    const results = await Promise.all(
      requests.map(request =>
        requestQueue.add(() => llmProxy.complete(request))
          .catch(error => ({ error: error.message })),
      ),
    );

    res.json({
      success: true,
      data: results,
    });
  }));

  /**
 * GET /api/v1/llm/models
 * Get available models
 */
  router.get('/models', asyncHandler(async (req, res) => {
    const models = await llmProxy.getAvailableModels();

    res.json({
      success: true,
      data: models,
    });
  }));

  /**
 * POST /api/v1/llm/tokenize
 * Count tokens in text
 */
  router.post('/tokenize', asyncHandler(async (req, res) => {
    const { text, model = 'gpt-4o-mini' } = req.body;

    if (!text) {
      return res.status(400).json({
        error: 'Text is required',
      });
    }

    const tokenCount = await llmProxy.countTokens(text, model);

    res.json({
      success: true,
      data: {
        text,
        model,
        tokenCount,
      },
    });
  }));

  return router;
}

// Create default router instance for production use
const router = createLLMRouter();

// Export both the router and the factory for testing
module.exports = router;
module.exports.createLLMRouter = createLLMRouter;
