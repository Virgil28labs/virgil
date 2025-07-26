import React, { useState, useRef, useEffect, memo } from 'react';
import './maps.css';
import { timeService } from '../../services/TimeService';

interface DepartureTimeSelectorProps {
  selectedTime: Date | 'now'
  onTimeChange: (time: Date | 'now') => void
  isCompact?: boolean
}

export const DepartureTimeSelector = memo(function DepartureTimeSelector({
  selectedTime,
  onTimeChange,
  isCompact = false,
}: DepartureTimeSelectorProps) {
  const [showDropdown, setShowDropdown] = useState(false);
  const [showCustomPicker, setShowCustomPicker] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
        setShowCustomPicker(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
  
  // Format the display text
  const getDisplayText = () => {
    if (selectedTime === 'now') {
      return isCompact ? 'Now' : 'Leave now';
    }
    
    const time = selectedTime;
    const now = timeService.getCurrentDateTime();
    const isToday = timeService.isSameDay(time, now);
    
    if (isToday) {
      return timeService.formatTimeToLocal(time, { 
        hour: 'numeric', 
        minute: '2-digit', 
      });
    } else {
      return timeService.formatDateToLocal(time, { 
        month: 'short', 
        day: 'numeric',
        hour: 'numeric', 
        minute: '2-digit', 
      });
    }
  };
  
  // Quick time options
  const handleQuickOption = (minutes: number) => {
    const newTime = timeService.addMinutes(timeService.getCurrentDateTime(), minutes);
    onTimeChange(newTime);
    setShowDropdown(false);
  };
  
  // Quick date options
  const handleQuickDate = (daysOffset: number, hour: number = 9) => {
    let newTime = timeService.getCurrentDateTime();
    if (daysOffset !== 0) {
      newTime = timeService.addDays(newTime, daysOffset);
    }
    // Use TimeService methods instead of direct manipulation
    newTime = timeService.startOfDay(newTime);
    newTime = timeService.addHours(newTime, hour);
    onTimeChange(newTime);
    setShowDropdown(false);
  };
  
  // Handle custom date/time input
  const handleCustomTime = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = timeService.parseDate(e.target.value);
    if (newTime) {
      onTimeChange(newTime);
      setShowCustomPicker(false);
      setShowDropdown(false);
    }
  };
  
  // Get current datetime string for input
  const getCurrentDateTimeString = () => {
    const now = selectedTime === 'now' ? timeService.getCurrentDateTime() : selectedTime;
    return timeService.formatForDateTimeInput(now);
  };
  
  // Get min/max date strings for the picker
  const getMinDateTimeString = () => {
    const minDate = timeService.addYears(timeService.getCurrentDateTime(), -1); // Allow up to 1 year in the past
    return timeService.formatForDateTimeInput(minDate);
  };
  
  const getMaxDateTimeString = () => {
    const maxDate = timeService.addYears(timeService.getCurrentDateTime(), 1); // Allow up to 1 year in the future
    return timeService.formatForDateTimeInput(maxDate);
  };
  
  return (
    <div className={`departure-time-selector ${showDropdown ? 'open' : ''}`} ref={dropdownRef}>
      <button
        className={`departure-time-btn ${isCompact ? 'compact' : ''}`}
        onClick={() => setShowDropdown(!showDropdown)}
        type="button"
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5" fill="none" />
          <path d="M8 4V8L10.5 10.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
        <span>{getDisplayText()}</span>
        {!isCompact && (
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className="chevron">
            <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        )}
      </button>
      
      {showDropdown && (
        <div className="departure-time-dropdown">
          <button onClick={() => { onTimeChange('now'); setShowDropdown(false); }}>
            Leave now
          </button>
          <button onClick={() => handleQuickOption(15)}>
            In 15 minutes
          </button>
          <button onClick={() => handleQuickOption(30)}>
            In 30 minutes
          </button>
          <button onClick={() => handleQuickOption(60)}>
            In 1 hour
          </button>
          <button onClick={() => handleQuickOption(120)}>
            In 2 hours
          </button>
          <div className="dropdown-divider" />
          <button onClick={() => handleQuickDate(1, 9)}>
            Tomorrow at 9 AM
          </button>
          <button onClick={() => handleQuickDate(1, 17)}>
            Tomorrow at 5 PM
          </button>
          <button onClick={() => handleQuickDate(7, 9)}>
            Next week
          </button>
          <div className="dropdown-divider" />
          <button onClick={() => setShowCustomPicker(!showCustomPicker)}>
            Pick specific date & time...
          </button>
          
          {showCustomPicker && (
            <div className="custom-time-picker">
              <input
                type="datetime-local"
                value={getCurrentDateTimeString()}
                onChange={handleCustomTime}
                min={getMinDateTimeString()}
                max={getMaxDateTimeString()}
              />
              <div style={{ fontSize: '0.75rem', color: '#666', marginTop: '0.5rem', textAlign: 'center' }}>
                Select any date and time
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
});