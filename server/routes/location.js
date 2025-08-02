const express = require('express');
const router = express.Router();
const fetch = require('node-fetch');
const rateLimit = require('express-rate-limit');
const logger = require('../lib/logger');

// Rate limiting for location API
const locationLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30, // Limit each IP to 30 requests per minute
  message: 'Too many location requests, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

// Simple in-memory cache for location data
const locationCache = new Map();
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

// Helper function to round coordinates to reduce cache misses
const roundCoordinate = coord => Math.round(coord * 1000) / 1000;

// Get enriched location data (address + elevation) by coordinates
router.get('/enrich/:lat/:lon', locationLimiter, async (req, res) => {
  try {
    const lat = parseFloat(req.params.lat);
    const lon = parseFloat(req.params.lon);

    if (isNaN(lat) || isNaN(lon)) {
      return res.status(400).json({
        error: 'Invalid coordinates provided',
      });
    }

    // Check if coordinates are within valid range
    if (lat < -90 || lat > 90 || lon < -180 || lon > 180) {
      return res.status(400).json({
        error: 'Coordinates out of valid range',
      });
    }

    // Round coordinates for caching
    const cacheKey = `${roundCoordinate(lat)},${roundCoordinate(lon)}`;

    // Check cache first
    const cached = locationCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      return res.json({ ...cached.data, cached: true });
    }

    // Fetch both address and elevation in parallel
    const [addressData, elevationData] = await Promise.all([
      fetchAddress(lat, lon),
      fetchElevation(lat, lon),
    ]);

    const result = {
      coordinates: {
        latitude: lat,
        longitude: lon,
      },
      address: addressData,
      elevation: elevationData,
      cached: false,
    };

    // Cache the result
    locationCache.set(cacheKey, {
      data: result,
      timestamp: Date.now(),
    });

    // Clean old cache entries periodically
    if (locationCache.size > 1000) {
      const now = Date.now();
      for (const [key, value] of locationCache) {
        if (now - value.timestamp > CACHE_DURATION) {
          locationCache.delete(key);
        }
      }
    }

    res.json(result);
  } catch (error) {
    logger.error('Location enrichment error:', error.message);
    res.status(500).json({
      error: 'Failed to fetch location data',
      message: error.message,
    });
  }
});

// Fetch address from OpenStreetMap Nominatim
async function fetchAddress(lat, lon) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);

  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&addressdetails=1`,
      {
        headers: {
          'User-Agent': 'Virgil-App/1.0',
        },
        signal: controller.signal,
      },
    );
    clearTimeout(timeout);

    if (!response.ok) {
      throw new Error(`Nominatim error: ${response.status}`);
    }

    const data = await response.json();

    if (!data || data.error) {
      throw new Error(data.error || 'No address found');
    }

    const address = data.address || {};

    // Handle various street name fields from OpenStreetMap
    const streetName = address.road ||
                      address.pedestrian ||
                      address.footway ||
                      address.path ||
                      address.cycleway ||
                      address.residential ||
                      '';

    return {
      street: streetName,
      house_number: address.house_number || '',
      city: address.city || address.town || address.village || address.hamlet || '',
      postcode: address.postcode || '',
      country: address.country || '',
      formatted: data.display_name || '',
    };
  } catch (error) {
    clearTimeout(timeout);
    logger.error('Nominatim API error:', error.message);

    // Return null address on error (non-critical)
    return {
      street: '',
      house_number: '',
      city: '',
      postcode: '',
      country: '',
      formatted: '',
    };
  }
}

// Fetch elevation from Open-Elevation API
async function fetchElevation(lat, lon) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);

  try {
    const response = await fetch(
      `https://api.open-elevation.com/api/v1/lookup?locations=${lat},${lon}`,
      { signal: controller.signal },
    );
    clearTimeout(timeout);

    if (!response.ok) {
      throw new Error(`Open-Elevation error: ${response.status}`);
    }

    const data = await response.json();

    if (!data || !data.results || data.results.length === 0) {
      throw new Error('No elevation data found');
    }

    const elevationData = data.results[0];
    const elevationMeters = elevationData.elevation;
    const elevationFeet = Math.round(elevationMeters * 3.28084);

    return {
      meters: elevationMeters,
      feet: elevationFeet,
      source: 'Open-Elevation',
    };
  } catch (error) {
    clearTimeout(timeout);
    logger.error('Open-Elevation API error:', error.message);

    // Return null elevation on error (non-critical)
    return null;
  }
}

// Health check endpoint
router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    cacheSize: locationCache.size,
    service: 'location',
  });
});

module.exports = router;
