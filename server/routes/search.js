const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const fetch = require('node-fetch');

// Search-specific rate limiter
const searchLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // Limit each IP to 10 search requests per minute
  message: 'Too many search requests, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

// Apply rate limiting
router.use(searchLimiter);

/**
 * POST /api/v1/search
 * Web search endpoint using SerpAPI
 */
router.post('/', async (req, res) => {
  try {
    const { query, max_results = 3, include_domains = [], exclude_domains = [] } = req.body;

    // Validate request
    if (!query || typeof query !== 'string' || query.trim().length === 0) {
      return res.status(400).json({
        error: 'Search query is required and must be a non-empty string'
      });
    }

    // Validate SerpAPI key
    const serpApiKey = process.env.SERPAPI_KEY;
    console.log('🔑 API Key check:', serpApiKey ? `Present (${serpApiKey.substring(0, 8)}...)` : 'Missing');
    if (!serpApiKey) {
      console.error('SerpAPI key not configured');
      return res.status(500).json({
        error: 'Search service is not properly configured'
      });
    }

    // Prepare search query with domain filters
    let searchQuery = query.trim();
    if (include_domains.length > 0) {
      searchQuery += ` site:${include_domains.join(' OR site:')}`;
    }
    if (exclude_domains.length > 0) {
      searchQuery += ` ${exclude_domains.map(domain => `-site:${domain}`).join(' ')}`;
    }

    // Prepare SerpAPI request URL
    const searchParams = new URLSearchParams({
      engine: 'google',
      q: searchQuery,
      api_key: serpApiKey,
      num: Math.min(max_results, 10).toString() // Limit to 10 results max
    });

    // Make request to SerpAPI
    const requestUrl = `https://serpapi.com/search?${searchParams}`;
    console.log('🌐 SerpAPI Request URL:', requestUrl);
    
    const response = await fetch(requestUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      }
    });

    console.log('📡 SerpAPI Response Status:', response.status);
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('❌ SerpAPI error:', response.status, errorData);
      
      // Don't expose internal error details to client
      return res.status(response.status).json({
        error: 'Failed to get response from search service',
        status: response.status
      });
    }

    const data = await response.json();
    console.log('✅ SerpAPI Response Data Keys:', Object.keys(data));
    console.log('🔍 Organic Results Count:', data.organic_results?.length || 0);
    
    // Format and return search results
    const results = data.organic_results?.map(result => ({
      title: result.title,
      url: result.link,
      content: result.snippet,
      published_date: result.date,
      score: result.position
    })) || [];

    // Extract answer from knowledge graph or answer box
    let answer = null;
    if (data.answer_box?.answer) {
      answer = data.answer_box.answer;
    } else if (data.answer_box?.snippet) {
      answer = data.answer_box.snippet;
    } else if (data.knowledge_graph?.description) {
      answer = data.knowledge_graph.description;
    }

    res.json({
      success: true,
      query,
      answer,
      results,
      total_results: results.length,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Search endpoint error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to process search request'
    });
  }
});

/**
 * GET /api/v1/search/health
 * Health check endpoint
 */
router.get('/health', (req, res) => {
  const hasApiKey = !!process.env.SERPAPI_KEY;
  
  res.json({
    status: hasApiKey ? 'healthy' : 'unhealthy',
    service: 'search',
    configured: hasApiKey,
    timestamp: new Date().toISOString()
  });
});

module.exports = router;