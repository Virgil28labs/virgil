import { memo } from 'react';
import type { ChatMessage } from '../../types/chat.types';
import { FormattedText } from '../../utils/textFormatter';
import { MessageActions } from './MessageActions';

interface MessageItemProps {
  message: ChatMessage;
  userNickname?: string;
  onMarkAsImportant: (message: ChatMessage) => void;
}

const MessageItem = memo(function MessageItem({
  message,
  userNickname = 'You',
  onMarkAsImportant,
}: MessageItemProps) {

  return (
    <div
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
          {message.role === 'user' ? userNickname : 'Virgil'}
        </div>
        <div className="message-content">
          <FormattedText content={message.content} />
          <MessageActions 
            message={message}
            onMarkAsImportant={onMarkAsImportant}
          />
        </div>
      </div>
    </div>
  );
});

export { MessageItem };
export default MessageItem;