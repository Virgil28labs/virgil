import { memo, useRef, useEffect } from 'react';
import { ChatMessage } from '../../types/chat.types';
import { StoredConversation } from '../../services/MemoryService';
import { SkeletonLoader } from '../SkeletonLoader';
import { User } from '../../types/auth.types';
import './ChatMessages.css';

interface ChatMessagesProps {
  messages: ChatMessage[];
  isTyping: boolean;
  error: string | null;
  onErrorDismiss: () => void;
  onMarkAsImportant: (message: ChatMessage) => void;
  
  // Welcome message data
  user: User | null;
  lastConversation: StoredConversation | null;
}

const ChatMessages = memo(function ChatMessages({
  messages,
  isTyping,
  error,
  onErrorDismiss,
  onMarkAsImportant,
  user,
  lastConversation,
}: ChatMessagesProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isTyping]);

  const renderWelcomeMessage = () => (
    <div className="welcome-msg">
      <div className="msg-avatar" aria-hidden="true">
        <span className="chatbot-avatar-v">V</span>
      </div>
      <div className="welcome-message-bubble" role="status">
        {lastConversation ? (
          <>
            Welcome back, {user?.user_metadata?.name || 'there'}! 
            {lastConversation.timestamp && (Date.now() - lastConversation.timestamp) < 24 * 60 * 60 * 1000 && (
              <> I remember our chat about "{lastConversation.firstMessage}"</>
            )}
          </>
        ) : (
          <>Good afternoon, {user?.user_metadata?.name || 'there'}!</>
        )}
      </div>
    </div>
  );

  const renderMessage = (message: ChatMessage) => (
    <div
      key={message.id}
      className={`message ${message.role === 'user' ? 'user-msg' : 'assistant-msg'}`}
      role="article"
      aria-label={`${message.role === 'user' ? 'Your message' : 'Virgil\'s response'}`}
    >
      {message.role === 'assistant' && (
        <div className="msg-avatar" aria-hidden="true">
          <span className="chatbot-avatar-v">V</span>
        </div>
      )}
      <div className="msg-content" role="text">
        {message.content}
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

  const renderTypingIndicator = () => (
    <div className="message assistant-msg" role="status" aria-label="Virgil is typing">
      <div className="msg-avatar" aria-hidden="true">
        <span className="chatbot-avatar-v">V</span>
      </div>
      <div className="msg-content">
        <SkeletonLoader width="80%" height="16px" />
        <div className="typing-status">
          <span className="typing-indicator">💭 Thinking...</span>
        </div>
        <span className="sr-only">Virgil is typing a response</span>
      </div>
    </div>
  );

  const renderError = () => (
    <div className="error-msg">
      <span>⚠️ {error}</span>
      <button onClick={onErrorDismiss} aria-label="Dismiss error">✕</button>
    </div>
  );

  return (
    <div 
      className="messages-area" 
      role="log" 
      aria-label="Chat messages"
      aria-live="polite"
      aria-atomic="false"
    >
      {/* Welcome message when no messages */}
      {messages.length === 0 && renderWelcomeMessage()}

      {/* Chat messages */}
      {messages.map(renderMessage)}

      {/* Typing indicator */}
      {isTyping && renderTypingIndicator()}

      {/* Error message */}
      {error && renderError()}

      {/* Scroll anchor */}
      <div ref={messagesEndRef} />
    </div>
  );
});

export { ChatMessages };
export default ChatMessages;