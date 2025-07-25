import { memo, useCallback, useState } from 'react';
import type { ChatMessage } from '../../types/chat.types';
import { toastService } from '../../services/ToastService';
import { dashboardContextService } from '../../services/DashboardContextService';
import { timeService } from '../../services/TimeService';
import './chat-interface.css';

interface BulkMessageActionsProps {
  messages: ChatMessage[];
  selectedMessages: string[];
  onSelectionChange: (messageIds: string[]) => void;
  onMarkMultipleAsImportant: (messages: ChatMessage[]) => void;
  onClose: () => void;
}

const BulkMessageActions = memo(function BulkMessageActions({
  messages,
  selectedMessages,
  onSelectionChange,
  onMarkMultipleAsImportant,
  onClose,
}: BulkMessageActionsProps) {
  const [isExporting, setIsExporting] = useState(false);

  const selectedMessageData = messages.filter(msg => 
    selectedMessages.includes(msg.id),
  );

  const handleSelectAll = useCallback(() => {
    if (selectedMessages.length === messages.length) {
      onSelectionChange([]);
    } else {
      onSelectionChange(messages.map(msg => msg.id));
    }
  }, [messages, selectedMessages, onSelectionChange]);

  const handleCopySelected = useCallback(async () => {
    if (selectedMessageData.length === 0) return;

    try {
      const combinedText = selectedMessageData
        .map(msg => `${msg.role === 'user' ? 'You' : 'Virgil'}: ${msg.content}`)
        .join('\n\n');
      
      await navigator.clipboard.writeText(combinedText);
      toastService.success(`${selectedMessageData.length} messages copied to clipboard`);
    } catch (_error) {
      toastService.error('Failed to copy messages');
    }
  }, [selectedMessageData]);

  const handleExportSelected = useCallback(async () => {
    if (selectedMessageData.length === 0) return;

    setIsExporting(true);

    try {
      const now = dashboardContextService.getCurrentDateTime();
      const exportData = {
        exportedAt: timeService.toISOString(now),
        messageCount: selectedMessageData.length,
        messages: selectedMessageData.map(msg => ({
          id: msg.id,
          role: msg.role,
          content: msg.content,
          timestamp: msg.timestamp || dashboardContextService.getTimestamp(),
        })),
      };

      const blob = new Blob([JSON.stringify(exportData, null, 2)], { 
        type: 'application/json', 
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `virgil-messages-${selectedMessageData.length}-${dashboardContextService.getLocalDate()}.json`;
      a.click();
      URL.revokeObjectURL(url);
      
      toastService.success(`${selectedMessageData.length} messages exported successfully`);
    } catch (_error) {
      toastService.error('Failed to export messages');
    } finally {
      setIsExporting(false);
    }
  }, [selectedMessageData]);

  const handleMarkAllAsImportant = useCallback(() => {
    if (selectedMessageData.length === 0) return;
    onMarkMultipleAsImportant(selectedMessageData);
  }, [selectedMessageData, onMarkMultipleAsImportant]);

  const handleShareSelected = useCallback(async () => {
    if (selectedMessageData.length === 0) return;

    try {
      const combinedText = selectedMessageData
        .map(msg => `${msg.role === 'user' ? 'You' : 'Virgil'}: ${msg.content}`)
        .join('\n\n');

      if (navigator.share) {
        await navigator.share({
          title: `Virgil Chat Messages (${selectedMessageData.length})`,
          text: combinedText,
        });
        toastService.success('Messages shared successfully');
      } else {
        // Fallback to copying
        await handleCopySelected();
      }
    } catch (error) {
      if (error instanceof Error && error.name !== 'AbortError') {
        toastService.error('Failed to share messages');
      }
    }
  }, [selectedMessageData, handleCopySelected]);

  if (selectedMessages.length === 0) {
    return null;
  }

  return (
    <div className="bulk-message-actions" role="toolbar" aria-label="Bulk message actions">
      <div className="bulk-actions-header">
        <div className="selection-info">
          <span className="selection-count">
            {selectedMessages.length} message{selectedMessages.length !== 1 ? 's' : ''} selected
          </span>
          <button
            className="select-all-btn"
            onClick={handleSelectAll}
            aria-label={selectedMessages.length === messages.length ? 'Deselect all' : 'Select all'}
          >
            {selectedMessages.length === messages.length ? 'Deselect All' : 'Select All'}
          </button>
        </div>
        <button
          className="close-bulk-actions"
          onClick={onClose}
          aria-label="Close bulk actions"
        >
          ✕
        </button>
      </div>

      <div className="bulk-actions-buttons">
        <button
          className="bulk-action-btn copy-btn"
          onClick={handleCopySelected}
          title="Copy selected messages"
          aria-label="Copy selected messages to clipboard"
        >
          📋 Copy
        </button>

        <button
          className="bulk-action-btn share-btn"
          onClick={handleShareSelected}
          title="Share selected messages"
          aria-label="Share selected messages"
        >
          📤 Share
        </button>

        <button
          className="bulk-action-btn export-btn"
          onClick={handleExportSelected}
          disabled={isExporting}
          title="Export selected messages"
          aria-label="Export selected messages as JSON"
        >
          {isExporting ? '⏳ Exporting...' : '💾 Export'}
        </button>

        <button
          className="bulk-action-btn important-btn"
          onClick={handleMarkAllAsImportant}
          title="Mark all selected as important"
          aria-label="Mark all selected messages as important"
        >
          💡 Mark Important
        </button>
      </div>
    </div>
  );
});

export { BulkMessageActions };
export default BulkMessageActions;