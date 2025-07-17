import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

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

export const useUserProfile = () => {
  const { user } = useAuth()
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
      country: ''
    }
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const saveTimeoutRef = useRef<NodeJS.Timeout>()
  const justSavedRef = useRef(false)
  const profileRef = useRef(profile)
  const saveProfileRef = useRef<() => Promise<void>>()

  // Keep profileRef updated
  useEffect(() => {
    profileRef.current = profile
  }, [profile])

  // Generate unique ID based on name and date of birth
  const generateUniqueId = useCallback((fullName: string, dob: string): string => {
    if (!fullName || !dob) return ''
    
    const firstName = fullName.split(' ')[0]
    const date = new Date(dob)
    if (isNaN(date.getTime())) return ''
    
    const day = date.getDate()
    const month = date.getMonth() + 1
    
    // Start with firstName + day
    let uniqueId = `${firstName}${day}`
    
    // Add month if needed for uniqueness (in real app, would check against database)
    // For now, just add month if day is common (1-10)
    if (day <= 10) {
      uniqueId = `${firstName}${day}${month}`
    }
    
    return uniqueId
  }, [])

  // Load profile from Supabase
  useEffect(() => {
    const loadProfile = async () => {
      if (!user) return
      
      // Skip loading if we just saved to prevent race condition
      if (justSavedRef.current) {
        console.log('Skipping profile reload after save')
        justSavedRef.current = false
        return
      }
      
      setLoading(true)
      try {
        // Get user metadata
        const metadata = user.user_metadata || {}
        console.log('Loading profile from Supabase metadata:', metadata)
        
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
            country: ''
          }
        }))
        
        // Generate unique ID if not set
        if (!metadata.uniqueId && metadata.fullName && metadata.dateOfBirth) {
          const newUniqueId = generateUniqueId(metadata.fullName, metadata.dateOfBirth)
          setProfile(prev => ({ ...prev, uniqueId: newUniqueId }))
        }
      } catch (error) {
        console.error('Error loading profile:', error)
      } finally {
        setLoading(false)
      }
    }
    
    loadProfile()
  }, [user, generateUniqueId])

  // Update profile field
  const updateField = useCallback((field: keyof UserProfile, value: any) => {
    setProfile(prev => {
      const updated = { ...prev, [field]: value }
      
      // Auto-generate unique ID when name or DOB changes
      if ((field === 'fullName' || field === 'dateOfBirth') && updated.fullName && updated.dateOfBirth) {
        updated.uniqueId = generateUniqueId(updated.fullName, updated.dateOfBirth)
      }
      
      return updated
    })
    
    // Trigger auto-save
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current)
    }
    saveTimeoutRef.current = setTimeout(() => {
      if (saveProfileRef.current) {
        saveProfileRef.current()
      }
    }, 500) // 500ms debounce
  }, [generateUniqueId])

  // Update address field
  const updateAddress = useCallback((field: keyof UserAddress, value: string) => {
    setProfile(prev => ({
      ...prev,
      address: {
        ...prev.address,
        [field]: value
      }
    }))
    
    // Trigger auto-save
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current)
    }
    saveTimeoutRef.current = setTimeout(() => {
      if (saveProfileRef.current) {
        saveProfileRef.current()
      }
    }, 500)
  }, [])

  // Save profile to Supabase
  const saveProfile = useCallback(async () => {
    if (!user) return
    
    const currentProfile = profileRef.current
    console.log('saveProfile called with data:', currentProfile)
    
    // Set flag to prevent reload during save
    justSavedRef.current = true
    
    setSaving(true)
    try {
      // Get current user to preserve existing metadata
      const { data: { user: currentUser }, error: getUserError } = await supabase.auth.getUser()
      
      if (getUserError) throw getUserError
      
      const currentMetadata = currentUser?.user_metadata || {}
      
      const { error } = await supabase.auth.updateUser({
        data: {
          ...currentMetadata, // Preserve all existing metadata fields
          nickname: currentProfile.nickname,
          fullName: currentProfile.fullName,
          dateOfBirth: currentProfile.dateOfBirth,
          phone: currentProfile.phone,
          gender: currentProfile.gender,
          maritalStatus: currentProfile.maritalStatus,
          uniqueId: currentProfile.uniqueId,
          address: currentProfile.address,
          name: currentProfile.nickname || currentProfile.fullName // Keep name field for compatibility
        }
      })
      
      if (error) throw error
      
      // Verify the save by fetching the updated user
      const { data: { user: updatedUser }, error: verifyError } = await supabase.auth.getUser()
      if (verifyError) {
        console.error('Error verifying profile save:', verifyError)
      } else {
        console.log('Profile saved successfully. Updated metadata:', updatedUser?.user_metadata)
      }
      
      // Show success indicator
      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 2000)
    } catch (error) {
      console.error('Error saving profile:', error)
      // Reset flag on error
      justSavedRef.current = false
    } finally {
      setSaving(false)
    }
  }, [user])

  // Update saveProfileRef
  useEffect(() => {
    saveProfileRef.current = saveProfile
  }, [saveProfile])

  // Cleanup
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
      }
    }
  }, [])

  return {
    profile,
    loading,
    saving,
    saveSuccess,
    updateField,
    updateAddress,
    saveProfile
  }
}