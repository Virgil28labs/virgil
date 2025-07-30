import { memo, useEffect, useState } from 'react';
import type { ChatMessage } from '../../types/chat.types';
import { vectorMemoryService } from '../../services/VectorMemoryService';
import { Message } from './Message';
import { logger } from '../../lib/logger';
import { useUserProfile } from '../../hooks/useUserProfile';

interface RecentMessagesTabProps {
  onMarkAsImportant: (message: ChatMessage) => void;
}

const RecentMessagesTab = memo(function RecentMessagesTab({
  onMarkAsImportant,
}: RecentMessagesTabProps) {
  const [recentMessages, setRecentMessages] = useState<ChatMessage[]>([]);
  const [isLoadingMessages, setIsLoadingMessages] = useState(true);
  const { profile } = useUserProfile();

  useEffect(() => {
    const loadRecentMessages = async () => {
      try {
        setIsLoadingMessages(true);
        const messages = await vectorMemoryService.getRecentMessages(30);
        setRecentMessages(messages);
      } catch (error) {
        logger.error('Failed to load recent messages', error as Error, {
          component: 'RecentMessagesTab',
          action: 'loadRecentMessages',
        });
      } finally {
        setIsLoadingMessages(false);
      }
    };

    loadRecentMessages();
  }, []);

  if (isLoadingMessages) {
    return (
      <div className="recent-messages-loading">
        <span className="loading-spinner">⏳</span>
        Loading recent messages...
      </div>
    );
  }

  return (
    <div className="recent-messages-tab">
      <div className="recent-messages-info">
        <p className="save-indicator">
          <span className="status-icon">●</span>
          <strong>All messages are automatically saved to the cloud</strong>
        </p>
        <p className="sync-info">Your conversations sync instantly across all devices</p>
      </div>

      <div className="recent-messages-list">
        {recentMessages.length === 0 ? (
          <div className="messages-empty">
            <p>No messages yet. Start a conversation and they'll appear here!</p>
          </div>
        ) : (
          <>
            <div className="messages-header">
              <span className="message-count">Showing last {recentMessages.length} messages</span>
            </div>
            <div className="messages-container">
              {recentMessages.map((message) => (
                <Message
                  key={message.id}
                  message={message}
                  userNickname={profile.nickname || 'You'}
                  onMarkAsImportant={onMarkAsImportant}
                  variant="conversation"
                  showExtendedActions={message.role === 'assistant'}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
});

export { RecentMessagesTab };
export default RecentMessagesTab;