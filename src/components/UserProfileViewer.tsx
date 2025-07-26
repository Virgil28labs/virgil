import React, { memo, useCallback, useEffect, useState, useMemo } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useLocation } from '../hooks/useLocation';
import { useWeather } from '../hooks/useWeather';
import { useKeyboardNavigation } from '../hooks/useKeyboardNavigation';
import { useDeviceInfo } from '../hooks/useDeviceInfo';
import { useUserProfile } from '../hooks/useUserProfile';
import { EditableDataPoint } from './EditableDataPoint';
import { SelectDataPoint } from './SelectDataPoint';
import { logger } from '../lib/logger';

interface UserProfileViewerProps {
  isOpen: boolean;
  onClose: () => void;
}

export const UserProfileViewer = memo(function UserProfileViewer({ 
  isOpen, 
  onClose, 
}: UserProfileViewerProps) {
  const { user, signOut } = useAuth();
  const { ipLocation } = useLocation();
  useWeather();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [activeTab, setActiveTab] = useState<'user' | 'virgil'>('user');
  const [showAddress, setShowAddress] = useState(false);
  const { deviceInfo, permissions, requestPermission } = useDeviceInfo(ipLocation || undefined);
  const { profile, loading: profileLoading, saving, saveSuccess, updateField, updateAddress } = useUserProfile();

  // Calculate profile completion
  const profileCompletion = useMemo(() => {
    const fields = [
      profile.nickname,
      profile.fullName,
      profile.dateOfBirth,
      profile.phone,
      profile.gender,
      profile.maritalStatus,
      profile.address.street,
      profile.address.city,
      profile.address.state,
      profile.address.zip,
      profile.address.country,
    ];
    const filledFields = fields.filter(field => field && field.trim() !== '').length;
    return Math.round((filledFields / fields.length) * 100);
  }, [profile]);

  // Handle click outside to close
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Element;
      if (!target.closest('.user-profile-viewer') && !target.closest('.virgil-logo-button')) {
        onClose();
      }
    };

    const handleEscKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscKey);
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('keydown', handleEscKey);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  // Keyboard navigation
  const { containerRef } = useKeyboardNavigation({
    enabled: isOpen,
    onEscape: onClose,
  });


  const handleSignOut = useCallback(async () => {
    if (isSigningOut) return;
    
    setIsSigningOut(true);
    const { error } = await signOut();
    if (error) {
      logger.error('Sign out error', error as Error, {
        component: 'UserProfileViewer',
        action: 'signOut',
      });
    }
    setIsSigningOut(false);
  }, [signOut, isSigningOut]);

  if (!isOpen || !user) {
    return null;
  }

  return (
    <>
      <div className="profile-backdrop" onClick={onClose} aria-hidden="true" />
      <div 
        ref={containerRef as React.RefObject<HTMLDivElement>} 
        className="user-profile-viewer" 
        role="dialog" 
        aria-modal="true"
        aria-label="User Profile"
      >
        <div className="profile-viewer-header">
          <button 
            className="profile-close-btn"
            onClick={onClose}
            aria-label="Close profile viewer"
            data-keyboard-nav
          >
            ✕
          </button>
          <div className="profile-user-info">
            <div className="profile-avatar-container">
              <div className="profile-avatar-small">
                {user?.user_metadata?.avatarUrl ? (
                  <img 
                    src={user.user_metadata.avatarUrl} 
                    alt="Profile avatar" 
                    className="avatar-image"
                  />
                ) : profile.fullName ? 
                  profile.fullName.charAt(0).toUpperCase() : 
                  '👤'}
              </div>
              <svg className="profile-completion-ring" viewBox="0 0 36 36">
                <path
                  className="completion-bg"
                  d="M18 2.0845
                  a 15.9155 15.9155 0 0 1 0 31.831
                  a 15.9155 15.9155 0 0 1 0 -31.831"
                />
                <path
                  className="completion-progress"
                  strokeDasharray={`${profileCompletion}, 100`}
                  d="M18 2.0845
                  a 15.9155 15.9155 0 0 1 0 31.831
                  a 15.9155 15.9155 0 0 1 0 -31.831"
                />
              </svg>
              <div className="completion-text">{profileCompletion}%</div>
            </div>
            <div className="profile-user-details">
              <div className="profile-user-name">{profile.fullName || profile.nickname || 'User'}</div>
              <div className="profile-user-email">{user?.email}</div>
              {profile.uniqueId && (
                <div className="profile-unique-id">
                  <span className="id-badge">ID: {profile.uniqueId}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      
        <div className="profile-tabs" role="tablist">
          <button
            role="tab"
            aria-selected={activeTab === 'user'}
            aria-controls="user-tab-panel"
            id="user-tab"
            className={activeTab === 'user' ? 'active' : ''}
            onClick={() => setActiveTab('user')}
            data-keyboard-nav
          >
            User
          </button>
          <button
            role="tab"
            aria-selected={activeTab === 'virgil'}
            aria-controls="virgil-tab-panel"
            id="virgil-tab"
            className={activeTab === 'virgil' ? 'active' : ''}
            onClick={() => setActiveTab('virgil')}
            data-keyboard-nav
          >
            Virgil
          </button>
        </div>
      
        <div className="profile-viewer-content">
          {activeTab === 'user' ? (
            <div
              role="tabpanel"
              id="user-tab-panel"
              aria-labelledby="user-tab"
              className="tab-content user-tab-content"
            >
              {profileLoading ? (
                <div className="profile-loading">
                  <span className="loading-spinner">🔄</span> Loading profile...
                </div>
              ) : (
                <div className="profile-cards-container">
                  {/* Primary Info Card */}
                  <div className="profile-card primary-card">
                    <div className="card-header">
                      <h4>Essential Information</h4>
                      <span className="card-icon">✨</span>
                    </div>
                    <div className="card-content">
                      <EditableDataPoint
                        icon="📝"
                        label="Full Name"
                        value={profile.fullName}
                        onChange={(value) => updateField('fullName', value)}
                        placeholder="Enter your full name"
                        className="primary-field"
                      />
                      <EditableDataPoint
                        icon="👤"
                        label="Nickname"
                        value={profile.nickname}
                        onChange={(value) => updateField('nickname', value)}
                        placeholder="Choose a nickname"
                        className="primary-field"
                      />
                      <EditableDataPoint
                        icon="✉️"
                        label="Email"
                        value={profile.email}
                        onChange={(value) => updateField('email', value)}
                        type="email"
                        readOnly
                        className="primary-field email-field"
                      />
                    </div>
                  </div>

                  {/* Personal Details Card */}
                  <div className="profile-card details-card">
                    <div className="card-header">
                      <h4>Personal Details</h4>
                      <span className="card-icon">🎭</span>
                    </div>
                    <div className="card-content details-grid">
                      <EditableDataPoint
                        icon="🎂"
                        label="Date of Birth"
                        value={profile.dateOfBirth}
                        onChange={(value) => updateField('dateOfBirth', value)}
                        type="date"
                        placeholder="Your birthday"
                      />
                      <SelectDataPoint
                        icon="⚧️"
                        label="Gender"
                        value={profile.gender}
                        onChange={(value) => updateField('gender', value)}
                        options={[
                          { value: 'male', label: 'Male' },
                          { value: 'female', label: 'Female' },
                          { value: 'non-binary', label: 'Non-binary' },
                          { value: 'prefer-not-to-say', label: 'Prefer not to say' },
                        ]}
                        allowCustom
                      />
                      <SelectDataPoint
                        icon="💍"
                        label="Marital Status"
                        value={profile.maritalStatus}
                        onChange={(value) => updateField('maritalStatus', value)}
                        options={[
                          { value: 'single', label: 'Single' },
                          { value: 'married', label: 'Married' },
                          { value: 'divorced', label: 'Divorced' },
                          { value: 'separated', label: 'Separated' },
                          { value: 'widowed', label: 'Widowed' },
                          { value: 'in-a-relationship', label: 'In a relationship' },
                        ]}
                        allowCustom
                      />
                    </div>
                  </div>

                  {/* Contact Card */}
                  <div className="profile-card contact-card">
                    <div className="card-header">
                      <h4>Contact Information</h4>
                      <span className="card-icon">📞</span>
                    </div>
                    <div className="card-content">
                      <EditableDataPoint
                        icon="📱"
                        label="Phone Number"
                        value={profile.phone}
                        onChange={(value) => updateField('phone', value)}
                        type="tel"
                        placeholder="+1 (555) 123-4567"
                        className="phone-field"
                      />
                    </div>
                  </div>

                  {/* Address Card */}
                  <div className={`profile-card address-card ${showAddress ? 'expanded' : ''}`}>
                    <div className="card-header" onClick={() => setShowAddress(!showAddress)}>
                      <h4>Address</h4>
                      <div className="card-header-actions">
                        <span className="card-icon">🏠</span>
                        <button 
                          className="address-expand-btn"
                          aria-expanded={showAddress}
                          aria-label={showAddress ? 'Hide address' : 'Show address'}
                        >
                          {showAddress ? '−' : '+'}
                        </button>
                      </div>
                    </div>
                    {showAddress && (
                      <div className="card-content address-content">
                        <EditableDataPoint
                          icon="🛣️"
                          label="Street Address"
                          value={profile.address.street}
                          onChange={(value) => updateAddress('street', value)}
                          placeholder="123 Main Street"
                          className="full-width"
                        />
                        <div className="address-row">
                          <EditableDataPoint
                            icon="🏙️"
                            label="City"
                            value={profile.address.city}
                            onChange={(value) => updateAddress('city', value)}
                            placeholder="City"
                          />
                          <EditableDataPoint
                            icon="📍"
                            label="State"
                            value={profile.address.state}
                            onChange={(value) => updateAddress('state', value)}
                            placeholder="State"
                          />
                        </div>
                        <div className="address-row">
                          <EditableDataPoint
                            icon="🔢"
                            label="ZIP Code"
                            value={profile.address.zip}
                            onChange={(value) => updateAddress('zip', value)}
                            placeholder="12345"
                          />
                          <EditableDataPoint
                            icon="🌍"
                            label="Country"
                            value={profile.address.country}
                            onChange={(value) => updateAddress('country', value)}
                            placeholder="United States"
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="profile-actions-container">
                    <button 
                      className={`profile-action-btn signout ${isSigningOut ? 'signing-out' : ''}`}
                      onClick={handleSignOut}
                      data-keyboard-nav
                      disabled={isSigningOut}
                    >
                      <span className="action-icon">🚪</span>
                      <span className="action-text">{isSigningOut ? 'Signing Out...' : 'Sign Out'}</span>
                    </button>
                  </div>

                  {/* Save Progress Bar */}
                  {(saving || saveSuccess) && (
                    <div className="save-progress-container">
                      <div className={`save-progress-bar ${saveSuccess ? 'success' : ''}`}>
                        <div className="progress-fill" />
                      </div>
                      <span className="save-status">
                        {saving ? 'Saving changes...' : 'All changes saved'}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div
              role="tabpanel"
              id="virgil-tab-panel"
              aria-labelledby="virgil-tab"
              className="tab-content"
            >
              {deviceInfo && (
                <>
                  <div className="virgil-data-section">
                    <h4>🖥️ Device & Browser</h4>
                    <div className="virgil-data-grid">
                      <div className="data-point">
                        <span className="data-icon">🌍</span>
                        <span className="data-label">Location</span>
                        <span className="data-value">{deviceInfo.location}</span>
                      </div>
                      <div className="data-point">
                        <span className="data-icon">📡</span>
                        <span className="data-label">IP</span>
                        <span className="data-value">{deviceInfo.ip}</span>
                      </div>
                      <div className="data-point">
                        <span className="data-icon">💻</span>
                        <span className="data-label">Device</span>
                        <span className="data-value">{deviceInfo.device}</span>
                      </div>
                      <div className="data-point">
                        <span className="data-icon">🖥️</span>
                        <span className="data-label">OS</span>
                        <span className="data-value">{deviceInfo.os}</span>
                      </div>
                      <div className="data-point">
                        <span className="data-icon">🌐</span>
                        <span className="data-label">Browser</span>
                        <span className="data-value">{deviceInfo.browser}</span>
                      </div>
                      <div className="data-point live">
                        <span className="data-icon">⏰</span>
                        <span className="data-label">Time</span>
                        <span className="data-value">{deviceInfo.localTime}</span>
                      </div>
                      <div className="data-point">
                        <span className="data-icon">🌏</span>
                        <span className="data-label">Timezone</span>
                        <span className="data-value">{deviceInfo.timezone}</span>
                      </div>
                      <div className="data-point">
                        <span className="data-icon">🗣️</span>
                        <span className="data-label">Language</span>
                        <span className="data-value">{deviceInfo.language}</span>
                      </div>
                      <div className="data-point">
                        <span className="data-icon">📐</span>
                        <span className="data-label">Screen</span>
                        <span className="data-value">{deviceInfo.screen} @{deviceInfo.pixelRatio}x</span>
                      </div>
                      <div className="data-point live">
                        <span className="data-icon">🪟</span>
                        <span className="data-label">Window</span>
                        <span className="data-value">{deviceInfo.windowSize}</span>
                      </div>
                      <div className="data-point">
                        <span className="data-icon">🎨</span>
                        <span className="data-label">Theme</span>
                        <span className="data-value">{deviceInfo.colorScheme === 'dark' ? 'Dark' : 'Light'}</span>
                      </div>
                      <div className="data-point">
                        <span className="data-icon">🧮</span>
                        <span className="data-label">CPU</span>
                        <span className="data-value">{deviceInfo.cpu} {typeof deviceInfo.cpu === 'number' ? 'cores' : ''}</span>
                      </div>
                      <div className="data-point">
                        <span className="data-icon">💾</span>
                        <span className="data-label">Memory</span>
                        <span className="data-value">{deviceInfo.memory}</span>
                      </div>
                      <div className="data-point">
                        <span className="data-icon">{deviceInfo.online ? '🟢' : '🔴'}</span>
                        <span className="data-label">Network</span>
                        <span className="data-value">{deviceInfo.online ? 'Online' : 'Offline'}</span>
                      </div>
                      <div className="data-point">
                        <span className="data-icon">📶</span>
                        <span className="data-label">Type</span>
                        <span className="data-value">{deviceInfo.networkType}</span>
                      </div>
                      <div className="data-point">
                        <span className="data-icon">⚡</span>
                        <span className="data-label">Speed</span>
                        <span className="data-value">{deviceInfo.downlink}</span>
                      </div>
                      <div className="data-point">
                        <span className="data-icon">⏱️</span>
                        <span className="data-label">Latency</span>
                        <span className="data-value">{deviceInfo.rtt}</span>
                      </div>
                      {deviceInfo.batteryLevel !== null && (
                        <div className="data-point">
                          <span className="data-icon">
                            {deviceInfo.batteryCharging ? '🔌' : '🔋'}
                          </span>
                          <span className="data-label">Battery</span>
                          <span className="data-value">
                            {deviceInfo.batteryLevel}%
                          </span>
                        </div>
                      )}
                      <div className="data-point">
                        <span className="data-icon">{deviceInfo.tabVisible ? '👀' : '😴'}</span>
                        <span className="data-label">Tab</span>
                        <span className="data-value">{deviceInfo.tabVisible ? 'Active' : 'Hidden'}</span>
                      </div>
                      <div className="data-point live">
                        <span className="data-icon">⏳</span>
                        <span className="data-label">Session</span>
                        <span className="data-value">
                          {Math.floor(deviceInfo.sessionDuration / 60)}:{(deviceInfo.sessionDuration % 60).toString().padStart(2, '0')}
                        </span>
                      </div>
                      <div className="data-point">
                        <span className="data-icon">🍪</span>
                        <span className="data-label">Cookies</span>
                        <span className="data-value">{deviceInfo.cookiesEnabled ? 'Enabled' : 'Disabled'}</span>
                      </div>
                      <div className="data-point">
                        <span className="data-icon">🚫</span>
                        <span className="data-label">DNT</span>
                        <span className="data-value">{deviceInfo.doNotTrack || 'Off'}</span>
                      </div>
                      <div className="data-point">
                        <span className="data-icon">💽</span>
                        <span className="data-label">Storage</span>
                        <span className="data-value">{deviceInfo.storageQuota}</span>
                      </div>
                    </div>
                  </div>

                  <div className="virgil-data-section">
                    <h4>🔐 Permissions</h4>
                    <div className="permission-grid">
                      <button 
                        className={`permission-btn ${permissions.geolocation}`}
                        onClick={() => requestPermission('geolocation')}
                        disabled={permissions.geolocation === 'granted'}
                      >
                        <span className="perm-icon">📍</span>
                        <span className="perm-name">Location</span>
                        {permissions.geolocation === 'granted' && <span className="check">✓</span>}
                      </button>
                      <button 
                        className={`permission-btn ${permissions.camera}`}
                        onClick={() => requestPermission('camera')}
                        disabled={permissions.camera === 'granted'}
                      >
                        <span className="perm-icon">📷</span>
                        <span className="perm-name">Camera</span>
                        {permissions.camera === 'granted' && <span className="check">✓</span>}
                      </button>
                      <button 
                        className={`permission-btn ${permissions.microphone}`}
                        onClick={() => requestPermission('microphone')}
                        disabled={permissions.microphone === 'granted'}
                      >
                        <span className="perm-icon">🎤</span>
                        <span className="perm-name">Microphone</span>
                        {permissions.microphone === 'granted' && <span className="check">✓</span>}
                      </button>
                      <button 
                        className={`permission-btn ${permissions.notifications}`}
                        onClick={() => requestPermission('notifications')}
                        disabled={permissions.notifications === 'granted'}
                      >
                        <span className="perm-icon">🔔</span>
                        <span className="perm-name">Notifications</span>
                        {permissions.notifications === 'granted' && <span className="check">✓</span>}
                      </button>
                      <button 
                        className={`permission-btn ${permissions.clipboard}`}
                        onClick={() => requestPermission('clipboard')}
                        disabled={permissions.clipboard === 'granted'}
                      >
                        <span className="perm-icon">📋</span>
                        <span className="perm-name">Clipboard</span>
                        {permissions.clipboard === 'granted' && <span className="check">✓</span>}
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
});