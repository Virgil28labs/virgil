# Breakpoints Migration Guide

## Standard Breakpoints

The app now uses standardized breakpoints defined in `breakpoints.css`:

- **xs**: 320px (extra small phones)
- **sm**: 480px (phones)
- **md**: 768px (tablets)
- **lg**: 1024px (laptops)
- **xl**: 1280px (desktops)
- **2xl**: 1536px (large screens)

## Migration Examples

### Old Pattern → New Pattern

```css
/* Old */
@media (max-width: 768px) {
  .component { ... }
}

/* New - using custom media queries */
@media (--md-down) {
  .component { ... }
}

/* Or using mobile-first approach (preferred) */
@media (--lg-up) {
  .component { ... }
}
```

### Common Migrations

1. **480px breakpoint**
   ```css
   /* Old */ @media (max-width: 480px)
   /* New */ @media (--sm-down)
   ```

2. **768px breakpoint**
   ```css
   /* Old */ @media (max-width: 768px)
   /* New */ @media (--md-down)
   ```

3. **1200px breakpoint**
   ```css
   /* Old */ @media (max-width: 1200px)
   /* New */ @media (--xl-down)
   ```

## Using the System

1. **Import breakpoints.css** in your component CSS:
   ```css
   @import '../styles/breakpoints.css';
   ```

2. **Use custom media queries**:
   ```css
   /* Mobile-first approach (recommended) */
   .component {
     /* Base mobile styles */
     padding: 1rem;
   }
   
   @media (--md-up) {
     /* Tablet and up */
     .component {
       padding: 1.5rem;
     }
   }
   
   @media (--lg-up) {
     /* Desktop and up */
     .component {
       padding: 2rem;
     }
   }
   ```

3. **Use CSS variables for consistent spacing**:
   ```css
   .section {
     padding: var(--spacing-mobile);
   }
   
   @media (--md-up) {
     .section {
       padding: var(--spacing-tablet);
     }
   }
   ```

## Benefits

- Consistent breakpoints across the app
- Easier maintenance and updates
- Better performance with PostCSS optimization
- Mobile-first approach by default
- Touch-friendly utilities included