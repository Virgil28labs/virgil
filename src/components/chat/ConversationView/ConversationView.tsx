import { memo, useCallback } from 'react';
import type { StoredConversation } from '../../../services/SupabaseMemoryService';
import type { ChatMessage } from '../../../types/chat.types';
import { useUserProfile } from '../../../hooks/useUserProfile';
import { dashboardContextService } from '../../../services/DashboardContextService';
import { timeService } from '../../../services/TimeService';
import { Message } from '../Message/Message';
import styles from './ConversationView.module.css';

interface ConversationViewProps {
  conversation: StoredConversation;
  onBack: () => void;
  onMarkAsImportant: (message: ChatMessage) => void;
}

const ConversationView = memo(function ConversationView({
  conversation,
  onBack,
  onMarkAsImportant,
}: ConversationViewProps) {
  const { profile } = useUserProfile();

  const handleExportConversation = useCallback(() => {
    const now = dashboardContextService.getCurrentDateTime();
    const conversationData = {
      exportedAt: timeService.toISOString(now),
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
    // Format conversation timestamp as local date for filename
    const conversationDate = timeService.fromTimestamp(conversation.timestamp);
    const dateStr = dashboardContextService.formatDateToLocal(conversationDate);
    a.download = `conversation-${dateStr}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [conversation]);

  return (
    <div className={styles.conversationDetail}>
      {/* Header */}
      <div className={styles.conversationDetailHeader}>
        <button
          className={styles.backButton}
          onClick={onBack}
          aria-label="Back to conversations list"
        >
          ← Back
        </button>
        <div className={styles.conversationInfo}>
          <h3>Conversation History</h3>
          <div className={styles.conversationStats}>
            <span className={styles.statItem}>
              <span role="img" aria-label="messages">💬</span> {conversation.messageCount} messages
            </span>
            <span className={styles.statItem}>
              <span role="img" aria-label="time">🕐</span> {timeService.formatDateTimeToLocal(timeService.fromTimestamp(conversation.timestamp))}
            </span>
          </div>
        </div>
        <button
          className={styles.exportButton}
          onClick={handleExportConversation}
          title="Download conversation"
          aria-label="Download conversation"
        >
          ⬇️
        </button>
      </div>

      {/* Messages */}
      <div className={styles.conversationMessages}>
        {conversation.messages.map((message) => (
          <Message
            key={message.id}
            message={message}
            userNickname={profile.nickname || 'You'}
            onMarkAsImportant={onMarkAsImportant}
            variant="conversation"
            showExtendedActions
          />
        ))}
      </div>
    </div>
  );
});

export { ConversationView };
export default ConversationView;