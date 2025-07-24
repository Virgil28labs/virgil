import { memo, useState, useCallback, useMemo } from 'react';
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
          {showTooltip && (
            <div className="tooltip">
              <div className="tooltip-content">
                <strong>Current System Prompt:</strong>
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