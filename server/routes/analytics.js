const express = require('express');
const router = express.Router();
const logger = require('../lib/logger');

// In-memory analytics storage (replace with database in production)
const analytics = {
  requests: [],
  errors: [],
  usage: {
    total: 0,
    byModel: {},
    byProvider: {},
  },
};

/**
 * POST /api/v1/analytics/track
 * Track analytics events
 */
router.post('/track', (req, res) => {
  try {
    const {
      event,
      data,
      timestamp = new Date().toISOString(),
    } = req.body;

    if (!event) {
      return res.status(400).json({
        error: 'Event name is required',
      });
    }

    const analyticsEvent = {
      event,
      data,
      timestamp,
      sessionId: req.sessionID,
      ip: req.ip,
    };

    // Store event based on type
    switch (event) {
    case 'llm_request':
      trackLLMRequest(analyticsEvent);
      break;
    case 'llm_error':
      trackError(analyticsEvent);
      break;
    default:
      analytics.requests.push(analyticsEvent);
    }

    res.json({ success: true });

  } catch (error) {
    logger.error('Analytics tracking error:', error);
    res.status(500).json({ error: 'Failed to track event' });
  }
});

/**
 * GET /api/v1/analytics/summary
 * Get analytics summary
 */
router.get('/summary', (req, res) => {
  try {
    const summary = {
      totalRequests: analytics.usage.total,
      requestsByModel: analytics.usage.byModel,
      requestsByProvider: analytics.usage.byProvider,
      errorRate: calculateErrorRate(),
      averageLatency: calculateAverageLatency(),
      lastUpdated: new Date().toISOString(),
    };

    res.json({
      success: true,
      data: summary,
    });

  } catch (error) {
    logger.error('Analytics summary error:', error);
    res.status(500).json({ error: 'Failed to generate summary' });
  }
});

/**
 * GET /api/v1/analytics/usage
 * Get detailed usage statistics
 */
router.get('/usage', (req, res) => {
  try {
    const { period = 'hour' } = req.query;
    const usage = calculateUsageByPeriod(period);

    res.json({
      success: true,
      data: {
        period,
        usage,
      },
    });

  } catch (error) {
    logger.error('Analytics usage error:', error);
    res.status(500).json({ error: 'Failed to calculate usage' });
  }
});

/**
 * GET /api/v1/analytics/errors
 * Get error analytics
 */
router.get('/errors', (req, res) => {
  try {
    const { limit = 100 } = req.query;
    const recentErrors = analytics.errors
      .slice(-limit)
      .reverse()
      .map(error => ({
        ...error,
        ip: undefined, // Remove sensitive data
      }));

    res.json({
      success: true,
      data: {
        total: analytics.errors.length,
        recent: recentErrors,
      },
    });

  } catch (error) {
    logger.error('Analytics errors fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch errors' });
  }
});

// Helper functions
function trackLLMRequest(event) {
  const { model, provider, tokens, latency } = event.data || {};

  analytics.usage.total += 1;

  if (model) {
    analytics.usage.byModel[model] = (analytics.usage.byModel[model] || 0) + 1;
  }

  if (provider) {
    analytics.usage.byProvider[provider] = (analytics.usage.byProvider[provider] || 0) + 1;
  }

  // Track token usage if available
  if (tokens && typeof tokens === 'number') {
    analytics.usage.totalTokens = (analytics.usage.totalTokens || 0) + tokens;
  }

  // Track latency metrics if available
  if (latency && typeof latency === 'number') {
    if (!analytics.usage.latency) {
      analytics.usage.latency = { total: 0, count: 0, avg: 0 };
    }
    analytics.usage.latency.total += latency;
    analytics.usage.latency.count += 1;
    analytics.usage.latency.avg = analytics.usage.latency.total / analytics.usage.latency.count;
  }

  analytics.requests.push({
    ...event,
    type: 'llm_request',
  });

  // Keep only last 10000 requests in memory
  if (analytics.requests.length > 10000) {
    analytics.requests.shift();
  }
}

function trackError(event) {
  analytics.errors.push({
    ...event,
    type: 'error',
  });

  // Keep only last 1000 errors in memory
  if (analytics.errors.length > 1000) {
    analytics.errors.shift();
  }
}

function calculateErrorRate() {
  if (analytics.usage.total === 0) return 0;
  return ((analytics.errors.length / analytics.usage.total) * 100).toFixed(2);
}

function calculateAverageLatency() {
  const recentRequests = analytics.requests
    .filter(req => req.type === 'llm_request' && req.data?.latency)
    .slice(-100);

  if (recentRequests.length === 0) return 0;

  const totalLatency = recentRequests.reduce((sum, req) => sum + req.data.latency, 0);
  return Math.round(totalLatency / recentRequests.length);
}

function calculateUsageByPeriod(period) {
  const now = new Date();
  const periodMs = {
    hour: 60 * 60 * 1000,
    day: 24 * 60 * 60 * 1000,
    week: 7 * 24 * 60 * 60 * 1000,
  }[period] || 60 * 60 * 1000;

  const cutoff = new Date(now - periodMs);

  return analytics.requests
    .filter(req => new Date(req.timestamp) > cutoff)
    .reduce((acc, req) => {
      const hour = new Date(req.timestamp).getHours();
      acc[hour] = (acc[hour] || 0) + 1;
      return acc;
    }, {});
}

// Reset analytics endpoint (development only)
if (process.env.NODE_ENV !== 'production') {
  router.delete('/reset', (req, res) => {
    analytics.requests = [];
    analytics.errors = [];
    analytics.usage = { total: 0, byModel: {}, byProvider: {} };
    res.json({ success: true, message: 'Analytics reset' });
  });
}

module.exports = router;
