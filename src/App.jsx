import './App.css'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { LocationProvider } from './contexts/LocationContext'
import { AuthPage } from './components/AuthPage'
import { Dashboard } from './components/Dashboard'

function AppContent() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner"></div>
        <p>Loading...</p>
      </div>
    )
  }

  return user ? <Dashboard /> : <AuthPage />
}

function App() {
  return (
    <AuthProvider>
      <LocationProvider>
        <div className="app">
          <AppContent />
        </div>
      </LocationProvider>
    </AuthProvider>
  )
}

export default App
