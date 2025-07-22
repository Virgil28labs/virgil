import React, { useState, useEffect, useCallback } from 'react'
import { SearchType } from '../../types/maps.types'
import './QuickSearchPill.css'

interface QuickSearchPillProps {
  onSearch: (type: SearchType) => void
  isSearching: boolean
  onClose?: () => void
}

interface SearchOption {
  type: SearchType
  icon: string
  label: string
}

// Get contextual search options based on time of day
const getTimeBasedOptions = (): SearchOption[] => {
  const hour = new Date().getHours()
  
  if (hour >= 6 && hour < 11) {
    // Morning: Coffee, Breakfast, Gas
    return [
      { type: 'coffee', icon: '☕', label: 'Coffee' },
      { type: 'food', icon: '🥐', label: 'Breakfast' },
      { type: 'gas', icon: '⛽', label: 'Gas' }
    ]
  } else if (hour >= 11 && hour < 14) {
    // Afternoon: Food, Coffee, Grocery
    return [
      { type: 'food', icon: '🍽️', label: 'Lunch' },
      { type: 'coffee', icon: '☕', label: 'Coffee' },
      { type: 'grocery', icon: '🛒', label: 'Grocery' }
    ]
  } else if (hour >= 17 && hour < 21) {
    // Evening: Dinner, Bar, Entertainment
    return [
      { type: 'restaurant', icon: '🍽️', label: 'Dinner' },
      { type: 'bar', icon: '🍺', label: 'Drinks' },
      { type: 'entertainment', icon: '🎭', label: 'Fun' }
    ]
  } else {
    // Late night: 24hr, Gas, Pharmacy
    return [
      { type: 'convenience', icon: '🏪', label: '24 Hour' },
      { type: 'gas', icon: '⛽', label: 'Gas' },
      { type: 'pharmacy', icon: '💊', label: 'Pharmacy' }
    ]
  }
}

// All available search options for expanded view
const allSearchOptions: SearchOption[] = [
  { type: 'coffee', icon: '☕', label: 'Coffee' },
  { type: 'food', icon: '🍽️', label: 'Food' },
  { type: 'gas', icon: '⛽', label: 'Gas' },
  { type: 'grocery', icon: '🛒', label: 'Grocery' },
  { type: 'pharmacy', icon: '💊', label: 'Pharmacy' },
  { type: 'atm', icon: '🏧', label: 'ATM' },
  { type: 'bar', icon: '🍺', label: 'Bar' },
  { type: 'convenience', icon: '🏪', label: '24 Hour' }
]

export const QuickSearchPill: React.FC<QuickSearchPillProps> = ({
  onSearch,
  isSearching,
  onClose
}) => {
  const [isExpanded, setIsExpanded] = useState(false)
  const [showLabels, setShowLabels] = useState(false)
  const [currentOptions, setCurrentOptions] = useState(getTimeBasedOptions())
  const [autoHideTimer, setAutoHideTimer] = useState<NodeJS.Timeout | null>(null)

  // Update options every minute to catch hour changes
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentOptions(getTimeBasedOptions())
    }, 60000)

    return () => clearInterval(interval)
  }, [])

  // Auto-hide after inactivity
  const resetAutoHide = useCallback(() => {
    if (autoHideTimer) {
      clearTimeout(autoHideTimer)
    }
    
    const timer = setTimeout(() => {
      setShowLabels(false)
      setIsExpanded(false)
    }, 5000)
    
    setAutoHideTimer(timer)
  }, [autoHideTimer])

  // Handle mouse/touch interaction
  const handleInteraction = useCallback(() => {
    setShowLabels(true)
    resetAutoHide()
  }, [resetAutoHide])

  // Handle search click
  const handleSearch = useCallback((type: SearchType) => {
    onSearch(type)
    setIsExpanded(false)
    setShowLabels(false)
  }, [onSearch])

  // Toggle expanded view
  const toggleExpanded = useCallback(() => {
    setIsExpanded(!isExpanded)
    resetAutoHide()
  }, [isExpanded, resetAutoHide])

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (autoHideTimer) {
        clearTimeout(autoHideTimer)
      }
    }
  }, [autoHideTimer])

  const displayOptions = isExpanded ? allSearchOptions : currentOptions

  return (
    <div 
      className={`quick-search-pill ${showLabels ? 'show-labels' : ''} ${isExpanded ? 'expanded' : ''}`}
      onMouseEnter={handleInteraction}
      onTouchStart={handleInteraction}
    >
      <div className="pill-content">
        {displayOptions.map((option) => (
          <button
            key={option.type}
            className={`search-option ${isSearching ? 'searching' : ''}`}
            onClick={() => handleSearch(option.type)}
            disabled={isSearching}
            title={option.label}
          >
            <span className="search-icon">{option.icon}</span>
            {showLabels && <span className="search-label">{option.label}</span>}
          </button>
        ))}
        
        {!isExpanded && (
          <button
            className="expand-button"
            onClick={toggleExpanded}
            title="More options"
          >
            <span className="expand-icon">⋯</span>
          </button>
        )}
      </div>
      
      {isSearching && (
        <div className="search-indicator">
          <div className="search-spinner"></div>
        </div>
      )}
    </div>
  )
}