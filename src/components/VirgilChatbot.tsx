import { useState, useRef, useEffect, memo, useCallback } from 'react';
import type { FormEvent } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useLocation } from '../contexts/LocationContext';
import type { ChatMessage, ModelOption } from '../types/chat.types';
import './VirgilChatbot.css';

export const VirgilChatbot = memo(function VirgilChatbot() {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState<string>('');
  const [isTyping, setIsTyping] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedModel, setSelectedModel] = useState<string>('gpt-4o-mini');
  const [showModelDropdown, setShowModelDropdown] = useState<boolean>(false);
  const [showTooltip, setShowTooltip] = useState<boolean>(false);
  
  const { user } = useAuth();
  const { address, ipLocation, hasGPSLocation } = useLocation();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Available models
  const models: ModelOption[] = [
    { id: 'gpt-4o-mini', name: 'GPT-4o Mini', description: 'Fast and efficient' },
    { id: 'gpt-4o', name: 'GPT-4o', description: 'Most capable model' },
    { id: 'gpt-4-turbo', name: 'GPT-4 Turbo', description: 'Balanced performance' }
  ];

  // Load saved model from localStorage
  useEffect(() => {
    const savedModel = localStorage.getItem('virgil-selected-model');
    if (savedModel && models.find(m => m.id === savedModel)) {
      setSelectedModel(savedModel);
    }
  }, []);

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

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showModelDropdown && !(event.target as Element)?.closest('.model-selector')) {
        setShowModelDropdown(false);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [showModelDropdown]);

  const createSystemPrompt = useCallback(() => {
    // Get current real-time data
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
    const memberSince = user?.created_at ? new Date(user.created_at).toLocaleDateString() : null;

    const userContext = user ? `

CURRENT USER CONTEXT:
- Authentication status: Logged in
- Current page: Dashboard
- Current time: ${currentTime}
- Current date: ${currentDate}
- Current day: ${currentDay}
- User name: ${user.user_metadata?.name || 'Unknown'}
- Email: ${user.email}
${memberSince ? `- Member since: ${memberSince}` : ''}
- Location available: ${hasGPSLocation ? 'GPS location available' : 'No GPS location'}
${hasGPSLocation && address?.street ? `- Address: ${address.street}` : ''}
${ipLocation?.city ? `- IP location: ${ipLocation.city}` : ''}
${ipLocation?.ip ? `- IP address: ${ipLocation.ip}` : ''}

Provide contextual help based on what the user is currently experiencing.` : `

CURRENT USER CONTEXT:
- Authentication status: Not logged in
- Current page: Authentication page
- Location: Authentication flow

Provide contextual help based on what the user is currently experiencing.`;

    return `You are Virgil, a helpful assistant that provides contextual help. ${userContext}

RESPONSE RULES:
- Keep responses extremely short and to the point
- For time queries, respond with current time: "${currentTime}"
- For date queries, respond with current date: "${currentDate}"
- For day queries, respond with current day: "${currentDay}"
- No explanations unless specifically requested
- Be direct and concise`;
  }, [user, hasGPSLocation, address, ipLocation]);

  const handleModelChange = useCallback((modelId: string) => {
    setSelectedModel(modelId);
    localStorage.setItem('virgil-selected-model', modelId);
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
    setIsTyping(true);
    setError(null);

    try {
      // Use our secure backend API instead of calling OpenAI directly
      const chatApiUrl = import.meta.env.VITE_LLM_API_URL || 'http://localhost:5002/api/v1';
      
      const response = await fetch(`${chatApiUrl}/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: selectedModel,
          messages: [
            { role: 'system', content: createSystemPrompt() },
            ...messages.map(msg => ({ role: msg.role, content: msg.content })),
            { role: 'user', content: messageText }
          ],
          max_tokens: 200,
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
      console.error('Chat error:', err);
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
    }
  }, [selectedModel, createSystemPrompt, messages]);

  const handleSubmit = useCallback((e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    sendMessage(input);
  }, [input, sendMessage]);

  const handleQuickAction = useCallback((action: string) => {
    sendMessage(action);
  }, [sendMessage]);

  const quickActions = [
    "Tell me about Virgil",
    "How do I use this app?",
    "Help me get started",
    "What can you do?"
  ];

  if (!isOpen) {
    return (
      <button
        className="virgil-chatbot-bubble"
        onClick={() => setIsOpen(true)}
        title="Chat with Virgil"
      >
        <div className="chat-icon">
          <div className="chat-line"></div>
          <div className="chat-line"></div>
        </div>
        <div className="pulse-ring"></div>
      </button>
    );
  }

  return (
    <div className="virgil-chatbot-container">
      {/* Header */}
      <div className="chatbot-header">
        <div className="header-left">
          <div 
            className="assistant-name"
            onMouseEnter={() => setShowTooltip(true)}
            onMouseLeave={() => setShowTooltip(false)}
            title="Hover to see system prompt"
          >
            Virgil
            {showTooltip && (
              <div className="tooltip">
                <div className="tooltip-content">
                  <strong>System Prompt:</strong>
                  <p>{createSystemPrompt()}</p>
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
                  >
                    <div className="model-name">{model.name}</div>
                    <div className="model-description">{model.description}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        <button
          className="close-btn"
          onClick={() => setIsOpen(false)}
          title="Close chat"
        >
          ✕
        </button>
      </div>

      {/* Messages */}
      <div className="messages-area">
        {messages.length === 0 && (
          <div className="welcome-msg">
            <div className="welcome-message-bubble">
              Good afternoon, {user?.user_metadata?.name || 'there'}!
            </div>
          </div>
        )}

        {messages.map((message) => (
          <div
            key={message.id}
            className={`message ${message.role === 'user' ? 'user-msg' : 'assistant-msg'}`}
          >
            {message.role === 'assistant' && (
              <div className="msg-avatar">
                <span className="chatbot-avatar-v">V</span>
              </div>
            )}
            <div className="msg-content">
              {message.content}
            </div>
            <div className="msg-time">
              {new Date(message.timestamp).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit'
              })}
            </div>
          </div>
        ))}

        {isTyping && (
          <div className="message assistant-msg">
            <div className="msg-avatar">
              <span className="chatbot-avatar-v">V</span>
            </div>
            <div className="typing-dots">
              <span></span>
              <span></span>
              <span></span>
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
            >
              {action}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <form onSubmit={handleSubmit} className="input-area">
        <div className="input-wrapper">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type your message..."
            disabled={isTyping}
            className="msg-input"
          />
          <button
            type="submit"
            disabled={!input.trim() || isTyping}
            className="send-btn"
            title="Send message"
          >
            {isTyping ? '...' : 'Send'}
          </button>
        </div>
      </form>
    </div>
  );
})