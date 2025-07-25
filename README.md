# Virgil

A sophisticated React/TypeScript web application that combines an AI-powered chatbot assistant with a comprehensive personal dashboard. Features include an interactive physics-based raccoon mascot, weather integration, location services, and multiple productivity tools, all designed with a local-first philosophy.

## ✨ Features

### AI Assistant - Virgil
- **Advanced Memory System**: Continuous conversation model with IndexedDB persistence
- **Context Awareness**: Real-time integration of time, location, weather, and device data
- **Dashboard Integration**: Unified access to all app data through intelligent adapters
- **Smart Context Enhancement**: Dynamic relevance scoring for optimal AI responses

### Dashboard Applications
- **Notes**: Task management, journaling, and intelligent tagging system
- **Pomodoro Timer**: Productivity tracking with session statistics
- **Streak Tracker**: Habit monitoring with visual progress tracking
- **Camera**: Photo gallery with metadata and favorites
- **Dog Gallery**: Curated collection of favorite dog images
- **NASA APOD**: Daily space images with explanations
- **Giphy Gallery**: Animated GIF collection and favorites
- **Perfect Circle Game**: Physics-based drawing challenge
- **Rhythm Machine**: Interactive drum sequencer

### Core Features
- **Interactive Raccoon Mascot**: Physics-based character with collision detection, triple jump, wall sticking, and text interaction
- **Weather Integration**: Real-time weather data with OpenWeatherMap API
- **Location Services**: GPS coordinates and IP geolocation with street address display
- **Secure Authentication**: Complete signup/login system powered by Supabase
- **Progressive Web App**: Installable with offline support
- **Local-First Architecture**: Privacy-focused with minimal cloud dependency

## 🎨 Design System

### Colors
- **Background**: `#39293e` (Dark Purple)
- **Text**: `#f5f5f5` (Light Gray)
- **Accent**: `#6c3baa` (Purple)
- **Secondary**: `#b2a5c1` (Light Purple), `#efb0c2` (Pink)

### Typography
- **Font**: Montserrat (Google Fonts)
- **Sizing**: Fluid with clamp() functions for perfect scaling

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- npm package manager
- Supabase project with auth enabled
- OpenWeatherMap API key (optional)
- Anthropic API key (for LLM features)

### Installation

1. **Clone and install dependencies**:
   ```bash
   git clone [repository-url]
   cd virgil
   npm install
   cd server && npm install
   ```

2. **Environment Setup**:
   ```bash
   cp .env.example .env
   ```
   
   Configure the following in `.env`:
   ```env
   # Backend/LLM Server
   ANTHROPIC_API_KEY=your_anthropic_api_key
   LLM_SERVER_PORT=5002
   
   # Frontend
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   VITE_LLM_API_URL=http://localhost:5002/api
   
   # Optional Services
   OPENWEATHERMAP_API_KEY=your_weather_api_key
   ```

3. **Start Development Environment**:
   
   **Important**: Virgil requires TWO servers running simultaneously:
   
   ```bash
   # Recommended: Use the unified startup script
   npm run dev-full
   ```
   
   Or run servers separately:
   ```bash
   # Terminal 1: Backend server (port 5002)
   npm run backend
   
   # Terminal 2: Frontend server (port 3000)
   npm run dev
   ```

## 🏗️ Architecture

### Tech Stack
- **Frontend**: React 19.1, TypeScript 5.8, Vite 7.0, PWA
- **Backend**: Express 5.1 (port 5002), Node.js
- **Database**: Supabase (Auth + User Profiles)
- **Storage**: IndexedDB (Primary), localStorage (Settings)
- **Testing**: Jest, React Testing Library (80%+ coverage target)
- **Styling**: CSS Modules, Custom Design System

### Service Architecture
```
VirgilChatbot (Main Component)
├── ChatContext (State Management)
├── MemoryService (IndexedDB Persistence)
├── DashboardContextService (Environmental Data)
├── DynamicContextBuilder (Query Enhancement)
├── DashboardAppService (App Integration)
└── LLMService (AI Communication)
```

### Storage Architecture
- **Cloud (Supabase)**: Authentication and user profiles only
- **IndexedDB**: Chat memories, photos, notes (local-first)
- **localStorage**: App settings, favorites, preferences
- **Memory Cache**: Performance optimization layer

### Project Structure
```
src/                    # React frontend
├── components/         # Feature-based components
│   ├── chat/          # Virgil AI assistant
│   ├── notes/         # Notes app with adapters
│   ├── camera/        # Photo management
│   └── [apps]/        # Other dashboard apps
├── hooks/             # Custom React hooks
├── contexts/          # Global state (Auth, Location, Weather)
├── services/          # Core services
│   ├── adapters/      # App data adapters
│   └── llm/           # LLM integration
├── types/             # TypeScript definitions
└── utils/             # Helper functions

server/                 # Express backend
├── routes/            # API endpoints
├── middleware/        # Security, validation
├── services/          # Business logic
└── types/             # Backend TypeScript types
```

## 🎯 User Experience

### Authentication Flow
1. **Landing**: Clean auth page with login/signup toggle
2. **Registration**: Name, email, password with validation
3. **Dashboard**: User info display with location data, interactive mascot, and animated power button

### Interactive Features
- **Raccoon Mascot**: Click to pick up, arrow keys to move, spacebar for triple jump
- **Text Collision**: Mascot can land on and interact with all text elements
- **Location Detection**: Automatic GPS and IP-based location services
- **Dynamic UI**: Power button changes from blue to pink on hover

### Design Philosophy
- **Mathematical centering** using CSS Grid
- **Fluid responsive design** with viewport units
- **Minimal visual elements** for maximum focus
- **Consistent brand identity** throughout

## 🛠️ Development

### Essential Commands
```bash
npm run dev-full      # Start both servers (recommended)
npm run dev          # Frontend only (port 3000)
npm run backend      # Backend only (port 5002)
npm test             # Run all tests
npm run lint         # ESLint check
npm run type-check   # TypeScript validation
npm run build        # Production build
```

### Development Scripts
- `start-dev.sh` - Unified startup script with process management
- `check-env.sh` - Validate development environment
- `cleanup-ports.sh` - Clean up stuck processes

### API Endpoints
- `POST /api/llm/chat` - LLM chat functionality
- `GET /api/weather` - Weather data
- `GET /api/location` - Location services
- `GET /api/elevation/coordinates/:lat/:lon` - Elevation data

## 🔒 Security

- API keys stored server-side only
- Backend proxy for all external APIs
- Supabase Row Level Security (RLS)
- Input validation and sanitization
- Rate limiting on all endpoints

## 🧪 Testing

- Minimum 80% code coverage required
- Run tests before committing
- Test files co-located with components
- Focus on behavior, not implementation

## 🚨 Troubleshooting

### Port Already in Use
```bash
npm run cleanup-ports  # or manually:
lsof -ti:3000 | xargs kill
lsof -ti:5002 | xargs kill
```

### Environment Issues
- Verify `.env` file exists and is configured
- Check API keys are valid
- Restart servers after changing `.env`

### Health Check
```bash
curl http://localhost:5002/api/health
```

## 📚 Documentation

- [System Summary](docs/VIRGIL_SYSTEM_SUMMARY.md) - Comprehensive overview of Virgil's architecture
- [Memory Enhancement Plan](docs/VIRGIL_MEMORY_ENHANCEMENT_PLAN.md) - Roadmap for semantic memory features
- [Supabase Vector Integration](docs/SUPABASE_VECTOR_INTEGRATION.md) - Detailed integration plan
- [Storage Architecture](docs/STORAGE_ARCHITECTURE.md) - Complete storage system documentation
- [Chatbot Architecture](docs/VIRGIL_CHATBOT_ARCHITECTURE.md) - AI assistant implementation details
- [Database Memory Architecture](docs/VIRGIL_DATABASE_MEMORY_ARCHITECTURE.md) - Memory system deep dive
- [Code Standards](CLAUDE.md) - Development excellence guidelines

---

*Built with excellence in mind - see CLAUDE.md for coding standards*