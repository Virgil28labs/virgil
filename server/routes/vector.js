const express = require('express');
const OpenAI = require('openai');
const { createClient } = require('@supabase/supabase-js');
const rateLimit = require('express-rate-limit');
const logger = require('../lib/logger');

const router = express.Router();

// Vector-specific rate limiter
const vectorLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30, // Limit each IP to 30 vector requests per minute
  message: 'Too many vector requests, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

// Apply rate limiting
router.use(vectorLimiter);

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Initialize Supabase
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// Store text with embedding
router.post('/store', async (req, res) => {
  try {
    const { content } = req.body;

    if (!content || typeof content !== 'string') {
      return res.status(400).json({ error: 'Content must be a non-empty string' });
    }

    // Generate embedding using OpenAI
    const embeddingResponse = await openai.embeddings.create({
      model: 'text-embedding-ada-002',
      input: content,
    });

    const { embedding } = embeddingResponse.data[0];

    // Store in Supabase
    const { data, error } = await supabase
      .from('memory_vectors')
      .insert({
        content,
        embedding: JSON.stringify(embedding), // pgvector expects JSON array format
      })
      .select('id')
      .single();

    if (error) {
      logger.error('Supabase error:', error);
      return res.status(500).json({ error: 'Failed to store memory' });
    }

    res.json({ id: data.id, message: 'Memory stored successfully' });
  } catch (error) {
    logger.error('Store error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Search for similar content
router.post('/search', async (req, res) => {
  try {
    const { query, limit = 10 } = req.body;

    if (!query || typeof query !== 'string') {
      return res.status(400).json({ error: 'Query must be a non-empty string' });
    }

    // Generate embedding for the query
    const embeddingResponse = await openai.embeddings.create({
      model: 'text-embedding-ada-002',
      input: query,
    });

    const queryEmbedding = embeddingResponse.data[0].embedding;

    // Search using Supabase RPC function
    const { data, error } = await supabase.rpc('match_memories', {
      query_embedding: queryEmbedding,
      match_threshold: 0.3, // Adjust based on testing
      match_count: limit,
    });

    if (error) {
      logger.error('Supabase error:', error);
      return res.status(500).json({ error: 'Failed to search memories' });
    }

    res.json({ results: data || [] });
  } catch (error) {
    logger.error('Search error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Health check
router.get('/health', async (req, res) => {
  try {
    // Check if we can query the table
    const { error } = await supabase
      .from('memory_vectors')
      .select('count')
      .limit(1);

    if (error) {
      return res.status(503).json({ healthy: false, error: error.message });
    }

    res.json({ healthy: true, message: 'Vector service is operational' });
  } catch (error) {
    logger.error('Health check error:', error);
    res.status(503).json({ healthy: false, error: 'Service unavailable' });
  }
});

// Get memory count
router.get('/count', async (req, res) => {
  try {
    const { count, error } = await supabase
      .from('memory_vectors')
      .select('*', { count: 'exact', head: true });

    if (error) {
      logger.error('Count error:', error);
      return res.status(500).json({ error: 'Failed to get memory count' });
    }

    res.json({ count: count || 0 });
  } catch (error) {
    logger.error('Count error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
