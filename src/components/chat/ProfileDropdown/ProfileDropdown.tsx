import { memo, useState, useCallback, useEffect, useRef } from 'react';
import styles from './ProfileDropdown.module.css';

interface ProfileDropdownProps {
  customSystemPrompt: string;
  onSystemPromptChange: (prompt: string) => void;
  onSystemPromptSave: () => void;
  onClearMessages: () => void;
  onExportMessages: () => void;
  messageCount: number;
}

const ProfileDropdown = memo(function ProfileDropdown({
  customSystemPrompt,
  onSystemPromptChange,
  onSystemPromptSave,
  onClearMessages,
  onExportMessages,
  messageCount,
}: ProfileDropdownProps) {
  const [showDropdown, setShowDropdown] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Handle save with dropdown close
  const handleSave = useCallback(() => {
    onSystemPromptSave();
    setShowDropdown(false);
  }, [onSystemPromptSave]);

  // Handle reset to default
  const handleReset = useCallback(() => {
    const defaultPrompt = 'You are Virgil, a contextual AI assistant.';
    onSystemPromptChange(defaultPrompt);
  }, [onSystemPromptChange]);

  // Handle clear with confirmation and dropdown close
  const handleClear = useCallback(() => {
    if (confirm('Clear all chat messages?')) {
      onClearMessages();
      setShowDropdown(false);
    }
  }, [onClearMessages]);

  // Handle export with dropdown close
  const handleExport = useCallback(() => {
    onExportMessages();
    setShowDropdown(false);
  }, [onExportMessages]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showDropdown && !containerRef.current?.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [showDropdown]);

  return (
    <div className={styles.container} ref={containerRef}>
      <button
        className={styles.triggerButton}
        onClick={() => setShowDropdown(!showDropdown)}
        title="System Prompt Editor"
        aria-expanded={showDropdown}
        aria-haspopup="menu"
      >
        ⚙️ EDIT
      </button>

      {showDropdown && (
        <div className={styles.dropdown} role="menu">
          <div className={styles.section}>
            <div className={styles.sectionTitle}>System Prompt Editor</div>
            <textarea
              value={customSystemPrompt}
              onChange={(e) => onSystemPromptChange(e.target.value)}
              placeholder="Enter custom system prompt for Virgil..."
              className={styles.promptTextarea}
              rows={6}
            />

            <div className={styles.promptActions}>
              <button
                className={styles.saveButton}
                onClick={handleSave}
              >
                💾 Save
              </button>
              <button
                className={styles.resetButton}
                onClick={handleReset}
              >
                🔄 Default
              </button>
            </div>

            <div className={styles.promptInfo}>
              <small className={styles.promptInfoText}>
                Length: {customSystemPrompt.length} characters
                {customSystemPrompt && (
                  <span className={styles.promptActive}> • Custom prompt active</span>
                )}
              </small>
            </div>
          </div>

          <div className={styles.section}>
            <div className={styles.sectionTitle}>Chat Actions</div>
            <button
              className={styles.profileAction}
              onClick={handleClear}
              role="menuitem"
            >
              <span className={styles.actionIcon}>🗑️</span>
              Clear Chat History
            </button>
            <button
              className={styles.profileAction}
              onClick={handleExport}
              disabled={messageCount === 0}
              role="menuitem"
            >
              <span className={styles.actionIcon}>💾</span>
              Export Chat Messages
            </button>
          </div>
        </div>
      )}
    </div>
  );
});

export { ProfileDropdown };
export default ProfileDropdown;