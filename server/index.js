const express = require('express');
const cors = require('cors');
const compression = require('compression');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

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
  allowedHeaders: ['Content-Type', 'Authorization']
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
const searchRoutes = require('./routes/search');
const elevationRoutes = require('./routes/elevation');

// Mount routes
app.use('/api/v1/llm', llmRoutes);
app.use('/api/v1/health', healthRoutes);
app.use('/api/v1/analytics', analyticsRoutes);
app.use('/api/v1/chat', chatRoutes);
app.use('/api/v1/weather', weatherRoutes);
app.use('/api/v1/search', searchRoutes);
app.use('/api/v1/elevation', elevationRoutes);

// Error handling middleware
app.use((err, req, res, _next) => {
  console.error('Error:', err);
  
  // Don't leak error details in production
  const isDev = process.env.NODE_ENV !== 'production';
  
  res.status(err.status || 500).json({
    error: {
      message: err.message || 'Internal server error',
      status: err.status || 500,
      ...(isDev && { stack: err.stack })
    }
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: {
      message: 'Endpoint not found',
      status: 404,
      path: req.path
    }
  });
});

// Server configuration
const PORT = process.env.LLM_SERVER_PORT || 5002;
const server = app.listen(PORT, () => {
  console.log(`🚀 Virgil LLM Server running on port ${PORT}`);
  console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log('📋 Available endpoints:');
  console.log(`  POST /api/v1/llm/complete - Text completion`);
  console.log(`  POST /api/v1/llm/stream - Streaming completion`);
  console.log(`  POST /api/v1/chat - Secure chat endpoint`);
  console.log(`  GET /api/v1/health - Health check`);
  console.log(`  POST /api/v1/analytics/track - Analytics tracking`);
  console.log(`  GET /api/v1/weather/coordinates/:lat/:lon - Weather by coordinates`);
  console.log(`  GET /api/v1/weather/city/:city - Weather by city`);
  console.log(`  POST /api/v1/search - Web search endpoint`);
  console.log(`  GET /api/v1/search/health - Search service health check`);
  console.log(`  GET /api/v1/elevation/coordinates/:lat/:lon - Elevation by coordinates`);
});

// Graceful shutdown
const gracefulShutdown = () => {
  console.log('🛑 Received shutdown signal, closing server gracefully...');
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
  
  // Force close after 10 seconds
  setTimeout(() => {
    console.error('❌ Could not close connections in time, forcefully shutting down');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

module.exports = app;