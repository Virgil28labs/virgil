/**
 * Supabase client configuration for Virgil
 * Handles authentication and database operations
 */
import { createClient, SupabaseClient } from '@supabase/supabase-js'
import type { User } from '../types/auth.types'

const supabaseUrl: string = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey: string = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables:', { supabaseUrl, supabaseAnonKey })
  throw new Error('Missing Supabase environment variables')
}

// Create typed Supabase client
export const supabase: SupabaseClient = createClient(supabaseUrl, supabaseAnonKey)

// Type-safe helpers
export type SupabaseUser = User