import { memo, useCallback } from 'react';
import type { StoredConversation } from '../../services/MemoryService';
import { formatTimestamp } from '../../utils/dateFormatter';

interface ConversationHeaderProps {
  conversation: StoredConversation;
  onBack: () => void;
}

const ConversationHeader = memo(function ConversationHeader({
  conversation,
  onBack,
}: ConversationHeaderProps) {
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

  return (
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
  );
});

export { ConversationHeader };
export default ConversationHeader;