import { memo, useCallback, useState, Suspense } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useLocation } from '../contexts/LocationContext'
import { VirgilLogo } from './VirgilLogo'
import { DateTime } from './DateTime'
import { LazyRaccoonMascot, LazyWeather, LazyUserProfileViewer } from './LazyComponents'
import { DogEmojiButton } from './DogEmojiButton'
import { LoadingFallback } from './LoadingFallback'
import { SkeletonLoader } from './SkeletonLoader'
import { useKeyboardNavigation } from '../hooks/useKeyboardNavigation'

export const Dashboard = memo(function Dashboard() {
  const { user, signOut } = useAuth()
  const { address, ipLocation, loading: locationLoading } = useLocation()
  const [showProfileViewer, setShowProfileViewer] = useState(false)

  const formatDate = useCallback((dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    })
  }, [])

  // Removed system prompt functionality - moved to VirgilChatbot

  // Keyboard navigation for dashboard
  const { containerRef } = useKeyboardNavigation({
    enabled: true,
    onEscape: () => {
      // Optional: Clear any selection or blur active element
      (document.activeElement as HTMLElement)?.blur();
    }
  });

  return (
    <div ref={containerRef} className="dashboard" role="main" aria-label="Dashboard">
      {/* Fixed positioned elements */}
      <VirgilLogo />
      <button 
        className={`user-profile-toggle ${showProfileViewer ? 'active' : ''}`}
        onClick={() => setShowProfileViewer(true)}
        aria-label="View user profile"
        title="View user profile"
        data-keyboard-nav
      >
        👤
      </button>
      <DateTime />
      <Suspense fallback={<LoadingFallback message="Loading weather..." size="small" variant="skeleton" />}>
        <LazyWeather />
      </Suspense>

      {/* Power button */}
      <button 
        className="power-button" 
        onClick={signOut} 
        title="Sign Out"
        aria-label="Sign out of your account"
        data-keyboard-nav
      >
        <div className="power-icon" aria-hidden="true"></div>
        <span className="sr-only">Sign Out</span>
      </button>

      {/* Main content */}
      <div id="main-content" className="dashboard-content">
        <div className="user-info">
          <p className="user-name">{user?.user_metadata?.name || 'Anonymous User'}</p>
          <p className="user-email">{user?.email}</p>
          {user?.created_at && (
            <p className="member-since">Member since {formatDate(user.created_at)}</p>
          )}
        </div>

        <div className="location-info">
          <div className="address-info">
            {address ? (
              address.street ? (
                <p className="street-address">{address.street}</p>
              ) : address.formatted ? (
                <p className="street-address">{address.formatted.split(',')[0]}</p>
              ) : (
                <SkeletonLoader width="200px" height="16px" />
              )
            ) : locationLoading ? (
              <SkeletonLoader width="200px" height="16px" />
            ) : (
              <p className="address-error">Address unavailable</p>
            )}
          </div>
          
          <div className="ip-info">
            {ipLocation ? (
              <p className="ip-address">{ipLocation.ip}</p>
            ) : locationLoading ? (
              <SkeletonLoader width="120px" height="16px" />
            ) : (
              <p className="ip-error">IP address unavailable</p>
            )}
          </div>
        </div>
      </div>

      {/* Raccoon Mascot */}
      <Suspense fallback={<LoadingFallback message="Loading mascot..." size="small" />}>
        <LazyRaccoonMascot />
      </Suspense>
      {/* Dog Emoji Button */}
      <DogEmojiButton />

      {/* User Profile Viewer */}
      <Suspense fallback={<LoadingFallback message="Loading profile..." size="small" variant="skeleton" />}>
        <LazyUserProfileViewer 
          isOpen={showProfileViewer}
          onClose={() => setShowProfileViewer(false)}
        />
      </Suspense>
    </div>
  )
})