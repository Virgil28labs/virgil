import { useContext } from 'react';
import { AuthContext } from '../contexts/AuthContextInstance';
import type { AuthContextValue } from '../types/auth.types';

export const useAuth = (): AuthContextValue => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};