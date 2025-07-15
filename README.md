# Virgil

A modern React/TypeScript application featuring an interactive physics-based raccoon mascot, weather integration, location services, and LLM chat capabilities.

## ✨ Features

- **Interactive Raccoon Mascot**: Physics-based character with collision detection, triple jump, wall sticking, and text interaction
- **Weather Integration**: Real-time weather data with OpenWeatherMap API
- **Location Services**: GPS coordinates and IP geolocation with street address display
- **LLM Chat**: AI-powered chat functionality with backend proxy for security
- **Secure Authentication**: Complete signup/login system powered by Supabase
- **Dynamic UI Elements**: Animated power button with blue/pink states and responsive scaling
- **Ultra-minimalist Design**: Clean, dark purple aesthetic with perfect viewport centering
- **Progressive Web App**: Installable with offline support

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
- **Database**: Supabase (Auth + Data)
- **Testing**: Jest, React Testing Library
- **Styling**: CSS Modules, Tailwind CSS

### Two-Server Architecture
1. **Frontend Server** (Port 3000): Vite-powered React application
2. **Backend Server** (Port 5002): Express API for LLM proxy and sensitive operations

### Project Structure
```
src/                    # React frontend
├── components/         # Feature-based components
├── hooks/             # Custom React hooks
├── contexts/          # Global state (Auth, Location, Weather)
├── services/          # API integrations
├── types/             # TypeScript definitions
└── utils/             # Helper functions

server/                 # Express backend
├── routes/            # API endpoints
├── middleware/        # Security, validation
├── services/          # Business logic
└── config/            # Configuration
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

---

*Built with excellence in mind - see CLAUDE.md for coding standards*