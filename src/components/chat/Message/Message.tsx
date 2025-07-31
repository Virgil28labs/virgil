import { memo, useCallback, useState } from 'react';
import type { ChatMessage } from '../../../types/chat.types';
import { FormattedText } from '../../FormattedText';
import { toastService } from '../../../services/ToastService';
import { dashboardContextService } from '../../../services/DashboardContextService';
import { timeService } from '../../../services/TimeService';
import styles from './Message.module.css';

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
    ? message.role === 'user' ? styles.userMsg : styles.assistantMsg
    : `${styles.conversationMessage} ${message.role === 'user' ? styles.user : styles.assistant}`;

  const renderChatVariant = () => (
    <div
      key={message.id}
      className={messageClass}
      role="article"
      aria-label={`${message.role === 'user' ? 'Your message' : 'Virgil\'s response'}`}
    >
      {message.role === 'assistant' && (
        <div className={styles.msgAvatar} aria-hidden="true">
          <span className={styles.chatbotAvatarV}>V</span>
        </div>
      )}
      <div className={styles.msgContent} role="text">
        <FormattedText content={message.content} />
        {message.role === 'assistant' && message.confidence !== undefined && (
          <span 
            className={`${styles.confidenceIndicator} ${
              message.confidence >= 0.8 ? styles.confidenceHigh : 
                message.confidence >= 0.7 ? styles.confidenceMedium : styles.confidenceLow
            }`}
            title={`Confidence: ${Math.round(message.confidence * 100)}%`}
            aria-label={`Confidence: ${Math.round(message.confidence * 100)}%`}
          >
            {message.confidence >= 0.8 ? '✓' : 
              message.confidence >= 0.7 ? '?' : '⚠'}
          </span>
        )}
        <button
          className={styles.rememberBtn}
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
      <div className={styles.messageMeta}>
        <span className={styles.messageRole}>{message.role === 'user' ? userNickname : 'Virgil'}</span>
        {message.timestamp && (
          <span className={styles.messageTimestamp}>
            {new Intl.DateTimeFormat('en-US', {
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
            }).format(timeService.parseDate(message.timestamp) || timeService.getCurrentDateTime())}
          </span>
        )}
        {message.role === 'assistant' && message.confidence !== undefined && (
          <span 
            className={`${styles.confidenceIndicator} ${
              message.confidence >= 0.8 ? styles.confidenceHigh : 
                message.confidence >= 0.7 ? styles.confidenceMedium : styles.confidenceLow
            }`}
            title={`Confidence: ${Math.round(message.confidence * 100)}%`}
            aria-label={`Confidence: ${Math.round(message.confidence * 100)}%`}
          >
            {message.confidence >= 0.8 ? '✓' : 
              message.confidence >= 0.7 ? '?' : '⚠'}
          </span>
        )}
      </div>
      <div className={styles.messageContent}>
        <FormattedText content={message.content} />
      </div>
      <div className={styles.messageActions}>
        {/* Primary actions - always visible */}
        <div className={styles.primaryActions}>
          <button
            className={`${styles.messageActionButton} ${styles.copyAction}`}
            onClick={handleCopyMessage}
            title={copiedMessageId === message.id ? 'Copied!' : 'Copy message'}
            aria-label={copiedMessageId === message.id ? 'Copied!' : 'Copy message'}
          >
            {copiedMessageId === message.id ? '✓' : '📋'}
          </button>
          <button
            className={`${styles.messageActionButton} ${styles.importantAction}`}
            onClick={() => onMarkAsImportant(message)}
            title="Mark as important"
            aria-label="Mark as important"
          >
            💡
          </button>
        </div>

        {/* Extended actions */}
        {(showExtendedActions || isExpanded) && (
          <div className={`${styles.extendedActions} ${isExpanded ? styles.expanded : ''}`}>
            <button
              className={`${styles.messageActionButton} ${styles.shareAction}`}
              onClick={handleShareMessage}
              title="Share message"
              aria-label="Share message"
            >
              📤
            </button>
            <button
              className={`${styles.messageActionButton} ${styles.quoteAction}`}
              onClick={handleQuoteMessage}
              title="Quote message"
              aria-label="Quote message"
            >
              💬
            </button>
            <button
              className={`${styles.messageActionButton} ${styles.exportAction}`}
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
            className={`${styles.messageActionButton} ${styles.moreActions}`}
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