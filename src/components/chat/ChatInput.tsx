import React, { memo, useRef, useEffect, useCallback } from 'react';
import type { DashboardContext } from '../../services/DashboardContextService';
import './chat-interface.css';

interface ChatInputProps {
  input: string;
  onInputChange: (value: string) => void;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  isTyping: boolean;
  error: string | null;

  // Quick actions
  onQuickAction: (action: string) => void;
  showQuickActions: boolean;
  dashboardContext: DashboardContext | null;

  // Focus management
  shouldFocus: boolean;
  externalInputRef?: React.RefObject<HTMLInputElement | null>;
}

const ChatInput = memo(function ChatInput({
  input,
  onInputChange,
  onSubmit,
  onKeyDown,
  isTyping,
  error,
  onQuickAction,
  showQuickActions,
  dashboardContext,
  shouldFocus,
  externalInputRef,
}: ChatInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const activeRef = externalInputRef || inputRef;

  // Focus management
  useEffect(() => {
    if (shouldFocus && activeRef.current) {
      setTimeout(() => activeRef.current?.focus(), 100);
    }
  }, [shouldFocus, activeRef]);

  // Generate quick actions based on context
  const generateQuickActions = useCallback(() => {
    const baseActions = [
      'Tell me about Virgil',
      'How do I use this app?',
      'What can you do?',
    ];

    // Add contextual quick actions based on current state
    const contextualActions: string[] = [];

    if (dashboardContext) {
      // Add time-based quick actions
      if (dashboardContext.timeOfDay === 'morning') {
        contextualActions.push('What\'s the plan for today?');
      } else if (dashboardContext.timeOfDay === 'evening') {
        contextualActions.push('How was my day?');
      }

      // Add weather-based quick actions
      if (dashboardContext.weather.hasData) {
        contextualActions.push('What\'s the weather like?');
      }

      // Add location-based quick actions
      if (dashboardContext.location.hasGPS) {
        contextualActions.push('What\'s nearby?');
      }
    }

    // Combine and limit to 4 total actions
    return [...contextualActions.slice(0, 2), ...baseActions].slice(0, 4);
  }, [dashboardContext]);

  const quickActions = generateQuickActions();

  const renderQuickActions = () => (
    <div className="quick-actions">
      <div className="quick-title">Quick help:</div>
      {quickActions.map((action, index) => (
        <button
          key={index}
          className="quick-btn"
          onClick={() => onQuickAction(action)}
          data-keyboard-nav
          aria-label={`Quick action: ${action}`}
        >
          {action}
        </button>
      ))}
    </div>
  );

  return (
    <>
      {/* Quick Actions - shown when no messages */}
      {showQuickActions && renderQuickActions()}

      {/* Input Form */}
      <form onSubmit={onSubmit} className="input-area" role="form">
        <div className="input-wrapper">
          <label htmlFor="chat-input" className="sr-only">Type your message to Virgil</label>
          <input
            ref={activeRef}
            id="chat-input"
            type="text"
            value={input}
            onChange={(e) => onInputChange(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Type your message..."
            disabled={isTyping}
            className="msg-input"
            aria-label="Type your message to Virgil"
            aria-describedby={error ? 'chat-error' : undefined}
            autoComplete="off"
          />
          <button
            type="submit"
            disabled={!input.trim() || isTyping}
            className="send-btn"
            title="Send message"
            aria-label={isTyping ? 'Sending message' : 'Send message'}
          >
            {isTyping ? '•••' : '➤'}
          </button>
        </div>
      </form>
    </>
  );
});

export { ChatInput };
export default ChatInput;
