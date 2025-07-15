# Virgil Design System

## Brand Colors

The Virgil brand uses a sophisticated palette of purples, pinks, and neutral tones. All colors are available as CSS variables and TypeScript constants.

### Core Palette
- **Deep Plum** (`#39293e`): Primary backgrounds, dark sections
- **Lavender** (`#b2a5c1`): Soft accents, hover states  
- **Violet Purple** (`#6c3baa`): CTAs, active states, links
- **Off White** (`#f5f5f5`): Primary text, light backgrounds
- **Silver Grey** (`#b3b3b3`): Borders, dividers, disabled states
- **Soft Pink** (`#efb0c2`): Special highlights, success states

### Usage
```css
/* CSS */
.cta-button {
  background: var(--violet-purple);
  color: var(--off-white);
}

/* TypeScript */
import { colors, withOpacity } from '@/assets/brand';

const hoverColor = withOpacity(colors.violetPurple, 0.8);
```

## Logo Usage

The Virgil logo is a high-quality PNG that preserves all design details and visual effects. Use the provided Logo component for consistent implementation.

### Logo Component

```tsx
import { Logo } from '@/components/Logo';

// Basic usage
<Logo width={200} />

// Clickable logo
<Logo width={100} onClick={() => navigate('/')} />

// With custom styling
<Logo 
  width={120} 
  className="header-logo" 
  style={{ marginBottom: '1rem' }}
/>
```

### Logo Guidelines

1. **Quality First**
   - The logo uses PNG format to maintain visual quality
   - All gradients, shadows, and effects are preserved

2. **Sizing**
   - Header: 100-150px width
   - Hero sections: 200-300px width
   - Footer: 80-120px width
   - Mobile: Scale down by 20-30%

3. **Spacing**
   - Maintain clear space equal to 25% of logo width on all sides
   - Never place text or elements too close to the logo

4. **Backgrounds**
   - Logo works on both light and dark backgrounds
   - For optimal contrast, use on `--off-white` or `--deep-plum` backgrounds

5. **Don'ts**
   - Don't stretch or distort the logo
   - Don't apply filters or effects
   - Don't change logo colors
   - Don't rotate the logo

### Direct Asset Import

If you need to use the logo assets directly:

```tsx
import VirgilLogoSvg from '@/assets/brand/virgil-logo-optimized.svg';
import VirgilLogoPng from '@/assets/brand/Virgil-Logo.png';
```

## Typography

The design system uses system fonts for optimal performance and readability:

```css
font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 
             'Helvetica Neue', Arial, sans-serif;
```

### Font Weights
- Regular (400): Body text
- Medium (500): Subheadings, emphasis
- Semibold (600): Headings, CTAs
- Bold (700): Hero text, special emphasis

## Elevation & Shadows

Three levels of elevation for depth and hierarchy:

```css
/* Small - Cards, buttons */
box-shadow: var(--elevation-sm);

/* Medium - Modals, dropdowns */
box-shadow: var(--elevation-md);

/* Large - Popovers, tooltips */
box-shadow: var(--elevation-lg);
```

## Gradients

Pre-defined gradients for special UI elements:

```css
/* Primary gradient - CTAs, hero sections */
background: var(--gradient-primary);

/* Accent gradient - Special highlights */
background: var(--gradient-accent);
```

## Animation & Transitions

Consistent timing for smooth interactions:

```css
/* Fast - Hovers, small state changes */
transition: all var(--transition-fast);

/* Base - Most interactions */
transition: all var(--transition-base);

/* Slow - Complex animations */
transition: all var(--transition-slow);
```

## Responsive Design

The design system is mobile-first with these breakpoints:

- Mobile: < 640px
- Tablet: 640px - 1024px  
- Desktop: > 1024px

Use CSS custom properties that automatically adjust for different screen sizes.