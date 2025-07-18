/**
 * Authentication and User Types
 * Based on Supabase Auth types and extended for Virgil app
 */

export interface UserAddress {
  street: string;
  city: string;
  state: string;
  zip: string;
  country: string;
}

export interface UserMetadata {
  name?: string;
  nickname?: string;
  fullName?: string;
  dateOfBirth?: string;
  phone?: string;
  gender?: string;
  maritalStatus?: string;
  uniqueId?: string;
  address?: UserAddress;
}

export interface AppMetadata {
  provider?: string;
  providers?: string[];
}

export interface User {
  id: string;
  email: string;
  user_metadata: UserMetadata;
  created_at: string;
  updated_at?: string;
  email_confirmed_at?: string;
  last_sign_in_at?: string;
  app_metadata?: AppMetadata;
}

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