const express = require('express');
const cors = require('cors');
const compression = require('compression');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const logger = require('./lib/logger');
const { errorHandler, NotFoundError } = require('./lib/errors');

const app = express();

// Security middleware
app.use(helmet());

// Compression for better performance
app.use(compression());

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// CORS configuration
app.use(cors({
  origin: process.env.NODE_ENV === 'production'
    ? process.env.ALLOWED_ORIGINS?.split(',') || []
    : ['http://localhost:5173', 'http://localhost:3000', 'http://localhost:5174'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Global rate limiting
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/', globalLimiter);

// Import routes
const llmRoutes = require('./routes/llm');
const healthRoutes = require('./routes/health');
const analyticsRoutes = require('./routes/analytics');
const chatRoutes = require('./routes/chat');
const weatherRoutes = require('./routes/weather');
const elevationRoutes = require('./routes/elevation');
const rhythmRoutes = require('./routes/rhythm');
const vectorRoutes = require('./routes/vector');

// Mount routes
app.use('/api/v1/llm', llmRoutes);
app.use('/api/v1/health', healthRoutes);
app.use('/api/v1/analytics', analyticsRoutes);
app.use('/api/v1/chat', chatRoutes);
app.use('/api/v1/weather', weatherRoutes);
app.use('/api/v1/elevation', elevationRoutes);
app.use('/api/v1/rhythm', rhythmRoutes);
app.use('/api/v1/vector', vectorRoutes);

// 404 handler
app.use((req, _res, next) => {
  next(new NotFoundError(`Endpoint not found: ${req.path}`));
});

// Error handling middleware
app.use(errorHandler);

// Server startup with initialization
const PORT = process.env.LLM_SERVER_PORT || 5002;

// Pre-startup checks
async function performStartupChecks() {
  logger.log('🔍 Performing startup checks...');

  // Check required environment variables
  const requiredEnvVars = ['NODE_ENV'];
  const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

  if (missingVars.length > 0) {
    logger.warn(`⚠️  Missing optional environment variables: ${missingVars.join(', ')}`);
  }

  // Initialize services
  try {
    // Initialize cache
    const { cache } = require('./middleware/cache');
    if (cache) {
      /* eslint-disable-next-line no-console */
      console.log('✅ Cache service initialized');
    } else {

      console.warn('⚠️  Cache service not available');
    }

    // Initialize queue
    const { RequestQueue } = require('./services/queue');
    if (RequestQueue) {
      /* eslint-disable-next-line no-console */
      console.log('✅ Queue service initialized');
    } else {

      console.warn('⚠️  Queue service not available');
    }

  } catch (error) {

    console.warn('⚠️  Service initialization warnings:', error.message);
  }

  /* eslint-disable-next-line no-console */
  console.log('✅ Startup checks completed');
}

// Start server with proper initialization
async function startServer() {
  try {
    await performStartupChecks();

    const server = app.listen(PORT, () => {
      /* eslint-disable no-console */
      console.log(`🚀 Virgil LLM Server running on port ${PORT}`);
      console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`🏥 Health check: http://localhost:${PORT}/api/v1/health`);
      console.log(`⚡ Ready check: http://localhost:${PORT}/api/v1/health/ready`);
      console.log('📋 Available endpoints:');
      console.log('  POST /api/v1/llm/complete - Text completion');
      console.log('  POST /api/v1/llm/stream - Streaming completion');
      console.log('  POST /api/v1/chat - Secure chat endpoint');
      console.log('  GET /api/v1/health - Health check');
      console.log('  POST /api/v1/analytics/track - Analytics tracking');
      console.log('  GET /api/v1/weather/coordinates/:lat/:lon - Weather by coordinates');
      console.log('  GET /api/v1/weather/city/:city - Weather by city');
      console.log('  GET /api/v1/elevation/coordinates/:lat/:lon - Elevation by coordinates');
      console.log('  POST /api/v1/rhythm/generate - AI-powered rhythm generation');
      console.log('  POST /api/v1/vector/store - Store text with embedding');
      console.log('  POST /api/v1/vector/search - Search similar texts');
      console.log('  GET /api/v1/vector/health - Vector service health check');
      console.log('🎯 Server ready to accept connections');
      /* eslint-enable no-console */
    });

    return server;
  } catch (error) {

    logger.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Start the server
let server;
startServer().then(srv => {
  server = srv;
}).catch(error => {

  logger.error('❌ Fatal startup error:', error);
  process.exit(1);
});

// Graceful shutdown
const gracefulShutdown = () => {
  /* eslint-disable no-console */
  console.log('🛑 Received shutdown signal, closing server gracefully...');

  if (server) {
    server.close(() => {
      console.log('✅ Server closed');
      process.exit(0);
    });

    // Force close after 10 seconds
    setTimeout(() => {
      logger.error('❌ Could not close connections in time, forcefully shutting down');
      process.exit(1);
    }, 10000);
  } else {
    console.log('⚠️  Server not yet initialized, exiting immediately');
    process.exit(0);
  }
  /* eslint-enable no-console */
};

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

module.exports = app;
