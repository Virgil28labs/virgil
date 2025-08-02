# Performance Monitoring Guide

## Overview
We've implemented a CSS-based performance monitoring system that tracks render performance, paint timing, and user interactions. This system works with browser DevTools and can integrate with analytics services.

## CSS Performance Markers

### Available Markers
- **Paint Timing**: First Paint, First Contentful Paint, Largest Contentful Paint
- **App State**: Interactive, Hero Rendered, API Loaded, Animations Ready
- **Loading State**: Loading indicators, lazy loading markers
- **Network Quality**: Network speed indicators
- **Performance Warnings**: Heavy operations, critical issues

## Usage in Components

### Basic Performance Marking

```tsx
import { performanceMonitor } from '../utils/performanceMonitor';

function Dashboard() {
  useEffect(() => {
    // Mark when component is rendered
    performanceMonitor.markHeroRendered();
    
    // Mark when data is loaded
    fetchData().then(() => {
      performanceMonitor.markApiLoaded();
    });
  }, []);
  
  return <div className="dashboard hero-rendered">...</div>;
}
```

### Intersection Observer for Lazy Loading

```tsx
function LazyComponent() {
  const ref = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    if (ref.current) {
      performanceMonitor.observeElement(ref.current, (isVisible) => {
        if (isVisible) {
          // Load component data
          loadData();
        }
      });
    }
  }, []);
  
  return <div ref={ref} className="perf-observe lazy-load">...</div>;
}
```

### Performance Classes

```css
/* GPU acceleration for animations */
.animated-element {
  @extend .gpu-accelerated;
  animation: slideIn 0.3s ease-out;
}

/* Promote to composite layer */
.heavy-component {
  @extend .promote-layer;
  contain: layout style paint;
}

/* Will-change optimization */
.interactive-element {
  @extend .will-change-transform;
  transition: transform 0.2s;
}
```

## Development Features

### Enable Debug Mode
Press `Shift + P` in development to enable visual performance debugging:
- Red outlines: All elements (to spot excessive repaints)
- Green outlines: GPU-accelerated elements
- Blue outlines: Will-change elements
- Performance indicator: Shows FCP and LCP timing

### Performance Monitoring in Code

```tsx
// Enable scroll performance monitoring
performanceMonitor.monitorScrollPerformance((fps) => {
  console.log(`Current FPS: ${fps}`);
});

// Get performance metrics
const metrics = performanceMonitor.getMetrics();
console.log('First Contentful Paint:', metrics.fcp);
console.log('Largest Contentful Paint:', metrics.lcp);

// Report to analytics
performanceMonitor.reportMetrics();
```

## CSS Performance Utilities

### Layout Shift Prevention
```css
.prevent-shift {
  aspect-ratio: 16 / 9;
  min-height: 200px;
}
```

### Reduce Motion Support
```css
.animated {
  @extend .respect-motion-preference;
  animation: bounce 0.5s;
}
```

### Network-Aware Loading
```css
/* Show different UI based on network speed */
.network-slow .high-quality-image {
  display: none;
}

.network-slow .low-quality-image {
  display: block;
}
```

## Performance Budget Tracking

```tsx
// Mark components that exceed performance budget
if (renderTime > 16) {
  element.classList.add('perf-heavy');
}

if (renderTime > 33) {
  element.classList.add('perf-critical');
}
```

## Integration with Monitoring Tools

The performance markers can be tracked by:
1. **Browser DevTools**: Performance tab shows custom markers
2. **Google Analytics**: Automatic reporting of timing metrics
3. **Custom Analytics**: Hook into `performanceMonitor.getMetrics()`
4. **Real User Monitoring (RUM)**: CSS markers visible in waterfall

## Best Practices

1. **Mark Key Milestones**: Interactive, Hero Content, API Loaded
2. **Use GPU Acceleration**: For animations and transforms
3. **Implement Lazy Loading**: For below-fold content
4. **Monitor Scroll Performance**: Especially for infinite scroll
5. **Test on Low-End Devices**: Use Chrome DevTools throttling
6. **Respect User Preferences**: Honor reduced motion settings

## Performance Checklist

- [ ] Hero content marked with `hero-rendered` class
- [ ] API calls trigger `markApiLoaded()` when complete
- [ ] Heavy animations use `gpu-accelerated` class
- [ ] Lazy-loaded components use `perf-observe` class
- [ ] Scroll-heavy pages monitor FPS
- [ ] Performance metrics reported to analytics
- [ ] Debug mode tested in development
- [ ] Reduced motion preferences respected