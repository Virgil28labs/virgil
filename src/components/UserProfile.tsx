import React, { memo, useState, useCallback, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { useToast } from '../hooks/useToast'
import { useKeyboardNavigation } from '../hooks/useKeyboardNavigation'
import type { User } from '../types/auth.types'
import '../styles/UserProfile.css'

interface UserProfileProps {
  onBack?: () => void;
}

interface ProfileFormData {
  name: string;
  email: string;
  bio: string;
  avatarUrl?: string;
}

interface PasswordFormData {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export const UserProfile = memo(function UserProfile({ onBack }: UserProfileProps) {
  const { user, signOut, refreshUser } = useAuth()
  const { success: showSuccess, error: showError, warning: showWarning, info: showInfo } = useToast()
  const [isLocked, setIsLocked] = useState(true)
  const [isChangingPassword, setIsChangingPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [isSigningOut, setIsSigningOut] = useState(false)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [profileData, setProfileData] = useState<ProfileFormData>({
    name: user?.user_metadata?.name || '',
    email: user?.email || '',
    bio: user?.user_metadata?.bio || '',
    avatarUrl: user?.user_metadata?.avatarUrl || ''
  })
  const [passwordData, setPasswordData] = useState<PasswordFormData>({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  })

  // Sync profile data with user metadata when user changes
  // Only update if we don't have unsaved changes to prevent losing user input
  useEffect(() => {
    if (user && !hasUnsavedChanges) {
      setProfileData({
        name: user.user_metadata?.name || '',
        email: user.email || '',
        bio: user.user_metadata?.bio || '',
        avatarUrl: user.user_metadata?.avatarUrl || ''
      })
    }
  }, [user, hasUnsavedChanges])

  const formatDate = useCallback((dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    })
  }, [])

  const getInitials = useCallback((name: string) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }, [])

  const handleFileUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith('image/')) {
      showError('Please select an image file')
      return
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      showError('Image must be less than 5MB')
      return
    }

    setLoading(true)
    
    try {
      // Create a data URL for preview
      const reader = new FileReader()
      reader.onload = (e) => {
        const result = e.target?.result as string
        setProfileData(prev => ({ ...prev, avatarUrl: result }))
        setHasUnsavedChanges(true)
      }
      reader.readAsDataURL(file)
      
      // Here you would typically upload to a cloud storage service
      // For now, we'll just use the data URL
      showSuccess('Profile picture updated!')
    } catch {
      showError('Failed to upload image')
    } finally {
      setLoading(false)
    }
  }, [showError, showSuccess])

  const handleRemoveAvatar = useCallback(() => {
    setProfileData(prev => ({ ...prev, avatarUrl: '' }))
    setHasUnsavedChanges(true)
  }, [])

  const handleProfileSave = async () => {
    if (!hasUnsavedChanges) return
    
    setLoading(true)

    try {
      // Get current user to preserve existing metadata
      const { data: { user: currentUser }, error: getUserError } = await supabase.auth.getUser()
      
      if (getUserError) throw getUserError
      
      const currentMetadata = currentUser?.user_metadata || {}
      
      // Update user metadata - merge with existing data
      const { error: updateError } = await supabase.auth.updateUser({
        data: {
          ...currentMetadata, // Preserve all existing metadata fields
          name: profileData.name,
          bio: profileData.bio,
          avatarUrl: profileData.avatarUrl
        }
      })

      if (updateError) throw updateError

      // Update email if changed
      if (profileData.email !== user?.email) {
        const { error: emailError } = await supabase.auth.updateUser({
          email: profileData.email
        })

        if (emailError) {
          // If email update fails, show warning but don't fail the whole operation
          showWarning('Profile updated, but email change requires verification')
        } else {
          showSuccess('Profile updated successfully! Please check your email to verify the new address.')
        }
      } else {
        showSuccess('Profile updated successfully!')
      }

      // Don't refresh immediately - let the UI show the saved data
      // The auth state will update automatically via onAuthStateChange
      setHasUnsavedChanges(false)
    } catch (error: any) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Profile update error:', error)
      }
      showError(error.message || 'Failed to update profile')
    } finally {
      setLoading(false)
    }
  }

  const handleLockToggle = useCallback(async () => {
    if (!isLocked && hasUnsavedChanges) {
      // Auto-save when locking
      await handleProfileSave()
    }
    setIsLocked(!isLocked)
  }, [isLocked, hasUnsavedChanges])

  const handleInputChange = useCallback((field: keyof ProfileFormData, value: string) => {
    setProfileData(prev => ({ ...prev, [field]: value }))
    setHasUnsavedChanges(true)
  }, [])

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      showError('New passwords do not match')
      return
    }

    if (passwordData.newPassword.length < 6) {
      showError('Password must be at least 6 characters long')
      return
    }

    setLoading(true)

    try {
      const { error } = await supabase.auth.updateUser({
        password: passwordData.newPassword
      })

      if (error) throw error

      showSuccess('Password updated successfully!')
      setIsChangingPassword(false)
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      })
    } catch (error: any) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Password update error:', error)
      }
      showError(error.message || 'Failed to update password')
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteAccount = async () => {
    if (!confirm('Are you sure you want to delete your account? This action cannot be undone.')) {
      return
    }

    if (!confirm('This will permanently delete all your data. Are you absolutely sure?')) {
      return
    }

    try {
      setLoading(true)
      // Note: Supabase doesn't have a direct delete user method for client-side
      // This would typically require a server-side function
      showInfo('Account deletion feature coming soon')
    } catch (error: any) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Account deletion error:', error)
      }
      showError(error.message || 'Failed to delete account')
    } finally {
      setLoading(false)
    }
  }

  const handleSignOut = async () => {
    if (isSigningOut) return
    
    setIsSigningOut(true)
    try {
      const { error } = await signOut()
      if (error) {
        console.error('Failed to sign out:', error)
        showError('Failed to sign out. Please try again.')
      }
    } catch (error) {
      console.error('Unexpected error during sign out:', error)
    }
  }

  // Keyboard navigation
  const { containerRef } = useKeyboardNavigation({
    enabled: true,
    onEscape: () => {
      if (!isLocked) {
        setIsLocked(true)
      } else if (isChangingPassword) {
        setIsChangingPassword(false)
      } else {
        onBack?.()
      }
    }
  })

  if (!user) {
    return (
      <div className="user-profile">
        <div className="profile-error">
          <p>Please log in to view your profile.</p>
        </div>
      </div>
    )
  }

  return (
    <div ref={containerRef} className="user-profile" role="main" aria-label="User Profile">
      <div className="profile-header">
        <div className="profile-nav">
          {onBack && (
            <button 
              className="back-button"
              onClick={onBack}
              aria-label="Go back"
              data-keyboard-nav
            >
              ← Back
            </button>
          )}
          <h1>Profile Settings</h1>
        </div>
        
        <div className="profile-avatar">
          <div className="avatar-circle">
            {profileData.avatarUrl ? (
              <img 
                src={profileData.avatarUrl} 
                alt="Profile avatar" 
                className="avatar-image"
              />
            ) : (
              getInitials(profileData.name || 'User')
            )}
          </div>
          <div className="avatar-actions">
            <label htmlFor="avatar-upload" className="avatar-upload-btn">
              Upload Photo
            </label>
            <input
              id="avatar-upload"
              type="file"
              accept="image/*"
              onChange={handleFileUpload}
              style={{ display: 'none' }}
            />
            {profileData.avatarUrl && (
              <button 
                type="button" 
                className="avatar-remove-btn"
                onClick={handleRemoveAvatar}
              >
                Remove
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="profile-content">
        {/* Profile Information Section */}
        <div className="profile-section">
          <h2>Profile Information</h2>
          
          <button
            className={`lock-button ${isLocked ? '' : 'unlocked'} ${loading ? 'saving' : ''}`}
            onClick={handleLockToggle}
            disabled={loading}
            aria-label={isLocked ? 'Unlock profile for editing' : 'Lock profile and save changes'}
            data-keyboard-nav
          >
            {loading ? '⏳' : (isLocked ? '🔒' : '🔓')}
          </button>
          
          <div className="profile-form">
            <div className="form-group">
              <label htmlFor="name">Name</label>
              <input
                id="name"
                type="text"
                value={profileData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                disabled={isLocked}
                required
                data-keyboard-nav
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                value={profileData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                disabled={isLocked}
                required
                data-keyboard-nav
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="bio">Bio</label>
              <textarea
                id="bio"
                value={profileData.bio}
                onChange={(e) => handleInputChange('bio', e.target.value)}
                disabled={isLocked}
                rows={3}
                placeholder="Tell us about yourself..."
                data-keyboard-nav
              />
            </div>
            
            <div className="profile-field">
              <label>Member Since</label>
              <p>{formatDate(user.created_at)}</p>
            </div>
          </div>
        </div>

        {/* Password Section */}
        <div className="profile-section">
          <h2>Security</h2>
          
          {!isChangingPassword ? (
            <div className="security-display">
              <div className="profile-field">
                <label>Password</label>
                <p>••••••••</p>
              </div>
              
              <button 
                className="change-password-button"
                onClick={() => setIsChangingPassword(true)}
                data-keyboard-nav
              >
                Change Password
              </button>
            </div>
          ) : (
            <form onSubmit={handlePasswordSubmit} className="password-form">
              <div className="form-group">
                <label htmlFor="new-password">New Password</label>
                <input
                  id="new-password"
                  type="password"
                  value={passwordData.newPassword}
                  onChange={(e) => setPasswordData(prev => ({ ...prev, newPassword: e.target.value }))}
                  required
                  minLength={6}
                  data-keyboard-nav
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="confirm-password">Confirm New Password</label>
                <input
                  id="confirm-password"
                  type="password"
                  value={passwordData.confirmPassword}
                  onChange={(e) => setPasswordData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                  required
                  minLength={6}
                  data-keyboard-nav
                />
              </div>
              
              <div className="form-actions">
                <button 
                  type="submit" 
                  className="save-button"
                  disabled={loading}
                  data-keyboard-nav
                >
                  {loading ? 'Updating...' : 'Update Password'}
                </button>
                <button 
                  type="button" 
                  className="cancel-button"
                  onClick={() => setIsChangingPassword(false)}
                  data-keyboard-nav
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Account Actions */}
        <div className="profile-section">
          <h2>Account Actions</h2>
          
          <div className="account-actions">
            <button 
              className="sign-out-button"
              onClick={handleSignOut}
              data-keyboard-nav
              disabled={isSigningOut}
            >
              {isSigningOut ? 'Signing Out...' : 'Sign Out'}
            </button>
            
            <button 
              className="delete-account-button"
              onClick={handleDeleteAccount}
              data-keyboard-nav
            >
              Delete Account
            </button>
          </div>
        </div>
      </div>
    </div>
  )
})