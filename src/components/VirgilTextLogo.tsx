import { memo } from 'react';

interface VirgilTextLogoProps {
  onClick?: () => void
}

/**
 * VirgilTextLogo Component
 *
 * Displays the "Virgil" brand name with styled first letter
 * Can be clickable to trigger actions (e.g., open profile)
 * Memoized for performance
 */
export const VirgilTextLogo = memo(function VirgilTextLogo({ onClick }: VirgilTextLogoProps) {
  if (onClick) {
    return (
      <button
        className="virgil-logo virgil-logo-button"
        data-raccoon-collision="virgil-logo"
        onClick={onClick}
        aria-label="Virgil - Open user profile"
        title="Open user profile"
        data-keyboard-nav
      >
        Virgil
      </button>
    );
  }

  return (
    <div className="virgil-logo" data-raccoon-collision="virgil-logo">
      Virgil
    </div>
  );
});
