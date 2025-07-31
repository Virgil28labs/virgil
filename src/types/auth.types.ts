/**
 * Authentication and User Types
 * Extends Supabase Auth types for Virgil app
 */

import type { User as SupabaseUser } from '@supabase/supabase-js';

export interface UserAddress {
  street: string;
  city: string;
  state: string;
  zip: string;
  country: string;
}

// Extend Supabase's UserMetadata with our app-specific fields
export interface AppUserMetadata {
  name?: string;
  nickname?: string;
  fullName?: string;
  dateOfBirth?: string;
  phone?: string;
  gender?: string;
  maritalStatus?: string;
  uniqueId?: string;
  address?: UserAddress;
  avatarUrl?: string;
}

// For now, we'll use Supabase User directly
// In the future, we can extend it if needed
export type User = SupabaseUser;

export interface AuthContextValue {
  user: User | null;
  loading: boolean;
  signOut: () => Promise<{ error?: Error }>;
  refreshUser: () => Promise<void>;
}

export interface LoginFormData {
  email: string;
  password: string;
}

export interface SignUpFormData {
  name: string;
  email: string;
  password: string;
}

export interface AuthFormProps {
  onSuccess?: () => void;
}
