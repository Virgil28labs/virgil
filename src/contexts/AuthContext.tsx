import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { supabase } from '../lib/supabase'
import type { AuthContextValue } from '../types/auth.types'

/**
 * Authentication Context for Virgil
 * Manages user authentication state using Supabase Auth
 */
const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export const useAuth = (): AuthContextValue => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState<boolean>(true)

  useEffect(() => {
    // Get initial session with error handling
    const getSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        setUser(session?.user ?? null)
      } catch (error: any) {
        if (process.env.NODE_ENV === 'development') {
          console.error('Auth session error:', error)
        }
        setUser(null)
      } finally {
        setLoading(false)
      }
    }

    getSession()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setUser(session?.user ?? null)
        setLoading(false)
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  const signOut = async (): Promise<{ error?: Error }> => {
    try {
      const { error } = await supabase.auth.signOut()
      if (error) throw error
      return {}
    } catch (error) {
      console.error('Sign out error:', error)
      return { error: error as Error }
    }
  }

  const refreshUser = async (): Promise<void> => {
    try {
      const { data: { user: refreshedUser } } = await supabase.auth.getUser()
      setUser(refreshedUser)
    } catch (error) {
      console.error('Error refreshing user:', error)
    }
  }

  const value: AuthContextValue = {
    user,
    loading,
    signOut,
    refreshUser
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}