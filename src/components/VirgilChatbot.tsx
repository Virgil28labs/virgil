import { useEffect, useCallback, memo } from 'react';

import { useAuth } from '../hooks/useAuth';
import { useFocusManagement } from '../hooks/useFocusManagement';
import { useKeyboardNavigation } from '../hooks/useKeyboardNavigation';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { useContextSync } from '../hooks/useContextSync';
import { useMemoryService } from '../hooks/useMemoryService';
import { useDashboardContext } from '../hooks/useDashboardContext';
import { useSystemPrompt } from '../hooks/useSystemPrompt';
import { useMessageHandling } from '../hooks/useMessageHandling';
import { useDataExport } from '../hooks/useDataExport';
import {
  ChatHeader,
  ChatMessages,
  ChatInput,
  MemoryModal,
  ChatProvider,
  useChatContext,
} from './chat';
import type { ModelOption } from '../types/chat.types';
import './VirgilChatbot.css';

// Available models - defined at module level for reuse
const AVAILABLE_MODELS: ModelOption[] = [
  { id: 'gpt-4.1-mini', name: 'GPT-4.1 Mini', description: 'Fast and efficient' },
  { id: 'gpt-4.1', name: 'GPT-4.1', description: 'Most capable model' },
  { id: 'o4-mini', name: 'o4 Mini', description: 'Optimized reasoning' },
];

// Inner component that uses the context
function VirgilChatbotInner() {
  const { state, dispatch, setOpen, setWindowSize, addMessage, setInput, setTyping, setError, clearMessages, newChat } = useChatContext();
  const { user } = useAuth();

  // Use custom hooks for cleaner code
  useContextSync();

  // Focus management for chatbot modal
  const { containerRef: chatContainerRef } = useFocusManagement(state.isOpen, {
    autoFocus: true,
    restoreFocus: true,
    trapFocus: true,
    initialFocusSelector: 'input[type="text"]',
  });

  // Keyboard navigation for quick actions and model dropdown
  const { containerRef: keyboardNavRef } = useKeyboardNavigation({
    enabled: state.isOpen,
    onEscape: () => setOpen(false),
    onEnter: (element) => {
      if (element.classList.contains('quick-btn')) {
        element.click();
      } else if (element.classList.contains('model-option')) {
        element.click();
      }
    },
  });

  // Use custom hooks for complex logic
  const { markAsImportant, loadRecentMessages } = useMemoryService({
    dispatch,
    setError,
    dashboardContext: state.dashboardContext,
  });

  useDashboardContext({ dispatch });

  const { createSystemPrompt, createSystemPromptSync } = useSystemPrompt({
    user,
    customSystemPrompt: state.customSystemPrompt,
    memoryContext: state.memoryContext,
    dashboardContext: state.dashboardContext,
    contextualSuggestions: state.contextualSuggestions,
  });

  const {
    sendMessage: _sendMessage,
    handleSubmit,
    handleKeyDown,
    handleQuickAction,
    inputRef,
  } = useMessageHandling({
    selectedModel: state.selectedModel,
    messages: state.messages,
    createSystemPrompt,
    addMessage,
    setInput,
    setError,
    setTyping,
    isTyping: state.isTyping,
    input: state.input,
  });

  const { handleExportMessages } = useDataExport({
    user,
    messages: state.messages,
  });

  // Load recent messages from continuous conversation on mount
  useEffect(() => {
    if (state.messages.length === 0) {
      loadRecentMessages();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only on mount - we intentionally only want this to run once

  // Use localStorage hook for selected model
  const [, setStoredModel] = useLocalStorage('virgil-selected-model', 'gpt-4.1-mini');

  const handleModelChange = useCallback((modelId: string) => {
    dispatch({ type: 'SET_MODEL', payload: modelId });
    setStoredModel(modelId);
  }, [dispatch, setStoredModel]);

  const handleSizeToggle = useCallback(() => {
    const sizes: ('normal' | 'large' | 'fullscreen')[] = ['normal', 'large', 'fullscreen'];
    const currentIndex = sizes.indexOf(state.windowSize);
    const nextSize = sizes[(currentIndex + 1) % sizes.length];
    setWindowSize(nextSize);
  }, [state.windowSize, setWindowSize]);

  const handleNewChat = useCallback(async () => {
    // In continuous conversation model, we don't need to save before clearing
    // Messages are saved in real-time as they're added
    newChat();
  }, [newChat]);

  // Use localStorage hook for system prompt
  const [, setStoredSystemPrompt] = useLocalStorage('virgil-custom-system-prompt', '');

  const handleSystemPromptSave = useCallback(() => {
    setStoredSystemPrompt(state.customSystemPrompt);
  }, [state.customSystemPrompt, setStoredSystemPrompt]);

  const handleMinimize = useCallback(() => {
    setOpen(false);
  }, [setOpen]);

  const handleErrorDismiss = useCallback(() => {
    setError(null);
  }, [setError]);

  const handleMemoryModalOpen = useCallback(() => {
    dispatch({ type: 'SET_MEMORY_MODAL', payload: true });
  }, [dispatch]);

  const handleMemoryModalClose = useCallback(() => {
    dispatch({ type: 'SET_MEMORY_MODAL', payload: false });
  }, [dispatch]);

  const handleSystemPromptChange = useCallback((prompt: string) => {
    dispatch({ type: 'SET_SYSTEM_PROMPT', payload: prompt });
  }, [dispatch]);

  // The handleSubmit and handleKeyDown are now provided by useMessageHandling hook

  if (!state.isOpen) {
    return (
      <button
        className="virgil-chatbot-bubble"
        onClick={() => setOpen(true)}
        title="Chat with Virgil AI Assistant"
        aria-label="Open chat with Virgil AI Assistant"
        aria-expanded="false"
        role="button"
      >
        <div className="chat-icon" aria-hidden="true">
          <div className="chat-line" />
          <div className="chat-line" />
        </div>
        <div className="pulse-ring" aria-hidden="true" />
      </button>
    );
  }

  return (
    <div
      ref={(el) => {
        if (chatContainerRef) chatContainerRef.current = el;
        if (keyboardNavRef) keyboardNavRef.current = el;
      }}
      className={`virgil-chatbot-container ${state.windowSize}`}
      role="dialog"
      aria-label="Virgil AI Assistant"
      aria-modal="true"
    >
      <ChatHeader
        windowSize={state.windowSize}
        onSizeToggle={handleSizeToggle}
        onMinimize={handleMinimize}
        selectedModel={state.selectedModel}
        onModelChange={handleModelChange}
        models={AVAILABLE_MODELS}
        showMemoryIndicator={state.showMemoryIndicator}
        markedMemories={state.markedMemories}
        recentConversations={state.recentConversations}
        onMemoryModalOpen={handleMemoryModalOpen}
        dashboardContext={state.dashboardContext}
        customSystemPrompt={state.customSystemPrompt}
        onSystemPromptChange={handleSystemPromptChange}
        onSystemPromptSave={handleSystemPromptSave}
        onNewChat={handleNewChat}
        messageCount={state.messages.length}
        onClearMessages={clearMessages}
        onExportMessages={handleExportMessages}
        createSystemPrompt={createSystemPromptSync}
      />

      <ChatMessages
        messages={state.messages}
        error={state.error}
        onErrorDismiss={handleErrorDismiss}
        onMarkAsImportant={markAsImportant}
        user={user}
        lastConversation={state.lastConversation}
        isTyping={state.isTyping}
      />

      <ChatInput
        input={state.input}
        onInputChange={setInput}
        onSubmit={handleSubmit}
        onKeyDown={handleKeyDown}
        isTyping={state.isTyping}
        error={state.error}
        onQuickAction={handleQuickAction}
        showQuickActions={state.messages.length === 0}
        dashboardContext={state.dashboardContext}
        shouldFocus={state.isOpen}
        externalInputRef={inputRef}
      />

      <MemoryModal
        isOpen={state.showMemoryModal}
        onClose={handleMemoryModalClose}
        markedMemories={state.markedMemories}
        recentConversations={state.recentConversations}
        onMemoriesUpdate={(memories) => dispatch({ type: 'SET_MEMORY_DATA', payload: { markedMemories: memories } })}
        onConversationsUpdate={(conversations) => dispatch({ type: 'SET_MEMORY_DATA', payload: { recentConversations: conversations } })}
        onMemoryContextUpdate={(context) => dispatch({ type: 'SET_MEMORY_DATA', payload: { memoryContext: context } })}
        onMemoryIndicatorUpdate={(show) => dispatch({ type: 'SET_MEMORY_DATA', payload: { showMemoryIndicator: show } })}
      />
    </div>
  );
}

// Wrapper component that provides the context - wrapped with memo for performance
const VirgilChatbot = memo(function VirgilChatbot() {
  return (
    <ChatProvider>
      <VirgilChatbotInner />
    </ChatProvider>
  );
});

export { VirgilChatbot };
export default VirgilChatbot;
