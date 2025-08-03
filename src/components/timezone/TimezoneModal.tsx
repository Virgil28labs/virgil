/**
 * TimezoneModal Component
 *
 * Modal for selecting and managing timezones. Features search, management,
 * reordering, and editing with full accessibility support.
 */

import React, { memo, useCallback, useEffect, useRef, useState } from 'react';
import { TimezoneSearch } from './TimezoneSearch';
import { useTimezones } from './TimezoneContext';
import { useTimezoneFormatters } from './useTimezones';
import styles from './TimezoneWidget.module.css';

interface TimezoneModalProps {
  isOpen: boolean
  onClose: () => void
  className?: string
}

const TimezoneModal = memo(function TimezoneModal({
  isOpen,
  onClose,
  className = '',
}: TimezoneModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingLabel, setEditingLabel] = useState('');

  const {
    selectedTimezones,
    timezonesWithTime,
    addTimezone,
    removeTimezone,
    updateTimezoneLabel,
    clearAllTimezones,
    canAddMoreTimezones,
  } = useTimezones();

  const { formatTime } = useTimezoneFormatters();

  // Focus management
  useEffect(() => {
    if (isOpen && closeButtonRef.current) {
      closeButtonRef.current.focus();
    }
  }, [isOpen]);

  // Trap focus within modal
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
        return;
      }

      if (event.key === 'Tab') {
        const modal = modalRef.current;
        if (!modal) return;

        const focusableElements = modal.querySelectorAll(
          'button, input, select, textarea, [tabindex]:not([tabindex="-1"])',
        );
        const firstElement = focusableElements[0] as HTMLElement;
        const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

        if (event.shiftKey) {
          if (document.activeElement === firstElement) {
            event.preventDefault();
            lastElement?.focus();
          }
        } else {
          if (document.activeElement === lastElement) {
            event.preventDefault();
            firstElement?.focus();
          }
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Handle backdrop click
  const handleBackdropClick = useCallback((event: React.MouseEvent) => {
    if (event.target === event.currentTarget) {
      onClose();
    }
  }, [onClose]);

  // Handle timezone selection from search
  const handleTimezoneSelect = useCallback((timezone: string) => {
    const success = addTimezone(timezone);
    if (!success) {
      // Could show error message here
      console.warn('Failed to add timezone:', timezone);
    }
  }, [addTimezone]);

  // Handle timezone removal
  const handleRemoveTimezone = useCallback((id: string) => {
    removeTimezone(id);
  }, [removeTimezone]);

  // Handle label editing
  const handleStartEditing = useCallback((id: string, currentLabel: string) => {
    setEditingId(id);
    setEditingLabel(currentLabel);
  }, []);

  const handleSaveLabel = useCallback(() => {
    if (editingId && editingLabel.trim()) {
      updateTimezoneLabel(editingId, editingLabel.trim());
    }
    setEditingId(null);
    setEditingLabel('');
  }, [editingId, editingLabel, updateTimezoneLabel]);

  const handleCancelEditing = useCallback(() => {
    setEditingId(null);
    setEditingLabel('');
  }, []);

  const handleLabelKeyDown = useCallback((event: React.KeyboardEvent) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      handleSaveLabel();
    } else if (event.key === 'Escape') {
      event.preventDefault();
      handleCancelEditing();
    }
  }, [handleSaveLabel, handleCancelEditing]);

  if (!isOpen) return null;

  return (
    <div
      className={`${styles.modalOverlay} ${className || ''}`}
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="timezone-modal-title"
    >
      <div
        ref={modalRef}
        className={styles.modal}
        role="document"
      >
        {/* Header */}
        <div className={styles.modalHeader}>
          <h2 id="timezone-modal-title">Manage Timezones</h2>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            className={styles.modalClose}
            aria-label="Close timezone settings"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className={styles.modalContent}>
          {/* Search Section */}
          {canAddMoreTimezones && (
            <TimezoneSearch
              onSelect={handleTimezoneSelect}
              excludeTimezones={selectedTimezones.map(tz => tz.timezone)}
              autoFocus
            />
          )}

          {/* Selected Timezones Section */}
          <div className={styles.selectedSection}>
            <div className={styles.sectionHeader}>
              <h3>Selected Timezones ({selectedTimezones.length}/5)</h3>
              {selectedTimezones.length > 0 && (
                <button
                  type="button"
                  onClick={clearAllTimezones}
                  className={styles.clearAllLink}
                  aria-label="Remove all timezones"
                >
                  Clear all
                </button>
              )}
            </div>

            {selectedTimezones.length === 0 ? (
              <div className={styles.emptyState}>
                <p>No timezones selected yet.</p>
                <p>Search above to add your first timezone.</p>
              </div>
            ) : (
              <ul className={styles.timezoneList} role="list">
                {timezonesWithTime.map((timezone) => {
                  const isEditing = editingId === timezone.id;

                  return (
                    <li
                      key={timezone.id}
                      className={`${styles.timezoneItem} ${!timezone.isValid ? styles.invalid : ''}`}
                      role="listitem"
                    >
                      <div className={styles.timezoneInfo}>
                        <div className={styles.timezoneLabel}>
                          {isEditing ? (
                            <input
                              type="text"
                              value={editingLabel}
                              onChange={(e) => setEditingLabel(e.target.value)}
                              onKeyDown={handleLabelKeyDown}
                              onBlur={handleSaveLabel}
                              className={styles.labelEditInput}
                              aria-label="Edit timezone label"
                              autoFocus
                            />
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleStartEditing(timezone.id, timezone.label)}
                              className={styles.labelEditButton}
                              aria-label={`Edit label for ${timezone.label}`}
                            >
                              {timezone.label}
                            </button>
                          )}
                        </div>

                        <div className={styles.timezoneDetails}>
                          <span className={styles.timezoneTime}>
                            {timezone.isValid ? formatTime(timezone.currentTime) : 'Invalid'}
                          </span>
                        </div>
                      </div>

                      {/* Remove button */}
                      <button
                        type="button"
                        onClick={() => handleRemoveTimezone(timezone.id)}
                        className={styles.removeBtn}
                        aria-label={`Remove ${timezone.label}`}
                        title="Remove timezone"
                      >
                        ×
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {/* Limit Notice */}
          {!canAddMoreTimezones && (
            <div className={styles.limitNotice}>
              <p>Maximum of 5 timezones reached. Remove a timezone to add another.</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className={styles.modalFooter}>
          <p className={styles.footerInfo}>
            Click labels to edit
          </p>
        </div>
      </div>
    </div>
  );
});

export { TimezoneModal };
