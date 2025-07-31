import React, { memo, useState, useCallback, useMemo } from 'react';
import type { ModelOption } from '../../../types/chat.types';
import type { DashboardContext } from '../../../services/DashboardContextService';
import type { StoredConversation, MarkedMemory } from '../../../services/SupabaseMemoryService';
import { StatusPills } from '../StatusPills/StatusPills';
import { WindowControls } from '../WindowControls/WindowControls';
import { ModelSelector } from '../ModelSelector/ModelSelector';
import { ProfileDropdown } from '../ProfileDropdown/ProfileDropdown';
import styles from './ChatHeader.module.css';

interface ChatHeaderProps {
  // Window state
  windowSize: 'normal' | 'large' | 'fullscreen';
  onSizeToggle: () => void;
  onMinimize: () => void;

  // Model selection
  selectedModel: string;
  onModelChange: (modelId: string) => void;
  models: ModelOption[];

  // Memory state
  showMemoryIndicator: boolean;
  markedMemories: MarkedMemory[];
  recentConversations: StoredConversation[];
  onMemoryModalOpen: () => void;

  // Context state
  dashboardContext: DashboardContext | null;

  // Profile/System prompt
  customSystemPrompt: string;
  onSystemPromptChange: (prompt: string) => void;
  onSystemPromptSave: () => void;

  // New chat functionality
  onNewChat: () => void;
  messageCount: number;
  
  // Real-time sync status
  isRealtimeConnected?: boolean;

  // Clear messages functionality
  onClearMessages: () => void;

  // Export functionality
  onExportMessages: () => void;

  // Tooltip/system prompt preview
  createSystemPrompt: () => string;
}

const ChatHeader = memo(function ChatHeader({
  windowSize,
  onSizeToggle,
  onMinimize,
  selectedModel,
  onModelChange,
  models,
  showMemoryIndicator,
  markedMemories,
  recentConversations,
  onMemoryModalOpen,
  dashboardContext,
  customSystemPrompt,
  onSystemPromptChange,
  onSystemPromptSave,
  onNewChat,
  messageCount,
  isRealtimeConnected,
  onClearMessages,
  onExportMessages,
  createSystemPrompt,
}: ChatHeaderProps) {
  const [showTooltip, setShowTooltip] = useState(false);

  // Memoized system prompt info for tooltip
  const systemPromptInfo = useMemo(() => {
    return {
      prompt: createSystemPrompt(),
      hasCustomPrompt: !!customSystemPrompt,
    };
  }, [createSystemPrompt, customSystemPrompt]);

  const handleLogoClick = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onMinimize();
  }, [onMinimize]);

  const handleLogoKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      e.stopPropagation();
      onMinimize();
    }
  }, [onMinimize]);

  return (
    <div className={styles.header}>
      <div className={styles.headerLeft}>
        {/* Virgil Logo/Name */}
        <div
          className={styles.assistantName}
          onClick={handleLogoClick}
          onMouseEnter={() => setShowTooltip(true)}
          onMouseLeave={() => setShowTooltip(false)}
          onKeyDown={handleLogoKeyDown}
          title="Click to close chat or hover to see system prompt"
          role="button"
          tabIndex={0}
          aria-label="Close chat or view system prompt"
        >
          Virgil
          {showTooltip && dashboardContext && (
            <div className={styles.enhancedTooltip}>
              <div className={styles.tooltipContent}>
                <div className={styles.tooltipHeader}>
                  <strong>🧠 Virgil's Context Awareness</strong>
                  <span className={styles.lastUpdated}>Updated: {dashboardContext.currentTime}</span>
                </div>
                
                {/* Time & Location Row */}
                <div className={styles.contextRow}>
                  <div className={styles.contextSection}>
                    <span className={styles.contextIcon}>⏰</span>
                    <div className={styles.contextDetails}>
                      <div className={styles.contextLabel}>Time</div>
                      <div className={styles.contextValue}>{dashboardContext.currentTime}</div>
                      <div className={styles.contextMeta}>{dashboardContext.timeOfDay} • {dashboardContext.dayOfWeek}</div>
                    </div>
                  </div>
                  
                  {dashboardContext.location.city && (
                    <div className={styles.contextSection}>
                      <span className={styles.contextIcon}>📍</span>
                      <div className={styles.contextDetails}>
                        <div className={styles.contextLabel}>Location</div>
                        <div className={styles.contextValue}>{dashboardContext.location.city}</div>
                        <div className={styles.contextMeta}>
                          {dashboardContext.location.region || dashboardContext.location.country || 
                           (dashboardContext.location.hasGPS ? 'GPS' : 'IP-based')}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                
                {/* Weather & User Row */}
                {(dashboardContext.weather.hasData || dashboardContext.user.name) && (
                  <div className={styles.contextRow}>
                    {dashboardContext.weather.hasData && (
                      <div className={styles.contextSection}>
                        <span className={styles.contextIcon}>🌤️</span>
                        <div className={styles.contextDetails}>
                          <div className={styles.contextLabel}>Weather</div>
                          <div className={styles.contextValue}>
                            {dashboardContext.weather.temperature}°{dashboardContext.weather.unit === 'fahrenheit' ? 'F' : 'C'}
                          </div>
                          <div className={styles.contextMeta}>{dashboardContext.weather.description}</div>
                        </div>
                      </div>
                    )}
                    
                    {dashboardContext.user.isAuthenticated && (
                      <div className={styles.contextSection}>
                        <span className={styles.contextIcon}>👤</span>
                        <div className={styles.contextDetails}>
                          <div className={styles.contextLabel}>User</div>
                          <div className={styles.contextValue}>
                            {dashboardContext.user.profile?.nickname || 
                             dashboardContext.user.profile?.fullName || 
                             dashboardContext.user.name || 
                             'User'}
                          </div>
                          <div className={styles.contextMeta}>
                            Session: {Math.floor(dashboardContext.activity.timeSpentInSession / 60000)}m
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
                
                {/* Device & Apps Row */}
                {(dashboardContext.device.hasData || (dashboardContext.apps && Object.keys(dashboardContext.apps.apps).length > 0)) && (
                  <div className={styles.contextRow}>
                    {dashboardContext.device.hasData && (
                      <div className={styles.contextSection}>
                        <span className={styles.contextIcon}>💻</span>
                        <div className={styles.contextDetails}>
                          <div className={styles.contextLabel}>Device</div>
                          <div className={styles.contextValue}>{dashboardContext.device.browser || 'Browser'}</div>
                          <div className={styles.contextMeta}>{dashboardContext.device.os || dashboardContext.environment.deviceType}</div>
                        </div>
                      </div>
                    )}
                    
                    {dashboardContext.apps && Object.keys(dashboardContext.apps.apps).length > 0 && (
                      <div className={styles.contextSection}>
                        <span className={styles.contextIcon}>📱</span>
                        <div className={styles.contextDetails}>
                          <div className={styles.contextLabel}>Active Apps</div>
                          <div className={styles.contextValue}>{dashboardContext.apps.activeApps.length} active</div>
                          <div className={styles.contextMeta}>
                            {dashboardContext.apps.activeApps.slice(0, 3).join(', ')}
                            {dashboardContext.apps.activeApps.length > 3 && '...'}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
                
                {/* Activity if present */}
                {dashboardContext.activity.recentActions.length > 0 && (
                  <div className={styles.contextRow}>
                    <div className={styles.contextSectionFull}>
                      <span className={styles.contextIcon}>🎯</span>
                      <div className={styles.contextDetails}>
                        <div className={styles.contextLabel}>Recent Activity</div>
                        <div className={styles.contextValue}>
                          {dashboardContext.activity.recentActions[dashboardContext.activity.recentActions.length - 1]}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                
                {systemPromptInfo.hasCustomPrompt && (
                  <div className={styles.customPromptIndicator}>
                    ✏️ Custom prompt active
                  </div>
                )}
              </div>
            </div>
          )}
          
          {/* Fallback for when no context is available */}
          {showTooltip && !dashboardContext && (
            <div className={styles.tooltip}>
              <div className={styles.tooltipContent}>
                <strong>System Prompt:</strong>
                <p>{systemPromptInfo.prompt}</p>
                {systemPromptInfo.hasCustomPrompt && (
                  <small style={{ color: 'var(--amber-orange)', marginTop: '8px', display: 'block' }}>
                    ✏️ Custom prompt active
                  </small>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Status Pills (Memory, Context) */}
        <StatusPills
          showMemoryIndicator={showMemoryIndicator}
          onMemoryClick={onMemoryModalOpen}
          dashboardContext={dashboardContext}
          markedMemoriesCount={markedMemories.length}
          recentConversationsCount={recentConversations.length}
          isRealtimeConnected={isRealtimeConnected}
        />

        {/* Model Selector */}
        <ModelSelector
          selectedModel={selectedModel}
          models={models}
          onModelChange={onModelChange}
        />

        {/* Profile Dropdown (System Prompt Editor) */}
        <ProfileDropdown
          customSystemPrompt={customSystemPrompt}
          onSystemPromptChange={onSystemPromptChange}
          onSystemPromptSave={onSystemPromptSave}
          onClearMessages={onClearMessages}
          onExportMessages={onExportMessages}
          messageCount={messageCount}
        />

        {/* New Chat Button */}
        <button
          className={styles.newChatButton}
          onClick={onNewChat}
          title={messageCount > 0 ? 'Start a new conversation (current one will be saved to memory)' : 'Start a new conversation'}
        >
          ✨ NEW
        </button>
      </div>

      {/* Window Controls */}
      <div className={styles.headerRight}>
        <WindowControls
          windowSize={windowSize}
          onSizeToggle={onSizeToggle}
          onMinimize={onMinimize}
        />
      </div>
    </div>
  );
});

export { ChatHeader };
export default ChatHeader;