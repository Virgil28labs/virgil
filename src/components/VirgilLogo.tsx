import { memo } from 'react'

/**
 * VirgilLogo Component
 * 
 * Displays the "Virgil" brand name with styled first letter
 * Memoized for performance as it never changes
 */
export const VirgilLogo = memo(function VirgilLogo() {
  return (
    <div className="virgil-logo">
      Virgil
    </div>
  )
})