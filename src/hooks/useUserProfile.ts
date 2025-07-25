import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { timeService } from '../services/TimeService';

export interface UserAddress {
  street: string
  city: string
  state: string
  zip: string
  country: string
}

export interface UserProfile {
  nickname: string
  fullName: string
  dateOfBirth: string
  email: string
  phone: string
  gender: 'male' | 'female' | 'other' | string
  maritalStatus: 'single' | 'married' | 'divorced' | 'separated' | 'widowed' | 'other' | string
  uniqueId: string
  address: UserAddress
}

// Validation functions
const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

const validatePhone = (phone: string): boolean => {
  // Allow various phone formats: +1234567890, (123) 456-7890, 123-456-7890, etc.
  const phoneRegex = /^[+]?[(]?[0-9]{3}[)]?[-\s.]?[(]?[0-9]{3}[)]?[-\s.]?[0-9]{4,6}$/;
  return phone === '' || phoneRegex.test(phone.replace(/\s/g, ''));
};

const sanitizeText = (text: string): string => {
  // Remove any potentially harmful characters but keep common punctuation
  return text.replace(/[<>]/g, '').trim();
};

export const useUserProfile = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState<UserProfile>({
    nickname: '',
    fullName: '',
    dateOfBirth: '',
    email: user?.email || '',
    phone: '',
    gender: '',
    maritalStatus: '',
    uniqueId: '',
    address: {
      street: '',
      city: '',
      state: '',
      zip: '',
      country: '',
    },
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Partial<Record<keyof UserProfile, string>>>({});
  const saveTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const skipNextLoadRef = useRef(false);

  // Generate unique ID based on name and date of birth
  const generateUniqueId = useCallback((fullName: string, dob: string): string => {
    if (!fullName || !dob) return '';
    
    const firstName = fullName.split(' ')[0];
    const date = timeService.parseDate(dob);
    if (!date) return '';
    
    const day = date.getDate();
    const month = date.getMonth() + 1;
    
    // Start with firstName + day
    let uniqueId = `${firstName}${day}`;
    
    // Add month if needed for uniqueness (in real app, would check against database)
    // For now, just add month if day is common (1-10)
    if (day <= 10) {
      uniqueId = `${firstName}${day}${month}`;
    }
    
    return uniqueId;
  }, []);

  // Load profile from Supabase
  useEffect(() => {
    const loadProfile = async () => {
      if (!user) return;
      
      // Skip loading if we just saved to prevent race condition
      if (skipNextLoadRef.current) {
        skipNextLoadRef.current = false;
        return;
      }
      
      setLoading(true);
      try {
        // Get user metadata
        const metadata = user.user_metadata || {};
        // Loading profile from Supabase metadata
        
        // Set profile with existing data
        setProfile(prev => ({
          ...prev,
          nickname: metadata.nickname || metadata.name || '',
          fullName: metadata.fullName || metadata.name || '',
          dateOfBirth: metadata.dateOfBirth || '',
          email: user.email || '',
          phone: metadata.phone || '',
          gender: metadata.gender || '',
          maritalStatus: metadata.maritalStatus || '',
          uniqueId: metadata.uniqueId || '',
          address: metadata.address || {
            street: '',
            city: '',
            state: '',
            zip: '',
            country: '',
          },
        }));
        
        // Generate unique ID if not set
        if (!metadata.uniqueId && metadata.fullName && metadata.dateOfBirth) {
          const newUniqueId = generateUniqueId(metadata.fullName, metadata.dateOfBirth);
          setProfile(prev => ({ ...prev, uniqueId: newUniqueId }));
        }
      } catch (error) {
        console.error('Error loading profile:', error);
      } finally {
        setLoading(false);
      }
    };
    
    loadProfile();
  }, [user, generateUniqueId]);

  // Debounced save function
  const debouncedSave = useCallback((profileData: UserProfile) => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    
    saveTimeoutRef.current = setTimeout(async () => {
      if (!user) return;
      
      skipNextLoadRef.current = true;
      setSaving(true);
      
      try {
        // Get current user to preserve existing metadata
        const { data: { user: currentUser }, error: getUserError } = await supabase.auth.getUser();
        
        if (getUserError) throw getUserError;
        
        const currentMetadata = currentUser?.user_metadata || {};
        
        const { error } = await supabase.auth.updateUser({
          data: {
            ...currentMetadata, // Preserve all existing metadata fields
            nickname: profileData.nickname,
            fullName: profileData.fullName,
            dateOfBirth: profileData.dateOfBirth,
            phone: profileData.phone,
            gender: profileData.gender,
            maritalStatus: profileData.maritalStatus,
            uniqueId: profileData.uniqueId,
            address: profileData.address,
            name: profileData.nickname || profileData.fullName, // Keep name field for compatibility
          },
        });
        
        if (error) throw error;
        
        // Verify the save by fetching the updated user
        const { error: verifyError } = await supabase.auth.getUser();
        if (verifyError) {
          console.error('Error verifying profile save:', verifyError);
        } else {
          // Profile saved successfully
        }
        
        // Show success indicator
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 2000);
      } catch (error) {
        console.error('Error saving profile:', error);
        skipNextLoadRef.current = false;
      } finally {
        setSaving(false);
      }
    }, 500); // 500ms debounce
  }, [user]);

  // Update profile field
  const updateField = useCallback((field: keyof UserProfile, value: any) => {
    // Sanitize text fields
    let sanitizedValue = value;
    if (typeof value === 'string' && field !== 'email' && field !== 'dateOfBirth') {
      sanitizedValue = sanitizeText(value);
    }
    
    // Validate field
    const errors = { ...validationErrors };
    
    switch (field) {
      case 'email':
        if (sanitizedValue && !validateEmail(sanitizedValue)) {
          errors.email = 'Please enter a valid email address';
        } else {
          delete errors.email;
        }
        break;
      case 'phone':
        if (sanitizedValue && !validatePhone(sanitizedValue)) {
          errors.phone = 'Please enter a valid phone number';
        } else {
          delete errors.phone;
        }
        break;
      case 'dateOfBirth':
        // Validate date is not in the future
        if (sanitizedValue) {
          const date = timeService.parseDate(sanitizedValue);
          if (date && date > timeService.getCurrentDateTime()) {
            errors.dateOfBirth = 'Date cannot be in the future';
          } else {
            delete errors.dateOfBirth;
          }
        }
        break;
    }
    
    setValidationErrors(errors);
    
    setProfile(prev => {
      const updated = { ...prev, [field]: sanitizedValue };
      
      // Auto-generate unique ID when name or DOB changes
      if ((field === 'fullName' || field === 'dateOfBirth') && updated.fullName && updated.dateOfBirth) {
        updated.uniqueId = generateUniqueId(updated.fullName, updated.dateOfBirth);
      }
      
      // Only trigger auto-save if there are no validation errors
      if (Object.keys(errors).length === 0) {
        debouncedSave(updated);
      }
      
      return updated;
    });
  }, [generateUniqueId, debouncedSave, validationErrors]);

  // Update address field
  const updateAddress = useCallback((field: keyof UserAddress, value: string) => {
    // Sanitize the value
    const sanitizedValue = sanitizeText(value);
    
    setProfile(prev => {
      const updated = {
        ...prev,
        address: {
          ...prev.address,
          [field]: sanitizedValue,
        },
      };
      
      // Trigger auto-save (address fields don't have specific validation)
      debouncedSave(updated);
      
      return updated;
    });
  }, [debouncedSave]);

  // Manual save profile function (for external use if needed)
  const saveProfile = useCallback(async () => {
    if (!user || !profile) return;
    
    skipNextLoadRef.current = true;
    setSaving(true);
    
    try {
      const { data: { user: currentUser }, error: getUserError } = await supabase.auth.getUser();
      
      if (getUserError) throw getUserError;
      
      const currentMetadata = currentUser?.user_metadata || {};
      
      const { error } = await supabase.auth.updateUser({
        data: {
          ...currentMetadata,
          nickname: profile.nickname,
          fullName: profile.fullName,
          dateOfBirth: profile.dateOfBirth,
          phone: profile.phone,
          gender: profile.gender,
          maritalStatus: profile.maritalStatus,
          uniqueId: profile.uniqueId,
          address: profile.address,
          name: profile.nickname || profile.fullName,
        },
      });
      
      if (error) throw error;
      
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);
    } catch (error) {
      console.error('Error saving profile:', error);
      skipNextLoadRef.current = false;
    } finally {
      setSaving(false);
    }
  }, [user, profile]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  return {
    profile,
    loading,
    saving,
    saveSuccess,
    validationErrors,
    updateField,
    updateAddress,
    saveProfile,
  };
};