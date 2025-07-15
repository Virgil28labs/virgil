import { memo } from 'react'

/**
 * VirgilTextLogo Component
 * 
 * Displays the "Virgil" brand name with styled first letter
 * Memoized for performance as it never changes
 */
export const VirgilTextLogo = memo(function VirgilTextLogo() {
  return (
    <div className="virgil-logo">
      Virgil
    </div>
  )
})