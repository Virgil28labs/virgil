import { memo, useCallback, useState, Suspense } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useLocation } from '../contexts/LocationContext'
import { VirgilTextLogo } from './VirgilTextLogo'
import { DateTime } from './DateTime'
import { LazyRaccoonMascot, LazyWeather, LazyUserProfileViewer } from './LazyComponents'
import { DogEmojiButton } from './DogEmojiButton'
import { GiphyEmojiButton } from './GiphyEmojiButton'
import { NasaApodButton } from './NasaApodButton'
import { RhythmMachineButton } from './RhythmMachineButton'
import { CircleGameButton } from './CircleGameButton'
import { StreakTrackerButton } from './StreakTrackerButton'
import { CameraEmojiButton } from './camera/CameraEmojiButton'
import { PomodoroEmojiButton } from './pomodoro/PomodoroEmojiButton'
import { LoadingFallback } from './LoadingFallback'
import { SkeletonLoader } from './SkeletonLoader'
import { useKeyboardNavigation } from '../hooks/useKeyboardNavigation'

export const Dashboard = memo(function Dashboard() {
  const { user, signOut } = useAuth()
  const { address, ipLocation, coordinates, loading: locationLoading } = useLocation()
  const [showProfileViewer, setShowProfileViewer] = useState(false)
  const [isSigningOut, setIsSigningOut] = useState(false)
  const [elevationUnit, setElevationUnit] = useState<'meters' | 'feet'>(() => {
    try {
      const saved = localStorage.getItem('elevationUnit')
      return (saved === 'feet' || saved === 'meters') ? saved : 'meters'
    } catch {
      return 'meters'
    }
  })


  const toggleElevationUnit = useCallback(() => {
    setElevationUnit(prev => {
      const newUnit = prev === 'meters' ? 'feet' : 'meters'
      try {
        localStorage.setItem('elevationUnit', newUnit)
      } catch (e) {
        console.warn('Failed to save elevation unit preference:', e)
      }
      return newUnit
    })
  }, [])

  const handleSignOut = useCallback(async () => {
    if (isSigningOut) return // Prevent multiple clicks
    
    setIsSigningOut(true)
    const { error } = await signOut()
    if (error) {
      console.error('Sign out error:', error)
    }
    setIsSigningOut(false)
  }, [signOut, isSigningOut])

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
    <div ref={containerRef as React.RefObject<HTMLDivElement>} className="dashboard" role="main" aria-label="Dashboard">
      {/* Fixed positioned elements */}
      <VirgilTextLogo onClick={() => setShowProfileViewer(true)} />
      <DateTime />
      <Suspense fallback={null}>
        <LazyWeather />
      </Suspense>

      {/* Power button */}
      <button 
        className={`power-button ${isSigningOut ? 'signing-out' : ''}`}
        onClick={handleSignOut} 
        title={isSigningOut ? "Signing out..." : "Sign Out"}
        aria-label={isSigningOut ? "Signing out..." : "Sign out of your account"}
        data-keyboard-nav
        disabled={isSigningOut}
      >
        <div className="power-icon" aria-hidden="true"></div>
        <span className="sr-only">{isSigningOut ? "Signing out..." : "Sign Out"}</span>
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
      
      {/* Giphy Emoji Button */}
      <GiphyEmojiButton />
      
      {/* NASA APOD Button */}
      <NasaApodButton />
      
      {/* Rhythm Machine Button */}
      <RhythmMachineButton />
      
      {/* Circle Game Button */}
      <CircleGameButton />
      
      {/* Streak Tracker Button */}
      <StreakTrackerButton />
      
      {/* Camera Button */}
      <CameraEmojiButton />
      
      {/* Pomodoro Timer Button */}
      <PomodoroEmojiButton />

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