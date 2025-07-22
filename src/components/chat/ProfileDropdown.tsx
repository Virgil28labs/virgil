import { memo, useState, useCallback, useEffect } from 'react';
import './ProfileDropdown.css';

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

  // Handle save with dropdown close
  const handleSave = useCallback(() => {
    onSystemPromptSave();
    setShowDropdown(false);
  }, [onSystemPromptSave]);

  // Handle reset to default
  const handleReset = useCallback(() => {
    const defaultPrompt = 'You are Virgil, a helpful assistant that provides contextual help and can search the web for current information.';
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
      if (showDropdown && !(event.target as Element)?.closest('.profile-selector')) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [showDropdown]);

  return (
    <div className="profile-selector">
      <button 
        className="status-pill edit-pill"
        onClick={() => setShowDropdown(!showDropdown)}
        title="System Prompt Editor"
        aria-expanded={showDropdown}
        aria-haspopup="menu"
      >
        ⚙️ EDIT
      </button>
      
      {showDropdown && (
        <div className="profile-dropdown" role="menu">
          <div className="profile-section">
            <div className="section-title">System Prompt Editor</div>
            <textarea
              value={customSystemPrompt}
              onChange={(e) => onSystemPromptChange(e.target.value)}
              placeholder="Enter custom system prompt for Virgil..."
              className="chatbot-prompt-textarea"
              rows={6}
            />
            
            <div className="chatbot-prompt-actions">
              <button 
                className="chatbot-prompt-btn save"
                onClick={handleSave}
              >
                💾 Save
              </button>
              <button 
                className="chatbot-prompt-btn reset"
                onClick={handleReset}
              >
                🔄 Default
              </button>
            </div>
            
            <div className="chatbot-prompt-info">
              <small>
                Length: {customSystemPrompt.length} characters
                {customSystemPrompt && (
                  <span className="prompt-active"> • Custom prompt active</span>
                )}
              </small>
            </div>
          </div>

          <div className="profile-section">
            <div className="section-title">Chat Actions</div>
            <button
              className="profile-action"
              onClick={handleClear}
              role="menuitem"
            >
              <span className="action-icon">🗑️</span>
              Clear Chat History
            </button>
            <button
              className="profile-action"
              onClick={handleExport}
              disabled={messageCount === 0}
              role="menuitem"
            >
              <span className="action-icon">💾</span>
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