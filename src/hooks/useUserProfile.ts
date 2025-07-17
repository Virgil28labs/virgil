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
      
      setLoading(true)
      try {
        // Get user metadata
        const metadata = user.user_metadata || {}
        
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
      saveProfile()
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
      saveProfile()
    }, 500)
  }, [])

  // Save profile to Supabase
  const saveProfile = useCallback(async () => {
    if (!user) return
    
    setSaving(true)
    try {
      const { error } = await supabase.auth.updateUser({
        data: {
          nickname: profile.nickname,
          fullName: profile.fullName,
          dateOfBirth: profile.dateOfBirth,
          phone: profile.phone,
          gender: profile.gender,
          maritalStatus: profile.maritalStatus,
          uniqueId: profile.uniqueId,
          address: profile.address,
          name: profile.nickname || profile.fullName // Keep name field for compatibility
        }
      })
      
      if (error) throw error
      
      // Show success indicator
      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 2000)
    } catch (error) {
      console.error('Error saving profile:', error)
    } finally {
      setSaving(false)
    }
  }, [user, profile])

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