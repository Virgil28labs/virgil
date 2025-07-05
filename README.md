# Virgil

A minimalist authentication web application with elegant design and perfect user experience.

## ✨ Features

- **Ultra-minimalist Design**: Clean, dark purple aesthetic with perfect viewport centering
- **Secure Authentication**: Complete signup/login system powered by Supabase
- **Responsive**: Fluid typography and layout that works beautifully on all devices
- **Brand Identity**: Custom Virgil flame logo and cohesive color palette

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
│   ├── Dashboard.jsx  # User dashboard
│   ├── LoginForm.jsx  # Login form
│   └── SignUpForm.jsx # Registration form
├── contexts/
│   └── AuthContext.jsx # Auth state management
├── assets/brand/       # Brand assets
│   ├── VirgilLogo.jsx # Logo component
│   └── colors.js      # Brand colors
└── lib/
    └── supabase.js    # Supabase client
```

## 🎯 User Experience

### Authentication Flow
1. **Landing**: Clean auth page with login/signup toggle
2. **Registration**: Name, email, password with validation
3. **Dashboard**: Centered display of user info and subtle sign-out

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