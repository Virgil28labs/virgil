import React, { useState, useRef, useEffect } from 'react';

interface SelectDataPointProps {
  icon: string
  label: string
  value: string
  onChange: (value: string) => void
  options: { value: string; label: string }[]
  allowCustom?: boolean
  placeholder?: string
  className?: string
}

export const SelectDataPoint: React.FC<SelectDataPointProps> = ({
  icon,
  label,
  value,
  onChange,
  options,
  allowCustom = true,
  placeholder = 'Not set',
  className = '',
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [customValue, setCustomValue] = useState('');
  const selectRef = useRef<HTMLSelectElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Check if current value is a custom value (not in options)
  const isCustomValue = value && !options.some(opt => opt.value === value);

  useEffect(() => {
    if (isCustomValue) {
      setCustomValue(value);
      setShowCustomInput(true);
    }
  }, [value, isCustomValue]);

  useEffect(() => {
    if (isEditing && selectRef.current && !showCustomInput) {
      selectRef.current.focus();
    } else if (showCustomInput && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing, showCustomInput]);

  const handleClick = () => {
    if (!isEditing) {
      setIsEditing(true);
    }
  };

  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newValue = e.target.value;
    if (newValue === 'other') {
      setShowCustomInput(true);
      setCustomValue('');
    } else {
      onChange(newValue);
      setIsEditing(false);
      setShowCustomInput(false);
    }
  };

  const handleCustomInputBlur = () => {
    if (customValue.trim()) {
      onChange(customValue.trim());
    }
    setIsEditing(false);
  };

  const handleCustomInputKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleCustomInputBlur();
    } else if (e.key === 'Escape') {
      setCustomValue('');
      setShowCustomInput(false);
      setIsEditing(false);
    }
  };

  const handleBlur = () => {
    if (!showCustomInput) {
      setIsEditing(false);
    }
  };

  const displayValue = () => {
    if (!value) return placeholder;
    
    // Find the label for the value
    const option = options.find(opt => opt.value === value);
    if (option) return option.label;
    
    // It's a custom value
    return value;
  };

  const currentSelectValue = () => {
    if (isCustomValue || showCustomInput) return 'other';
    return value || '';
  };

  return (
    <div className={`data-point editable selectable ${className}`}>
      <span className="data-icon">{icon}</span>
      <span className="data-label">{label}</span>
      {isEditing ? (
        showCustomInput ? (
          <input
            ref={inputRef}
            type="text"
            className="data-input"
            value={customValue}
            onChange={(e) => setCustomValue(e.target.value)}
            onBlur={handleCustomInputBlur}
            onKeyDown={handleCustomInputKeyDown}
            placeholder="Enter custom value"
            aria-label={`Custom ${label}`}
          />
        ) : (
          <select
            ref={selectRef}
            className="data-select"
            value={currentSelectValue()}
            onChange={handleSelectChange}
            onBlur={handleBlur}
            aria-label={label}
          >
            <option value="">Select...</option>
            {options.map(opt => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
            {allowCustom && (
              <option value="other">Other...</option>
            )}
          </select>
        )
      ) : (
        <span 
          className={`data-value ${!value ? 'placeholder' : ''}`}
          onClick={handleClick}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              handleClick();
            }
          }}
          aria-label={`${label}: ${displayValue()}, click to edit`}
        >
          {displayValue()}
          <span className="edit-icon">✏️</span>
        </span>
      )}
    </div>
  );
};