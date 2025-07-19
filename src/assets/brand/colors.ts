// Virgil Visual Design System - Color Palette
// These colors are defined in App.css as CSS custom properties

export interface ColorPalette {
  // Core Colors
  deepPlum: string;
  lavender: string;
  violetPurple: string;
  offWhite: string;
  silverGrey: string;
  softPink: string;
}

export interface SemanticColors {
  // Backgrounds
  background: string;
  surface: string;

  // Text
  textPrimary: string;
  textSecondary: string;

  // Interactive
  primary: string;
  secondary: string;
  accent: string;
  border: string;
}

export interface DesignTokens {
  // Gradients
  gradients: {
    plumLavender: string;
    violetPink: string;
    subtle: string;
  };

  // Elevations
  elevations: {
    small: string;
    medium: string;
    large: string;
    hover: string;
  };

  // Transitions
  transitions: {
    fast: string;
    normal: string;
    slow: string;
  };

  // Border Radius
  radius: {
    small: string;
    medium: string;
    large: string;
    round: string;
  };
}

// Core color values
export const colors: ColorPalette = {
  deepPlum: "#39293e", // Backgrounds, dark sections
  lavender: "#b2a5c1", // Soft accents, hover states
  violetPurple: "#6c3baa", // CTAs, active states, links
  offWhite: "#f5f5f5", // Primary text, light backgrounds
  silverGrey: "#b3b3b3", // Borders, dividers, disabled states
  softPink: "#efb0c2", // Special highlights, success states
};

// Semantic color mappings
export const semanticColors: SemanticColors = {
  background: colors.deepPlum,
  surface: colors.offWhite,
  textPrimary: colors.offWhite,
  textSecondary: colors.silverGrey,
  primary: colors.violetPurple,
  secondary: colors.lavender,
  accent: colors.softPink,
  border: colors.silverGrey,
};

// Design tokens
export const tokens: DesignTokens = {
  gradients: {
    plumLavender: "linear-gradient(135deg, #39293e 0%, #b2a5c1 100%)",
    violetPink: "linear-gradient(135deg, #6c3baa 0%, #efb0c2 100%)",
    subtle:
      "linear-gradient(180deg, #f5f5f5 0%, rgba(178, 165, 193, 0.1) 100%)",
  },
  elevations: {
    small: "0 2px 4px rgba(57, 41, 62, 0.1)",
    medium: "0 4px 8px rgba(57, 41, 62, 0.15)",
    large: "0 8px 16px rgba(57, 41, 62, 0.2)",
    hover: "0 6px 12px rgba(108, 59, 170, 0.15)",
  },
  transitions: {
    fast: "200ms ease-in-out",
    normal: "300ms ease-in-out",
    slow: "500ms ease-in-out",
  },
  radius: {
    small: "4px",
    medium: "8px",
    large: "12px",
    round: "9999px",
  },
};

// CSS custom property names for runtime access
export const cssVariables = {
  // Core colors
  deepPlum: "var(--deep-plum)",
  lavender: "var(--lavender)",
  violetPurple: "var(--violet-purple)",
  offWhite: "var(--off-white)",
  silverGrey: "var(--silver-grey)",
  softPink: "var(--soft-pink)",

  // Semantic colors
  colorBackground: "var(--color-background)",
  colorSurface: "var(--color-surface)",
  colorPrimary: "var(--color-primary)",
  colorSecondary: "var(--color-secondary)",
  colorAccent: "var(--color-accent)",
  colorTextPrimary: "var(--color-text-primary)",
  colorTextSecondary: "var(--color-text-secondary)",
  colorBorder: "var(--color-border)",
};

// Legacy support - maps old names to new
export const brandColors = {
  darkPurple: colors.deepPlum,
  lightGray: colors.offWhite,
  lightPurple: colors.lavender,
  mediumGray: colors.silverGrey,
  accentPurple: colors.violetPurple,
  accentPink: colors.softPink,
};

// Helper functions
export const withOpacity = (color: string, opacity: number): string => {
  const hex = color.replace("#", "");
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
};

export const getColorForBackground = (background: string): string => {
  // Returns appropriate text color for given background
  return background === colors.deepPlum || background === colors.violetPurple
    ? colors.offWhite
    : colors.deepPlum;
};
