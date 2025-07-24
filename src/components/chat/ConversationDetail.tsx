import { memo, useCallback, useState } from 'react';
import { StoredConversation } from '../../services/MemoryService';
import { ChatMessage } from '../../types/chat.types';
import { FormattedText } from '../../utils/textFormatter';
import { logger } from '../../lib/logger';
import { useUserProfile } from '../../hooks/useUserProfile';
import './ConversationDetail.css';

interface ConversationDetailProps {
  conversation: StoredConversation;
  onBack: () => void;
  onMarkAsImportant: (message: ChatMessage) => void;
}

const ConversationDetail = memo(function ConversationDetail({
  conversation,
  onBack,
  onMarkAsImportant,
}: ConversationDetailProps) {
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const { profile } = useUserProfile();

  // Handle copy message
  const handleCopyMessage = useCallback(async (message: ChatMessage) => {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopiedMessageId(message.id);
      setTimeout(() => setCopiedMessageId(null), 2000);
    } catch (error) {
      logger.error('Failed to copy message', error as Error, {
        component: 'ConversationDetail',
        action: 'handleCopyMessage',
      });
    }
  }, []);

  // Handle export conversation
  const handleExportConversation = useCallback(() => {
    const conversationData = {
      exportedAt: new Date().toISOString(),
      conversation: {
        timestamp: conversation.timestamp,
        messageCount: conversation.messageCount,
        messages: conversation.messages,
      },
    };
    
    const blob = new Blob([JSON.stringify(conversationData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `conversation-${new Date(conversation.timestamp).toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [conversation]);

  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  return (
    <div className="conversation-detail">
      <div className="conversation-detail-header">
        <button
          className="back-button"
          onClick={onBack}
          aria-label="Back to conversations list"
        >
          ← Back
        </button>
        <div className="conversation-info">
          <h3>Conversation History</h3>
          <div className="conversation-stats">
            <span>{conversation.messageCount} messages</span>
            <span>•</span>
            <span>{formatTimestamp(conversation.timestamp)}</span>
          </div>
        </div>
        <button
          className="export-button"
          onClick={handleExportConversation}
          title="Download conversation"
        >
          ⬇️
        </button>
      </div>

      <div className="conversation-messages">
        {conversation.messages.map((message) => (
          <div
            key={message.id}
            className={`conversation-message ${message.role === 'user' ? 'user-message' : 'assistant-message'}`}
          >
            {message.role === 'assistant' && (
              <div className="message-avatar">
                <span className="chatbot-avatar-v">V</span>
              </div>
            )}
            
            {message.role === 'user' && (
              <div className="user-avatar">
                <span className="user-avatar-initial">U</span>
              </div>
            )}
            
            <div className="message-wrapper">
              <div className="message-sender">
                {message.role === 'user' ? (profile.nickname || 'You') : 'Virgil'}
              </div>
              <div className="message-content">
                <FormattedText content={message.content} />
              
                <div className="message-actions">
                  <button
                    className="message-action-btn"
                    onClick={() => onMarkAsImportant(message)}
                    title="Mark as important"
                    aria-label="Mark this message as important"
                  >
                    💡
                  </button>
                  
                  <button
                    className="message-action-btn"
                    onClick={() => handleCopyMessage(message)}
                    title={copiedMessageId === message.id ? "Copied!" : "Copy message"}
                    aria-label="Copy message to clipboard"
                  >
                    {copiedMessageId === message.id ? '✓' : '📋'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
});

export { ConversationDetail };
export default ConversationDetail;