import { memo, useState, useCallback } from 'react';
import { StoredConversation, MarkedMemory, MemoryService, memoryService } from '../../services/MemoryService';
import { ConversationDetail } from './ConversationDetail';
import { ChatMessage } from '../../types/chat.types';
import './MemoryModal.css';
import { logger } from '../../lib/logger';

interface MemoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  markedMemories: MarkedMemory[];
  recentConversations: StoredConversation[];
  onMemoriesUpdate: (memories: MarkedMemory[]) => void;
  onConversationsUpdate: (conversations: StoredConversation[]) => void;
  onMemoryContextUpdate: (context: string) => void;
  onMemoryIndicatorUpdate: (show: boolean) => void;
}

const MemoryModal = memo(function MemoryModal({
  isOpen,
  onClose,
  markedMemories,
  recentConversations,
  onMemoriesUpdate,
  onConversationsUpdate,
  onMemoryContextUpdate,
  onMemoryIndicatorUpdate,
}: MemoryModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedConversation, setSelectedConversation] = useState<StoredConversation | null>(null);

  // Handle backdrop click to close
  const handleBackdropClick = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  }, [onClose]);

  // Handle memory deletion
  const handleDeleteMemory = useCallback(async (memoryId: string) => {
    try {
      await memoryService.forgetMemory(memoryId);
      const updatedMemories = await memoryService.getMarkedMemories();
      onMemoriesUpdate(updatedMemories);
      
      const newContext = await memoryService.getContextForPrompt();
      onMemoryContextUpdate(newContext);
      onMemoryIndicatorUpdate(!!newContext);
    } catch (error) {
      logger.error('Failed to delete memory', error as Error, {
        component: 'MemoryModal',
        action: 'handleDeleteMemory',
        metadata: { memoryId }
      });
    }
  }, [onMemoriesUpdate, onMemoryContextUpdate, onMemoryIndicatorUpdate]);

  // Handle export all data
  const handleExportData = useCallback(async () => {
    try {
      const data = await memoryService.exportAllData();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `virgil-memory-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      logger.error('Failed to export data', error as Error, {
        component: 'MemoryModal',
        action: 'handleExport'
      });
    }
  }, []);

  // Handle clear all data
  const handleClearAllData = useCallback(async () => {
    if (confirm('Clear all memories and conversations? This cannot be undone.')) {
      try {
        await memoryService.clearAllData();
        onMemoriesUpdate([]);
        onConversationsUpdate([]);
        onMemoryContextUpdate('');
        onMemoryIndicatorUpdate(false);
        setSelectedConversation(null); // Reset selected conversation
        onClose();
      } catch (error) {
        logger.error('Failed to clear all data', error as Error, {
          component: 'MemoryModal',
          action: 'handleClearAll'
        });
      }
    }
  }, [onMemoriesUpdate, onConversationsUpdate, onMemoryContextUpdate, onMemoryIndicatorUpdate, onClose]);

  // Handle conversation click
  const handleConversationClick = useCallback((conversation: StoredConversation) => {
    setSelectedConversation(conversation);
  }, []);

  // Handle back from conversation detail
  const handleBackToList = useCallback(() => {
    setSelectedConversation(null);
  }, []);

  // Handle marking message as important from conversation detail
  const handleMarkAsImportantFromDetail = useCallback(async (message: ChatMessage) => {
    try {
      const context = `From conversation on ${new Date().toLocaleDateString()}`;
      await memoryService.markAsImportant(message.id, message.content, context);
      
      const updatedMemories = await memoryService.getMarkedMemories();
      onMemoriesUpdate(updatedMemories);
      
      const newContext = await memoryService.getContextForPrompt();
      onMemoryContextUpdate(newContext);
      onMemoryIndicatorUpdate(true);
    } catch (error) {
      logger.error('Failed to mark message as important', error as Error, {
        component: 'MemoryModal',
        action: 'handleMarkAsImportantFromDetail',
        metadata: { messageId: message.id }
      });
    }
  }, [onMemoriesUpdate, onMemoryContextUpdate, onMemoryIndicatorUpdate]);

  // Filter memories based on search
  const filteredMemories = markedMemories.filter(memory => 
    !searchQuery || 
    memory.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
    memory.context.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Filter conversations based on search
  const filteredConversations = recentConversations.filter(conv => 
    !searchQuery || 
    conv.firstMessage.toLowerCase().includes(searchQuery.toLowerCase()) ||
    conv.lastMessage.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!isOpen) return null;

  // Show conversation detail if a conversation is selected
  if (selectedConversation) {
    return (
      <div className="memory-modal-backdrop" onClick={handleBackdropClick}>
        <div className="memory-modal" onClick={(e) => e.stopPropagation()}>
          <ConversationDetail
            conversation={selectedConversation}
            onBack={handleBackToList}
            onMarkAsImportant={handleMarkAsImportantFromDetail}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="memory-modal-backdrop" onClick={handleBackdropClick}>
      <div className="memory-modal" onClick={(e) => e.stopPropagation()}>
        <div className="memory-modal-header">
          <h3>🧠 Memory & Conversations</h3>
          <button 
            className="close-btn"
            onClick={onClose}
            title="Close memory viewer"
            aria-label="Close memory viewer"
          >
            ✕
          </button>
        </div>

        <div className="memory-modal-content">
          <div className="memory-search">
            <input
              type="text"
              placeholder="Search memories and conversations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="memory-search-input"
            />
          </div>

          <div className="memory-tabs">
            <div className="memory-tab active">
              <h4>📌 Marked Memories ({markedMemories.length})</h4>
              <div className="memory-list">
                {filteredMemories.length === 0 ? (
                  <div className="memory-empty">
                    {searchQuery 
                      ? `No memories found matching "${searchQuery}"`
                      : "No marked memories yet. Click the 💡 button on messages to remember them."
                    }
                  </div>
                ) : (
                  filteredMemories.map(memory => (
                    <div key={memory.id} className="memory-item">
                      <div className="memory-content">{memory.content}</div>
                      <div className="memory-meta">
                        <span className="memory-context">{memory.context}</span>
                        <span className="memory-time">
                          {MemoryService.timeAgo(memory.timestamp)}
                        </span>
                        <button
                          className="memory-delete"
                          onClick={() => handleDeleteMemory(memory.id)}
                          title="Forget this memory"
                          aria-label="Delete this memory"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="memory-tab">
              <h4>💬 Recent Conversations ({recentConversations.length})</h4>
              <div className="conversation-list">
                {filteredConversations.length === 0 ? (
                  <div className="memory-empty">
                    {searchQuery 
                      ? `No conversations found matching "${searchQuery}"`
                      : "No conversations yet."
                    }
                  </div>
                ) : (
                  filteredConversations.map(conv => (
                    <div 
                      key={conv.id} 
                      className="conversation-item clickable"
                      onClick={() => handleConversationClick(conv)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          handleConversationClick(conv);
                        }
                      }}
                    >
                      <div className="conversation-preview">
                        <div className="conversation-first">"{conv.firstMessage}"</div>
                        <div className="conversation-last">"{conv.lastMessage}"</div>
                      </div>
                      <div className="conversation-meta">
                        <span className="conversation-count">{conv.messageCount} messages</span>
                        <span className="conversation-time">
                          {MemoryService.timeAgo(conv.timestamp)}
                        </span>
                        <span className="conversation-arrow">→</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          <div className="memory-modal-actions">
            <button
              className="memory-action-btn export"
              onClick={handleExportData}
            >
              💾 Export All Data
            </button>
            
            <button
              className="memory-action-btn clear"
              onClick={handleClearAllData}
            >
              🗑️ Clear All Data
            </button>
          </div>
        </div>
      </div>
    </div>
  );
});

export { MemoryModal };
export default MemoryModal;