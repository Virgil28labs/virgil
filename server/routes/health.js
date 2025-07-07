const express = require('express');
const router = express.Router();
const os = require('os');

/**
 * GET /api/v1/health
 * Basic health check endpoint
 */
router.get('/', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development'
  });
});

/**
 * GET /api/v1/health/detailed
 * Detailed health check with system information
 */
router.get('/detailed', async (req, res) => {
  try {
    const memoryUsage = process.memoryUsage();
    const systemInfo = {
      platform: os.platform(),
      arch: os.arch(),
      cpus: os.cpus().length,
      totalMemory: os.totalmem(),
      freeMemory: os.freemem(),
      loadAverage: os.loadavg()
    };

    // Check external services
    const services = {
      openai: await checkOpenAI(),
      cache: checkCache(),
      queue: checkQueue()
    };

    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
      process: {
        pid: process.pid,
        version: process.version,
        memoryUsage: {
          rss: `${(memoryUsage.rss / 1024 / 1024).toFixed(2)} MB`,
          heapTotal: `${(memoryUsage.heapTotal / 1024 / 1024).toFixed(2)} MB`,
          heapUsed: `${(memoryUsage.heapUsed / 1024 / 1024).toFixed(2)} MB`,
          external: `${(memoryUsage.external / 1024 / 1024).toFixed(2)} MB`
        }
      },
      system: systemInfo,
      services
    });
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /api/v1/health/ready
 * Readiness probe for orchestrators
 */
router.get('/ready', async (req, res) => {
  try {
    // Check if all required services are ready
    const openaiReady = await checkOpenAI();
    
    if (!openaiReady) {
      return res.status(503).json({
        ready: false,
        reason: 'External services not available'
      });
    }

    res.json({ ready: true });
  } catch (error) {
    res.status(503).json({
      ready: false,
      reason: error.message
    });
  }
});

/**
 * GET /api/v1/health/live
 * Liveness probe for orchestrators
 */
router.get('/live', (req, res) => {
  res.json({ alive: true });
});

// Helper functions
async function checkOpenAI() {
  try {
    // Check if OpenAI API key is configured
    return !!process.env.OPENAI_API_KEY;
  } catch (error) {
    return false;
  }
}

function checkCache() {
  // Check if cache service is working
  try {
    const cache = require('../middleware/cache').cache;
    return cache && typeof cache.get === 'function';
  } catch (error) {
    return false;
  }
}

function checkQueue() {
  // Check if queue service is working
  try {
    const { RequestQueue } = require('../services/queue');
    return !!RequestQueue;
  } catch (error) {
    return false;
  }
}

module.exports = router;