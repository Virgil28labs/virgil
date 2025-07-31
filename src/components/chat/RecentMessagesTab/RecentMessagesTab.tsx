import { memo, useEffect, useState } from 'react';
import type { ChatMessage } from '../../../types/chat.types';
import { vectorMemoryService } from '../../../services/VectorMemoryService';
import { Message } from '../Message/Message';
import styles from './RecentMessagesTab.module.css';
import { logger } from '../../../lib/logger';
import { useUserProfile } from '../../../hooks/useUserProfile';

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
      <div className={styles.recentMessagesLoading}>
        <span className={styles.loadingSpinner}>⏳</span>
        Loading recent messages...
      </div>
    );
  }

  return (
    <div className={styles.recentMessagesTab}>
      <div className={styles.recentMessagesInfo}>
        <p className={styles.saveIndicator}>
          <span className={styles.statusIcon}>●</span>
          <strong>All messages are automatically saved to the cloud</strong>
        </p>
        <p className={styles.syncInfo}>Your conversations sync instantly across all devices</p>
      </div>

      <div className={styles.recentMessagesList}>
        {recentMessages.length === 0 ? (
          <div className={styles.messagesEmpty}>
            <p>No messages yet. Start a conversation and they'll appear here!</p>
          </div>
        ) : (
          <>
            <div className={styles.messagesHeader}>
              <span className={styles.messageCount}>Showing last {recentMessages.length} messages</span>
            </div>
            <div className={styles.messagesContainer}>
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