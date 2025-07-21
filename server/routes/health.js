const express = require("express");
const router = express.Router();
const os = require("os");

/**
 * GET /api/v1/health
 * Basic health check endpoint
 */
router.get("/", (req, res) => {
  res.json({
    status: "healthy",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || "development",
  });
});

/**
 * GET /api/v1/health/detailed
 * Detailed health check with system information
 */
router.get("/detailed", async (req, res) => {
  try {
    const memoryUsage = process.memoryUsage();
    const systemInfo = {
      platform: os.platform(),
      arch: os.arch(),
      cpus: os.cpus().length,
      totalMemory: os.totalmem(),
      freeMemory: os.freemem(),
      loadAverage: os.loadavg(),
    };

    // Check external services
    const services = {
      openai: await checkOpenAI(),
      cache: checkCache(),
      queue: checkQueue(),
    };

    res.json({
      status: "healthy",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || "development",
      process: {
        pid: process.pid,
        version: process.version,
        memoryUsage: {
          rss: `${(memoryUsage.rss / 1024 / 1024).toFixed(2)} MB`,
          heapTotal: `${(memoryUsage.heapTotal / 1024 / 1024).toFixed(2)} MB`,
          heapUsed: `${(memoryUsage.heapUsed / 1024 / 1024).toFixed(2)} MB`,
          external: `${(memoryUsage.external / 1024 / 1024).toFixed(2)} MB`,
        },
      },
      system: systemInfo,
      services,
    });
  } catch (error) {
    res.status(503).json({
      status: "unhealthy",
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * GET /api/v1/health/ready
 * Readiness probe for orchestrators - checks if server is ready to serve requests
 */
router.get("/ready", async (req, res) => {
  try {
    const checks = {};
    let allReady = true;

    // Check OpenAI configuration (non-blocking)
    checks.openai = await checkOpenAI();

    // Check cache service
    checks.cache = checkCache();

    // Check queue service
    checks.queue = checkQueue();

    // Check basic server functionality
    checks.server = true; // If we reach here, server is responding

    // Check memory usage (warning if > 90%)
    const memUsage = process.memoryUsage();
    const memUsageMB = memUsage.heapUsed / 1024 / 1024;
    checks.memory = memUsageMB < 512; // Warn if using more than 512MB

    // Determine overall readiness - only fail on critical issues
    const criticalChecks = ["cache", "queue", "server"];
    for (const check of criticalChecks) {
      if (!checks[check]) {
        allReady = false;
        break;
      }
    }

    const response = {
      ready: allReady,
      timestamp: new Date().toISOString(),
      checks: checks,
    };

    if (!allReady) {
      response.reason = "One or more critical services are not ready";
    }

    // Return 200 if ready, 503 if not ready
    res.status(allReady ? 200 : 503).json(response);
  } catch (error) {
    res.status(503).json({
      ready: false,
      reason: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * GET /api/v1/health/live
 * Liveness probe for orchestrators
 */
router.get("/live", (req, res) => {
  res.json({ alive: true });
});

// Helper functions
async function checkOpenAI() {
  try {
    // Check if OpenAI API key is configured (non-blocking)
    const hasKey = !!(
      process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY.length > 10
    );
    return hasKey;
  } catch (error) {
    console.warn("OpenAI configuration check failed:", error.message);
    return false;
  }
}

function checkCache() {
  // Check if cache service is working
  try {
    const cache = require("../middleware/cache").cache;
    if (!cache || typeof cache.get !== "function") {
      return false;
    }

    // Test basic cache operation
    const testKey = "__health_check_test__";
    const testValue = Date.now().toString();
    cache.set(testKey, testValue, 1); // 1 second TTL
    const retrieved = cache.get(testKey);

    // Handle both sync and async cache implementations
    if (retrieved instanceof Promise) {
      // For async cache, just check if the methods exist
      return typeof cache.set === "function" && typeof cache.get === "function";
    }

    return retrieved === testValue;
  } catch (error) {
    console.warn("Cache check failed:", error.message);
    return false;
  }
}

function checkQueue() {
  // Check if queue service is working
  try {
    const { RequestQueue } = require("../services/queue");
    if (!RequestQueue || typeof RequestQueue !== "function") {
      return false;
    }

    // Check if it's a proper class constructor by testing prototype methods
    const proto = RequestQueue.prototype;
    if (
      !proto ||
      typeof proto.add !== "function" ||
      typeof proto.process !== "function"
    ) {
      return false;
    }

    return true;
  } catch (error) {
    console.warn("Queue check failed:", error.message);
    return false;
  }
}

module.exports = router;
