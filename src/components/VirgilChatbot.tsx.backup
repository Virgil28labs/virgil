import { useState, useRef, useEffect, memo, useCallback, useMemo } from 'react';
import type { FormEvent, KeyboardEvent } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useLocation } from '../contexts/LocationContext';
import { useWeather } from '../contexts/WeatherContext';
import type { ChatMessage, ModelOption } from '../types/chat.types';
import { SkeletonLoader } from './SkeletonLoader';
import { dedupeFetch } from '../lib/requestDeduplication';
import { useFocusManagement } from '../hooks/useFocusManagement';
import { useKeyboardNavigation } from '../hooks/useKeyboardNavigation';
import { memoryService, MemoryService, type StoredConversation, type MarkedMemory } from '../services/MemoryService';
import { dashboardContextService, type DashboardContext, type ContextualSuggestion } from '../services/DashboardContextService';
import { DynamicContextBuilder } from '../services/DynamicContextBuilder';
import { dashboardAppService } from '../services/DashboardAppService';
import './VirgilChatbot.css';

const VirgilChatbot = memo(function VirgilChatbot() {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState<string>('');
  const [isTyping, setIsTyping] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedModel, setSelectedModel] = useState<string>('gpt-4.1-mini');
  const [showModelDropdown, setShowModelDropdown] = useState<boolean>(false);
  const [showProfileDropdown, setShowProfileDropdown] = useState<boolean>(false);
  const [showTooltip, setShowTooltip] = useState<boolean>(false);
  const [customSystemPrompt, setCustomSystemPrompt] = useState<string>(() => {
    // Load from localStorage on component mount
    try {
      return localStorage.getItem('virgil-custom-system-prompt') || '';
    } catch {
      return '';
    }
  });
  
  // Memory-related state
  const [lastConversation, setLastConversation] = useState<StoredConversation | null>(null);
  const [markedMemories, setMarkedMemories] = useState<MarkedMemory[]>([]);
  const [showMemoryIndicator, setShowMemoryIndicator] = useState<boolean>(false);
  const [memoryContext, setMemoryContext] = useState<string>('');
  const [showMemoryModal, setShowMemoryModal] = useState<boolean>(false);
  const [recentConversations, setRecentConversations] = useState<StoredConversation[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [dashboardContext, setDashboardContext] = useState<DashboardContext | null>(null);
  const [contextualSuggestions, setContextualSuggestions] = useState<ContextualSuggestion[]>([]);
  
  // Window control state
  const [windowSize, setWindowSize] = useState<'normal' | 'large' | 'fullscreen'>(() => {
    try {
      const saved = localStorage.getItem('virgil-window-size') as 'normal' | 'large' | 'fullscreen';
      return saved || 'normal';
    } catch {
      return 'normal';
    }
  });
  
  const { user } = useAuth();
  const { address, ipLocation, hasGPSLocation, coordinates } = useLocation();
  const { data: weatherData, unit: weatherUnit } = useWeather();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Responsive and viewport hooks (currently unused but may be needed for mobile-specific behavior)
  // const { isMobile, isTouchDevice } = useResponsive();
  // const { isKeyboardOpen } = useViewport();

  // Focus management for chatbot modal
  const { containerRef: chatContainerRef } = useFocusManagement(isOpen, {
    autoFocus: true,
    restoreFocus: true,
    trapFocus: true,
    initialFocusSelector: 'input[type="text"]',
  });

  // Keyboard navigation for quick actions and model dropdown
  const { containerRef: keyboardNavRef } = useKeyboardNavigation({
    enabled: isOpen,
    onEscape: () => setIsOpen(false),
    onEnter: (element) => {
      if (element.classList.contains('quick-btn')) {
        element.click();
      } else if (element.classList.contains('model-option')) {
        element.click();
      }
    },
  });

  // Available models - memoized to prevent recreation on every render
  const models = useMemo<ModelOption[]>(() => [
    { id: 'gpt-4.1-mini', name: 'GPT-4.1 Mini', description: 'Fast and efficient' },
    { id: 'gpt-4.1', name: 'GPT-4.1', description: 'Most capable model' },
    { id: 'o4-mini', name: 'o4 Mini', description: 'Optimized reasoning' },
  ], []);

  // Load saved model from localStorage
  useEffect(() => {
    try {
      const savedModel = localStorage.getItem('virgil-selected-model');
      if (savedModel && models.find(m => m.id === savedModel)) {
        setSelectedModel(savedModel);
      }
    } catch {
      // Ignore localStorage errors
    }
  }, []);

  // Initialize memory service and load memory data
  useEffect(() => {
    const initMemory = async () => {
      try {
        await memoryService.init();
        
        // Load last conversation
        const lastConv = await memoryService.getLastConversation();
        setLastConversation(lastConv);
        
        // Load marked memories
        const memories = await memoryService.getMarkedMemories();
        setMarkedMemories(memories);
        
        // Load recent conversations
        const conversations = await memoryService.getRecentConversations(10);
        setRecentConversations(conversations);
        
        // Get context for prompt
        const context = await memoryService.getContextForPrompt();
        setMemoryContext(context);
        
        // Show indicator if we have memory context
        setShowMemoryIndicator(!!context);
      } catch (error) {
        console.error('Failed to initialize memory service:', error);
      }
    };
    
    initMemory();
  }, []);

  // Initialize dashboard context service
  useEffect(() => {
    // Subscribe to context updates
    const unsubscribe = dashboardContextService.subscribe((context) => {
      setDashboardContext(context);
      const suggestions = dashboardContextService.generateSuggestions();
      setContextualSuggestions(suggestions);
    });

    // Get initial context
    setDashboardContext(dashboardContextService.getContext());
    setContextualSuggestions(dashboardContextService.generateSuggestions());

    return unsubscribe;
  }, []);

  // Update context service with external data
  useEffect(() => {
    dashboardContextService.updateLocationContext({
      address,
      ipLocation,
      hasGPSLocation,
      coordinates,
      loading: false,
      error: null,
      permissionStatus: 'granted',
      hasLocation: !!(coordinates || ipLocation),
      hasIPLocation: !!ipLocation,
      initialized: true,
      lastUpdated: Date.now(),
      fetchLocationData: () => Promise.resolve(),
      requestLocationPermission: () => Promise.resolve(),
      clearError: () => {},
    });
  }, [address, ipLocation, hasGPSLocation, coordinates]);

  useEffect(() => {
    dashboardContextService.updateWeatherContext({
      data: weatherData,
      unit: weatherUnit,
      loading: false,
      error: null,
      fetchWeather: () => Promise.resolve(),
      toggleUnit: () => {},
      clearError: () => {},
      hasWeather: !!weatherData,
      forecast: null,
      lastUpdated: weatherData ? Date.now() : null,
    });
  }, [weatherData, weatherUnit]);

  useEffect(() => {
    dashboardContextService.updateUserContext({
      user,
      loading: false,
      signOut: () => Promise.resolve({ error: undefined }),
      refreshUser: () => Promise.resolve(),
    });
  }, [user]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isTyping]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // Save conversation when chat is closed (but keep messages for persistence)
  useEffect(() => {
    if (!isOpen && messages.length > 0) {
      const saveConversation = async () => {
        try {
          await memoryService.saveConversation(messages);
          // Keep messages in state for persistence - don't clear them
        } catch (error) {
          console.error('Failed to save conversation:', error);
        }
      };
      
      saveConversation();
    }
  }, [isOpen, messages]);

  // Persist active conversation to localStorage
  useEffect(() => {
    if (messages.length > 0) {
      try {
        localStorage.setItem('virgil-active-conversation', JSON.stringify(messages));
      } catch (error) {
        console.error('Failed to save active conversation:', error);
      }
    } else {
      // Clear localStorage when no messages
      localStorage.removeItem('virgil-active-conversation');
    }
  }, [messages]);

  // Load persisted conversation on mount
  useEffect(() => {
    const loadPersistedConversation = async () => {
      try {
        // Priority: localStorage active session > memory service > empty
        const savedMessages = localStorage.getItem('virgil-active-conversation');
        if (savedMessages) {
          const parsedMessages = JSON.parse(savedMessages);
          if (parsedMessages.length > 0) {
            setMessages(parsedMessages);
            return;
          }
        }
        
        // Fallback to memory service if no active session
        const lastConv = await memoryService.getLastConversation();
        if (lastConv && lastConv.messages && lastConv.messages.length > 0) {
          // Only load if conversation is recent (within 24 hours)
          const isRecent = lastConv.timestamp && (Date.now() - lastConv.timestamp) < 24 * 60 * 60 * 1000;
          if (isRecent) {
            setMessages(lastConv.messages);
          }
        }
      } catch (error) {
        console.error('Failed to load persisted conversation:', error);
      }
    };

    // Only load on initial mount
    if (messages.length === 0) {
      loadPersistedConversation();
    }
  }, []); // Empty dependency array for mount-only execution

  // System prompt is now managed directly in this component

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showModelDropdown && !(event.target as Element)?.closest('.model-selector')) {
        setShowModelDropdown(false);
      }
      if (showProfileDropdown && !(event.target as Element)?.closest('.profile-selector')) {
        setShowProfileDropdown(false);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [showModelDropdown, showProfileDropdown]);

  // Memoized static parts of system prompt (performance optimization)
  const staticPromptParts = useMemo(() => {
    const memberSince = user?.created_at ? new Date(user.created_at).toLocaleDateString() : null;
    
    const staticUserContext = user ? `
CURRENT USER CONTEXT:
- Authentication status: Logged in
- Current page: Dashboard
- User name: ${user.user_metadata?.name || 'Unknown'}
- Email: ${user.email}
${memberSince ? `- Member since: ${memberSince}` : ''}

LOCATION DATA:
- GPS Status: ${hasGPSLocation ? 'Available' : 'Not available'}
${coordinates ? `- Coordinates: ${coordinates.latitude.toFixed(6)}, ${coordinates.longitude.toFixed(6)}` : ''}
${coordinates ? `- GPS Accuracy: ${coordinates.accuracy.toFixed(0)} meters` : ''}
${address ? `
- Full Address: ${address.formatted}
- Street: ${address.street}
- House Number: ${address.house_number}
- City: ${address.city}
- Postcode: ${address.postcode}
- Country: ${address.country}` : ''}
${ipLocation ? `
- IP Address: ${ipLocation.ip}
- IP Location: ${ipLocation.city}${ipLocation.region ? `, ${ipLocation.region}` : ''}${ipLocation.country ? `, ${ipLocation.country}` : ''}
- Timezone: ${ipLocation.timezone || 'Unknown'}` : ''}
${weatherData ? `
WEATHER DATA:
- Temperature: ${weatherData.temperature}°${weatherUnit === 'fahrenheit' ? 'F' : 'C'} (feels like ${weatherData.feelsLike}°${weatherUnit === 'fahrenheit' ? 'F' : 'C'})
- Conditions: ${weatherData.condition.description}
- Humidity: ${weatherData.humidity}%
- Wind: ${weatherData.windSpeed} mph
- Location: ${weatherData.cityName}${weatherData.country ? `, ${weatherData.country}` : ''}` : ''}

Provide contextual help based on what the user is currently experiencing.` : `
CURRENT USER CONTEXT:
- Authentication status: Not logged in
- Current page: Authentication page
- Location: Authentication flow

AVAILABLE ACTIONS:
- Sign up with name, email, and password
- Log in with existing credentials
- Toggle between login and signup forms

Provide contextual help based on what the user is currently experiencing.`;

    const basePrompt = customSystemPrompt || 'You are Virgil, a helpful assistant that provides contextual help and can search the web for current information.';
    
    return { basePrompt, staticUserContext };
  }, [user, hasGPSLocation, address, ipLocation, coordinates, weatherData, weatherUnit, customSystemPrompt]);

  const createSystemPrompt = useCallback((userQuery?: string) => {
    // Base prompt and static context
    const basePrompt = customSystemPrompt || 'You are Virgil, a helpful assistant that provides contextual help and can search the web for current information.';
    
    // Start with basic prompt structure
    let systemPrompt = basePrompt + ' ' + staticPromptParts.staticUserContext;

    // Add memory context if available
    if (memoryContext) {
      systemPrompt += `\n\nMEMORY CONTEXT:${memoryContext}`;
    }

    // Add smart contextual awareness using DynamicContextBuilder
    if (userQuery && dashboardContext) {
      const enhancedPrompt = DynamicContextBuilder.buildEnhancedPrompt(
        systemPrompt,
        userQuery,
        dashboardContext,
        contextualSuggestions
      );
      systemPrompt = enhancedPrompt.enhancedPrompt;

      // Log activity for context service
      dashboardContextService.logActivity(`Asked: "${userQuery.slice(0, 50)}..."`, 'virgil-chat');
    }

    // Add response rules
    const responseRules = `

RESPONSE RULES:
- Keep responses extremely short and to the point
- Use the contextual awareness to provide relevant, personalized responses
- For time queries, provide current time with context
- For weather queries, be specific about current conditions
- For location queries, use available location data
- When you have contextual information, use it naturally in responses
- For dashboard app queries (notes, habits, pomodoro), use the provided app data to give specific answers
- Be conversational but concise
- No explanations unless specifically requested`;
    
    return systemPrompt + responseRules;
  }, [staticPromptParts, memoryContext, dashboardContext, contextualSuggestions, customSystemPrompt]);

  const handleModelChange = useCallback((modelId: string) => {
    setSelectedModel(modelId);
    try {
      localStorage.setItem('virgil-selected-model', modelId);
    } catch {
      // Ignore localStorage errors
    }
    setShowModelDropdown(false);
  }, []);

  const getCurrentModel = useCallback(() => {
    return models.find(m => m.id === selectedModel) || models[0];
  }, [selectedModel]);

  // Window control handlers
  const handleMinimize = useCallback(() => {
    setIsOpen(false);
  }, []);

  const handleSizeToggle = useCallback(() => {
    const sizes: ('normal' | 'large' | 'fullscreen')[] = ['normal', 'large', 'fullscreen'];
    const currentIndex = sizes.indexOf(windowSize);
    const nextSize = sizes[(currentIndex + 1) % sizes.length];
    setWindowSize(nextSize);
    try {
      localStorage.setItem('virgil-window-size', nextSize);
    } catch {
      // Ignore localStorage errors
    }
  }, [windowSize]);

  const handleNewChat = useCallback(async () => {
    if (messages.length > 0) {
      try {
        // Save current conversation to memory before clearing
        await memoryService.saveConversation(messages);
      } catch (error) {
        console.error('Failed to save conversation before starting new chat:', error);
      }
    }
    
    // Clear current conversation
    setMessages([]);
    localStorage.removeItem('virgil-active-conversation');
  }, [messages]);

  const sendMessage = useCallback(async (messageText: string) => {
    if (!messageText.trim()) return;

    const userMessage: ChatMessage = {
      id: Date.now() + '-user',
      role: 'user',
      content: messageText,
      timestamp: new Date().toISOString(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setError(null);
    
    // Refocus the input field after sending message
    setTimeout(() => inputRef.current?.focus(), 0);

    try {
      setIsTyping(true);

      // Check if any dashboard apps can directly answer this query
      const appResponse = await dashboardAppService.getResponseForQuery(messageText);
      if (appResponse) {
        // Add app-specific response
        const appMessage: ChatMessage = {
          id: Date.now() + '-assistant',
          role: 'assistant',
          content: appResponse.response,
          timestamp: new Date().toISOString(),
        };
        setMessages(prev => [...prev, appMessage]);
        setIsTyping(false);
        // Refocus input after app response
        setTimeout(() => inputRef.current?.focus(), 0);
        return;
      }

      // Use our secure backend API instead of calling OpenAI directly
      const chatApiUrl = import.meta.env.VITE_LLM_API_URL || 'http://localhost:5002/api/v1';
      
      // Prepare messages with contextual awareness
      const systemPrompt = createSystemPrompt(messageText);

      const response = await dedupeFetch(`${chatApiUrl}/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: selectedModel,
          messages: [
            { role: 'system', content: systemPrompt },
            ...messages.map(msg => ({ role: msg.role, content: msg.content })),
            { role: 'user', content: messageText },
          ],
          max_tokens: 200,
          temperature: 0.7,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Chat service error: ${response.status}`);
      }

      const data = await response.json();
      
      if (!data.success || !data.message) {
        throw new Error('Invalid response from chat service');
      }

      const assistantMessage: ChatMessage = {
        id: Date.now() + '-assistant',
        role: 'assistant', 
        content: data.message.content,
        timestamp: new Date().toISOString(),
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (err) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Chat error:', err);
      }
      setError(err instanceof Error ? err.message : 'An error occurred');
      
      // Add fallback message
      const fallbackMessage: ChatMessage = {
        id: Date.now() + '-fallback',
        role: 'assistant',
        content: "I'm having trouble connecting right now. Please try again in a moment!",
        timestamp: new Date().toISOString(),
      };
      
      setMessages(prev => [...prev, fallbackMessage]);
    } finally {
      setIsTyping(false);
      // Refocus input after response is complete
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [selectedModel, createSystemPrompt, messages]);

  const handleSubmit = useCallback((e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (input.trim() && !isTyping) {
      sendMessage(input);
    }
  }, [input, sendMessage, isTyping]);

  const handleKeyDown = useCallback((e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && !isTyping && input.trim()) {
      e.preventDefault();
      sendMessage(input);
    }
  }, [input, sendMessage, isTyping]);

  const handleQuickAction = useCallback((action: string) => {
    sendMessage(action);
  }, [sendMessage]);

  const quickActions = useMemo(() => {
    const baseActions = [
      'Tell me about Virgil',
      'How do I use this app?',
      'What can you do?',
    ];

    // Add contextual quick actions based on current state
    const contextualActions: string[] = [];
    
    if (dashboardContext) {
      // Add time-based quick actions
      if (dashboardContext.timeOfDay === 'morning') {
        contextualActions.push('What\'s the plan for today?');
      } else if (dashboardContext.timeOfDay === 'evening') {
        contextualActions.push('How was my day?');
      }

      // Add weather-based quick actions
      if (dashboardContext.weather.hasData) {
        contextualActions.push('What\'s the weather like?');
      }

      // Add location-based quick actions
      if (dashboardContext.location.hasGPS) {
        contextualActions.push('What\'s nearby?');
      }
    }

    // Combine and limit to 4 total actions
    return [...contextualActions.slice(0, 2), ...baseActions].slice(0, 4);
  }, [dashboardContext]);

  // Function to mark a message as important
  const markAsImportant = useCallback(async (message: ChatMessage) => {
    try {
      // Create rich context for the memory
      let context = `From conversation on ${new Date().toLocaleDateString()}`;
      if (dashboardContext) {
        context = DynamicContextBuilder.createContextSummary(dashboardContext);
      }
      await memoryService.markAsImportant(message.id, message.content, context);
      
      // Reload marked memories
      const memories = await memoryService.getMarkedMemories();
      setMarkedMemories(memories);
      
      // Update memory context
      const newContext = await memoryService.getContextForPrompt();
      setMemoryContext(newContext);
      setShowMemoryIndicator(true);
      
      // Show feedback (could add a toast notification here)
      console.log('Message marked as important');
    } catch (error) {
      console.error('Failed to mark message as important:', error);
    }
  }, [dashboardContext]);

  if (!isOpen) {
    return (
      <button
        className="virgil-chatbot-bubble"
        onClick={() => setIsOpen(true)}
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
      className={`virgil-chatbot-container ${windowSize}`}
      role="dialog"
      aria-label="Virgil AI Assistant"
      aria-modal="true"
    >
      {/* Header */}
      <div className="chatbot-header">
        <div className="header-left">
          <div 
            className="assistant-name clickable-logo"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setIsOpen(false);
            }}
            onMouseEnter={() => setShowTooltip(true)}
            onMouseLeave={() => setShowTooltip(false)}
            title="Click to close chat or hover to see system prompt"
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                e.stopPropagation();
                setIsOpen(false);
              }
            }}
            aria-label="Close chat or view system prompt"
            style={{ cursor: 'pointer', userSelect: 'none' }}
          >
            Virgil
            {showTooltip && (
              <div className="tooltip">
                <div className="tooltip-content">
                  <strong>Current System Prompt:</strong>
                  <p>{createSystemPrompt()}</p>
                  {customSystemPrompt && (
                    <small style={{ color: '#ff9f43', marginTop: '8px', display: 'block' }}>
                      ✏️ Custom prompt active
                    </small>
                  )}
                </div>
              </div>
            )}
          </div>
          {(showMemoryIndicator || dashboardContext || messages.length > 0) && (
            <div className="status-cluster">
              {showMemoryIndicator && (
                <button 
                  className="status-pill memory-pill"
                  onClick={() => setShowMemoryModal(true)}
                  title="Memory Active - View conversations"
                >
                  🧠 MEM
                </button>
              )}
              {dashboardContext && (
                <div 
                  className="status-pill context-pill"
                  title={`Context Aware: ${dashboardContext.timeOfDay}${dashboardContext.weather.hasData ? ', weather' : ''}${dashboardContext.location.hasGPS ? ', location' : ''}`}
                >
                  🎯 CTX
                </div>
              )}
            </div>
          )}
          <div className="model-selector">
            <button 
              className="model-dropdown-btn compact"
              onClick={() => setShowModelDropdown(!showModelDropdown)}
            >
              {getCurrentModel().name.replace('GPT-', '').replace(' Mini', '')}
              <span className="dropdown-arrow">▼</span>
            </button>
            {showModelDropdown && (
              <div className="model-dropdown">
                {models.map(model => (
                  <div
                    key={model.id}
                    className={`model-option ${selectedModel === model.id ? 'selected' : ''}`}
                    onClick={() => handleModelChange(model.id)}
                    data-keyboard-nav
                    tabIndex={0}
                    role="option"
                    aria-selected={selectedModel === model.id}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        handleModelChange(model.id);
                      }
                    }}
                  >
                    <div className="model-name">{model.name}</div>
                    <div className="model-description">{model.description}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="profile-selector">
            <button 
              className="status-pill edit-pill"
              onClick={() => setShowProfileDropdown(!showProfileDropdown)}
              title="System Prompt Editor"
            >
              ⚙️ EDIT
            </button>
            {showProfileDropdown && (
              <div className="profile-dropdown">
                <div className="profile-section">
                  <div className="section-title">System Prompt Editor</div>
                  <textarea
                    value={customSystemPrompt}
                    onChange={(e) => setCustomSystemPrompt(e.target.value)}
                    placeholder="Enter custom system prompt for Virgil..."
                    className="chatbot-prompt-textarea"
                    rows={6}
                  />
                  
                  <div className="chatbot-prompt-actions">
                    <button 
                      className="chatbot-prompt-btn save"
                      onClick={() => {
                        try {
                          localStorage.setItem('virgil-custom-system-prompt', customSystemPrompt);
                        } catch {
                          // Ignore localStorage errors
                        }
                        setShowProfileDropdown(false);
                      }}
                    >
                      💾 Save
                    </button>
                    <button 
                      className="chatbot-prompt-btn reset"
                      onClick={() => {
                        const defaultPrompt = 'You are Virgil, a helpful assistant that provides contextual help and can search the web for current information.';
                        setCustomSystemPrompt(defaultPrompt);
                      }}
                    >
                      🔄 Default
                    </button>
                  </div>
                  
                  <div className="chatbot-prompt-info">
                    <small>
                      Length: {customSystemPrompt.length} characters
                      {customSystemPrompt && (
                        <span className="prompt-active"> • Custom prompt active</span>
                      )}
                    </small>
                  </div>
                </div>

                <div className="profile-section">
                  <div className="section-title">Chat Actions</div>
                  <button
                    className="profile-action"
                    onClick={() => {
                      if (confirm('Clear all chat messages?')) {
                        setMessages([]);
                        setShowProfileDropdown(false);
                      }
                    }}
                  >
                    <span className="action-icon">🗑️</span>
                    Clear Chat History
                  </button>
                  <button
                    className="profile-action"
                    onClick={() => {
                      const chatData = {
                        exportedAt: new Date().toISOString(),
                        user: user?.user_metadata?.name || 'Unknown',
                        messages: messages,
                        totalMessages: messages.length,
                      };
                      const blob = new Blob([JSON.stringify(chatData, null, 2)], { type: 'application/json' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = `virgil-chat-${new Date().toISOString().split('T')[0]}.json`;
                      a.click();
                      URL.revokeObjectURL(url);
                      setShowProfileDropdown(false);
                    }}
                  >
                    <span className="action-icon">💾</span>
                    Export Chat Messages
                  </button>
                </div>
              </div>
            )}
          </div>
          <button
            className="status-pill new-chat-pill"
            onClick={handleNewChat}
            title={messages.length > 0 ? "Start a new conversation (current one will be saved to memory)" : "Start a new conversation"}
          >
            ✨ NEW
          </button>
        </div>
        <div className="header-right">
          <div className="window-controls">
            <button
              className="minimize-btn"
              onClick={handleMinimize}
              title="Close to floating bubble"
              aria-label="Close to floating bubble"
            >
              —
            </button>
            <button
              className="size-toggle-btn"
              onClick={handleSizeToggle}
              title={`Current: ${windowSize} - Click to toggle`}
              aria-label={`Toggle window size (current: ${windowSize})`}
            >
              ⧉
            </button>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div 
        className="messages-area" 
        role="log" 
        aria-label="Chat messages"
        aria-live="polite"
        aria-atomic="false"
      >
        {messages.length === 0 && (
          <div className="welcome-msg">
            <div className="msg-avatar" aria-hidden="true">
              <span className="chatbot-avatar-v">V</span>
            </div>
            <div className="welcome-message-bubble" role="status">
              {lastConversation ? (
                <>
                  Welcome back, {user?.user_metadata?.name || 'there'}! 
                  {lastConversation.timestamp && (Date.now() - lastConversation.timestamp) < 24 * 60 * 60 * 1000 && (
                    <> I remember our chat about "{lastConversation.firstMessage}"</>
                  )}
                </>
              ) : (
                <>Good afternoon, {user?.user_metadata?.name || 'there'}!</>
              )}
            </div>
          </div>
        )}

        {messages.map((message) => (
          <div
            key={message.id}
            className={`message ${message.role === 'user' ? 'user-msg' : 'assistant-msg'}`}
            role="article"
            aria-label={`${message.role === 'user' ? 'Your message' : 'Virgil\'s response'}`}
          >
            {message.role === 'assistant' && (
              <div className="msg-avatar" aria-hidden="true">
                <span className="chatbot-avatar-v">V</span>
              </div>
            )}
            <div className="msg-content" role="text">
              {message.content}
              <button
                className="remember-btn"
                onClick={() => markAsImportant(message)}
                title="Remember this message"
                aria-label="Mark this message as important"
              >
                💡
              </button>
            </div>
          </div>
        ))}

        {isTyping && (
          <div className="message assistant-msg" role="status" aria-label="Virgil is typing">
            <div className="msg-avatar" aria-hidden="true">
              <span className="chatbot-avatar-v">V</span>
            </div>
            <div className="msg-content">
              <SkeletonLoader width="80%" height="16px" />
              <div className="typing-status">
                <span className="typing-indicator">💭 Thinking...</span>
              </div>
              <span className="sr-only">Virgil is typing a response</span>
            </div>
          </div>
        )}

        {error && (
          <div className="error-msg">
            <span>⚠️ {error}</span>
            <button onClick={() => setError(null)}>✕</button>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Quick Actions */}
      {messages.length === 0 && (
        <div className="quick-actions">
          <div className="quick-title">Quick help:</div>
          {quickActions.map((action, index) => (
            <button
              key={index}
              className="quick-btn"
              onClick={() => handleQuickAction(action)}
              data-keyboard-nav
              aria-label={`Quick action: ${action}`}
            >
              {action}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <form onSubmit={handleSubmit} className="input-area" role="form">
        <div className="input-wrapper">
          <label htmlFor="chat-input" className="sr-only">Type your message to Virgil</label>
          <input
            ref={inputRef}
            id="chat-input"
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type your message..."
            disabled={isTyping}
            className="msg-input"
            aria-label="Type your message to Virgil"
            aria-describedby={error ? 'chat-error' : undefined}
            autoComplete="off"
          />
          <button
            type="submit"
            disabled={!input.trim() || isTyping}
            className="send-btn"
            title="Send message"
            aria-label={isTyping ? 'Sending message' : 'Send message'}
          >
            {isTyping ? '•••' : '➤'}
          </button>
        </div>
      </form>

      {/* Memory Modal */}
      {showMemoryModal && (
        <div className="memory-modal-backdrop" onClick={() => setShowMemoryModal(false)}>
          <div className="memory-modal" onClick={(e) => e.stopPropagation()}>
            <div className="memory-modal-header">
              <h3>🧠 Memory & Conversations</h3>
              <button 
                className="close-btn"
                onClick={() => setShowMemoryModal(false)}
                title="Close memory viewer"
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
                    {markedMemories.length === 0 ? (
                      <div className="memory-empty">
                        No marked memories yet. Click the 💡 button on messages to remember them.
                      </div>
                    ) : (
                      markedMemories
                        .filter(memory => 
                          !searchQuery || 
                          memory.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          memory.context.toLowerCase().includes(searchQuery.toLowerCase()),
                        )
                        .map(memory => (
                          <div key={memory.id} className="memory-item">
                            <div className="memory-content">{memory.content}</div>
                            <div className="memory-meta">
                              <span className="memory-context">{memory.context}</span>
                              <span className="memory-time">
                                {MemoryService.timeAgo(memory.timestamp)}
                              </span>
                              <button
                                className="memory-delete"
                                onClick={async () => {
                                  await memoryService.forgetMemory(memory.id);
                                  const updatedMemories = await memoryService.getMarkedMemories();
                                  setMarkedMemories(updatedMemories);
                                  const newContext = await memoryService.getContextForPrompt();
                                  setMemoryContext(newContext);
                                  setShowMemoryIndicator(!!newContext);
                                }}
                                title="Forget this memory"
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
                    {recentConversations.length === 0 ? (
                      <div className="memory-empty">
                        No conversations yet.
                      </div>
                    ) : (
                      recentConversations
                        .filter(conv => 
                          !searchQuery || 
                          conv.firstMessage.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          conv.lastMessage.toLowerCase().includes(searchQuery.toLowerCase()),
                        )
                        .map(conv => (
                          <div key={conv.id} className="conversation-item">
                            <div className="conversation-preview">
                              <div className="conversation-first">"{conv.firstMessage}"</div>
                              <div className="conversation-last">"{conv.lastMessage}"</div>
                            </div>
                            <div className="conversation-meta">
                              <span className="conversation-count">{conv.messageCount} messages</span>
                              <span className="conversation-time">
                                {MemoryService.timeAgo(conv.timestamp)}
                              </span>
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
                  onClick={async () => {
                    const data = await memoryService.exportAllData();
                    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `virgil-memory-${new Date().toISOString().split('T')[0]}.json`;
                    a.click();
                    URL.revokeObjectURL(url);
                  }}
                >
                  💾 Export All Data
                </button>
                
                <button
                  className="memory-action-btn clear"
                  onClick={async () => {
                    if (confirm('Clear all memories and conversations? This cannot be undone.')) {
                      await memoryService.clearAllData();
                      setMarkedMemories([]);
                      setRecentConversations([]);
                      setLastConversation(null);
                      setMemoryContext('');
                      setShowMemoryIndicator(false);
                      setShowMemoryModal(false);
                    }
                  }}
                >
                  🗑️ Clear All Data
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

export { VirgilChatbot };
export default VirgilChatbot;