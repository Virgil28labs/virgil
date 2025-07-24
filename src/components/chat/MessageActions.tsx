import { memo, useCallback, useState } from 'react';
import type { ChatMessage } from '../../types/chat.types';
import { toastService } from '../../services/ToastService';
import './message-components.css';

interface MessageActionsProps {
  message: ChatMessage;
  onMarkAsImportant: (message: ChatMessage) => void;
  showExtended?: boolean;
}

const MessageActions = memo(function MessageActions({
  message,
  onMarkAsImportant,
  showExtended = false,
}: MessageActionsProps) {
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);

  const handleCopyMessage = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopiedMessageId(message.id);
      setTimeout(() => setCopiedMessageId(null), 2000);
      toastService.success('Message copied to clipboard');
    } catch (error) {
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
    } catch (error) {
      // User cancelled share or error occurred
      if (error instanceof Error && error.name !== 'AbortError') {
        toastService.error('Failed to share message');
      }
    }
  }, [message.content, handleCopyMessage]);

  const handleExportMessage = useCallback(() => {
    const messageData = {
      id: message.id,
      role: message.role,
      content: message.content,
      timestamp: message.timestamp || Date.now(),
      exportedAt: new Date().toISOString(),
    };

    const blob = new Blob([JSON.stringify(messageData, null, 2)], { 
      type: 'application/json' 
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `message-${message.id}-${new Date().toISOString().split('T')[0]}.json`;
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

  const primaryActions = [
    {
      icon: copiedMessageId === message.id ? '✓' : '📋',
      label: copiedMessageId === message.id ? 'Copied!' : 'Copy message',
      onClick: handleCopyMessage,
      className: 'copy-action',
    },
    {
      icon: '💡',
      label: 'Mark as important',
      onClick: () => onMarkAsImportant(message),
      className: 'important-action',
    },
  ];

  const extendedActions = [
    {
      icon: '📤',
      label: 'Share message',
      onClick: handleShareMessage,
      className: 'share-action',
    },
    {
      icon: '💬',
      label: 'Quote message',
      onClick: handleQuoteMessage,
      className: 'quote-action',
    },
    {
      icon: '💾',
      label: 'Export message',
      onClick: handleExportMessage,
      className: 'export-action',
    },
  ];

  const toggleExpanded = useCallback(() => {
    setIsExpanded(!isExpanded);
  }, [isExpanded]);

  return (
    <div className="message-actions">
      {/* Primary actions - always visible */}
      <div className="primary-actions">
        {primaryActions.map((action) => (
          <button
            key={action.label}
            className={`message-action-btn ${action.className}`}
            onClick={action.onClick}
            title={action.label}
            aria-label={action.label}
          >
            {action.icon}
          </button>
        ))}
      </div>

      {/* Extended actions - show on hover/expand or when showExtended is true */}
      {(showExtended || isExpanded) && (
        <div className="extended-actions">
          {extendedActions.map((action) => (
            <button
              key={action.label}
              className={`message-action-btn ${action.className}`}
              onClick={action.onClick}
              title={action.label}
              aria-label={action.label}
            >
              {action.icon}
            </button>
          ))}
        </div>
      )}

      {/* More actions button for mobile/compact mode */}
      {!showExtended && (
        <button
          className="message-action-btn more-actions"
          onClick={toggleExpanded}
          title={isExpanded ? 'Hide actions' : 'More actions'}
          aria-label={isExpanded ? 'Hide actions' : 'More actions'}
          aria-expanded={isExpanded}
        >
          {isExpanded ? '⋯' : '⋯'}
        </button>
      )}
    </div>
  );
});

export { MessageActions };
export default MessageActions;