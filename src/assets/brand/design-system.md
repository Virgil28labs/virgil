# Virgil Visual Design System

## Color Palette

```css
:root {
  --deep-plum: #39293e; /* Backgrounds, dark sections */
  --lavender: #b2a5c1; /* Soft accents, hover states */
  --violet-purple: #6c3baa; /* CTAs, active states, links */
  --off-white: #f5f5f5; /* Primary text, light backgrounds */
  --silver-grey: #b3b3b3; /* Borders, dividers, disabled states */
  --soft-pink: #efb0c2; /* Special highlights, success states */
}
```

## Typography

**Font**: Montserrat (Google Fonts)

- Weights: 300 (light), 400 (regular), 500 (medium), 600 (semibold), 700 (bold)
- Fluid sizing with clamp() for responsive design

## Visual Hierarchy

### On Light Backgrounds (white/off-white)

- **Primary text**: `deep-plum` or dark grey
- **Secondary text**: `silver-grey`
- **Links/Actions**: `violet-purple`

### On Dark Backgrounds (deep-plum)

- **Primary text**: `off-white`
- **Secondary text**: `lavender`
- **Active/Highlight**: `violet-purple` or `soft-pink`

## Dashboard Color Usage

### Layout

- **Main background**: `off-white`
- **Sidebar/Nav**: `deep-plum` with `off-white` text
- **Cards**: White with subtle shadows
- **Sections**: Alternate between white and `off-white` for visual separation

### Interactive Elements

- **Default state**: `lavender`
- **Hover**: `violet-purple`
- **Active**: `violet-purple` with higher opacity
- **Success/Positive**: `soft-pink`

### Data Visualization

- Use the full palette creatively
- Primary data: `violet-purple`
- Secondary data: `lavender`
- Accent data: `soft-pink`
- Grid lines: `silver-grey` at low opacity

## Design Tokens

### Gradients

```css
--gradient-plum-lavender: linear-gradient(
  135deg,
  var(--deep-plum) 0%,
  var(--lavender) 100%
);
--gradient-violet-pink: linear-gradient(
  135deg,
  var(--violet-purple) 0%,
  var(--soft-pink) 100%
);
--gradient-subtle: linear-gradient(
  180deg,
  var(--off-white) 0%,
  rgba(178, 165, 193, 0.1) 100%
);
```

### Elevations (Shadows)

```css
--elevation-1: 0 2px 4px rgba(57, 41, 62, 0.1); /* Subtle - cards */
--elevation-2: 0 4px 8px rgba(57, 41, 62, 0.15); /* Medium - hover */
--elevation-3: 0 8px 16px rgba(57, 41, 62, 0.2); /* Strong - modals */
--elevation-hover: 0 6px 12px rgba(108, 59, 170, 0.15); /* Interactive hover */
```

### Transitions

```css
--transition-fast: 200ms ease-in-out; /* Micro-interactions */
--transition-normal: 300ms ease-in-out; /* Standard transitions */
--transition-slow: 500ms ease-in-out; /* Page transitions */
```

### Border Radius

```css
--radius-small: 4px; /* Inputs, small buttons */
--radius-medium: 8px; /* Cards, containers */
--radius-large: 12px; /* Modals, large cards */
--radius-round: 9999px; /* Pills, circular buttons */
```

## Component Patterns

### Buttons

- **Primary**: `violet-purple` background, `off-white` text
- **Secondary**: Transparent with `violet-purple` border
- **Accent**: `soft-pink` background, `deep-plum` text

### Cards

- White background with `elevation-1`
- Hover: `elevation-2`
- Border radius: `radius-medium`

### Forms

- Input background: White or `off-white`
- Border: `silver-grey`
- Focus: `violet-purple` border
- Error: Red-tinted `soft-pink`

## Guidelines

### Do's

✅ Use plenty of white space for clean design  
✅ Apply subtle shadows over hard borders  
✅ Implement smooth transitions (200-300ms)  
✅ Use round corners for modern feel  
✅ Ensure high contrast for readability  
✅ Be creative with gradients using the palette  
✅ Mix and match colors for visual interest  
✅ Use opacity variations for depth

### Don'ts

❌ Use colors outside the palette  
❌ Make text hard to read with poor contrast  
❌ Use harsh shadows or borders  
❌ Skip transitions on interactive elements

## Quick Reference

### CSS Utility Classes

```css
/* Backgrounds */
.bg-plum, .bg-lavender, .bg-violet, .bg-white, .bg-grey, .bg-pink

/* Text Colors */
.text-plum, .text-lavender, .text-violet, .text-white, .text-grey, .text-pink

/* Gradients */
.gradient-plum-lavender, .gradient-violet-pink, .gradient-subtle

/* Elevations */
.elevation-1, .elevation-2, .elevation-3, .elevation-hover

/* Transitions */
.transition-fast, .transition-normal, .transition-slow

/* Border Radius */
.radius-small, .radius-medium, .radius-large, .radius-round
```

### JavaScript/TypeScript Usage

```typescript
import { colors, semanticColors, tokens } from "@/assets/brand/colors";

// Use color values
const primaryColor = colors.violetPurple;
const bgColor = semanticColors.background;

// Apply gradients
const heroGradient = tokens.gradients.plumLavender;

// Use with opacity
import { withOpacity } from "@/assets/brand/colors";
const subtleViolet = withOpacity(colors.violetPurple, 0.1);
```

## Accessibility

- Maintain WCAG AA contrast ratios (4.5:1 for normal text, 3:1 for large text)
- Test color combinations with contrast checkers
- Provide focus indicators for all interactive elements
- Don't rely solely on color to convey information

---

_This design system promotes creativity within constraints. Feel free to experiment with gradients, opacity, and combinations while staying within the palette._
