// Virgil Brand Colors
// These colors are also defined in App.css as CSS custom properties

export interface BrandColors {
  darkPurple: string;
  lightGray: string;
  lightPurple: string;
  mediumGray: string;
  accentPurple: string;
  accentPink: string;
}

export const brandColors: BrandColors = {
  // Primary colors
  darkPurple: '#39293e',
  lightGray: '#f5f5f5',
  
  // Secondary colors
  lightPurple: '#b2a5c1',
  mediumGray: '#b3b3b3',
  
  // Accent colors
  accentPurple: '#6c3baa',
  accentPink: '#efb0c2',
}

// CSS custom property names for reference
export const cssVariables: BrandColors = {
  darkPurple: 'var(--brand-dark-purple)',
  lightGray: 'var(--brand-light-gray)',
  lightPurple: 'var(--brand-light-purple)',
  mediumGray: 'var(--brand-medium-gray)',
  accentPurple: 'var(--brand-accent-purple)',
  accentPink: 'var(--brand-accent-pink)',
}