import { useState, useRef, useEffect, memo, useCallback, useMemo } from 'react';
import type { FormEvent, KeyboardEvent } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useLocation } from '../contexts/LocationContext';
import { useWeather } from '../contexts/WeatherContext';
import type { ChatMessage, ModelOption, SearchResponse } from '../types/chat.types';
import { SkeletonLoader } from './SkeletonLoader';
import { dedupeFetch } from '../lib/requestDeduplication';
import { searchService } from '../lib/searchService';
import { useFocusManagement } from '../hooks/useFocusManagement';
import { useKeyboardNavigation } from '../hooks/useKeyboardNavigation';
import './VirgilChatbot.css';

const VirgilChatbot = memo(function VirgilChatbot() {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState<string>('');
  const [isTyping, setIsTyping] = useState<boolean>(false);
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedModel, setSelectedModel] = useState<string>('gpt-4o-mini');
  const [showModelDropdown, setShowModelDropdown] = useState<boolean>(false);
  const [showProfileDropdown, setShowProfileDropdown] = useState<boolean>(false);
  const [showTooltip, setShowTooltip] = useState<boolean>(false);
  const [customSystemPrompt, setCustomSystemPrompt] = useState<string>(() => {
    // Load from localStorage on component mount
    try {
      return localStorage.getItem('virgil-custom-system-prompt') || ''
    } catch {
      return ''
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
    initialFocusSelector: 'input[type="text"]'
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
    }
  });

  // Available models - memoized to prevent recreation on every render
  const models = useMemo<ModelOption[]>(() => [
    { id: 'gpt-4o-mini', name: 'GPT-4o Mini', description: 'Fast and efficient' },
    { id: 'gpt-4o', name: 'GPT-4o', description: 'Most capable model' },
    { id: 'gpt-4-turbo', name: 'GPT-4 Turbo', description: 'Balanced performance' }
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

  // Auto-scroll to bottom
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isTyping, isSearching]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

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

    const basePrompt = customSystemPrompt || "You are Virgil, a helpful assistant that provides contextual help and can search the web for current information.";
    
    return { basePrompt, staticUserContext };
  }, [user, hasGPSLocation, address, ipLocation, coordinates, weatherData, weatherUnit, customSystemPrompt]);

  const createSystemPrompt = useCallback(() => {
    // Get current real-time data (only time-sensitive parts)
    const now = new Date();
    const currentTime = now.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
    const currentDate = now.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
    const currentDay = now.toLocaleDateString('en-US', {
      weekday: 'long'
    }).toLowerCase();

    // Combine static and dynamic parts
    const dynamicTimeContext = `
- Current time: ${currentTime}
- Current date: ${currentDate}
- Current day: ${currentDay}`;

    const responseRules = `
RESPONSE RULES:
- Keep responses extremely short and to the point
- For time queries, respond with current time: "${currentTime}"
- For date queries, respond with current date: "${currentDate}"
- For day queries, respond with current day: "${currentDay}"
- For weather queries, provide current conditions and temperature
- For location queries, provide specific requested data only
- For feature questions, explain controls concisely
- When you have web search results, use them to provide accurate, current information
- Include relevant links from search results when appropriate
- No explanations unless specifically requested
- Be direct and concise`;
    
    return `${staticPromptParts.basePrompt} ${staticPromptParts.staticUserContext.replace('- Current page: Dashboard', `- Current page: Dashboard${dynamicTimeContext}`)} ${responseRules}`;
  }, [staticPromptParts]);

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

  const sendMessage = useCallback(async (messageText: string) => {
    if (!messageText.trim()) return;

    const userMessage: ChatMessage = {
      id: Date.now() + '-user',
      role: 'user',
      content: messageText,
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setError(null);

    try {
      let searchResults: SearchResponse | null = null;
      
      // Check if message needs web search
      if (searchService.detectSearchIntent(messageText)) {
        setIsSearching(true);
        try {
          const searchQuery = searchService.extractSearchQuery(messageText);
          searchResults = await searchService.search({
            query: searchQuery,
            max_results: 3
          });
        } catch (searchError) {
          if (process.env.NODE_ENV === 'development') {
            console.warn('Search failed, continuing with regular chat:', searchError);
          }
        } finally {
          setIsSearching(false);
        }
      }
      
      setIsTyping(true);

      // Use our secure backend API instead of calling OpenAI directly
      const chatApiUrl = import.meta.env.VITE_LLM_API_URL || 'http://localhost:5002/api/v1';
      
      // Prepare messages with search context if available
      let systemPrompt = createSystemPrompt();
      if (searchResults) {
        systemPrompt += `\n\nWEB SEARCH RESULTS for "${searchResults.query}":`;
        if (searchResults.answer) {
          systemPrompt += `\nSummary: ${searchResults.answer}`;
        }
        if (searchResults.results.length > 0) {
          systemPrompt += `\nSources:`;
          searchResults.results.forEach((result, index) => {
            systemPrompt += `\n${index + 1}. ${result.title} (${result.url}): ${result.content.substring(0, 200)}...`;
          });
        }
        systemPrompt += `\n\nUse this search information to provide a comprehensive answer. Include relevant links when appropriate.`;
      }

      const response = await dedupeFetch(`${chatApiUrl}/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: selectedModel,
          messages: [
            { role: 'system', content: systemPrompt },
            ...messages.map(msg => ({ role: msg.role, content: msg.content })),
            { role: 'user', content: messageText }
          ],
          max_tokens: searchResults ? 400 : 200,
          temperature: 0.7
        })
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
        timestamp: new Date().toISOString()
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
        timestamp: new Date().toISOString()
      };
      
      setMessages(prev => [...prev, fallbackMessage]);
    } finally {
      setIsTyping(false);
      setIsSearching(false);
    }
  }, [selectedModel, createSystemPrompt, messages]);

  const handleSubmit = useCallback((e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (input.trim() && !isTyping && !isSearching) {
      sendMessage(input);
    }
  }, [input, sendMessage, isTyping, isSearching]);

  const handleKeyDown = useCallback((e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && !isTyping && !isSearching && input.trim()) {
      e.preventDefault();
      sendMessage(input);
    }
  }, [input, sendMessage, isTyping, isSearching]);

  const handleQuickAction = useCallback((action: string) => {
    sendMessage(action);
  }, [sendMessage]);

  const quickActions = useMemo(() => [
    "Tell me about Virgil",
    "How do I use this app?",
    "Search for latest news",
    "What can you do?"
  ], []);

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
          <div className="chat-line"></div>
          <div className="chat-line"></div>
        </div>
        <div className="pulse-ring" aria-hidden="true"></div>
      </button>
    );
  }

  return (
    <div 
      ref={(el) => {
        if (chatContainerRef) chatContainerRef.current = el;
        if (keyboardNavRef) keyboardNavRef.current = el;
      }}
      className="virgil-chatbot-container"
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
                    <small style={{color: '#ff9f43', marginTop: '8px', display: 'block'}}>
                      ✏️ Custom prompt active
                    </small>
                  )}
                </div>
              </div>
            )}
          </div>
          <div className="model-selector">
            <button 
              className="model-dropdown-btn"
              onClick={() => setShowModelDropdown(!showModelDropdown)}
            >
              {getCurrentModel().name}
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
        </div>
        <div className="header-right">
          <div className="profile-selector">
            <button 
              className="profile-dropdown-btn"
              onClick={() => setShowProfileDropdown(!showProfileDropdown)}
              title="System Prompt Editor"
            >
              <div className="user-avatar">
                📝
              </div>
              <span className="dropdown-arrow">▼</span>
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
                        const defaultPrompt = "You are Virgil, a helpful assistant that provides contextual help and can search the web for current information.";
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
                  <button className="profile-action" onClick={() => {
                    if (confirm('Clear all chat messages?')) {
                      setMessages([]);
                      setShowProfileDropdown(false);
                    }
                  }}>
                    <span className="action-icon">🗑️</span>
                    Clear Chat History
                  </button>
                  <button className="profile-action" onClick={() => {
                    const chatData = {
                      exportedAt: new Date().toISOString(),
                      user: user?.user_metadata?.name || 'Unknown',
                      messages: messages,
                      totalMessages: messages.length
                    };
                    const blob = new Blob([JSON.stringify(chatData, null, 2)], { type: 'application/json' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `virgil-chat-${new Date().toISOString().split('T')[0]}.json`;
                    a.click();
                    URL.revokeObjectURL(url);
                    setShowProfileDropdown(false);
                  }}>
                    <span className="action-icon">💾</span>
                    Export Chat Messages
                  </button>
                </div>
              </div>
            )}
          </div>
          <button
            className="close-btn"
            onClick={() => setIsOpen(false)}
            title="Close chat"
          >
            ✕
          </button>
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
            <div className="welcome-message-bubble" role="status">
              Good afternoon, {user?.user_metadata?.name || 'there'}!
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
            </div>
            <div className="msg-time" aria-label={`Sent at ${new Date(message.timestamp).toLocaleTimeString()}`}>
              {new Date(message.timestamp).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit'
              })}
            </div>
          </div>
        ))}

        {(isSearching || isTyping) && (
          <div className="message assistant-msg" role="status" aria-label={isSearching ? "Virgil is searching" : "Virgil is typing"}>
            <div className="msg-avatar" aria-hidden="true">
              <span className="chatbot-avatar-v">V</span>
            </div>
            <div className="msg-content">
              <SkeletonLoader width="80%" height="16px" />
              <div className="typing-status">
                {isSearching ? (
                  <span className="search-indicator">🔍 Searching the web...</span>
                ) : (
                  <span className="typing-indicator">💭 Thinking...</span>
                )}
              </div>
              <span className="sr-only">
                {isSearching ? "Virgil is searching the web" : "Virgil is typing a response"}
              </span>
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
            disabled={isTyping || isSearching}
            className="msg-input"
            aria-label="Type your message to Virgil"
            aria-describedby={error ? "chat-error" : undefined}
            autoComplete="off"
          />
          <button
            type="submit"
            disabled={!input.trim() || isTyping || isSearching}
            className="send-btn"
            title="Send message"
            aria-label={isSearching ? "Searching..." : isTyping ? "Sending message" : "Send message"}
          >
            {isSearching ? '🔍' : isTyping ? '...' : 'Send'}
          </button>
        </div>
      </form>
    </div>
  );
})

export { VirgilChatbot };
export default VirgilChatbot;