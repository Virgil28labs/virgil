import { useAuth } from '../contexts/AuthContext'
import { RaccoonMascot } from './RaccoonMascot'
import { VirgilLogo } from './VirgilLogo'
import { useLocation } from '../contexts/LocationContext'

/**
 * Dashboard Component
 * 
 * Main user dashboard displaying user information, location data,
 * interactive raccoon mascot, and animated sign-out button.
 * 
 * Features:
 * - Centered user info layout
 * - Location services integration (GPS + IP)
 * - Interactive physics-based raccoon mascot
 * - Animated power button with hover states
 * - Two-tone Virgil brand logo
 */
export function Dashboard() {
  const { user, signOut } = useAuth()
  const { address, ipLocation, hasGPSLocation, hasIPLocation } = useLocation()

  const handleSignOut = async () => {
    await signOut()
  }

  return (
    <div className="dashboard">
      <button className="sign-out-fixed" onClick={handleSignOut} title="Sign Out">
        ⏻
      </button>
      
      <VirgilLogo />
      
      <div className="user-info">
        <p className="user-name">{user?.user_metadata?.name || 'User'}</p>
        <p className="user-email">{user?.email}</p>
        <p className="user-created">Member since {new Date(user?.created_at).toLocaleDateString()}</p>
        {hasGPSLocation && address?.street && <p className="user-location">{address.street}</p>}
        {hasIPLocation && <p className="user-ip">{ipLocation.ip}</p>}
      </div>
      
      {/* Interactive Raccoon Mascot */}
      <RaccoonMascot />
    </div>
  )
}