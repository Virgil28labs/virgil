/**
 * TimezoneWidget Component
 * 
 * Main timezone widget that provides the complete timezone functionality.
 * Integrates modal, hover panel, and click/hover interactions.
 */

import { memo, useState, useCallback, useRef, useEffect } from 'react'
import { TimezoneModal } from './TimezoneModal'
import { PositionedTimezoneHoverPanel } from './TimezoneHoverPanel'
import { useTimezones } from './useTimezones'

interface TimezoneWidgetProps {
  children: React.ReactNode
  className?: string
  disabled?: boolean
  hoverDelay?: number
  clickToOpen?: boolean
}

export const TimezoneWidget = memo(function TimezoneWidget({
  children,
  className = '',
  disabled = false,
  hoverDelay = 150,
  clickToOpen = true
}: TimezoneWidgetProps) {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isHoverPanelVisible, setIsHoverPanelVisible] = useState(false)
  const triggerRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const hideTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  
  const { selectedTimezones } = useTimezones()

  // Check if we should show hover panel
  const shouldShowHoverPanel = selectedTimezones.length > 1 && !disabled

  // Clear hover timeouts on unmount
  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current)
      }
      if (hideTimeoutRef.current) {
        clearTimeout(hideTimeoutRef.current)
      }
    }
  }, [])

  // Handle click to open modal
  const handleClick = useCallback(() => {
    if (disabled || !clickToOpen) return
    
    // Clear any pending hover states
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current)
      hoverTimeoutRef.current = null
    }
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current)
      hideTimeoutRef.current = null
    }
    
    setIsModalOpen(true)
    setIsHoverPanelVisible(false)
  }, [disabled, clickToOpen])

  // Handle modal close
  const handleModalClose = useCallback(() => {
    setIsModalOpen(false)
  }, [])

  // Handle mouse enter for hover panel
  const handleMouseEnter = useCallback(() => {
    if (!shouldShowHoverPanel || isModalOpen) return

    // Clear any existing timeouts
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current)
    }
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current)
      hideTimeoutRef.current = null
    }

    // Set timeout for hover delay
    hoverTimeoutRef.current = setTimeout(() => {
      if (!isModalOpen) {
        setIsHoverPanelVisible(true)
      }
    }, hoverDelay)
  }, [shouldShowHoverPanel, isModalOpen, hoverDelay])

  // Handle mouse leave for hover panel
  const handleMouseLeave = useCallback(() => {
    // Clear hover timeout
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current)
      hoverTimeoutRef.current = null
    }

    // Add a small delay before hiding to prevent flickering
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current)
    }
    
    hideTimeoutRef.current = setTimeout(() => {
      setIsHoverPanelVisible(false)
    }, 100)
  }, [])

  // Handle keyboard interactions
  const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
    if (disabled) return

    switch (event.key) {
      case 'Enter':
      case ' ':
        event.preventDefault()
        if (clickToOpen) {
          setIsModalOpen(true)
          setIsHoverPanelVisible(false)
        }
        break
        
      case 'Escape':
        if (isModalOpen) {
          setIsModalOpen(false)
        }
        break
    }
  }, [disabled, clickToOpen, isModalOpen])

  // Handle focus events for keyboard users
  const handleFocus = useCallback(() => {
    if (!shouldShowHoverPanel) return
    
    // Show hover panel on focus for keyboard users
    setIsHoverPanelVisible(true)
  }, [shouldShowHoverPanel])

  const handleBlur = useCallback(() => {
    // Hide panel when focus leaves, with small delay to allow for quick refocus
    setTimeout(() => {
      if (!containerRef.current?.contains(document.activeElement)) {
        setIsHoverPanelVisible(false)
      }
    }, 100)
  }, [])

  return (
    <div 
      ref={containerRef}
      className="timezone-widget-container"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div
        ref={triggerRef}
        className={`timezone-widget-trigger ${className} ${disabled ? 'disabled' : ''}`}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        onFocus={handleFocus}
        onBlur={handleBlur}
        role="button"
        tabIndex={disabled ? -1 : 0}
        aria-label={
          selectedTimezones.length === 0
            ? 'Click to add timezones'
            : `View ${selectedTimezones.length} selected timezone${selectedTimezones.length > 1 ? 's' : ''}`
        }
        aria-haspopup="dialog"
        aria-expanded={isModalOpen}
        style={{
          cursor: disabled ? 'default' : clickToOpen ? 'pointer' : 'default'
        }}
      >
        {children}
      </div>

      {/* Hover Panel */}
      {shouldShowHoverPanel && (
        <PositionedTimezoneHoverPanel
          isVisible={isHoverPanelVisible && !isModalOpen}
          triggerRef={triggerRef as React.RefObject<HTMLDivElement>}
          className="timezone-widget-panel"
        />
      )}

      {/* Modal */}
      <TimezoneModal
        isOpen={isModalOpen}
        onClose={handleModalClose}
        className="timezone-widget-modal"
      />
    </div>
  )
})


