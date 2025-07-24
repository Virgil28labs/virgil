import { memo } from 'react';
import type { StoredConversation } from '../../services/MemoryService';
import type { ChatMessage } from '../../types/chat.types';
import { useUserProfile } from '../../hooks/useUserProfile';
import { ConversationHeader } from './ConversationHeader';
import { MessageItem } from './MessageItem';
import './memory-modals.css';

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
  const { profile } = useUserProfile();

  return (
    <div className="conversation-detail">
      <ConversationHeader 
        conversation={conversation} 
        onBack={onBack} 
      />

      <div className="conversation-messages">
        {conversation.messages.map((message) => (
          <MessageItem
            key={message.id}
            message={message}
            userNickname={profile.nickname || 'You'}
            onMarkAsImportant={onMarkAsImportant}
          />
        ))}
      </div>
    </div>
  );
});

export { ConversationDetail };
export default ConversationDetail;