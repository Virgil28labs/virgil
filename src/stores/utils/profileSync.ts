/**
 * Profile Sync Utilities
 * 
 * Utilities for syncing between UserProfile data and user fields in the store.
 * Maintains consistency between the existing profile system and new user fields.
 */

import { useContextStore } from '../ContextStore';
import type { UserProfile } from '../../hooks/useUserProfile';
import { timeService } from '../../services/TimeService';

/**
 * Sync UserProfile data to user fields in the store
 * @param profile - UserProfile data to sync from
 */
export const syncProfileToUserFields = (profile: UserProfile | null) => {
  if (!profile) return;

  const store = useContextStore.getState();
  store.user.updateUserFields({
    name: profile.nickname || profile.fullName,
    dob: profile.dateOfBirth,
    userId: profile.uniqueId,
  });
};

/**
 * Sync user fields from store to UserProfile format
 * @param userFields - User fields from the store
 * @returns Partial UserProfile object with synced data
 */
export const syncUserFieldsToProfile = (userFields: {
  name?: string;
  dob?: string;
  userId?: string;
}): Partial<UserProfile> => {
  return {
    nickname: userFields.name || '',
    fullName: userFields.name || '',
    dateOfBirth: userFields.dob || '',
    uniqueId: userFields.userId || '',
  };
};

/**
 * Update user fields when they're available from external sources
 * This is useful when user data comes from authentication or external APIs
 */
export const updateUserFieldsFromSource = (source: {
  name?: string;
  displayName?: string;
  fullName?: string;
  nickname?: string;
  dob?: string;
  dateOfBirth?: string;
  userId?: string;
  uniqueId?: string;
  id?: string;
}) => {
  const store = useContextStore.getState();
  
  // Extract name from various possible fields
  const name = source.name || 
               source.displayName || 
               source.fullName || 
               source.nickname || 
               '';

  // Extract date of birth from various possible fields
  const dob = source.dob || 
              source.dateOfBirth || 
              '';

  // Extract user ID from various possible fields
  const userId = source.userId || 
                 source.uniqueId || 
                 source.id || 
                 '';

  store.user.updateUserFields({
    name,
    dob,
    userId,
  });
};

/**
 * Generate a unique user ID based on name and date of birth
 * Follows the same logic as the UserProfile system
 */
export const generateUserId = (name: string, dob: string): string => {
  if (!name || !dob) return '';

  const firstName = name.split(' ')[0];
  
  // Parse date - handle DD-MM-YYYY format
  const parts = dob.split('-');
  if (parts.length !== 3) return '';
  
  const day = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10);
  
  if (isNaN(day) || isNaN(month)) return '';

  // Start with firstName + day
  let uniqueId = `${firstName}${day}`;

  // Add month if needed for uniqueness (if day is common 1-10)
  if (day <= 10) {
    uniqueId = `${firstName}${day}${month}`;
  }

  return uniqueId;
};

/**
 * Auto-generate user ID when name or dob changes
 */
export const autoGenerateUserId = (name?: string, dob?: string) => {
  const store = useContextStore.getState();
  const currentUser = store.user.user;
  
  const finalName = name || currentUser?.name || '';
  const finalDob = dob || currentUser?.dob || '';
  
  if (finalName && finalDob) {
    const generatedUserId = generateUserId(finalName, finalDob);
    if (generatedUserId) {
      store.user.setUserId(generatedUserId);
    }
  }
};

/**
 * Validate user fields for completeness and format
 */
export const validateUserFields = (fields: {
  name?: string;
  dob?: string;
  userId?: string;
}) => {
  const errors: string[] = [];
  
  // Validate name
  if (!fields.name || fields.name.trim() === '') {
    errors.push('Name is required');
  }
  
  // Validate date of birth format (DD-MM-YYYY)
  if (fields.dob) {
    const dobPattern = /^\d{2}-\d{2}-\d{4}$/;
    if (!dobPattern.test(fields.dob)) {
      errors.push('Date of birth must be in DD-MM-YYYY format');
    } else {
      // Check if date is valid and not in the future
      const parts = fields.dob.split('-');
      const day = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10);
      const year = parseInt(parts[2], 10);
      
      const date = timeService.createDate(year, month - 1, day);
      const now = timeService.getCurrentDateTime();
      
      if (date > now) {
        errors.push('Date of birth cannot be in the future');
      }
      
      if (timeService.getYear(date) !== year || 
          timeService.getMonth(date) !== month || 
          timeService.getDay(date) !== day) {
        errors.push('Invalid date of birth');
      }
    }
  }
  
  // Validate user ID format (alphanumeric)
  if (fields.userId && !/^[a-zA-Z0-9]+$/.test(fields.userId)) {
    errors.push('User ID must contain only letters and numbers');
  }
  
  return {
    isValid: errors.length === 0,
    errors,
  };
};

/**
 * Complete user setup from profile data
 * Sets up both user fields and profile, ensuring consistency
 */
export const setupUserFromProfile = (profile: UserProfile) => {
  const store = useContextStore.getState();
  
  // Set the profile
  store.user.setProfile(profile);
  
  // Sync to user fields
  syncProfileToUserFields(profile);
  
  // Auto-generate user ID if missing
  if (!profile.uniqueId && profile.fullName && profile.dateOfBirth) {
    autoGenerateUserId(profile.fullName, profile.dateOfBirth);
  }
};

/**
 * Clear all user data (for sign out)
 */
export const clearUserData = () => {
  const store = useContextStore.getState();
  store.user.signOut();
};

/**
 * Get consolidated user data from store
 * Combines user fields, profile, and auth status
 */
export const getConsolidatedUserData = () => {
  const state = useContextStore.getState();
  
  return {
    // Core fields
    name: state.user.user?.name || '',
    dob: state.user.user?.dob || '',
    userId: state.user.user?.userId || '',
    
    // Auth info
    email: state.user.user?.email || '',
    isAuthenticated: state.user.isAuthenticated,
    memberSince: state.user.memberSince,
    
    // Profile
    profile: state.user.profile,
    
    // Environment context
    environment: state.user.env,
    
    // Status
    loading: state.user.loading,
  };
};