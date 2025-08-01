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
import styles from './UserProfileViewer.module.css';

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
      if (!target.closest(`.${styles.userProfileViewer}`) && !target.closest('.virgil-logo-button')) {
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
      <div className={styles.profileBackdrop} onClick={onClose} aria-hidden="true" />
      <div
        ref={containerRef as React.RefObject<HTMLDivElement>}
        className={styles.userProfileViewer}
        role="dialog"
        aria-modal="true"
        aria-label="User Profile"
      >
        <div className={styles.profileViewerHeader}>
          <button
            className={styles.profileCloseBtn}
            onClick={onClose}
            aria-label="Close profile viewer"
            data-keyboard-nav
          >
            ✕
          </button>
          <div className={styles.profileUserInfo}>
            <div className={styles.profileAvatarContainer}>
              <div className={styles.profileAvatarSmall}>
                {user?.user_metadata?.avatarUrl ? (
                  <img
                    src={user.user_metadata.avatarUrl}
                    alt="Profile avatar"
                    className={styles.avatarImage}
                  />
                ) : profile.fullName ?
                  profile.fullName.charAt(0).toUpperCase() :
                  '👤'}
              </div>
              <svg className={styles.profileCompletionRing} viewBox="0 0 36 36">
                <path
                  className={styles.completionBg}
                  d="M18 2.0845
                  a 15.9155 15.9155 0 0 1 0 31.831
                  a 15.9155 15.9155 0 0 1 0 -31.831"
                />
                <path
                  className={styles.completionProgress}
                  strokeDasharray={`${profileCompletion}, 100`}
                  d="M18 2.0845
                  a 15.9155 15.9155 0 0 1 0 31.831
                  a 15.9155 15.9155 0 0 1 0 -31.831"
                />
              </svg>
              <div className={styles.completionText}>{profileCompletion}%</div>
            </div>
            <div className={styles.profileUserDetails}>
              <div className={styles.profileUserName}>{profile.fullName || profile.nickname || 'User'}</div>
              <div className={styles.profileUserEmail}>{user?.email}</div>
              {profile.uniqueId && (
                <div className={styles.profileUniqueId}>
                  <span className={styles.idBadge}>ID: {profile.uniqueId}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className={styles.profileTabs} role="tablist">
          <button
            role="tab"
            aria-selected={activeTab === 'user'}
            aria-controls="user-tab-panel"
            id="user-tab"
            className={activeTab === 'user' ? styles.active : ''}
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
            className={activeTab === 'virgil' ? styles.active : ''}
            onClick={() => setActiveTab('virgil')}
            data-keyboard-nav
          >
            Virgil
          </button>
        </div>

        <div className={styles.profileViewerContent}>
          {activeTab === 'user' ? (
            <div
              role="tabpanel"
              id="user-tab-panel"
              aria-labelledby="user-tab"
              className={`${styles.tabContent} ${styles.userTabContent}`}
            >
              {profileLoading ? (
                <div className={styles.profileLoading}>
                  <span className={styles.loadingSpinner}>🔄</span> Loading profile...
                </div>
              ) : (
                <div className={styles.profileCardsContainer}>
                  {/* Primary Info Card */}
                  <div className={`${styles.profileCard} ${styles.primaryCard}`}>
                    <div className={styles.cardHeader}>
                      <h4>Essential Information</h4>
                      <span className={styles.cardIcon}>✨</span>
                    </div>
                    <div className={styles.cardContent}>
                      <EditableDataPoint
                        icon="📝"
                        label="Full Name"
                        value={profile.fullName}
                        onChange={(value) => updateField('fullName', value)}
                        placeholder="Enter your full name"
                        className={styles.primaryField}
                      />
                      <EditableDataPoint
                        icon="👤"
                        label="Nickname"
                        value={profile.nickname}
                        onChange={(value) => updateField('nickname', value)}
                        placeholder="Choose a nickname"
                        className={styles.primaryField}
                      />
                      <EditableDataPoint
                        icon="✉️"
                        label="Email"
                        value={profile.email}
                        onChange={(value) => updateField('email', value)}
                        type="email"
                        readOnly
                        className={`${styles.primaryField} ${styles.emailField}`}
                      />
                    </div>
                  </div>

                  {/* Personal Details Card */}
                  <div className={`${styles.profileCard} ${styles.detailsCard}`}>
                    <div className={styles.cardHeader}>
                      <h4>Personal Details</h4>
                      <span className={styles.cardIcon}>🎭</span>
                    </div>
                    <div className={`${styles.cardContent} ${styles.detailsGrid}`}>
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
                  <div className={`${styles.profileCard} ${styles.contactCard}`}>
                    <div className={styles.cardHeader}>
                      <h4>Contact Information</h4>
                      <span className={styles.cardIcon}>📞</span>
                    </div>
                    <div className={styles.cardContent}>
                      <EditableDataPoint
                        icon="📱"
                        label="Phone Number"
                        value={profile.phone}
                        onChange={(value) => updateField('phone', value)}
                        type="tel"
                        placeholder="+1 (555) 123-4567"
                        className={styles.phoneField}
                      />
                    </div>
                  </div>

                  {/* Address Card */}
                  <div className={`${styles.profileCard} ${styles.addressCard} ${showAddress ? styles.expanded : ''}`}>
                    <div className={styles.cardHeader} onClick={() => setShowAddress(!showAddress)}>
                      <h4>Address</h4>
                      <div className={styles.cardHeaderActions}>
                        <span className={styles.cardIcon}>🏠</span>
                        <button
                          className={styles.addressExpandBtn}
                          aria-expanded={showAddress}
                          aria-label={showAddress ? 'Hide address' : 'Show address'}
                        >
                          {showAddress ? '−' : '+'}
                        </button>
                      </div>
                    </div>
                    {showAddress && (
                      <div className={`${styles.cardContent} ${styles.addressContent}`}>
                        <EditableDataPoint
                          icon="🛣️"
                          label="Street Address"
                          value={profile.address.street}
                          onChange={(value) => updateAddress('street', value)}
                          placeholder="123 Main Street"
                          className={styles.fullWidth}
                        />
                        <div className={styles.addressRow}>
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
                        <div className={styles.addressRow}>
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
                  <div className={styles.profileActionsContainer}>
                    <button
                      className={`${styles.profileActionBtn} ${styles.signout} ${isSigningOut ? styles.signingOut : ''}`}
                      onClick={handleSignOut}
                      data-keyboard-nav
                      disabled={isSigningOut}
                    >
                      <span className={styles.actionIcon}>🚪</span>
                      <span className={styles.actionText}>{isSigningOut ? 'Signing Out...' : 'Sign Out'}</span>
                    </button>
                  </div>

                  {/* Save Progress Bar */}
                  {(saving || saveSuccess) && (
                    <div className={styles.saveProgressContainer}>
                      <div className={`${styles.saveProgressBar} ${saveSuccess ? styles.success : ''}`}>
                        <div className={styles.progressFill} />
                      </div>
                      <span className={styles.saveStatus}>
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
              className={styles.tabContent}
            >
              {deviceInfo && (
                <>
                  <div className={styles.virgilDataSection}>
                    <h4>🖥️ Device & Browser</h4>
                    <div className={styles.virgilDataGrid}>
                      <div className={styles.dataPoint}>
                        <span className={styles.dataIcon}>🌍</span>
                        <span className={styles.dataLabel}>Location</span>
                        <span className={styles.dataValue}>{deviceInfo.location}</span>
                      </div>
                      <div className={styles.dataPoint}>
                        <span className={styles.dataIcon}>📡</span>
                        <span className={styles.dataLabel}>IP</span>
                        <span className={styles.dataValue}>{deviceInfo.ip}</span>
                      </div>
                      <div className={styles.dataPoint}>
                        <span className={styles.dataIcon}>💻</span>
                        <span className={styles.dataLabel}>Device</span>
                        <span className={styles.dataValue}>{deviceInfo.device}</span>
                      </div>
                      <div className={styles.dataPoint}>
                        <span className={styles.dataIcon}>🖥️</span>
                        <span className={styles.dataLabel}>OS</span>
                        <span className={styles.dataValue}>{deviceInfo.os}</span>
                      </div>
                      <div className={styles.dataPoint}>
                        <span className={styles.dataIcon}>🌐</span>
                        <span className={styles.dataLabel}>Browser</span>
                        <span className={styles.dataValue}>{deviceInfo.browser}</span>
                      </div>
                      <div className={`${styles.dataPoint} ${styles.live}`}>
                        <span className={styles.dataIcon}>⏰</span>
                        <span className={styles.dataLabel}>Time</span>
                        <span className={styles.dataValue}>{deviceInfo.localTime}</span>
                      </div>
                      <div className={styles.dataPoint}>
                        <span className={styles.dataIcon}>🌏</span>
                        <span className={styles.dataLabel}>Timezone</span>
                        <span className={styles.dataValue}>{deviceInfo.timezone}</span>
                      </div>
                      <div className={styles.dataPoint}>
                        <span className={styles.dataIcon}>🗣️</span>
                        <span className={styles.dataLabel}>Language</span>
                        <span className={styles.dataValue}>{deviceInfo.language}</span>
                      </div>
                      <div className={styles.dataPoint}>
                        <span className={styles.dataIcon}>📐</span>
                        <span className={styles.dataLabel}>Screen</span>
                        <span className={styles.dataValue}>{deviceInfo.screen} @{deviceInfo.pixelRatio}x</span>
                      </div>
                      <div className={`${styles.dataPoint} ${styles.live}`}>
                        <span className={styles.dataIcon}>🪟</span>
                        <span className={styles.dataLabel}>Window</span>
                        <span className={styles.dataValue}>{deviceInfo.windowSize}</span>
                      </div>
                      <div className={styles.dataPoint}>
                        <span className={styles.dataIcon}>🎨</span>
                        <span className={styles.dataLabel}>Theme</span>
                        <span className={styles.dataValue}>{deviceInfo.colorScheme === 'dark' ? 'Dark' : 'Light'}</span>
                      </div>
                      <div className={styles.dataPoint}>
                        <span className={styles.dataIcon}>🧮</span>
                        <span className={styles.dataLabel}>CPU</span>
                        <span className={styles.dataValue}>{deviceInfo.cpu} {typeof deviceInfo.cpu === 'number' ? 'cores' : ''}</span>
                      </div>
                      <div className={styles.dataPoint}>
                        <span className={styles.dataIcon}>💾</span>
                        <span className={styles.dataLabel}>Memory</span>
                        <span className={styles.dataValue}>{deviceInfo.memory}</span>
                      </div>
                      <div className={styles.dataPoint}>
                        <span className={styles.dataIcon}>{deviceInfo.online ? '🟢' : '🔴'}</span>
                        <span className={styles.dataLabel}>Network</span>
                        <span className={styles.dataValue}>{deviceInfo.online ? 'Online' : 'Offline'}</span>
                      </div>
                      <div className={styles.dataPoint}>
                        <span className={styles.dataIcon}>📶</span>
                        <span className={styles.dataLabel}>Type</span>
                        <span className={styles.dataValue}>{deviceInfo.networkType}</span>
                      </div>
                      <div className={styles.dataPoint}>
                        <span className={styles.dataIcon}>⚡</span>
                        <span className={styles.dataLabel}>Speed</span>
                        <span className={styles.dataValue}>{deviceInfo.downlink}</span>
                      </div>
                      <div className={styles.dataPoint}>
                        <span className={styles.dataIcon}>⏱️</span>
                        <span className={styles.dataLabel}>Latency</span>
                        <span className={styles.dataValue}>{deviceInfo.rtt}</span>
                      </div>
                      {deviceInfo.batteryLevel !== null && (
                        <div className={styles.dataPoint}>
                          <span className={styles.dataIcon}>
                            {deviceInfo.batteryCharging ? '🔌' : '🔋'}
                          </span>
                          <span className={styles.dataLabel}>Battery</span>
                          <span className={styles.dataValue}>
                            {deviceInfo.batteryLevel}%
                          </span>
                        </div>
                      )}
                      <div className={styles.dataPoint}>
                        <span className={styles.dataIcon}>{deviceInfo.tabVisible ? '👀' : '😴'}</span>
                        <span className={styles.dataLabel}>Tab</span>
                        <span className={styles.dataValue}>{deviceInfo.tabVisible ? 'Active' : 'Hidden'}</span>
                      </div>
                      <div className={`${styles.dataPoint} ${styles.live}`}>
                        <span className={styles.dataIcon}>⏳</span>
                        <span className={styles.dataLabel}>Session</span>
                        <span className={styles.dataValue}>
                          {Math.floor(deviceInfo.sessionDuration / 60)}:{(deviceInfo.sessionDuration % 60).toString().padStart(2, '0')}
                        </span>
                      </div>
                      <div className={styles.dataPoint}>
                        <span className={styles.dataIcon}>🍪</span>
                        <span className={styles.dataLabel}>Cookies</span>
                        <span className={styles.dataValue}>{deviceInfo.cookiesEnabled ? 'Enabled' : 'Disabled'}</span>
                      </div>
                      <div className={styles.dataPoint}>
                        <span className={styles.dataIcon}>🚫</span>
                        <span className={styles.dataLabel}>DNT</span>
                        <span className={styles.dataValue}>{deviceInfo.doNotTrack || 'Off'}</span>
                      </div>
                      <div className={styles.dataPoint}>
                        <span className={styles.dataIcon}>💽</span>
                        <span className={styles.dataLabel}>Storage</span>
                        <span className={styles.dataValue}>{deviceInfo.storageQuota}</span>
                      </div>
                    </div>
                  </div>

                  <div className={styles.virgilDataSection}>
                    <h4>🔐 Permissions</h4>
                    <div className={styles.permissionGrid}>
                      <button
                        className={`${styles.permissionBtn} ${permissions.geolocation ? styles[permissions.geolocation] : ''}`}
                        onClick={() => requestPermission('geolocation')}
                        disabled={permissions.geolocation === 'granted'}
                      >
                        <span className={styles.permIcon}>📍</span>
                        <span className={styles.permName}>Location</span>
                        {permissions.geolocation === 'granted' && <span className={styles.check}>✓</span>}
                      </button>
                      <button
                        className={`${styles.permissionBtn} ${permissions.camera ? styles[permissions.camera] : ''}`}
                        onClick={() => requestPermission('camera')}
                        disabled={permissions.camera === 'granted'}
                      >
                        <span className={styles.permIcon}>📷</span>
                        <span className={styles.permName}>Camera</span>
                        {permissions.camera === 'granted' && <span className={styles.check}>✓</span>}
                      </button>
                      <button
                        className={`${styles.permissionBtn} ${permissions.microphone ? styles[permissions.microphone] : ''}`}
                        onClick={() => requestPermission('microphone')}
                        disabled={permissions.microphone === 'granted'}
                      >
                        <span className={styles.permIcon}>🎤</span>
                        <span className={styles.permName}>Microphone</span>
                        {permissions.microphone === 'granted' && <span className={styles.check}>✓</span>}
                      </button>
                      <button
                        className={`${styles.permissionBtn} ${permissions.notifications ? styles[permissions.notifications] : ''}`}
                        onClick={() => requestPermission('notifications')}
                        disabled={permissions.notifications === 'granted'}
                      >
                        <span className={styles.permIcon}>🔔</span>
                        <span className={styles.permName}>Notifications</span>
                        {permissions.notifications === 'granted' && <span className={styles.check}>✓</span>}
                      </button>
                      <button
                        className={`${styles.permissionBtn} ${permissions.clipboard ? styles[permissions.clipboard] : ''}`}
                        onClick={() => requestPermission('clipboard')}
                        disabled={permissions.clipboard === 'granted'}
                      >
                        <span className={styles.permIcon}>📋</span>
                        <span className={styles.permName}>Clipboard</span>
                        {permissions.clipboard === 'granted' && <span className={styles.check}>✓</span>}
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
