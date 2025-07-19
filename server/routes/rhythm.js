const express = require("express");
const rateLimit = require("express-rate-limit");
const { LLMProxy } = require("../services/llmProxy");
const { RequestQueue } = require("../services/queue");
// const { validateRequest } = require('../middleware/validation');

// Custom validation for rhythm generation
const validateRhythmRequest = (req, res, next) => {
  const { description, barLength, style, temperature } = req.body;

  // Validate description
  if (!description || typeof description !== "string") {
    return res.status(400).json({
      error: "Description is required and must be a string",
    });
  }

  // Validate barLength
  if (barLength !== undefined) {
    if (![4, 8, 16, 32].includes(barLength)) {
      return res.status(400).json({
        error: "Bar length must be 4, 8, 16, or 32 steps",
      });
    }
  }

  // Validate style
  if (style !== undefined && typeof style !== "string") {
    return res.status(400).json({
      error: "Style must be a string",
    });
  }

  // Validate temperature
  if (temperature !== undefined) {
    if (typeof temperature !== "number" || temperature < 0 || temperature > 2) {
      return res.status(400).json({
        error: "Temperature must be a number between 0 and 2",
      });
    }
  }

  next();
};
const { cacheMiddleware } = require("../middleware/cache");

const router = express.Router();
const llmProxy = new LLMProxy();
const requestQueue = new RequestQueue();

// Rate limiter for rhythm generation
const rhythmLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30, // Allow more requests for rhythm generation
  message: "Too many rhythm generation requests, please try again later.",
  standardHeaders: true,
  legacyHeaders: false,
});

router.use(rhythmLimiter);

/**
 * POST /api/v1/rhythm/generate
 * Generate drum patterns using LLM
 */
router.post(
  "/generate",
  validateRhythmRequest,
  cacheMiddleware,
  async (req, res, next) => {
    try {
      const {
        description = "hip hop groove",
        barLength = 8,
        style = "",
        temperature = 0.7,
      } = req.body;

      // Simple classification prompt - matching original behavior
      const systemPrompt = `You are a music genre classifier. Classify drum beat descriptions into one of these categories: techno, house, trap, breakbeat, or minimal.`;

      const userPrompt = `Given this drum beat description: "${description}", classify it into one of these categories: techno, house, trap, breakbeat, or minimal. Respond with ONLY the category name in lowercase, nothing else.`;

      // Generate pattern using LLM
      const result = await requestQueue.add(async () => {
        return llmProxy.complete({
          messages: [{ role: "user", content: userPrompt }],
          model: "claude-3-haiku-20240307", // Fast and good for structured output
          temperature,
          maxTokens: 512,
          systemPrompt,
          provider: "anthropic",
        });
      });

      // Define presets matching original
      const PRESETS = {
        techno: [
          [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0], // kick
          [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0], // snare
          [0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0], // hihat
          [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1], // openhat
          [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0], // clap
        ],
        house: [
          [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0], // kick
          [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0], // snare
          [0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0], // hihat
          [0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1], // openhat
          [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0], // clap
        ],
        trap: [
          [1, 0, 0, 0, 0, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0, 0], // kick
          [0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0], // snare
          [1, 0, 1, 0, 1, 0, 1, 0, 1, 1, 0, 1, 0, 1, 1, 1], // hihat
          [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0], // openhat
          [0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0], // clap
        ],
        breakbeat: [
          [1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 0, 0], // kick
          [0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 1, 0, 0, 0], // snare
          [1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0], // hihat
          [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0], // openhat
          [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], // clap
        ],
        minimal: [
          [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0], // kick
          [0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0], // snare
          [0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1], // hihat
          [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], // openhat
          [0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0], // clap
        ],
      };

      let pattern;
      let selectedCategory = "techno"; // default

      try {
        // Get the category from LLM response
        const category = result.content.trim().toLowerCase();

        // Validate category
        if (PRESETS[category]) {
          selectedCategory = category;
          // LLM selected category
        } else {
          // Invalid category from LLM - using default
        }
      } catch {
        // LLM response parsing failed - using default
      }

      // Get the preset pattern for the selected category
      const presetPattern = PRESETS[selectedCategory];

      // Adjust pattern length if needed
      if (barLength === 16) {
        // Use preset as-is for 16 steps
        pattern = presetPattern.map((drum) => drum.slice(0, 16));
      } else if (barLength < 16) {
        // Truncate pattern
        pattern = presetPattern.map((drum) => drum.slice(0, barLength));
      } else {
        // Repeat pattern for longer lengths
        pattern = presetPattern.map((drum) => {
          const extended = [];
          for (let i = 0; i < barLength; i++) {
            extended.push(drum[i % 16]);
          }
          return extended;
        });
      }

      // Convert to boolean arrays
      pattern = pattern.map((drum) => drum.map((step) => Boolean(step)));

      res.json({
        success: true,
        data: {
          pattern,
          description,
          barLength,
          style,
          generated: new Date().toISOString(),
          category: selectedCategory,
        },
        usage: result.usage,
        cached: res.locals.cached || false,
      });
    } catch (error) {
      console.error("Rhythm generation error:", error);

      // Fallback to algorithmic generation on any error
      try {
        const pattern = generateFallbackPattern(
          req.body.barLength || 8,
          req.body.description || "hip hop groove",
        );

        res.json({
          success: true,
          data: {
            pattern,
            description: req.body.description || "hip hop groove",
            barLength: req.body.barLength || 8,
            style: req.body.style || "",
            generated: new Date().toISOString(),
            fallback: true,
          },
          cached: false,
        });
      } catch (fallbackError) {
        next(fallbackError);
      }
    }
  },
);

// Removed convertAdvancedPatternToBoolean - no longer needed for classification approach

/**
 * Fallback pattern generation for when LLM fails
 */
function generateFallbackPattern(barLength, description) {
  const pattern = Array(5)
    .fill(null)
    .map(() => Array(barLength).fill(false));

  // Generate basic patterns based on description keywords
  const desc = description.toLowerCase();

  for (let step = 0; step < barLength; step++) {
    // KICK patterns
    if (desc.includes("hip hop") || desc.includes("trap")) {
      pattern[0][step] =
        step % 4 === 0 || (step % 8 === 6 && Math.random() > 0.5);
    } else if (desc.includes("rock") || desc.includes("punk")) {
      pattern[0][step] = step % 4 === 0 || step % 4 === 2;
    } else if (desc.includes("jazz")) {
      pattern[0][step] =
        step % 4 === 0 || (step % 12 === 10 && Math.random() > 0.6);
    } else {
      pattern[0][step] = step % 4 === 0;
    }

    // SNARE patterns
    if (desc.includes("hip hop") || desc.includes("trap")) {
      pattern[1][step] =
        step % 8 === 4 || (step % 16 === 14 && Math.random() > 0.4);
    } else if (desc.includes("rock")) {
      pattern[1][step] = step % 4 === 2;
    } else if (desc.includes("jazz")) {
      pattern[1][step] =
        (step % 6 === 4 || step % 12 === 10) && Math.random() > 0.3;
    } else {
      pattern[1][step] = step % 8 === 4;
    }

    // HIHAT patterns
    if (desc.includes("hip hop") || desc.includes("trap")) {
      pattern[2][step] = step % 2 === 1 && Math.random() > 0.1;
    } else if (desc.includes("rock")) {
      pattern[2][step] = step % 2 === 1;
    } else if (desc.includes("jazz")) {
      pattern[2][step] = step % 3 === 1 && Math.random() > 0.2;
    } else {
      pattern[2][step] = step % 2 === 1 && Math.random() > 0.3;
    }

    // OPENHAT patterns
    pattern[3][step] = step % 8 === 7 && Math.random() > 0.5;

    // CLAP patterns
    if (desc.includes("hip hop") || desc.includes("trap")) {
      pattern[4][step] = step % 16 === 12 && Math.random() > 0.4;
    } else {
      pattern[4][step] = step % 16 === 12 && Math.random() > 0.7;
    }
  }

  return pattern;
}

module.exports = router;
