import React, { memo, useState, useCallback, useMemo } from 'react';
import type { ModelOption } from '../../types/chat.types';
import type { DashboardContext } from '../../services/DashboardContextService';
import type { StoredConversation, MarkedMemory } from '../../services/MemoryService';
import { StatusPills } from './StatusPills';
import { WindowControls } from './WindowControls';
import { ModelSelector } from './ModelSelector';
import { ProfileDropdown } from './ProfileDropdown';
import './chat-interface.css';

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
    <div className="chatbot-header">
      <div className="header-left">
        {/* Virgil Logo/Name */}
        <div
          className="assistant-name clickable-logo"
          onClick={handleLogoClick}
          onMouseEnter={() => setShowTooltip(true)}
          onMouseLeave={() => setShowTooltip(false)}
          onKeyDown={handleLogoKeyDown}
          title="Click to close chat or hover to see system prompt"
          role="button"
          tabIndex={0}
          aria-label="Close chat or view system prompt"
          style={{ cursor: 'pointer', userSelect: 'none' }}
        >
          Virgil
          {showTooltip && dashboardContext && (
            <div className="tooltip enhanced-context-tooltip">
              <div className="tooltip-content">
                <div className="tooltip-header">
                  <strong>🧠 Virgil's Context Awareness</strong>
                  <span className="last-updated">Updated: {dashboardContext.currentTime}</span>
                </div>
                
                {/* Time & Location Row */}
                <div className="context-row">
                  <div className="context-section">
                    <span className="context-icon">⏰</span>
                    <div className="context-details">
                      <div className="context-label">Time</div>
                      <div className="context-value">{dashboardContext.currentTime}</div>
                      <div className="context-meta">{dashboardContext.timeOfDay} • {dashboardContext.dayOfWeek}</div>
                    </div>
                  </div>
                  
                  {dashboardContext.location.city && (
                    <div className="context-section">
                      <span className="context-icon">📍</span>
                      <div className="context-details">
                        <div className="context-label">Location</div>
                        <div className="context-value">{dashboardContext.location.city}</div>
                        <div className="context-meta">
                          {dashboardContext.location.region || dashboardContext.location.country || 
                           (dashboardContext.location.hasGPS ? 'GPS' : 'IP-based')}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                
                {/* Weather & User Row */}
                {(dashboardContext.weather.hasData || dashboardContext.user.name) && (
                  <div className="context-row">
                    {dashboardContext.weather.hasData && (
                      <div className="context-section">
                        <span className="context-icon">🌤️</span>
                        <div className="context-details">
                          <div className="context-label">Weather</div>
                          <div className="context-value">
                            {dashboardContext.weather.temperature}°{dashboardContext.weather.unit === 'fahrenheit' ? 'F' : 'C'}
                          </div>
                          <div className="context-meta">{dashboardContext.weather.description}</div>
                        </div>
                      </div>
                    )}
                    
                    {dashboardContext.user.isAuthenticated && (
                      <div className="context-section">
                        <span className="context-icon">👤</span>
                        <div className="context-details">
                          <div className="context-label">User</div>
                          <div className="context-value">
                            {dashboardContext.user.profile?.nickname || 
                             dashboardContext.user.profile?.fullName || 
                             dashboardContext.user.name || 
                             'User'}
                          </div>
                          <div className="context-meta">
                            Session: {Math.floor(dashboardContext.activity.timeSpentInSession / 60000)}m
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
                
                {/* Device & Apps Row */}
                {(dashboardContext.device.hasData || (dashboardContext.apps && Object.keys(dashboardContext.apps.apps).length > 0)) && (
                  <div className="context-row">
                    {dashboardContext.device.hasData && (
                      <div className="context-section">
                        <span className="context-icon">💻</span>
                        <div className="context-details">
                          <div className="context-label">Device</div>
                          <div className="context-value">{dashboardContext.device.browser || 'Browser'}</div>
                          <div className="context-meta">{dashboardContext.device.os || dashboardContext.environment.deviceType}</div>
                        </div>
                      </div>
                    )}
                    
                    {dashboardContext.apps && Object.keys(dashboardContext.apps.apps).length > 0 && (
                      <div className="context-section">
                        <span className="context-icon">📱</span>
                        <div className="context-details">
                          <div className="context-label">Active Apps</div>
                          <div className="context-value">{dashboardContext.apps.activeApps.length} active</div>
                          <div className="context-meta">
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
                  <div className="context-row">
                    <div className="context-section full-width">
                      <span className="context-icon">🎯</span>
                      <div className="context-details">
                        <div className="context-label">Recent Activity</div>
                        <div className="context-value">
                          {dashboardContext.activity.recentActions[dashboardContext.activity.recentActions.length - 1]}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                
                {systemPromptInfo.hasCustomPrompt && (
                  <div className="custom-prompt-indicator">
                    ✏️ Custom prompt active
                  </div>
                )}
              </div>
            </div>
          )}
          
          {/* Fallback for when no context is available */}
          {showTooltip && !dashboardContext && (
            <div className="tooltip">
              <div className="tooltip-content">
                <strong>System Prompt:</strong>
                <p>{systemPromptInfo.prompt}</p>
                {systemPromptInfo.hasCustomPrompt && (
                  <small style={{ color: 'var(--color-active)', marginTop: '8px', display: 'block' }}>
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
          className="status-pill new-chat-pill"
          onClick={onNewChat}
          title={messageCount > 0 ? 'Start a new conversation (current one will be saved to memory)' : 'Start a new conversation'}
        >
          ✨ NEW
        </button>
      </div>

      {/* Window Controls */}
      <div className="header-right">
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
