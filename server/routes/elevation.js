const express = require("express");
const router = express.Router();
const fetch = require("node-fetch");
const rateLimit = require("express-rate-limit");

// Rate limiting for elevation API
const elevationLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30, // Limit each IP to 30 requests per minute
  message: "Too many elevation requests, please try again later.",
  standardHeaders: true,
  legacyHeaders: false,
});

// Simple in-memory cache for elevation data
const elevationCache = new Map();
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

// Helper function to round coordinates to reduce cache misses
const roundCoordinate = (coord) => Math.round(coord * 1000) / 1000;

// Get elevation by coordinates
router.get("/coordinates/:lat/:lon", elevationLimiter, async (req, res) => {
  try {
    const lat = parseFloat(req.params.lat);
    const lon = parseFloat(req.params.lon);

    if (isNaN(lat) || isNaN(lon)) {
      return res.status(400).json({
        error: "Invalid coordinates provided",
      });
    }

    // Check if coordinates are within valid range
    if (lat < -90 || lat > 90 || lon < -180 || lon > 180) {
      return res.status(400).json({
        error: "Coordinates out of valid range",
      });
    }

    // Round coordinates for caching
    const cacheKey = `${roundCoordinate(lat)},${roundCoordinate(lon)}`;

    // Check cache first
    const cached = elevationCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      return res.json(cached.data);
    }

    // Fetch elevation from Open-Elevation API
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    try {
      const response = await fetch(
        `https://api.open-elevation.com/api/v1/lookup?locations=${lat},${lon}`,
        { signal: controller.signal },
      );
      clearTimeout(timeout);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (!data || !data.results || data.results.length === 0) {
        return res.status(404).json({
          error: "No elevation data found for these coordinates",
        });
      }

      const elevationData = data.results[0];
      const elevationMeters = elevationData.elevation;
      const elevationFeet = Math.round(elevationMeters * 3.28084);

      const result = {
        elevation: elevationMeters,
        elevationFeet: elevationFeet,
        unit: "meters",
        coordinates: {
          latitude: elevationData.latitude,
          longitude: elevationData.longitude,
        },
        source: "Open-Elevation",
        cached: false,
      };

      // Cache the result
      elevationCache.set(cacheKey, {
        data: { ...result, cached: true },
        timestamp: Date.now(),
      });

      // Clean old cache entries periodically
      if (elevationCache.size > 1000) {
        const now = Date.now();
        for (const [key, value] of elevationCache) {
          if (now - value.timestamp > CACHE_DURATION) {
            elevationCache.delete(key);
          }
        }
      }

      res.json(result);
    } catch (fetchError) {
      clearTimeout(timeout);
      throw fetchError;
    }
  } catch (error) {
    console.error("Elevation API error:", error.message);

    if (error.name === "AbortError") {
      return res.status(504).json({
        error: "Elevation service timeout",
      });
    }

    res.status(500).json({
      error: "Failed to fetch elevation data",
      message: error.message,
    });
  }
});

// Health check endpoint
router.get("/health", (req, res) => {
  res.json({
    status: "ok",
    cacheSize: elevationCache.size,
    service: "elevation",
  });
});

module.exports = router;
