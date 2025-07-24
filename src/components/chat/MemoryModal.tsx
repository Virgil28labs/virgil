import { memo, useState, useCallback, useEffect } from 'react';
import type { StoredConversation, MarkedMemory } from '../../services/MemoryService';
import { MemoryService, memoryService } from '../../services/MemoryService';
import { ConversationView } from './ConversationView';
import { AdvancedMemorySearch } from './AdvancedMemorySearch';
import type { ChatMessage } from '../../types/chat.types';
import './memory-modals.css';

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
  const [selectedConversation, setSelectedConversation] = useState<StoredConversation | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isAdvancedSearchExpanded, setIsAdvancedSearchExpanded] = useState(false);
  const [filteredResults, setFilteredResults] = useState({
    memories: markedMemories,
    conversations: recentConversations,
  });

  // Handle backdrop click to close
  const handleBackdropClick = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  }, [onClose]);

  // Handle memory deletion
  const handleDeleteMemory = useCallback(async (memoryId: string) => {
    setIsLoading(true);
    try {
      await memoryService.forgetMemory(memoryId);
      const updatedMemories = await memoryService.getMarkedMemories();
      onMemoriesUpdate(updatedMemories);
      
      const newContext = await memoryService.getContextForPrompt();
      onMemoryContextUpdate(newContext);
      onMemoryIndicatorUpdate(!!newContext);
    } catch (error) {
      // Error is already handled by MemoryService with toast notifications
    } finally {
      setIsLoading(false);
    }
  }, [onMemoriesUpdate, onMemoryContextUpdate, onMemoryIndicatorUpdate]);

  // Handle export all data
  const handleExportData = useCallback(async () => {
    setIsLoading(true);
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
      // Error is already handled by MemoryService with toast notifications
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Handle clear all data
  const handleClearAllData = useCallback(async () => {
    if (confirm('Clear all memories and conversations? This cannot be undone.')) {
      setIsLoading(true);
      try {
        await memoryService.clearAllData();
        onMemoriesUpdate([]);
        onConversationsUpdate([]);
        onMemoryContextUpdate('');
        onMemoryIndicatorUpdate(false);
        setSelectedConversation(null); // Reset selected conversation
        onClose();
      } catch (error) {
        // Error is already handled by MemoryService with toast notifications
      } finally {
        setIsLoading(false);
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
    setIsLoading(true);
    try {
      const context = `From conversation on ${new Date().toLocaleDateString()}`;
      await memoryService.markAsImportant(message.id, message.content, context);
      
      const updatedMemories = await memoryService.getMarkedMemories();
      onMemoriesUpdate(updatedMemories);
      
      const newContext = await memoryService.getContextForPrompt();
      onMemoryContextUpdate(newContext);
      onMemoryIndicatorUpdate(true);
    } catch (error) {
      // Error is already handled by MemoryService with toast notifications
    } finally {
      setIsLoading(false);
    }
  }, [onMemoriesUpdate, onMemoryContextUpdate, onMemoryIndicatorUpdate]);

  // Update filtered results when props change
  useEffect(() => {
    setFilteredResults({
      memories: markedMemories,
      conversations: recentConversations,
    });
  }, [markedMemories, recentConversations]);

  const handleSearchResultsChange = useCallback((results: {
    memories: MarkedMemory[];
    conversations: StoredConversation[];
  }) => {
    setFilteredResults(results);
  }, []);

  const toggleAdvancedSearch = useCallback(() => {
    setIsAdvancedSearchExpanded(!isAdvancedSearchExpanded);
  }, [isAdvancedSearchExpanded]);

  if (!isOpen) return null;

  // Show conversation detail if a conversation is selected
  if (selectedConversation) {
    return (
      <div className="memory-modal-backdrop" onClick={handleBackdropClick}>
        <div className="memory-modal" onClick={(e) => e.stopPropagation()}>
          <ConversationView
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
          <AdvancedMemorySearch
            memories={markedMemories}
            conversations={recentConversations}
            onResultsChange={handleSearchResultsChange}
            isExpanded={isAdvancedSearchExpanded}
            onToggleExpanded={toggleAdvancedSearch}
          />

          <div className="memory-tabs">
            <div className="memory-tab active">
              <h4>📌 Marked Memories ({markedMemories.length})</h4>
              <div className="memory-list">
                {filteredResults.memories.length === 0 ? (
                  <div className="memory-empty">
                    {filteredResults.memories.length !== markedMemories.length
                      ? 'No memories found with current search criteria'
                      : 'No marked memories yet. Click the 💡 button on messages to remember them.'}
                  </div>
                ) : (
                  filteredResults.memories.map(memory => (
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
                          disabled={isLoading}
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
                {filteredResults.conversations.length === 0 ? (
                  <div className="memory-empty">
                    {filteredResults.conversations.length !== recentConversations.length
                      ? 'No conversations found with current search criteria'
                      : 'No conversations yet.'}
                  </div>
                ) : (
                  filteredResults.conversations.map(conv => (
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
              disabled={isLoading}
            >
              {isLoading ? '⏳ Exporting...' : '💾 Export All Data'}
            </button>
            
            <button
              className="memory-action-btn clear"
              onClick={handleClearAllData}
              disabled={isLoading}
            >
              {isLoading ? '⏳ Clearing...' : '🗑️ Clear All Data'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
});

export { MemoryModal };
export default MemoryModal;