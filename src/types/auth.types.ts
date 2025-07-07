/**
 * Authentication and User Types
 * Based on Supabase Auth types and extended for Virgil app
 */

export interface User {
  id: string;
  email: string;
  user_metadata: {
    name?: string;
    [key: string]: any;
  };
  created_at: string;
  updated_at?: string;
  email_confirmed_at?: string;
  last_sign_in_at?: string;
  app_metadata?: {
    provider?: string;
    providers?: string[];
    [key: string]: any;
  };
  [key: string]: any;
}

export interface AuthContextValue {
  user: User | null;
  loading: boolean;
  signOut: () => Promise<void>;
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

export interface AuthError {
  message: string;
  status?: number;
}

export type AuthLoadingState = boolean;
export type AuthMessage = string;