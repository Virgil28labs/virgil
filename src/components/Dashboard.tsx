import { memo, useCallback } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useLocation } from '../contexts/LocationContext'
import { VirgilLogo } from './VirgilLogo'
import { DateTime } from './DateTime'
import { RaccoonMascot } from './RaccoonMascot'
import { DogEmojiButton } from './DogEmojiButton'

export const Dashboard = memo(function Dashboard() {
  const { user, signOut } = useAuth()
  const { address, ipLocation, loading: locationLoading } = useLocation()

  const formatDate = useCallback((dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    })
  }, [])

  return (
    <div className="dashboard">
      {/* Fixed positioned elements */}
      <VirgilLogo />
      <DateTime />

      {/* Power button */}
      <button 
        className="power-button" 
        onClick={signOut} 
        title="Sign Out"
        aria-label="Sign out of your account"
      >
        <div className="power-icon" aria-hidden="true"></div>
        <span className="sr-only">Sign Out</span>
      </button>

      {/* Main content */}
      <div className="dashboard-content">
        <div className="user-info">
          <p className="user-name">{user?.user_metadata?.name || 'Anonymous User'}</p>
          <p className="user-email">{user?.email}</p>
          {user?.created_at && (
            <p className="member-since">Member since {formatDate(user.created_at)}</p>
          )}
        </div>

        <div className="location-info">
          {address && (
            <div className="address-info">
              {address.street ? (
                <p className="street-address">{address.street}</p>
              ) : address.formatted ? (
                <p className="street-address">{address.formatted.split(',')[0]}</p>
              ) : (
                <p className="address-loading">Loading address...</p>
              )}
            </div>
          )}
          
          <div className="ip-info">
            {ipLocation ? (
              <p className="ip-address">{ipLocation.ip}</p>
            ) : locationLoading ? (
              <p className="ip-loading">Loading IP...</p>
            ) : (
              <p className="ip-error">IP address unavailable</p>
            )}
          </div>
        </div>
      </div>

      {/* Raccoon Mascot */}
      <RaccoonMascot />
      {/* Dog Emoji Button */}
      <DogEmojiButton />
    </div>
  )
})