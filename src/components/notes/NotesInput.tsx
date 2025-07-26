/**
 * Input component for creating new notes
 * Features rotating placeholders, auto-resize, and keyboard shortcuts
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { INPUT_PLACEHOLDERS, UI_CONFIG } from './constants';
import './notes.css';

interface NotesInputProps {
  /** Callback when a note is submitted */
  onSubmit: (content: string) => void
}

/**
 * Smart input field for capturing notes with progressive enhancement
 * - Rotating placeholder text for inspiration
 * - Auto-resizing textarea
 * - Keyboard shortcut support (Cmd/Ctrl + Enter)
 * - Character limit enforcement
 */
export const NotesInput = ({ onSubmit }: NotesInputProps) => {
  const [value, setValue] = useState('');
  const [placeholder, setPlaceholder] = useState<string>(INPUT_PLACEHOLDERS[0]);
  const [isFocused, setIsFocused] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Rotate placeholders
  useEffect(() => {
    if (!isFocused && !value) {
      const interval = setInterval(() => {
        setPlaceholder(prev => {
          const currentIndex = INPUT_PLACEHOLDERS.indexOf(prev as typeof INPUT_PLACEHOLDERS[number]);
          const nextIndex = (currentIndex + 1) % INPUT_PLACEHOLDERS.length;
          return INPUT_PLACEHOLDERS[nextIndex];
        });
      }, UI_CONFIG.PLACEHOLDER_ROTATION_INTERVAL);

      return () => clearInterval(interval);
    }
    return undefined;
  }, [isFocused, value]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [value]);

  const handleSubmit = useCallback((e?: React.FormEvent) => {
    e?.preventDefault();
    
    const trimmedValue = value.trim();
    if (trimmedValue) {
      onSubmit(trimmedValue);
      setValue('');
      
      // Reset textarea height
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    }
  }, [value, onSubmit]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && e.metaKey) {
      e.preventDefault();
      handleSubmit();
    }
  }, [handleSubmit]);

  return (
    <form onSubmit={handleSubmit} className="notes-input-form">
      <div className={`notes-input-wrapper ${isFocused ? 'focused' : ''}`}>
        <span className="notes-input-icon">💭</span>
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder={placeholder}
          className="notes-input"
          rows={1}
          maxLength={UI_CONFIG.MAX_NOTE_LENGTH}
          aria-label="Note input"
          aria-describedby="notes-input-hint"
          autoComplete="off"
          spellCheck="true"
        />
        {value && (
          <button
            type="submit"
            className="notes-submit-button"
            aria-label="Submit note"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path
                d="M7 11L12 6L17 11M12 18V6"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        )}
      </div>
      <span id="notes-input-hint" className="notes-input-hint">
        Press {navigator.platform.includes('Mac') ? '⌘' : 'Ctrl'}+Enter to submit
      </span>
    </form>
  );
};