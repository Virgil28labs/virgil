import React, { memo, useState, useCallback, useEffect } from 'react';
import ReactDOM from 'react-dom';
import type { StoredConversation, MarkedMemory } from '../../../services/SupabaseMemoryService';
import { SupabaseMemoryService } from '../../../services/SupabaseMemoryService';
import { vectorMemoryService } from '../../../services/VectorMemoryService';
import { ConversationView } from '../ConversationView/ConversationView';
import { AdvancedMemorySearch } from '../AdvancedMemorySearch/AdvancedMemorySearch';
import { RecentMessagesTab } from '../RecentMessagesTab/RecentMessagesTab';
import type { ChatMessage } from '../../../types/chat.types';
import { dashboardContextService } from '../../../services/DashboardContextService';
import { timeService } from '../../../services/TimeService';
import { logger } from '../../../lib/logger';
import styles from './MemoryModal.module.css';

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
          logger.error('Failed to load enhanced memory features', error as Error, {
            component: 'MemoryModal',
            action: 'loadEnhancedFeatures',
          });
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
      logger.error('Failed to generate daily summary', error as Error, {
        component: 'MemoryModal',
        action: 'handleGenerateDailySummary',
      });
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
      <div className={styles.modalBackdrop} onClick={handleBackdropClick}>
        <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
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
    <div className={styles.modalBackdrop} onClick={handleBackdropClick}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h3>Memory & Conversations</h3>
          <button
            className={styles.closeButton}
            onClick={onClose}
            title="Close memory viewer"
            aria-label="Close memory viewer"
          >
            ✕
          </button>
        </div>

        <div className={styles.modalContent}>
          <AdvancedMemorySearch
            memories={markedMemories}
            conversations={recentConversations}
            onResultsChange={handleSearchResultsChange}
            isExpanded={isAdvancedSearchExpanded}
            onToggleExpanded={toggleAdvancedSearch}
          />

          <div className={styles.tabs}>
            <div className={styles.tabsHeader}>
              <button
                className={`${styles.tabButton} ${activeTab === 'memories' ? styles.active : ''}`}
                onClick={() => setActiveTab('memories')}
              >
                Marked Memories ({markedMemories.length})
              </button>
              <button
                className={`${styles.tabButton} ${activeTab === 'recent' ? styles.active : ''}`}
                onClick={() => setActiveTab('recent')}
              >
                Recent Messages
              </button>
              <button
                className={`${styles.tabButton} ${activeTab === 'history' ? styles.active : ''}`}
                onClick={() => setActiveTab('history')}
              >
                Full Chat History
              </button>
              <button
                className={`${styles.tabButton} ${activeTab === 'summaries' ? styles.active : ''}`}
                onClick={() => setActiveTab('summaries')}
              >
                Daily Summaries ({dailySummaries.length})
              </button>
              <button
                className={`${styles.tabButton} ${activeTab === 'insights' ? styles.active : ''}`}
                onClick={() => setActiveTab('insights')}
              >
                Insights
              </button>
            </div>

            <div className={styles.tabsContent}>
              {activeTab === 'memories' && (
                <div className={styles.tabPanel}>
                  <div className={styles.memoryList}>
                    {categorizedMemories.size === 0 ? (
                      <div className={styles.memoryEmpty}>
                        {filteredResults.memories.length !== markedMemories.length
                          ? 'No memories found with current search criteria'
                          : 'No marked memories yet. Mark important messages to remember them.'}
                      </div>
                    ) : (
                      Array.from(categorizedMemories.entries()).map(([category, memories]) => (
                        <div key={category} className={styles.memoryCategory}>
                          <h4 className={styles.categoryHeader}>{category} ({memories.length})</h4>
                          <div className={styles.categoryMemories}>
                            {memories.map(memory => (
                              <div key={memory.id} className={styles.memoryItem}>
                                <div className={styles.memoryContent}>{memory.content}</div>
                                <div className={styles.memoryMeta}>
                                  <span className={styles.memoryContext}>{memory.context}</span>
                                  <span className={styles.memoryTime}>
                                    {SupabaseMemoryService.timeAgo(memory.timestamp)}
                                  </span>
                                  <button
                                    className={styles.memoryDelete}
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
                <div className={styles.tabPanel}>
                  <RecentMessagesTab
                    onMarkAsImportant={handleMarkAsImportantFromDetail}
                  />
                </div>
              )}

              {activeTab === 'history' && (
                <div className={styles.tabPanel}>
                  <div className={styles.chatHistoryInfo}>
                    <h4>Your Complete Chat History</h4>
                    <p className={styles.historyDescription}>
                      All your conversations are saved in one continuous thread
                    </p>
                  </div>
                  <div className={styles.conversationList}>
                    {filteredResults.conversations.length === 0 ? (
                      <div className={styles.memoryEmpty}>
                        {filteredResults.conversations.length !== recentConversations.length
                          ? 'No conversations found with current search criteria'
                          : 'No conversations yet.'}
                      </div>
                    ) : (
                      filteredResults.conversations.map(conv => (
                        <div
                          key={conv.id}
                          className={`${styles.conversationItem} clickable`}
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
                          <div className={styles.conversationStatsCard}>
                            <div className={styles.statRow}>
                              <span className={styles.statLabel}>Total Messages:</span>
                              <span className={styles.statValue}>{conv.messageCount}</span>
                            </div>
                            <div className={styles.statRow}>
                              <span className={styles.statLabel}>Started:</span>
                              <span className={styles.statValue}>
                                {timeService.formatDateToLocal(timeService.fromTimestamp(conv.timestamp))}
                              </span>
                            </div>
                            <div className={styles.statRow}>
                              <span className={styles.statLabel}>Status:</span>
                              <span className={`${styles.statValue} ${styles.syncStatus}`}>✅ Synced across all devices</span>
                            </div>
                          </div>
                          <div className={styles.conversationAction}>
                            <span className={styles.viewAllButton}>View All Messages →</span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              {activeTab === 'summaries' && (
                <div className={styles.tabPanel}>
                  <div className={styles.summaryHeader}>
                    <p>
                      Daily summaries capture your conversations and key information
                    </p>
                    <button
                      className={`${styles.actionButton} ${styles.summaryGenerateButton}`}
                      onClick={handleGenerateDailySummary}
                      disabled={isLoading}
                    >
                      {isLoading ? 'Generating...' : 'Generate Today\'s Summary'}
                    </button>
                  </div>
                  <div className={styles.memoryList}>
                    {dailySummaries.length === 0 ? (
                      <div className={styles.memoryEmpty}>
                        No daily summaries yet. Click the button above to generate one!
                      </div>
                    ) : (
                      dailySummaries
                        .sort((a, b) => b.timestamp - a.timestamp)
                        .map(summary => (
                          <div key={summary.id} className={`${styles.memoryItem} ${styles.summaryItem}`}>
                            <div className={`${styles.memoryContent} ${styles.summaryContent}`}>
                              {summary.content.split('\n').map((line, idx) => (
                                <div key={idx} className={line.startsWith('Conversation') ? styles.summarySection : ''}>
                                  {line}
                                </div>
                              ))}
                            </div>
                            <div className={styles.memoryMeta}>
                              <span className={styles.memoryContext}>{summary.context}</span>
                              <span className={styles.memoryTime}>
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
                <div className={styles.tabPanel}>
                  <div className={styles.insightsContainer}>
                    <h4>Your Conversation Patterns</h4>
                    
                    {patternInsights.peakHours && patternInsights.peakHours.length > 0 && (
                      <div className={styles.insightSection}>
                        <h5>🕐 Most Active Hours</h5>
                        <p>You typically chat during: {patternInsights.peakHours.join(', ')}</p>
                      </div>
                    )}
                    
                    {patternInsights.frequentTopics && patternInsights.frequentTopics.length > 0 && (
                      <div className={styles.insightSection}>
                        <h5>💬 Frequent Topics</h5>
                        <div className={styles.topicList}>
                          {patternInsights.frequentTopics.map((topic, idx) => (
                            <span key={idx} className={styles.topicTag}>{topic}</span>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {patternInsights.preferences && patternInsights.preferences.length > 0 && (
                      <div className={styles.insightSection}>
                        <h5>⭐ Learned Preferences</h5>
                        <p>{patternInsights.preferences.join(', ')}</p>
                      </div>
                    )}
                    
                    {!patternInsights.peakHours && !patternInsights.frequentTopics && !patternInsights.preferences && (
                      <div className={styles.memoryEmpty}>
                        <p>No patterns detected yet. Keep chatting and I'll learn your preferences over time!</p>
                        <p className={styles.insightNote}>Pattern analysis runs weekly on Sundays.</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className={styles.modalActions}>
            <button
              className={styles.actionButtonExport}
              onClick={handleExportData}
              disabled={isLoading}
            >
              {isLoading ? 'Exporting...' : 'Export All Data'}
            </button>

            <button
              className={styles.actionButtonClear}
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