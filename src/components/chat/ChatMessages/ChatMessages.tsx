import { memo, useRef, useEffect, useCallback } from 'react';
import type { ChatMessage } from '../../../types/chat.types';
import type { StoredConversation } from '../../../services/SupabaseMemoryService';
import type { User } from '../../../types/auth.types';
import { FormattedText } from '../../FormattedText';
import { timeService } from '../../../services/TimeService';
import styles from './ChatMessages.module.css';

interface ChatMessagesProps {
  messages: ChatMessage[];
  error: string | null;
  onErrorDismiss: () => void;
  onMarkAsImportant: (message: ChatMessage) => void;

  // Welcome message data
  user: User | null;
  lastConversation: StoredConversation | null;

  // Simple loading state
  isTyping: boolean;
}

const ChatMessages = memo(function ChatMessages({
  messages,
  error,
  onErrorDismiss,
  onMarkAsImportant,
  user,
  lastConversation,
  isTyping,
}: ChatMessagesProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isTyping]);

  const renderWelcomeMessage = useCallback(() => (
    <div className={styles.welcomeMessage}>
      <div className={styles.avatar} aria-hidden="true">
        <span className={styles.avatarLetter}>V</span>
      </div>
      <div className={styles.welcomeBubble} role="status">
        {lastConversation ? (
          <>
            Welcome back, {user?.user_metadata?.name || 'there'}!
            {lastConversation.timestamp && (timeService.getTimestamp() - lastConversation.timestamp) < 24 * 60 * 60 * 1000 && (
              <> I remember our chat about "{lastConversation.firstMessage}"</>
            )}
          </>
        ) : (
          <>Good afternoon, {user?.user_metadata?.name || 'there'}!</>
        )}
      </div>
    </div>
  ), [lastConversation, user]);

  const renderMessage = useCallback((message: ChatMessage) => (
    <div
      key={message.id}
      className={message.role === 'user' ? styles.userMessage : styles.assistantMessage}
      role="article"
      aria-label={`${message.role === 'user' ? 'Your message' : 'Virgil\'s response'}`}
    >
      {message.role === 'assistant' && (
        <div className={styles.avatar} aria-hidden="true">
          <span className={styles.avatarLetter}>V</span>
        </div>
      )}
      <div className={styles.messageContent} role="text">
        <FormattedText content={message.content} />
        <button
          className={styles.rememberButton}
          onClick={() => onMarkAsImportant(message)}
          title="Remember this message"
          aria-label="Mark this message as important"
        >
          💡
        </button>
      </div>
    </div>
  ), [onMarkAsImportant]);

  const renderError = useCallback(() => (
    <div className={styles.errorMessage}>
      <span>⚠️ {error}</span>
      <button 
        className={styles.errorDismiss}
        onClick={onErrorDismiss} 
        aria-label="Dismiss error"
      >
        ✕
      </button>
    </div>
  ), [error, onErrorDismiss]);

  return (
    <div
      className={styles.messagesArea}
      role="log"
      aria-label="Chat messages"
      aria-live="polite"
      aria-atomic="false"
    >
      {/* Welcome message when no messages */}
      {messages.length === 0 && renderWelcomeMessage()}

      {/* Chat messages */}
      {messages.map(renderMessage)}

      {/* Ultra-minimal thinking indicator */}
      {isTyping && <div className={styles.typingIndicator}>💭</div>}

      {/* Error message */}
      {error && renderError()}

      {/* Scroll anchor */}
      <div ref={messagesEndRef} />
    </div>
  );
});

export { ChatMessages };
export default ChatMessages;