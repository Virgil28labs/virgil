import { memo } from 'react';
import './message-components.css';

interface MessageLoadingStateProps {
  type: 'generating' | 'processing' | 'thinking' | 'searching';
  progress?: number; // 0-100 for progress indication
}

const MessageLoadingState = memo(function MessageLoadingState({
  type,
  progress,
}: MessageLoadingStateProps) {
  const getLoadingText = () => {
    switch (type) {
      case 'generating':
        return 'Generating response...';
      case 'processing':
        return 'Processing your request...';
      case 'thinking':
        return 'Thinking about your question...';
      case 'searching':
        return 'Searching through memory...';
      default:
        return 'Working...';
    }
  };

  const getLoadingIcon = () => {
    switch (type) {
      case 'generating':
        return '✨';
      case 'processing':
        return '⚙️';
      case 'thinking':
        return '🤔';
      case 'searching':
        return '🔍';
      default:
        return '⏳';
    }
  };

  return (
    <div className="message-loading-state" role="status" aria-live="polite">
      <div className="loading-message">
        <div className="message-avatar">
          <span className="chatbot-avatar-v">V</span>
        </div>
        <div className="loading-content">
          <div className="loading-header">
            <span className="loading-icon">{getLoadingIcon()}</span>
            <span className="loading-text">{getLoadingText()}</span>
          </div>
          
          {progress !== undefined && (
            <div className="loading-progress">
              <div className="progress-bar">
                <div 
                  className="progress-fill"
                  style={{ width: `${Math.max(0, Math.min(100, progress))}%` }}
                />
              </div>
              <span className="progress-text">{Math.round(progress)}%</span>
            </div>
          )}
          
          <div className="loading-animation">
            <div className="pulse-dot pulse-1"></div>
            <div className="pulse-dot pulse-2"></div>
            <div className="pulse-dot pulse-3"></div>
          </div>
        </div>
      </div>
    </div>
  );
});

export { MessageLoadingState };
export default MessageLoadingState;