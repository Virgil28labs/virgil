import { memo, useCallback, useState, Suspense } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useLocation } from '../contexts/LocationContext'
import { VirgilTextLogo } from './VirgilTextLogo'
import { DateTime } from './DateTime'
import { LazyRaccoonMascot, LazyWeather, LazyUserProfileViewer } from './LazyComponents'
import { DogEmojiButton } from './DogEmojiButton'
import { LoadingFallback } from './LoadingFallback'
import { SkeletonLoader } from './SkeletonLoader'
import { useKeyboardNavigation } from '../hooks/useKeyboardNavigation'

export const Dashboard = memo(function Dashboard() {
  const { user, signOut } = useAuth()
  const { address, ipLocation, coordinates, loading: locationLoading } = useLocation()
  const [showProfileViewer, setShowProfileViewer] = useState(false)
  const [elevationUnit, setElevationUnit] = useState<'meters' | 'feet'>(() => {
    const saved = localStorage.getItem('elevationUnit')
    return (saved === 'feet' || saved === 'meters') ? saved : 'meters'
  })


  const toggleElevationUnit = useCallback(() => {
    setElevationUnit(prev => {
      const newUnit = prev === 'meters' ? 'feet' : 'meters'
      localStorage.setItem('elevationUnit', newUnit)
      return newUnit
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
      <VirgilTextLogo />
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
            ) : ipLocation?.city ? (
              <p className="street-address">{ipLocation.city}{ipLocation.region ? `, ${ipLocation.region}` : ''}</p>
            ) : (
              <p className="address-error">Location unavailable</p>
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
          
          {coordinates?.elevation !== undefined && (
            <div className="elevation-info">
              <p 
                className="elevation" 
                onClick={toggleElevationUnit}
                style={{ cursor: 'pointer' }}
                title="Click to toggle unit"
              >
                Elevation: {elevationUnit === 'meters' 
                  ? `${Math.round(coordinates.elevation)}m`
                  : `${Math.round(coordinates.elevation * 3.28084)}ft`
                }
              </p>
            </div>
          )}
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