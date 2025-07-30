const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const fetch = require('node-fetch');
const logger = require('../lib/logger');

// Chat-specific rate limiter
const chatLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30, // Limit each IP to 30 chat requests per minute
  message: 'Too many chat requests, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

// Apply rate limiting
router.use(chatLimiter);

/**
 * Calculate confidence score from logprobs
 * @param {Object} logprobs - The logprobs object from OpenAI response
 * @returns {number} - Confidence score between 0 and 1
 */
function calculateConfidenceFromLogprobs(logprobs) {
  if (!logprobs?.content || logprobs.content.length === 0) {
    return 0.8; // Default confidence if no logprobs available
  }

  // Calculate statistics across all tokens
  const logprobValues = logprobs.content.map(token => token.logprob || 0);
  const avgLogprob = logprobValues.reduce((sum, val) => sum + val, 0) / logprobValues.length;

  // Calculate variance to understand model uncertainty
  const variance = logprobValues.reduce((sum, val) =>
    sum + Math.pow(val - avgLogprob, 2), 0) / logprobValues.length;
  const stdDev = Math.sqrt(variance);

  // Convert average log probability to probability (0-1)
  const avgProb = Math.exp(avgLogprob);

  // Apply penalties for high variance (model uncertainty)
  // Higher variance = lower confidence
  const variancePenalty = Math.exp(-stdDev * 0.5);

  // Combine average probability with variance penalty
  let confidence = avgProb * variancePenalty;

  // Apply response length normalization
  // Very short responses might have artificially high confidence
  const lengthFactor = Math.min(logprobValues.length / 10, 1);
  confidence = confidence * (0.7 + 0.3 * lengthFactor);

  // Ensure minimum confidence of 0.1 (never fully uncertain)
  // and maximum of 0.95 (never fully certain)
  return Math.min(Math.max(confidence, 0.1), 0.95);
}

/**
 * POST /api/v1/chat
 * Secure chat endpoint that proxies to OpenAI
 */
router.post('/', async (req, res) => {
  try {
    const { messages, model = 'gpt-4o-mini', temperature = 0.7, max_tokens = 200 } = req.body;

    // Validate request
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({
        error: 'Messages array is required and must not be empty',
      });
    }

    // Validate OpenAI API key
    const openaiApiKey = process.env.OPENAI_API_KEY;
    if (!openaiApiKey) {
      logger.error('OpenAI API key not configured');
      return res.status(500).json({
        error: 'Chat service is not properly configured',
      });
    }

    // Make request to OpenAI
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openaiApiKey}`,
      },
      body: JSON.stringify({
        model,
        messages,
        max_tokens,
        temperature,
        logprobs: true,  // Enable confidence data
        top_logprobs: 3,  // Get alternatives
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      logger.error('OpenAI API error:', response.status, errorData);

      // Don't expose internal error details to client
      return res.status(response.status).json({
        error: 'Failed to get response from chat service',
        status: response.status,
      });
    }

    const data = await response.json();

    // Calculate confidence from logprobs
    const confidence = calculateConfidenceFromLogprobs(data.choices[0].logprobs);

    // Return only necessary data to client
    res.json({
      success: true,
      message: {
        role: 'assistant',
        content: data.choices[0].message.content,
        confidence,  // Include confidence score
      },
      usage: data.usage,
    });

  } catch (error) {
    logger.error('Chat endpoint error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to process chat request',
    });
  }
});

/**
 * GET /api/v1/chat/health
 * Health check endpoint
 */
router.get('/health', (req, res) => {
  const hasApiKey = !!process.env.OPENAI_API_KEY;

  res.json({
    status: hasApiKey ? 'healthy' : 'unhealthy',
    service: 'chat',
    configured: hasApiKey,
    timestamp: new Date().toISOString(),
  });
});

module.exports = router;
