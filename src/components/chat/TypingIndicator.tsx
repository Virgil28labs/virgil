import { memo } from 'react';
import './message-components.css';

interface TypingIndicatorProps {
  isVisible: boolean;
  message?: string;
}

const TypingIndicator = memo(function TypingIndicator({
  isVisible,
  message = 'Virgil is thinking...',
}: TypingIndicatorProps) {
  if (!isVisible) return null;

  return (
    <div className="typing-indicator" role="status" aria-live="polite">
      <div className="typing-message">
        <div className="message-avatar">
          <span className="chatbot-avatar-v">V</span>
        </div>
        <div className="typing-content">
          <div className="typing-text">{message}</div>
          <div className="typing-dots">
            <span className="dot dot-1"></span>
            <span className="dot dot-2"></span>
            <span className="dot dot-3"></span>
          </div>
        </div>
      </div>
    </div>
  );
});

export { TypingIndicator };
export default TypingIndicator;