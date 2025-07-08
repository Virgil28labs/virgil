import React, { memo, useCallback, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useLocation } from '../contexts/LocationContext'
import { useWeather } from '../contexts/WeatherContext'
import { useKeyboardNavigation } from '../hooks/useKeyboardNavigation'

interface UserProfileViewerProps {
  isOpen: boolean;
  onClose: () => void;
}

export const UserProfileViewer = memo(function UserProfileViewer({ 
  isOpen, 
  onClose 
}: UserProfileViewerProps) {
  const { user, signOut } = useAuth()
  const { address, ipLocation, hasGPSLocation } = useLocation()
  const { data: weatherData, unit: weatherUnit } = useWeather()

  // Handle click outside to close
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Element
      if (!target.closest('.user-profile-viewer') && !target.closest('.user-profile-toggle')) {
        onClose()
      }
    }

    const handleEscKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleEscKey)
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('keydown', handleEscKey)
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen, onClose])

  // Keyboard navigation
  const { containerRef } = useKeyboardNavigation({
    enabled: isOpen,
    onEscape: onClose
  })

  const copyProfileData = useCallback(() => {
    const profileData = {
      name: user?.user_metadata?.name,
      email: user?.email,
      memberSince: user?.created_at,
      location: address?.formatted || ipLocation?.city,
      weather: weatherData ? `${weatherData.temperature}°${weatherUnit === 'fahrenheit' ? 'F' : 'C'}` : null
    }
    navigator.clipboard?.writeText(JSON.stringify(profileData, null, 2))
  }, [user, address, ipLocation, weatherData, weatherUnit])

  if (!isOpen || !user) {
    return null
  }

  return (
    <div 
      ref={containerRef} 
      className="user-profile-viewer" 
      role="dialog" 
      aria-modal="false"
      aria-label="User Profile"
    >
      <div className="profile-viewer-header">
        <div className="profile-user-info">
          <div className="profile-avatar-small">
            {user?.user_metadata?.avatarUrl ? (
              <img 
                src={user.user_metadata.avatarUrl} 
                alt="Profile avatar" 
                className="avatar-image"
              />
            ) : user?.user_metadata?.name ? 
              user.user_metadata.name.charAt(0).toUpperCase() : 
              '👤'
            }
          </div>
          <div className="profile-user-details">
            <div className="profile-user-name">{user?.user_metadata?.name || 'User'}</div>
            <div className="profile-user-email">{user?.email}</div>
          </div>
        </div>
      </div>
      
      <div className="profile-viewer-content">
        <div className="profile-info-section">
          <h4>Account</h4>
          <div className="profile-info-item">
            <span className="info-icon">📅</span>
            <span className="info-text">
              Member since {user?.created_at ? 
                new Date(user.created_at).toLocaleDateString('en-US', { 
                  month: 'short', 
                  day: 'numeric', 
                  year: 'numeric' 
                }) : 
                'Unknown'
              }
            </span>
          </div>
        </div>

        <div className="profile-info-section">
          <h4>Location & Weather</h4>
          <div className="profile-info-item">
            <span className="info-icon">📍</span>
            <span className="info-text">
              {hasGPSLocation ? 'GPS Location Available' : 
               address ? `${address.city}${address.country ? `, ${address.country}` : ''}` :
               ipLocation ? `${ipLocation.city}${ipLocation.country ? `, ${ipLocation.country}` : ''}` :
               'Location unavailable'}
            </span>
          </div>
          {weatherData && (
            <div className="profile-info-item">
              <span className="info-icon">☀️</span>
              <span className="info-text">
                {weatherData.temperature}°{weatherUnit === 'fahrenheit' ? 'F' : 'C'} - {weatherData.condition.description}
              </span>
            </div>
          )}
        </div>

        <div className="profile-info-section">
          <h4>Actions</h4>
          <div className="profile-actions">
            <button 
              className="profile-action-btn copy"
              onClick={copyProfileData}
              data-keyboard-nav
            >
              📋 Copy Profile Data
            </button>
            <button 
              className="profile-action-btn signout"
              onClick={signOut}
              data-keyboard-nav
            >
              🚪 Sign Out
            </button>
          </div>
        </div>
      </div>
    </div>
  )
})