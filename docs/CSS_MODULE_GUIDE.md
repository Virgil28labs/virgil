# CSS Module Guide for Virgil

## Overview
We've migrated from global CSS to CSS Modules for better organization, maintainability, and scoped styling. This guide explains our CSS architecture and patterns.

## Structure

### Component Organization
Each component now lives in its own folder with co-located styles:
```
src/components/chat/
├── ModelSelector/
│   ├── ModelSelector.tsx
│   └── ModelSelector.module.css
├── StatusPills/
│   ├── StatusPills.tsx
│   └── StatusPills.module.css
└── WindowControls/
    ├── WindowControls.tsx
    └── WindowControls.module.css
```

### Shared Styles
Common patterns are abstracted into shared modules:
```
src/styles/shared/
├── Button.module.css     # Button patterns (pills, icons)
└── Dropdown.module.css   # Dropdown menus
```

## CSS Module Benefits

1. **Scoped Styles**: Classes are automatically scoped to components
2. **No Conflicts**: No more global namespace collisions
3. **Easy Maintenance**: Find styles right next to components
4. **Clear Dependencies**: Import chains show what styles are used
5. **Type Safety**: TypeScript integration (coming soon)

## Usage Examples

### Basic Component with CSS Module
```tsx
// StatusPills.tsx
import styles from './StatusPills.module.css';

export function StatusPills() {
  return (
    <div className={styles.cluster}>
      <button className={styles.memoryPill}>
        🧠 MEM
      </button>
    </div>
  );
}
```

### Using Multiple Classes
```tsx
// Conditional classes
className={isConnected ? styles.syncConnected : styles.syncDisconnected}

// Multiple classes
className={`${styles.button} ${styles.buttonCompact}`}
```

### CSS Module with Composition
```css
/* StatusPills.module.css */
.pill {
  /* Base styles */
}

.memoryPill {
  composes: pill; /* Inherits from .pill */
  background: var(--violet-purple);
}
```

## Naming Conventions

### CSS Classes
- **camelCase**: Use camelCase for all class names
- **Descriptive**: `memoryPill` not `mp`
- **Component-specific**: Prefix with component context when needed

### File Names
- **Component.module.css**: For component styles
- **[Pattern].module.css**: For shared patterns (Button, Dropdown)

## Design Tokens
Continue using CSS variables from `variables.css`:
```css
.button {
  background: var(--violet-purple);
  transition: var(--transition-fast);
  box-shadow: var(--elevation-sm);
}
```

## Migration Checklist

When migrating a component to CSS Modules:

1. **Create component folder**: `mkdir ComponentName/`
2. **Create CSS module**: `ComponentName.module.css`
3. **Move styles**: Copy from global CSS, update to module syntax
4. **Update imports**: `import styles from './ComponentName.module.css'`
5. **Update classNames**: Change strings to `styles.className`
6. **Update parent imports**: Fix import paths in parent components
7. **Remove old styles**: Delete from global CSS files
8. **Test thoroughly**: Verify styles still work correctly

## Best Practices

### Do's
- ✅ One CSS module per component
- ✅ Use composition for shared patterns
- ✅ Keep styles close to components
- ✅ Use semantic class names
- ✅ Leverage CSS variables for theming

### Don'ts
- ❌ Don't use global selectors in modules
- ❌ Don't nest modules too deeply
- ❌ Don't duplicate shared patterns
- ❌ Don't use inline styles for component styling
- ❌ Don't mix global and module styles

## Common Patterns

### Shared Button Styles
Instead of duplicating button styles, we'll create a shared pattern:
```css
/* Button.module.css */
.base { /* Common button styles */ }
.pill { /* Pill-shaped button */ }
.icon { /* Icon-only button */ }
```

### Component Variants
Use composition for variants:
```css
.button { /* Base */ }
.primaryButton { composes: button; /* Primary variant */ }
.secondaryButton { composes: button; /* Secondary variant */ }
```

## Future Improvements

1. **TypeScript Types**: Generate types for CSS modules
2. **Style Dictionary**: Token management system
3. **Component Library**: Storybook for style documentation
4. **CSS-in-JS**: Consider emotion/styled-components for dynamic styles

## Resources
- [CSS Modules Documentation](https://github.com/css-modules/css-modules)
- [Vite CSS Modules Guide](https://vitejs.dev/guide/features.html#css-modules)
- [CSS Module Composition](https://github.com/css-modules/css-modules#composition)