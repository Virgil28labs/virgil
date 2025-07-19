export default {
  plugins: {
    "@tailwindcss/postcss": {},
    autoprefixer: {},
    // Safe CSS optimizations
    "postcss-merge-rules": {}, // Merges duplicate CSS rules
    "postcss-combine-media-query": {}, // Combines duplicate media queries
  },
};
