/**
 * Vite Plugin for Critical CSS Optimization
 * 
 * This plugin extracts critical CSS for above-the-fold content
 * to improve initial render performance.
 */

export function criticalCSSPlugin() {
  // Critical selectors for above-the-fold content
  const criticalSelectors = [
    // App and loading states
    '.app',
    '.loading-screen',
    '.skip-link',
    
    // Dashboard layout
    '.dashboard',
    '.dashboardHeader',
    '.dashboardContent',
    '.dashboardAside',
    '.dashboardGrid',
    
    // Core components visible on load
    '.headerBrand',
    '.virginiaText',
    '.dateTimeWidget',
    '.weatherWidget',
    '.locationWidget',
    '.mascotContainer',
    
    // Essential animations for initial render
    '@keyframes fadeIn',
    '@keyframes slideUp',
    '@keyframes spin',
    
    // Critical typography and colors
    ':root',
    'body',
    'html',
    
    // Skeleton loaders
    '.skeleton',
    '.shimmer',
    
    // Error boundaries
    '.error-boundary',
    '.section-error'
  ];

  return {
    name: 'vite-plugin-critical-css',
    
    // Hook into the transform phase
    transform(code, id) {
      // Only process CSS files
      if (!id.endsWith('.css')) return null;
      
      // Mark critical CSS modules for special handling
      if (id.includes('Dashboard.module.css') || 
          id.includes('App.css') ||
          id.includes('variables.css')) {
        // Add metadata for build optimization
        return {
          code,
          map: null,
          meta: {
            critical: true
          }
        };
      }
      
      return null;
    },
    
    // Hook into the generateBundle phase
    generateBundle(options, bundle) {
      // Extract critical CSS from bundles
      const criticalCSS = [];
      
      for (const [fileName, chunk] of Object.entries(bundle)) {
        if (fileName.endsWith('.css') && chunk.type === 'asset') {
          const cssContent = chunk.source;
          
          // Extract critical rules
          const criticalRules = extractCriticalRules(cssContent, criticalSelectors);
          if (criticalRules) {
            criticalCSS.push(criticalRules);
          }
        }
      }
      
      // Create a critical CSS file
      if (criticalCSS.length > 0) {
        this.emitFile({
          type: 'asset',
          fileName: 'critical.css',
          source: criticalCSS.join('\n')
        });
      }
    }
  };
}

function extractCriticalRules(css, selectors) {
  const criticalRules = [];
  
  // Simple CSS parser to extract matching rules
  const ruleRegex = /([^{]+)\{([^}]+)\}/g;
  let match;
  
  while ((match = ruleRegex.exec(css)) !== null) {
    const selector = match[1].trim();
    const rules = match[2].trim();
    
    // Check if this selector is critical
    const isCritical = selectors.some(critical => {
      if (critical.startsWith('@')) {
        // Handle at-rules like @keyframes
        return selector.includes(critical);
      }
      // Handle regular selectors
      return selector.includes(critical) || 
             selector.split(',').some(s => s.trim().includes(critical));
    });
    
    if (isCritical) {
      criticalRules.push(`${selector} { ${rules} }`);
    }
  }
  
  return criticalRules.length > 0 ? criticalRules.join('\n') : null;
}