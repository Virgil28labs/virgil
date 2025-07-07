const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const { LLMProxy } = require('../services/llmProxy');
const { RequestQueue } = require('../services/queue');
const { validateRequest } = require('../middleware/validation');
const { cacheMiddleware } = require('../middleware/cache');

// Initialize services
const llmProxy = new LLMProxy();
const requestQueue = new RequestQueue();

// Specific rate limiter for LLM endpoints
const llmLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 20, // Limit each IP to 20 LLM requests per minute
  message: 'Too many LLM requests, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.user?.isPremium // Skip rate limiting for premium users
});

// Apply rate limiting to all LLM routes
router.use(llmLimiter);

/**
 * POST /api/v1/llm/complete
 * Standard text completion endpoint
 */
router.post('/complete', validateRequest, cacheMiddleware, async (req, res, next) => {
  try {
    const {
      messages,
      model = process.env.VITE_DEFAULT_MODEL || 'gpt-4o-mini',
      temperature = 0.7,
      maxTokens = 256,
      systemPrompt = null,
      context = {},
      provider = 'openai'
    } = req.body;

    // Add to queue for better performance
    const result = await requestQueue.add(async () => {
      return llmProxy.complete({
        messages,
        model,
        temperature,
        maxTokens,
        systemPrompt,
        context,
        provider
      });
    });

    res.json({
      success: true,
      data: result,
      usage: result.usage,
      cached: res.locals.cached || false
    });

  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/v1/llm/stream
 * Streaming completion endpoint
 */
router.post('/stream', validateRequest, async (req, res, next) => {
  try {
    const {
      messages,
      model = process.env.VITE_DEFAULT_MODEL || 'gpt-4o-mini',
      temperature = 0.7,
      maxTokens = 256,
      systemPrompt = null,
      context = {},
      provider = 'openai'
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
      provider
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

  } catch (error) {
    // For streaming, we need to send error in SSE format
    res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
    res.end();
  }
});

/**
 * POST /api/v1/llm/batch
 * Batch completion endpoint for multiple requests
 */
router.post('/batch', validateRequest, async (req, res, next) => {
  try {
    const { requests } = req.body;

    if (!Array.isArray(requests) || requests.length === 0) {
      return res.status(400).json({
        error: 'Invalid request: requests must be a non-empty array'
      });
    }

    if (requests.length > 10) {
      return res.status(400).json({
        error: 'Batch size cannot exceed 10 requests'
      });
    }

    // Process all requests in parallel
    const results = await Promise.all(
      requests.map(request => 
        requestQueue.add(() => llmProxy.complete(request))
          .catch(error => ({ error: error.message }))
      )
    );

    res.json({
      success: true,
      data: results
    });

  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v1/llm/models
 * Get available models
 */
router.get('/models', async (req, res, next) => {
  try {
    const models = await llmProxy.getAvailableModels();
    
    res.json({
      success: true,
      data: models
    });

  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/v1/llm/tokenize
 * Count tokens in text
 */
router.post('/tokenize', async (req, res, next) => {
  try {
    const { text, model = 'gpt-4o-mini' } = req.body;

    if (!text) {
      return res.status(400).json({
        error: 'Text is required'
      });
    }

    const tokenCount = await llmProxy.countTokens(text, model);

    res.json({
      success: true,
      data: {
        text,
        model,
        tokenCount
      }
    });

  } catch (error) {
    next(error);
  }
});

module.exports = router;