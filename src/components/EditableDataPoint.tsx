import React, { useState, useRef, useEffect, memo } from 'react';
import { timeService } from '../services/TimeService';

interface EditableDataPointProps {
  icon: string
  label: string
  value: string
  onChange: (value: string) => void
  type?: 'text' | 'date' | 'tel' | 'email'
  placeholder?: string
  readOnly?: boolean
  className?: string
}

export const EditableDataPoint = memo(function EditableDataPoint({
  icon,
  label,
  value,
  onChange,
  type = 'text',
  placeholder = 'Not set',
  readOnly = false,
  className = '',
}: EditableDataPointProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [localValue, setLocalValue] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleClick = () => {
    if (!readOnly && !isEditing) {
      setIsEditing(true);
    }
  };

  const handleBlur = () => {
    setIsEditing(false);
    if (localValue !== value) {
      onChange(localValue);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleBlur();
    } else if (e.key === 'Escape') {
      setLocalValue(value);
      setIsEditing(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLocalValue(e.target.value);
  };

  // Format display value for dates
  const displayValue = () => {
    if (!value) return placeholder;
    if (type === 'date' && !isEditing) {
      try {
        // Parse date string as local date by adding time component
        // This prevents timezone shifting when displaying dates
        const [year, month, day] = value.split('-').map(Number);
        const date = timeService.createDate(year, month - 1, day); // month is 0-indexed
        return timeService.formatDateToLocal(date, {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        });
      } catch {
        return value;
      }
    }
    return value;
  };

  return (
    <div className={`data-point editable ${className}`}>
      <span className="data-icon">{icon}</span>
      <span className="data-label">{label}</span>
      {isEditing ? (
        <input
          ref={inputRef}
          type={type}
          className="data-input"
          value={localValue}
          onChange={handleChange}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          aria-label={label}
        />
      ) : (
        <span 
          className={`data-value ${!value ? 'placeholder' : ''} ${readOnly ? 'readonly' : ''}`}
          onClick={handleClick}
          role={readOnly ? undefined : 'button'}
          tabIndex={readOnly ? undefined : 0}
          onKeyDown={(e) => {
            if (!readOnly && (e.key === 'Enter' || e.key === ' ')) {
              e.preventDefault();
              handleClick();
            }
          }}
          aria-label={`${label}: ${displayValue()}, click to edit`}
        >
          {displayValue()}
          {!readOnly && <span className="edit-icon">✏️</span>}
        </span>
      )}
    </div>
  );
});