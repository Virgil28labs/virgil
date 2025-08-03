/**
 * TimezoneHoverPanel Component
 *
 * Minimal hover panel that displays selected timezone times in a single row.
 * Clean, lightweight design.
 */

import React, { memo, useState, useEffect, useMemo } from 'react';
import { useTimezones } from './TimezoneContext';
import { useTimezoneFormatters } from './useTimezones';
import styles from './TimezoneWidget.module.css';

interface TimezoneHoverPanelProps {
  isVisible: boolean
  className?: string
}

const TimezoneHoverPanel = memo(function TimezoneHoverPanel({
  isVisible,
  className = '',
}: TimezoneHoverPanelProps) {
  const { timezonesWithTime } = useTimezones();
  const { formatTime } = useTimezoneFormatters();

  // Sort by UTC offset: earliest (west) to latest (east)
  const sortedTimezones = useMemo(() => {
    if (!isVisible || timezonesWithTime.length < 2) return [];
    return [...timezonesWithTime].sort((a, b) =>
      a.currentTime.offset - b.currentTime.offset,
    );
  }, [isVisible, timezonesWithTime]);

  if (!isVisible || sortedTimezones.length === 0) return null;

  return (
    <div
      className={`${styles.hoverPanel} ${className}`}
      role="tooltip"
      aria-label="Selected timezone times"
    >
      {sortedTimezones.map((timezone) => (
        <div key={timezone.id} className={styles.timezoneItem}>
          <div className={styles.timezoneLabel}>{timezone.label}</div>
          <div className={styles.timezoneTime}>
            {timezone.isValid ? formatTime(timezone.currentTime) : '--:--'}
          </div>
        </div>
      ))}
    </div>
  );
});

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
  const [position, setPosition] = useState({ top: 0, left: 0 });

  useEffect(() => {
    if (!triggerRef?.current || !panelProps.isVisible) return;

    const trigger = triggerRef.current;
    // Find the actual datetime display element
    const datetimeDisplay = trigger.querySelector('.datetime-display');
    const elementToPosition = datetimeDisplay || trigger;
    const rect = elementToPosition.getBoundingClientRect();

    // Position directly below the clock
    setPosition({
      top: rect.bottom + 4,
      left: rect.left + rect.width / 2,
    });
  }, [triggerRef, panelProps.isVisible]);

  if (!panelProps.isVisible) return null;

  return (
    <div
      className={styles.hoverPanelWrapper}
      style={{
        top: `${position.top}px`,
        left: `${position.left}px`,
        transform: 'translateX(-50%)',
      }}
    >
      <TimezoneHoverPanel {...panelProps} />
    </div>
  );
});

export { PositionedTimezoneHoverPanel };
