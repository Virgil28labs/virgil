# Virgil LLM Integration Guide

## Overview

The Virgil project now includes a powerful, scalable LLM integration system that provides AI assistance throughout the application. This system is designed for easy expansion and supports multiple LLM providers.

## Architecture

```
virgil/
├── server/                           # LLM API proxy server
│   ├── index.js                     # Main server file
│   ├── routes/                      # API endpoints
│   ├── middleware/                  # Caching, validation, etc.
│   └── services/                    # Core proxy logic
├── src/
│   ├── services/llm/               # Frontend LLM service
│   ├── hooks/                      # React hooks for LLM
│   └── components/VirgilAgent.jsx  # AI assistant component
└── start-llm-server.sh            # Startup script
```

## Quick Start

### 1. Start the LLM Server

```bash
# From the virgil project root
./start-llm-server.sh
```

This will:
- Install dependencies if needed
- Start the LLM proxy server on port 5002
- Enable auto-restart in development mode

### 2. Start the Virgil App

```bash
# In another terminal
npm run dev
```

The VirgilAgent will automatically appear as a floating chat bubble in the bottom-right corner.

## Usage Examples

### Basic Chat Integration

```javascript
import { useChat } from './hooks';

function MyComponent() {
  const { messages, sendMessage, loading } = useChat(
    "You are a helpful assistant for the Virgil app."
  );

  const handleSendMessage = async () => {
    await sendMessage("How do I control the raccoon mascot?");
  };

  return (
    <div>
      {messages.map(msg => (
        <div key={msg.id}>{msg.content}</div>
      ))}
      <button onClick={handleSendMessage} disabled={loading}>
        Ask Question
      </button>
    </div>
  );
}
```

### Direct LLM Service Usage

```javascript
import { useLLM } from './hooks';

function SmartFeature() {
  const { complete } = useLLM();

  const generateHelp = async (userAction) => {
    const response = await complete({
      messages: [
        { role: 'user', content: `Explain how to ${userAction}` }
      ],
      systemPrompt: "You are a concise tutorial guide.",
      maxTokens: 100,
      cacheKey: `help-${userAction}` // Enable caching
    });
    
    return response.content;
  };

  return <div>...</div>;
}
```

### Streaming Responses

```javascript
import { useChat } from './hooks';

function StreamingChat() {
  const { sendMessageStream, messages, isTyping } = useChat();

  const handleStream = async (message) => {
    // Streams response word by word for better UX
    await sendMessageStream(message);
  };

  return (
    <div>
      {messages.map(msg => (
        <div key={msg.id}>
          {msg.content}
          {msg.streaming && <span className="cursor">|</span>}
        </div>
      ))}
      {isTyping && <div>Assistant is typing...</div>}
    </div>
  );
}
```

## VirgilAgent Features

The main VirgilAgent component provides:

### 🎯 **Contextual Assistance**
- Knows about user's auth state
- Understands current page (auth vs dashboard)
- Provides location-aware help
- Raccoon mascot guidance

### 🎮 **Interactive Elements**
- Floating chat bubble
- Quick action buttons
- Voice input support
- Smooth animations

### 🧠 **Smart Responses**
- Cached responses for performance
- Streaming for better UX
- Error handling and retry logic
- Rate limiting protection

### 💬 **Conversation Features**
- Message history
- Export/import conversations
- Regenerate responses
- Clear conversations

## Configuration

### Environment Variables

```env
# LLM Service Configuration
VITE_LLM_API_URL=http://localhost:5002/api/v1
VITE_DEFAULT_MODEL=gpt-4o-mini
VITE_ENABLE_CACHE=true
VITE_CACHE_TTL=3600

# Server Configuration
LLM_SERVER_PORT=5002
OPENAI_API_KEY=your-openai-key
MAX_CONCURRENT_REQUESTS=10
REQUEST_TIMEOUT=30000
```

### Model Support

Currently supported models:
- **OpenAI**: gpt-4o-mini, gpt-3.5-turbo, gpt-4
- **Future**: Claude, Llama, custom models

## API Reference

### Server Endpoints

```
POST /api/v1/llm/complete
POST /api/v1/llm/stream  
POST /api/v1/llm/batch
GET  /api/v1/llm/models
POST /api/v1/llm/tokenize
GET  /api/v1/health
POST /api/v1/analytics/track
```

### React Hooks

```javascript
// Core LLM integration
const { complete, loading, error } = useLLM(config);

// Chat conversation management
const { 
  messages, 
  sendMessage, 
  sendMessageStream,
  clearMessages 
} = useChat(systemPrompt, config);

// Voice input support
const { 
  isListening, 
  transcript, 
  startListening,
  stopListening 
} = useVoiceInput(options);
```

## Performance Features

### 🚀 **Caching System**
- Automatic response caching
- LRU eviction policy
- Configurable TTL
- Cache hit rate tracking

### ⚡ **Request Optimization**
- Connection pooling
- Request queuing
- Rate limiting
- Retry logic with exponential backoff

### 📊 **Analytics**
- Usage tracking
- Performance monitoring
- Error rate analysis
- Model usage statistics

### 🔧 **Development Tools**
- Health checks
- Debug endpoints
- Request logging
- Performance metrics

## Adding New Agents

### 1. Create Agent Configuration

```javascript
// src/services/agents/tutorialAgent.js
export const tutorialAgent = {
  name: 'Tutorial Guide',
  systemPrompt: 'You help users learn Virgil features...',
  model: 'gpt-4o-mini',
  temperature: 0.5
};
```

### 2. Use in Components

```javascript
import { useChat } from '../hooks';
import { tutorialAgent } from '../services/agents/tutorialAgent';

function TutorialHelper() {
  const { sendMessage } = useChat(tutorialAgent.systemPrompt, {
    model: tutorialAgent.model,
    temperature: tutorialAgent.temperature
  });

  return <div>...</div>;
}
```

## Troubleshooting

### Common Issues

1. **Server won't start**
   - Check if port 5002 is available
   - Verify OpenAI API key in .env
   - Ensure dependencies are installed

2. **No responses from agent**
   - Check server is running (http://localhost:5002/api/v1/health)
   - Verify API key permissions
   - Check browser console for errors

3. **Slow responses**
   - Enable caching in environment
   - Check network connection
   - Monitor server logs for bottlenecks

### Debug Commands

```bash
# Check server health
curl http://localhost:5002/api/v1/health

# Test completion endpoint
curl -X POST http://localhost:5002/api/v1/llm/complete \
  -H "Content-Type: application/json" \
  -d '{"messages":[{"role":"user","content":"Hello"}]}'

# View cache statistics
curl http://localhost:5002/api/v1/analytics/summary
```

## Future Enhancements

- [ ] Multi-language support
- [ ] Custom model fine-tuning
- [ ] Advanced conversation memory
- [ ] Plugin system for custom agents
- [ ] Voice output (text-to-speech)
- [ ] Image generation support
- [ ] Conversation analytics dashboard

## Contributing

When adding new LLM features:

1. **Follow the service pattern** - Use the LLMService class
2. **Add proper caching** - Include cache keys for repeated queries
3. **Handle errors gracefully** - Provide fallbacks and user feedback
4. **Test thoroughly** - Include unit tests for new hooks/services
5. **Update documentation** - Keep this guide current

---

The Virgil LLM integration provides a solid foundation for AI-powered features while maintaining performance, scalability, and ease of use. Happy coding! 🦝✨