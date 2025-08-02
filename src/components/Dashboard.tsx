import React, { memo, useCallback, useState, Suspense, useRef, useEffect, useMemo } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useLocation } from '../hooks/useLocation';
import { VirgilTextLogo } from './VirgilTextLogo';
import { DateTime } from './DateTime';
import { LazyRaccoonMascot } from './LazyComponents';
import { Weather } from './Weather';
import { UserProfileViewer } from './UserProfileViewer';
import { DogEmojiButton } from './DogEmojiButton';
import { GiphyEmojiButton } from './GiphyEmojiButton';
import { NasaApodButton } from './NasaApodButton';
import { RhythmMachineButton } from './RhythmMachineButton';
import { CircleGameButton } from './CircleGameButton';
import { StreakTrackerButton } from './StreakTrackerButton';
import { CameraEmojiButton } from './camera/CameraEmojiButton';
import { PomodoroEmojiButton } from './pomodoro/PomodoroEmojiButton';
import { NotesEmojiButton } from './notes/NotesEmojiButton';
import { VectorMemoryButton } from './VectorMemoryButton';
import { LoadingFallback } from './LoadingFallback';
import { Skeleton } from './ui/skeleton';
import { useKeyboardNavigation } from '../hooks/useKeyboardNavigation';
import { useDeviceInfo } from '../hooks/useDeviceInfo';
import { SectionErrorBoundary } from './common/SectionErrorBoundary';
import { ContextDebugger } from './ContextDebugger';
import { PositionedIPHoverCard } from './location/IPHoverCard';
import { dashboardAppService } from '../services/DashboardAppService';
import { dashboardContextService } from '../services/DashboardContextService';
import { NotesAdapter } from '../services/adapters/NotesAdapter';
import { pomodoroAdapter } from '../services/adapters/PomodoroAdapter';
import { streakAdapterRefactored } from '../services/adapters/StreakAdapterRefactored';
import { CameraAdapter } from '../services/adapters/CameraAdapter';
import { DogGalleryAdapter } from '../services/adapters/DogGalleryAdapter';
import { NasaApodAdapter } from '../services/adapters/NasaApodAdapter';
import { GiphyAdapter } from '../services/adapters/GiphyAdapter';
import { RhythmMachineAdapter } from '../services/adapters/RhythmMachineAdapter';
import { CircleGameAdapter } from '../services/adapters/CircleGameAdapter';
import { logger } from '../lib/logger';
import styles from './Dashboard.module.css';

export const Dashboard = memo(function Dashboard() {
  const { user, signOut } = useAuth();
  const { address, ipLocation, coordinates, loading: locationLoading, isPreciseLocation, canRetryGPS, gpsRetrying, retryGPSLocation } = useLocation();
  const { deviceInfo } = useDeviceInfo(ipLocation || undefined);
  const [showProfileViewer, setShowProfileViewer] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [showIPHover, setShowIPHover] = useState(false);
  const ipRef = useRef<HTMLDivElement | null>(null);
  const [elevationUnit, setElevationUnit] = useState<'meters' | 'feet'>(() => {
    try {
      const saved = localStorage.getItem('elevationUnit');
      return (saved === 'feet' || saved === 'meters') ? saved : 'meters';
    } catch {
      return 'meters';
    }
  });

  // Memoized callbacks
  const handleShowProfileViewer = useCallback(() => setShowProfileViewer(true), []);
  const handleHideProfileViewer = useCallback(() => setShowProfileViewer(false), []);
  const handleShowIPHover = useCallback(() => setShowIPHover(true), []);
  const handleHideIPHover = useCallback(() => setShowIPHover(false), []);

  const toggleElevationUnit = useCallback(() => {
    setElevationUnit(prev => {
      const newUnit = prev === 'meters' ? 'feet' : 'meters';
      try {
        localStorage.setItem('elevationUnit', newUnit);
      } catch (e) {
        logger.warn('Failed to save elevation unit preference', {
          component: 'Dashboard',
          action: 'handleUnitChange',
          metadata: { error: e },
        });
      }
      return newUnit;
    });
  }, []);

  const handleSignOut = useCallback(async () => {
    if (isSigningOut) return; // Prevent multiple clicks

    setIsSigningOut(true);
    const { error } = await signOut();
    if (error) {
      logger.error('Sign out error', error as Error, {
        component: 'Dashboard',
        action: 'handleSignOut',
      });
    }
    setIsSigningOut(false);
  }, [signOut, isSigningOut]);

  const handleRetryGPS = useCallback(async () => {
    try {
      await retryGPSLocation();
      logger.info('GPS retry successful from Dashboard', {
        component: 'Dashboard',
        action: 'handleRetryGPS',
      });
    } catch (error) {
      logger.error('GPS retry failed from Dashboard', error as Error, {
        component: 'Dashboard',
        action: 'handleRetryGPS',
      });
    }
  }, [retryGPSLocation]);

  // Removed system prompt functionality - moved to VirgilChatbot

  // Keyboard navigation for dashboard
  const { containerRef } = useKeyboardNavigation({
    enabled: true,
    onEscape: () => {
      // Optional: Clear any selection or blur active element
      (document.activeElement as HTMLElement)?.blur();
    },
  });

  // Memoize adapters to prevent recreation on every render
  const adapters = useMemo(() => ({
    notes: new NotesAdapter(),
    pomodoro: pomodoroAdapter,
    streak: streakAdapterRefactored,
    camera: new CameraAdapter(),
    dogGallery: new DogGalleryAdapter(),
    nasaApod: new NasaApodAdapter(),
    giphy: new GiphyAdapter(),
    rhythmMachine: new RhythmMachineAdapter(),
    circleGame: new CircleGameAdapter(),
  }), []);

  // Initialize dashboard app adapters
  useEffect(() => {
    // Register app adapters with the dashboard service
    Object.values(adapters).forEach(adapter => {
      dashboardAppService.registerAdapter(adapter);
    });

    // Cleanup on unmount
    return () => {
      dashboardAppService.unregisterAdapter('notes');
      dashboardAppService.unregisterAdapter('pomodoro');
      dashboardAppService.unregisterAdapter('streaks');
      dashboardAppService.unregisterAdapter('camera');
      dashboardAppService.unregisterAdapter('dog');
      dashboardAppService.unregisterAdapter('nasa');
      dashboardAppService.unregisterAdapter('giphy');
      dashboardAppService.unregisterAdapter('rhythm');
      dashboardAppService.unregisterAdapter('circle');
    };
  }, [adapters]);

  // Update dashboard context service with device info
  useEffect(() => {
    if (deviceInfo) {
      dashboardContextService.updateDeviceContext(deviceInfo);
    }
  }, [deviceInfo]);

  return (
    <div 
      ref={containerRef as React.RefObject<HTMLDivElement>} 
      className={`${styles.dashboard} ${deviceInfo?.device === 'mobile' ? styles.mobileLayout : ''}`}
      role="main" 
      aria-label="Dashboard main content"
      data-testid="dashboard-container"
    >
      {/* Fixed positioned elements */}
      <VirgilTextLogo onClick={handleShowProfileViewer} />
      <DateTime />
      <SectionErrorBoundary sectionName="Weather" fallback={null} data-testid="section-error-boundary">
        <Weather />
      </SectionErrorBoundary>

      {/* Power button */}
      <button
        className={`${styles.powerButton} ${isSigningOut ? styles.signingOut : ''}`}
        data-raccoon-collision="power-button"
        onClick={handleSignOut}
        title={isSigningOut ? 'Signing out...' : 'Sign Out'}
        aria-label={isSigningOut ? 'Signing out...' : 'Sign out of your account'}
        data-keyboard-nav
        disabled={isSigningOut}
      >
        <div className={styles.powerIcon} aria-hidden="true" />
        <span className="sr-only">{isSigningOut ? 'Signing out...' : 'Sign Out'}</span>
      </button>

      {/* Main content */}
      <div id="main-content" className={styles.dashboardContent} aria-label="User profile and settings">
        <div className={styles.userInfo}>
          <p className={styles.userName} data-raccoon-collision="user-name">{user?.user_metadata?.name || 'Anonymous User'}</p>
          <button 
            className={styles.userEmail} 
            data-raccoon-collision="user-email"
            onClick={handleShowProfileViewer}
            tabIndex={0}
            aria-label="View user profile"
          >
            {user?.email}
          </button>
        </div>

        <div className={styles.locationInfo}>
          <div className={styles.addressInfo}>
            <div className={styles.addressRow}>
              {address ? (
                address.street ? (
                  <p
                    className={styles.streetAddress}
                    data-raccoon-collision="street-address"
                    title="Your current address"
                  >
                    {address.house_number && `${address.house_number} `}{address.street}
                  </p>
                ) : address.formatted ? (
                  <p
                    className={styles.streetAddress}
                    data-raccoon-collision="street-address"
                    title="Your current address"
                  >
                    {address.formatted.split(',').slice(0, 2).join(',').trim()}
                  </p>
                ) : (
                  <Skeleton className="w-48 h-4" />
                )
              ) : locationLoading ? (
                <div data-testid="location-loading">
                  <Skeleton className="w-48 h-4" />
                </div>
              ) : ipLocation?.city ? (
                <p
                  className="street-address"
                  data-raccoon-collision="street-address"
                  title="IP-based location (approximate)"
                >
                  📍 {ipLocation.city}{ipLocation.region ? `, ${ipLocation.region}` : ''}{ipLocation.country ? `, ${ipLocation.country}` : ''}
                </p>
              ) : (
                <p className={styles.addressError}>Location unavailable</p>
              )}
              
              {/* GPS retry button (only show when needed) */}
              {!locationLoading && canRetryGPS && !isPreciseLocation && (
                <div className={styles.locationAccuracy}>
                  <button
                    className={`${styles.retryGpsButton} ${gpsRetrying ? styles.retrying : ''}`}
                    onClick={handleRetryGPS}
                    disabled={gpsRetrying}
                    title={gpsRetrying ? 'Getting precise location...' : 'Try to get precise GPS location'}
                    aria-label={gpsRetrying ? 'Getting precise location...' : 'Retry GPS location'}
                  >
                    {gpsRetrying ? '⏳' : '🔄'}
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className={styles.ipInfo}>
            {ipLocation ? (
              <div
                ref={ipRef}
                className={styles.ipHoverContainer}
                onMouseEnter={handleShowIPHover}
                onMouseLeave={handleHideIPHover}
              >
                <p className={styles.ipAddress} data-raccoon-collision="ip-address">{ipLocation.ip}</p>
                <PositionedIPHoverCard
                  ipLocation={ipLocation}
                  isVisible={showIPHover}
                  triggerRef={ipRef}
                />
              </div>
            ) : locationLoading ? (
              <Skeleton className="w-32 h-4" />
            ) : (
              <p className={styles.ipError}>IP address unavailable</p>
            )}
          </div>

          <div className={styles.elevationInfo}>
            {coordinates?.elevation !== undefined ? (
              <p
                className={`${styles.elevation} ${styles.clickable}`}
                data-raccoon-collision="elevation"
                onClick={toggleElevationUnit}
                title="Click to toggle unit"
              >
                Elevation: {elevationUnit === 'meters'
                  ? `${Math.round(coordinates.elevation)}m`
                  : `${Math.round(coordinates.elevation * 3.28084)}ft`}
              </p>
            ) : coordinates && !locationLoading ? (
              <p className={styles.elevation} style={{ opacity: 0.6 }}>
                Elevation: unavailable
              </p>
            ) : locationLoading ? (
              <Skeleton className="w-32 h-4" />
            ) : null}
          </div>
        </div>
      </div>

      {/* Dashboard Applications */}
      <div aria-label="Dashboard applications">
        {/* Raccoon Mascot */}
        <SectionErrorBoundary sectionName="Mascot" fallback={null} data-testid="section-error-boundary">
          <Suspense fallback={<div data-testid="loading-fallback"><LoadingFallback message="Loading mascot..." size="small" /></div>}>
            <LazyRaccoonMascot />
          </Suspense>
        </SectionErrorBoundary>
        {/* Dog Emoji Button */}
        <DogEmojiButton />

        {/* Giphy Emoji Button */}
        <GiphyEmojiButton />

        {/* NASA APOD Button */}
        <NasaApodButton />

        {/* Rhythm Machine Button */}
        <RhythmMachineButton />

        {/* Circle Game Button */}
        <CircleGameButton />

        {/* Streak Tracker Button */}
        <StreakTrackerButton />

        {/* Camera Button */}
        <CameraEmojiButton />

        {/* Pomodoro Timer Button */}
        <PomodoroEmojiButton />

        {/* Notes Button */}
        <NotesEmojiButton />

        {/* Vector Test Button */}
        <VectorMemoryButton />
      </div>

      {/* User Profile Viewer */}
      <UserProfileViewer
        isOpen={showProfileViewer}
        onClose={handleHideProfileViewer}
      />

      {/* Context Debugger (Development) */}
      <ContextDebugger />

    </div>
  );
});
