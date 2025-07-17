/**
 * TimezoneHoverPanel Component
 * 
 * Minimal hover panel that displays selected timezone times in a single row.
 * Clean, lightweight design.
 */

import { memo, useState, useEffect } from 'react'
import { useTimezones, useTimezoneFormatters } from './useTimezones'

interface TimezoneHoverPanelProps {
  isVisible: boolean
  className?: string
}

const TimezoneHoverPanel = memo(function TimezoneHoverPanel({
  isVisible,
  className = ''
}: TimezoneHoverPanelProps) {
  const { timezonesWithTime } = useTimezones()
  const { formatTime } = useTimezoneFormatters()

  if (!isVisible || timezonesWithTime.length < 2) return null

  // Sort by UTC offset: earliest (west) to latest (east)
  const sortedTimezones = [...timezonesWithTime].sort((a, b) => 
    a.currentTime.offset - b.currentTime.offset
  )

  return (
    <div 
      className={`timezone-hover-panel ${className}`}
      role="tooltip"
      aria-label="Selected timezone times"
    >
      {sortedTimezones.map((timezone) => (
        <div key={timezone.id} className="timezone-item">
          <div className="timezone-label">{timezone.label}</div>
          <div className="timezone-time">
            {timezone.isValid ? formatTime(timezone.currentTime) : '--:--'}
          </div>
        </div>
      ))}
    </div>
  )
})

/**
 * Positioned wrapper for the hover panel
 * Positions panel to the right of the trigger element
 */
interface PositionedHoverPanelProps extends TimezoneHoverPanelProps {
  triggerRef?: React.RefObject<HTMLElement>
}

const PositionedTimezoneHoverPanel = memo(function PositionedTimezoneHoverPanel({
  triggerRef,
  ...panelProps
}: PositionedHoverPanelProps) {
  const [position, setPosition] = useState({ top: 0, left: 0 })

  useEffect(() => {
    if (!triggerRef?.current || !panelProps.isVisible) return

    const trigger = triggerRef.current
    // Find the actual datetime display element
    const datetimeDisplay = trigger.querySelector('.datetime-display')
    const elementToPosition = datetimeDisplay || trigger
    const rect = elementToPosition.getBoundingClientRect()
    
    // Position directly below the clock
    setPosition({
      top: rect.bottom + 4,
      left: rect.left + rect.width / 2
    })
  }, [triggerRef, panelProps.isVisible])

  if (!panelProps.isVisible) return null

  return (
    <div 
      className="timezone-hover-panel-wrapper"
      style={{
        top: `${position.top}px`,
        left: `${position.left}px`,
        transform: 'translateX(-50%)'
      }}
    >
      <TimezoneHoverPanel {...panelProps} />
    </div>
  )
})