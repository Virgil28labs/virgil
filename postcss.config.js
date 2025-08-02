export default {
  plugins: {
    // Import handling - must be first
    'postcss-import': {
      path: ['src/styles'],
    },
    
    // Modern CSS features
    'postcss-preset-env': {
      stage: 3,
      features: {
        'nesting-rules': true,
        'custom-properties': true,
        'custom-media-queries': true,
        'media-query-ranges': true,
      },
      autoprefixer: {
        flexbox: 'no-2009',
        grid: 'autoplace',
      },
    },
    
    // CSS nesting support
    'postcss-nesting': {},
    
    // Custom properties optimization
    'postcss-custom-properties': {
      preserve: true, // Keep custom properties for runtime theming
    },
    
    // Math calculations
    'postcss-calc': {
      precision: 5,
      preserve: false,
      warnWhenCannotResolve: false,
    },
    
    // Tailwind CSS
    '@tailwindcss/postcss': {},
    
    // Autoprefixer (configured through preset-env)
    autoprefixer: {},
    
    // CSS optimizations
    'postcss-merge-rules': {}, // Merges duplicate CSS rules
    'postcss-combine-media-query': {}, // Combines duplicate media queries
    
    // Production optimizations with cssnano
    // eslint-disable-next-line no-undef
    ...(process.env.NODE_ENV === 'production' ? {
      cssnano: {
        preset: ['default', {
          discardComments: {
            removeAll: true,
          },
          normalizeWhitespace: true,
          colormin: true,
          convertValues: {
            length: false, // Don't convert px to other units
          },
          minifyFontValues: true,
          minifyGradients: true,
          minifyParams: true,
          minifySelectors: true,
          discardUnused: {
            fontFace: false, // Keep all font-face rules
          },
          discardDuplicates: true,
          mergeIdents: true,
          reduceIdents: false, // Don't rename identifiers
          zindex: false, // Don't rebase z-index values
          calc: false, // Already handled by postcss-calc
        }],
      },
    } : {}),
  },
};