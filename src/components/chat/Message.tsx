import { memo, useCallback, useState } from 'react';
import type { ChatMessage } from '../../types/chat.types';
import { FormattedText } from '../FormattedText';
import { toastService } from '../../services/ToastService';
import { dashboardContextService } from '../../services/DashboardContextService';
import { timeService } from '../../services/TimeService';
import './message-components.css';

interface MessageProps {
  message: ChatMessage;
  userNickname?: string;
  onMarkAsImportant: (message: ChatMessage) => void;
  showExtendedActions?: boolean;
  variant?: 'chat' | 'conversation'; // For different styling contexts
}

const Message = memo(function Message({
  message,
  userNickname = 'You',
  onMarkAsImportant,
  showExtendedActions = false,
  variant = 'chat',
}: MessageProps) {
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);

  const handleCopyMessage = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopiedMessageId(message.id);
      setTimeout(() => setCopiedMessageId(null), 2000);
      toastService.success('Message copied to clipboard');
    } catch (_error) {
      toastService.error('Failed to copy message to clipboard');
    }
  }, [message.id, message.content]);

  const handleShareMessage = useCallback(async () => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: 'Virgil Chat Message',
          text: message.content,
        });
        toastService.success('Message shared successfully');
      } else {
        // Fallback to copying
        await handleCopyMessage();
      }
    } catch (_error) {
      // User cancelled share or error occurred
      if (_error instanceof Error && _error.name !== 'AbortError') {
        toastService.error('Failed to share message');
      }
    }
  }, [message.content, handleCopyMessage]);

  const handleExportMessage = useCallback(() => {
    const now = dashboardContextService.getCurrentDateTime();
    const messageData = {
      id: message.id,
      role: message.role,
      content: message.content,
      timestamp: message.timestamp || dashboardContextService.getTimestamp(),
      exportedAt: timeService.toISOString(now),
    };

    const blob = new Blob([JSON.stringify(messageData, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `message-${message.id}-${dashboardContextService.getLocalDate()}.json`;
    a.click();
    URL.revokeObjectURL(url);

    toastService.success('Message exported successfully');
  }, [message]);

  const handleQuoteMessage = useCallback(() => {
    const quotedText = `> ${message.content.split('\n').join('\n> ')}\n\n`;

    // Try to find and focus the chat input
    const chatInput = document.querySelector('input[placeholder*="Type your message"]') as HTMLInputElement;
    if (chatInput) {
      const currentValue = chatInput.value;
      chatInput.value = currentValue ? `${currentValue}\n\n${quotedText}` : quotedText;
      chatInput.focus();
      // Move cursor to end
      chatInput.setSelectionRange(chatInput.value.length, chatInput.value.length);

      // Trigger input event for React
      const event = new Event('input', { bubbles: true });
      chatInput.dispatchEvent(event);

      toastService.success('Message quoted in input');
    } else {
      // Fallback to clipboard
      navigator.clipboard.writeText(quotedText);
      toastService.success('Quoted text copied to clipboard');
    }
  }, [message.content]);

  const toggleExpanded = useCallback(() => {
    setIsExpanded(!isExpanded);
  }, [isExpanded]);

  // Different class names based on variant
  const messageClass = variant === 'chat'
    ? `message ${message.role === 'user' ? 'user-msg' : 'assistant-msg'}`
    : `conversation-message ${message.role === 'user' ? 'user' : 'assistant'}`;

  const renderChatVariant = () => (
    <div
      key={message.id}
      className={messageClass}
      role="article"
      aria-label={`${message.role === 'user' ? 'Your message' : 'Virgil\'s response'}`}
    >
      {message.role === 'assistant' && (
        <div className="msg-avatar" aria-hidden="true">
          <span className="chatbot-avatar-v">V</span>
        </div>
      )}
      <div className="msg-content" role="text">
        <FormattedText content={message.content} />
        <button
          className="remember-btn"
          onClick={() => onMarkAsImportant(message)}
          title="Remember this message"
          aria-label="Mark this message as important"
        >
          💡
        </button>
      </div>
    </div>
  );

  const renderConversationVariant = () => (
    <div className={messageClass}>
      <div className="message-meta">
        <span className="message-role">{message.role === 'user' ? userNickname : 'Virgil'}</span>
        {message.timestamp && (
          <span className="message-timestamp">
            {new Intl.DateTimeFormat('en-US', {
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
            }).format(timeService.parseDate(message.timestamp) || timeService.getCurrentDateTime())}
          </span>
        )}
      </div>
      <div className="message-content">
        <FormattedText content={message.content} />
      </div>
      <div className="message-actions">
        {/* Primary actions - always visible */}
        <div className="primary-actions">
          <button
            className={'message-action-btn copy-action'}
            onClick={handleCopyMessage}
            title={copiedMessageId === message.id ? 'Copied!' : 'Copy message'}
            aria-label={copiedMessageId === message.id ? 'Copied!' : 'Copy message'}
          >
            {copiedMessageId === message.id ? '✓' : '📋'}
          </button>
          <button
            className="message-action-btn important-action"
            onClick={() => onMarkAsImportant(message)}
            title="Mark as important"
            aria-label="Mark as important"
          >
            💡
          </button>
        </div>

        {/* Extended actions */}
        {(showExtendedActions || isExpanded) && (
          <div className="extended-actions">
            <button
              className="message-action-btn share-action"
              onClick={handleShareMessage}
              title="Share message"
              aria-label="Share message"
            >
              📤
            </button>
            <button
              className="message-action-btn quote-action"
              onClick={handleQuoteMessage}
              title="Quote message"
              aria-label="Quote message"
            >
              💬
            </button>
            <button
              className="message-action-btn export-action"
              onClick={handleExportMessage}
              title="Export message"
              aria-label="Export message"
            >
              💾
            </button>
          </div>
        )}

        {/* More actions button for mobile/compact mode */}
        {!showExtendedActions && (
          <button
            className="message-action-btn more-actions"
            onClick={toggleExpanded}
            title={isExpanded ? 'Hide actions' : 'More actions'}
            aria-label={isExpanded ? 'Hide actions' : 'More actions'}
            aria-expanded={isExpanded}
          >
            {isExpanded ? '⋯' : '⋯'}
          </button>
        )}
      </div>
    </div>
  );

  return variant === 'chat' ? renderChatVariant() : renderConversationVariant();
});

export { Message };
export default Message;
