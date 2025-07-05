# Virgil

A minimalist authentication web application with interactive mascot, location services, and elegant design.

## ✨ Features

- **Interactive Raccoon Mascot**: Physics-based character with collision detection, triple jump, wall sticking, and text interaction
- **Location Services**: GPS coordinates and IP geolocation with street address display
- **Secure Authentication**: Complete signup/login system powered by Supabase
- **Dynamic UI Elements**: Animated power button with blue/pink states and responsive scaling
- **Ultra-minimalist Design**: Clean, dark purple aesthetic with perfect viewport centering
- **Brand Identity**: Two-tone "Virgil" logo with purple V and cohesive color palette
- **Responsive**: Fluid typography and layout that works beautifully on all devices

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
- Supabase project with auth enabled

### Installation

1. **Clone and install dependencies**:
   ```bash
   cd virgil
   npm install
   ```

2. **Environment Setup**:
   - Ensure global `.env` file at `/Users/bbb/Desktop/Coding/.env` contains:
   ```
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

3. **Run development server**:
   ```bash
   npm run dev
   ```

## 🏗️ Architecture

### Tech Stack
- **Frontend**: React 19 + Vite
- **Backend**: Supabase (Auth + Database)
- **Styling**: Pure CSS with modern features

### Project Structure
```
src/
├── components/         # React components
│   ├── AuthPage.jsx   # Login/Signup toggle
│   ├── Dashboard.jsx  # User dashboard with mascot
│   ├── LoginForm.jsx  # Login form
│   ├── SignUpForm.jsx # Registration form
│   ├── RaccoonMascot.jsx # Interactive physics mascot
│   └── VirgilLogo.jsx # Two-tone brand logo
├── contexts/
│   ├── AuthContext.jsx    # Auth state management
│   └── LocationContext.jsx # Location services
├── lib/
│   ├── supabase.js           # Supabase client
│   ├── locationService.js    # GPS & IP geolocation
│   ├── mapsService.js        # Google Maps integration
│   └── textAlignmentUtils.js # Text collision detection
└── assets/brand/       # Brand assets
    ├── colors.js      # Brand color palette
    └── index.js       # Brand exports
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

### Available Scripts
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

### Brand Assets
Import and use brand components:
```jsx
import { VirgilLogo, brandColors } from './assets/brand'

<VirgilLogo size={32} />
```

## 🔒 Security

- Supabase Row Level Security (RLS) enabled
- Environment variables for sensitive config
- Secure authentication with email verification

---

*Designed with ❤️ for simplicity and elegance*