import React, { memo, useState, useCallback, useEffect } from 'react';
import ReactDOM from 'react-dom';
import type { StoredConversation, MarkedMemory } from '../../services/SupabaseMemoryService';
import { SupabaseMemoryService } from '../../services/SupabaseMemoryService';
import { vectorMemoryService } from '../../services/VectorMemoryService';
import { ConversationView } from './ConversationView';
import { AdvancedMemorySearch } from './AdvancedMemorySearch';
import { RecentMessagesTab } from './RecentMessagesTab';
import type { ChatMessage } from '../../types/chat.types';
import { dashboardContextService } from '../../services/DashboardContextService';
import { timeService } from '../../services/TimeService';
import './memory-modal-modern.css';

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
  const [activeTab, setActiveTab] = useState<'memories' | 'recent' | 'history' | 'summaries' | 'insights'>('memories');
  const [filteredResults, setFilteredResults] = useState({
    memories: markedMemories,
    conversations: recentConversations,
  });
  const [categorizedMemories, setCategorizedMemories] = useState<Map<string, MarkedMemory[]>>(new Map());
  const [dailySummaries, setDailySummaries] = useState<MarkedMemory[]>([]);
  const [patternInsights, setPatternInsights] = useState<{ peakHours?: string[]; frequentTopics?: string[]; preferences?: string[] }>({});

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
      await vectorMemoryService.forgetMemory(memoryId);
      const updatedMemories = await vectorMemoryService.getMarkedMemories();
      onMemoriesUpdate(updatedMemories);

      const newContext = await vectorMemoryService.getContextForPrompt();
      onMemoryContextUpdate(newContext);
      onMemoryIndicatorUpdate(!!newContext);
    } catch (_error) {
      // Error is already handled by MemoryService with toast notifications
    } finally {
      setIsLoading(false);
    }
  }, [onMemoriesUpdate, onMemoryContextUpdate, onMemoryIndicatorUpdate]);

  // Handle export all data
  const handleExportData = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await vectorMemoryService.exportAllData();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `virgil-memory-${dashboardContextService.getLocalDate()}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (_error) {
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
        await vectorMemoryService.clearAllData();
        onMemoriesUpdate([]);
        onConversationsUpdate([]);
        onMemoryContextUpdate('');
        onMemoryIndicatorUpdate(false);
        setSelectedConversation(null); // Reset selected conversation
        onClose();
      } catch (_error) {
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
      const context = `From conversation on ${timeService.formatDateToLocal(timeService.getCurrentDateTime())}`;
      await vectorMemoryService.markAsImportant(message.id, message.content, context);

      const updatedMemories = await vectorMemoryService.getMarkedMemories();
      onMemoriesUpdate(updatedMemories);

      const newContext = await vectorMemoryService.getContextForPrompt();
      onMemoryContextUpdate(newContext);
      onMemoryIndicatorUpdate(true);
    } catch (_error) {
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

  // Load enhanced memory features when modal opens
  useEffect(() => {
    const loadEnhancedFeatures = async () => {
      if (isOpen) {
        try {
          // Load categorized memories
          const categories = await vectorMemoryService.getMemoriesByCategory();
          setCategorizedMemories(categories);

          // Separate daily summaries from regular memories
          const summaries = markedMemories.filter(m => m.tag === 'daily-summary');
          setDailySummaries(summaries);

          // Load user patterns
          const patterns = await vectorMemoryService.getUserPatterns();
          setPatternInsights(patterns);
        } catch (error) {
          console.error('Failed to load enhanced memory features:', error);
        }
      }
    };

    loadEnhancedFeatures();
  }, [isOpen, markedMemories]);

  const handleSearchResultsChange = useCallback((results: {
    memories: MarkedMemory[];
    conversations: StoredConversation[];
  }) => {
    setFilteredResults(results);
  }, []);

  const toggleAdvancedSearch = useCallback(() => {
    setIsAdvancedSearchExpanded(!isAdvancedSearchExpanded);
  }, [isAdvancedSearchExpanded]);

  // Handle manual daily summary generation
  const handleGenerateDailySummary = useCallback(async () => {
    setIsLoading(true);
    try {
      await vectorMemoryService.createDailySummary();
      
      // Refresh memories to show the new summary
      const updatedMemories = await vectorMemoryService.getMarkedMemories();
      onMemoriesUpdate(updatedMemories);
      
      // Update the daily summaries list
      const summaries = updatedMemories.filter(m => m.tag === 'daily-summary');
      setDailySummaries(summaries);
      
      // Switch to summaries tab to show the result
      setActiveTab('summaries');
    } catch (error) {
      console.error('Failed to generate daily summary:', error);
    } finally {
      setIsLoading(false);
    }
  }, [onMemoriesUpdate]);

  // Handle Escape key to close modal
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  // Show conversation detail if a conversation is selected
  if (selectedConversation) {
    return ReactDOM.createPortal(
      <div className="memory-modal-backdrop" onClick={handleBackdropClick}>
        <div className="memory-modal" onClick={(e) => e.stopPropagation()}>
          <ConversationView
            conversation={selectedConversation}
            onBack={handleBackToList}
            onMarkAsImportant={handleMarkAsImportantFromDetail}
          />
        </div>
      </div>,
      document.body,
    );
  }

  return ReactDOM.createPortal(
    <div className="memory-modal-backdrop" onClick={handleBackdropClick}>
      <div className="memory-modal" onClick={(e) => e.stopPropagation()}>
        <div className="memory-modal-header">
          <h3>Memory & Conversations</h3>
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
            <div className="memory-tabs-header">
              <button
                className={`memory-tab-btn ${activeTab === 'memories' ? 'active' : ''}`}
                onClick={() => setActiveTab('memories')}
              >
                Marked Memories ({markedMemories.length})
              </button>
              <button
                className={`memory-tab-btn ${activeTab === 'recent' ? 'active' : ''}`}
                onClick={() => setActiveTab('recent')}
              >
                Recent Messages
              </button>
              <button
                className={`memory-tab-btn ${activeTab === 'history' ? 'active' : ''}`}
                onClick={() => setActiveTab('history')}
              >
                Full Chat History
              </button>
              <button
                className={`memory-tab-btn ${activeTab === 'summaries' ? 'active' : ''}`}
                onClick={() => setActiveTab('summaries')}
              >
                Daily Summaries ({dailySummaries.length})
              </button>
              <button
                className={`memory-tab-btn ${activeTab === 'insights' ? 'active' : ''}`}
                onClick={() => setActiveTab('insights')}
              >
                Insights
              </button>
            </div>

            <div className="memory-tabs-content">
              {activeTab === 'memories' && (
                <div className="memory-tab-panel">
                  <div className="memory-list">
                    {categorizedMemories.size === 0 ? (
                      <div className="memory-empty">
                        {filteredResults.memories.length !== markedMemories.length
                          ? 'No memories found with current search criteria'
                          : 'No marked memories yet. Mark important messages to remember them.'}
                      </div>
                    ) : (
                      Array.from(categorizedMemories.entries()).map(([category, memories]) => (
                        <div key={category} className="memory-category">
                          <h4 className="category-header">{category} ({memories.length})</h4>
                          <div className="category-memories">
                            {memories.map(memory => (
                              <div key={memory.id} className="memory-item">
                                <div className="memory-content">{memory.content}</div>
                                <div className="memory-meta">
                                  <span className="memory-context">{memory.context}</span>
                                  <span className="memory-time">
                                    {SupabaseMemoryService.timeAgo(memory.timestamp)}
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
                            ))}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              {activeTab === 'recent' && (
                <div className="memory-tab-panel">
                  <RecentMessagesTab
                    onMarkAsImportant={handleMarkAsImportantFromDetail}
                  />
                </div>
              )}

              {activeTab === 'history' && (
                <div className="memory-tab-panel">
                  <div className="chat-history-info">
                    <h4>Your Complete Chat History</h4>
                    <p className="history-description">
                      All your conversations are saved in one continuous thread
                    </p>
                  </div>
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
                          <div className="conversation-stats-card">
                            <div className="stat-row">
                              <span className="stat-label">Total Messages:</span>
                              <span className="stat-value">{conv.messageCount}</span>
                            </div>
                            <div className="stat-row">
                              <span className="stat-label">Started:</span>
                              <span className="stat-value">
                                {timeService.formatDateToLocal(timeService.fromTimestamp(conv.timestamp))}
                              </span>
                            </div>
                            <div className="stat-row">
                              <span className="stat-label">Status:</span>
                              <span className="stat-value sync-status">✅ Synced across all devices</span>
                            </div>
                          </div>
                          <div className="conversation-action">
                            <span className="view-all-btn">View All Messages →</span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              {activeTab === 'summaries' && (
                <div className="memory-tab-panel">
                  <div className="summary-header" style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <p style={{ margin: 0, color: 'var(--text-gray)' }}>
                      Daily summaries capture your conversations and key information
                    </p>
                    <button
                      className="memory-action-btn summary-generate-btn"
                      onClick={handleGenerateDailySummary}
                      disabled={isLoading}
                    >
                      {isLoading ? 'Generating...' : 'Generate Today\'s Summary'}
                    </button>
                  </div>
                  <div className="memory-list">
                    {dailySummaries.length === 0 ? (
                      <div className="memory-empty">
                        No daily summaries yet. Click the button above to generate one!
                      </div>
                    ) : (
                      dailySummaries
                        .sort((a, b) => b.timestamp - a.timestamp)
                        .map(summary => (
                          <div key={summary.id} className="memory-item summary-item">
                            <div className="memory-content summary-content">
                              {summary.content.split('\n').map((line, idx) => (
                                <div key={idx} className={line.startsWith('Conversation') ? 'summary-section' : ''}>
                                  {line}
                                </div>
                              ))}
                            </div>
                            <div className="memory-meta">
                              <span className="memory-context">{summary.context}</span>
                              <span className="memory-time">
                                {SupabaseMemoryService.timeAgo(summary.timestamp)}
                              </span>
                            </div>
                          </div>
                        ))
                    )}
                  </div>
                </div>
              )}

              {activeTab === 'insights' && (
                <div className="memory-tab-panel">
                  <div className="insights-container">
                    <h4>Your Conversation Patterns</h4>
                    
                    {patternInsights.peakHours && patternInsights.peakHours.length > 0 && (
                      <div className="insight-section">
                        <h5>🕐 Most Active Hours</h5>
                        <p>You typically chat during: {patternInsights.peakHours.join(', ')}</p>
                      </div>
                    )}
                    
                    {patternInsights.frequentTopics && patternInsights.frequentTopics.length > 0 && (
                      <div className="insight-section">
                        <h5>💬 Frequent Topics</h5>
                        <div className="topic-list">
                          {patternInsights.frequentTopics.map((topic, idx) => (
                            <span key={idx} className="topic-tag">{topic}</span>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {patternInsights.preferences && patternInsights.preferences.length > 0 && (
                      <div className="insight-section">
                        <h5>⭐ Learned Preferences</h5>
                        <p>{patternInsights.preferences.join(', ')}</p>
                      </div>
                    )}
                    
                    {!patternInsights.peakHours && !patternInsights.frequentTopics && !patternInsights.preferences && (
                      <div className="memory-empty">
                        <p>No patterns detected yet. Keep chatting and I'll learn your preferences over time!</p>
                        <p className="insight-note">Pattern analysis runs weekly on Sundays.</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="memory-modal-actions">
            <button
              className="memory-action-btn export"
              onClick={handleExportData}
              disabled={isLoading}
            >
              {isLoading ? 'Exporting...' : 'Export All Data'}
            </button>

            <button
              className="memory-action-btn clear"
              onClick={handleClearAllData}
              disabled={isLoading}
            >
              {isLoading ? 'Clearing...' : 'Clear All Data'}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
});

export { MemoryModal };
export default MemoryModal;
