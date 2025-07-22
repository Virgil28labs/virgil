import { useState, useEffect, memo, useMemo } from 'react';
import { TimezoneWidget } from './timezone';

/**
 * DateTime Component
 * 
 * Displays current local time and date with real-time updates
 * Now includes timezone widget functionality with click and hover interactions
 * Positioned in center-top of dashboard between logo and power button
 * Memoized and optimized to prevent unnecessary parent re-renders
 */
export const DateTime = memo(function DateTime() {
  const [currentTime, setCurrentTime] = useState<Date>(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Memoize formatters to prevent recreation on every render
  const formatters = useMemo(() => ({
    time: (date: Date): string => date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    }),
    date: (date: Date): string => date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }),
    day: (date: Date): string => date.toLocaleDateString('en-US', {
      weekday: 'long',
    }).toLowerCase(),
  }), []);

  return (
    <TimezoneWidget 
      className="datetime-widget"
      hoverDelay={150}
      clickToOpen
    >
      <div className="datetime-display">
        <div className="time">
          {(() => {
            const timeParts = formatters.time(currentTime).split(':');
            return (
              <>
                {timeParts[0]}:{timeParts[1]}
                <sup className="time-seconds">{timeParts[2]}</sup>
              </>
            );
          })()}
        </div>
        <div className="date">{formatters.date(currentTime)}</div>
        <div className="day">{formatters.day(currentTime)}</div>
      </div>
    </TimezoneWidget>
  );
});