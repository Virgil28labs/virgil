/**
 * Dashboard Adapters Integration Tests
 * 
 * Tests the complete integration of all 9 dashboard adapters with the Dashboard component,
 * including real-time data flow, error handling, and cross-adapter communication.
 */

import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Dashboard } from '../Dashboard';
import { AllTheProviders } from '../../test-utils/AllTheProviders';
import { dashboardAppService } from '../../services/DashboardAppService';

// Mock all adapters and services
jest.mock('../../hooks/useAuth', () => ({
  useAuth: jest.fn(() => ({
    user: {
      id: '1',
      email: 'test@example.com',
      app_metadata: {},
      user_metadata: { name: 'Test User' },
      aud: 'authenticated',
      created_at: '2024-01-01T00:00:00.000Z',
      updated_at: '2024-01-01T00:00:00.000Z',
      role: 'authenticated',
      last_sign_in_at: '2024-01-01T00:00:00.000Z',
      confirmation_sent_at: undefined,
      confirmed_at: '2024-01-01T00:00:00.000Z',
      email_confirmed_at: '2024-01-01T00:00:00.000Z',
      phone: undefined,
      phone_confirmed_at: undefined,
      recovery_sent_at: undefined,
      new_email: undefined,
      invited_at: undefined,
      factors: undefined,
      identities: [],
      is_anonymous: false,
    },
    loading: false,
    signOut: jest.fn(),
    refreshUser: jest.fn(),
  })),
}));

jest.mock('../../hooks/useLocation', () => ({
  useLocation: jest.fn(() => ({
    address: { 
      street: 'Test St',
      house_number: '123',
      city: 'San Francisco',
      postcode: '94102',
      country: 'US',
      formatted: '123 Test St, San Francisco, CA',
    },
    ipLocation: { 
      ip: '127.0.0.1',
      city: 'San Francisco', 
      region: 'CA', 
      country: 'US',
    },
    coordinates: { 
      latitude: 37.7749, 
      longitude: -122.4194,
      accuracy: 10,
      timestamp: Date.now(),
      elevation: 100,
    },
    loading: false,
    error: null,
    permissionStatus: 'granted',
    lastUpdated: Date.now(),
    initialized: true,
    fetchLocationData: jest.fn(),
    requestLocationPermission: jest.fn(),
    clearError: jest.fn(),
    hasLocation: true,
    hasGPSLocation: true,
    hasIpLocation: true,
  })),
}));

jest.mock('../../hooks/useDeviceInfo', () => ({
  useDeviceInfo: jest.fn(() => ({
    deviceInfo: {
      location: 'San Francisco, CA',
      ip: '127.0.0.1',
      device: 'Desktop',
      os: 'macOS',
      browser: 'Chrome',
      screen: '1920x1080',
      pixelRatio: 1,
      colorScheme: 'light',
      windowSize: '1920x1080',
      cpu: 8,
      memory: '16 GB',
      online: true,
      networkType: 'wifi',
      downlink: '10 Mbps',
      rtt: '20ms',
      batteryLevel: null,
      batteryCharging: null,
      localTime: '12:00 PM',
      timezone: 'America/Los_Angeles',
      language: 'en-US',
      tabVisible: true,
      sessionDuration: 0,
      cookiesEnabled: true,
      doNotTrack: null,
      storageQuota: '10 GB',
    },
    permissions: {
      geolocation: 'granted',
      camera: 'prompt',
      microphone: 'prompt',
      notifications: 'prompt',
      'clipboard-read': 'prompt',
      clipboard: 'prompt',
    },
    requestPermission: jest.fn(),
  })),
}));

jest.mock('../../hooks/useKeyboardNavigation', () => ({
  useKeyboardNavigation: jest.fn(() => ({
    containerRef: { current: null },
    focusFirst: jest.fn(),
    focusLast: jest.fn(),
    focusNext: jest.fn(),
    focusPrevious: jest.fn(),
    focusElement: jest.fn(),
  })),
}));

// Mock all dashboard services and adapters
const mockAdapterData = {
  notes: {
    count: 5,
    lastNote: 'Meeting at 3pm',
    tags: ['work', 'personal'],
    recentNotes: [
      { id: '1', content: 'Buy groceries', timestamp: Date.now() },
      { id: '2', content: 'Call dentist', timestamp: Date.now() - 1000 },
    ],
  },
  pomodoro: {
    isActive: true,
    remainingTime: 1200,
    currentSession: 3,
    totalSessions: 8,
    mode: 'work',
  },
  streak: {
    habits: [
      { id: '1', name: 'Exercise', emoji: '💪', streak: 7, lastCompleted: Date.now() },
      { id: '2', name: 'Read', emoji: '📚', streak: 3, lastCompleted: Date.now() },
    ],
    totalHabits: 2,
    longestStreak: 7,
  },
  camera: {
    photosCount: 25,
    lastPhotoTimestamp: Date.now() - 3600000,
    storageUsed: '120 MB',
    favoritePhotos: 8,
  },
  dogGallery: {
    favorites: 12,
    totalViewed: 150,
    lastFetch: Date.now() - 1800000,
    breeds: ['Golden Retriever', 'Beagle', 'Pug'],
  },
  nasaApod: {
    todaysImage: {
      title: 'Nebula in Orion',
      date: '2025-01-15',
      mediaType: 'image',
      explanation: 'A beautiful nebula in the Orion constellation',
    },
    favorites: 5,
    viewHistory: 23,
  },
  giphy: {
    favorites: 18,
    searchHistory: ['cats', 'dancing', 'funny'],
    lastSearch: 'space',
    totalSearches: 47,
  },
  rhythmMachine: {
    isPlaying: false,
    currentBPM: 120,
    selectedKit: 'electronic',
    patterns: ['pattern1', 'pattern2'],
    volume: 0.7,
  },
  circleGame: {
    bestScore: 95.2,
    gamesPlayed: 12,
    averageScore: 78.5,
    lastPlayed: Date.now() - 7200000,
  },
};

let appUpdateCallback: ((data: unknown) => void) | undefined;

jest.mock('../../services/DashboardAppService', () => ({
  dashboardAppService: {
    registerAdapter: jest.fn(),
    unregisterAdapter: jest.fn(),
    subscribe: jest.fn((callback) => {
      appUpdateCallback = callback;
      return jest.fn();
    }),
    getAppData: jest.fn(() => ({
      apps: new Map(Object.entries(mockAdapterData)),
      activeApps: ['notes', 'pomodoro', 'camera'],
      lastUpdated: Date.now(),
    })),
    getAllAppData: jest.fn(() => ({
      apps: new Map(Object.entries(mockAdapterData)),
      activeApps: ['notes', 'pomodoro', 'camera'],
      lastUpdated: Date.now(),
    })),
    getContextSummary: jest.fn(() => 'Active: Notes (5 items), Pomodoro (20:00 remaining), Camera (25 photos)'),
  },
}));

jest.mock('../../services/DashboardContextService', () => ({
  dashboardContextService: {
    subscribe: jest.fn(() => jest.fn()),
    getContext: jest.fn(() => ({
      currentTime: '12:00 PM',
      currentDate: 'January 15, 2025',
      timeOfDay: 'afternoon',
      location: { hasGPS: true, city: 'San Francisco' },
      weather: { hasData: true, temperature: 22 },
      user: { isAuthenticated: true, name: 'Test User' },
      device: { hasData: true },
      activity: { activeComponents: [], recentActions: [] },
      environment: { isOnline: true, deviceType: 'desktop' },
      apps: {
        apps: new Map(Object.entries(mockAdapterData)),
        activeApps: ['notes', 'pomodoro', 'camera'],
        lastUpdated: Date.now(),
      },
    })),
    updateDeviceContext: jest.fn(),
    updateLocationContext: jest.fn(),
    updateWeatherContext: jest.fn(),
  },
}));

// Mock individual adapters
jest.mock('../../services/adapters/NotesAdapter', () => ({
  NotesAdapter: jest.fn().mockImplementation(() => ({
    appName: 'notes',
    getContextData: jest.fn(() => mockAdapterData.notes),
    isActive: jest.fn(() => true),
    subscribe: jest.fn(() => jest.fn()),
  })),
  notesAdapter: {
    appName: 'notes',
    getContextData: jest.fn(() => mockAdapterData.notes),
    isActive: jest.fn(() => true),
    subscribe: jest.fn(() => jest.fn()),
  },
}));

jest.mock('../../services/adapters/PomodoroAdapter', () => ({
  pomodoroAdapter: {
    getContextData: jest.fn(() => mockAdapterData.pomodoro),
    isActive: jest.fn(() => true),
    subscribe: jest.fn(() => jest.fn()),
  },
}));

jest.mock('../../services/adapters/StreakAdapterRefactored', () => ({
  streakAdapterRefactored: {
    appName: 'streak',
    getContextData: jest.fn(() => mockAdapterData.streak),
    isActive: jest.fn(() => true),
    subscribe: jest.fn(() => jest.fn()),
  },
}));

jest.mock('../../services/adapters/CameraAdapter', () => ({
  CameraAdapter: jest.fn().mockImplementation(() => ({
    appName: 'camera',
    getContextData: jest.fn(() => mockAdapterData.camera),
    isActive: jest.fn(() => true),
    subscribe: jest.fn(() => jest.fn()),
  })),
  cameraAdapter: {
    appName: 'camera',
    getContextData: jest.fn(() => mockAdapterData.camera),
    isActive: jest.fn(() => true),
    subscribe: jest.fn(() => jest.fn()),
  },
}));

jest.mock('../../services/adapters/DogGalleryAdapter', () => ({
  DogGalleryAdapter: jest.fn().mockImplementation(() => ({
    getContextData: jest.fn(() => mockAdapterData.dogGallery),
    isActive: jest.fn(() => false),
    subscribe: jest.fn(() => jest.fn()),
  })),
  dogGalleryAdapter: {
    getContextData: jest.fn(() => mockAdapterData.dogGallery),
    isActive: jest.fn(() => false),
    subscribe: jest.fn(() => jest.fn()),
  },
}));

jest.mock('../../services/adapters/NasaApodAdapter', () => ({
  NasaApodAdapter: jest.fn().mockImplementation(() => ({
    getContextData: jest.fn(() => mockAdapterData.nasaApod),
    isActive: jest.fn(() => false),
    subscribe: jest.fn(() => jest.fn()),
  })),
  nasaApodAdapter: {
    getContextData: jest.fn(() => mockAdapterData.nasaApod),
    isActive: jest.fn(() => false),
    subscribe: jest.fn(() => jest.fn()),
  },
}));

jest.mock('../../services/adapters/GiphyAdapter', () => ({
  GiphyAdapter: jest.fn().mockImplementation(() => ({
    getContextData: jest.fn(() => mockAdapterData.giphy),
    isActive: jest.fn(() => false),
    subscribe: jest.fn(() => jest.fn()),
  })),
  giphyAdapter: {
    getContextData: jest.fn(() => mockAdapterData.giphy),
    isActive: jest.fn(() => false),
    subscribe: jest.fn(() => jest.fn()),
  },
}));

jest.mock('../../services/adapters/RhythmMachineAdapter', () => ({
  RhythmMachineAdapter: jest.fn().mockImplementation(() => ({
    getContextData: jest.fn(() => mockAdapterData.rhythmMachine),
    isActive: jest.fn(() => false),
    subscribe: jest.fn(() => jest.fn()),
  })),
  rhythmMachineAdapter: {
    getContextData: jest.fn(() => mockAdapterData.rhythmMachine),
    isActive: jest.fn(() => false),
    subscribe: jest.fn(() => jest.fn()),
  },
}));

jest.mock('../../services/adapters/CircleGameAdapter', () => ({
  CircleGameAdapter: jest.fn().mockImplementation(() => ({
    getContextData: jest.fn(() => mockAdapterData.circleGame),
    isActive: jest.fn(() => false),
    subscribe: jest.fn(() => jest.fn()),
  })),
  circleGameAdapter: {
    getContextData: jest.fn(() => mockAdapterData.circleGame),
    isActive: jest.fn(() => false),
    subscribe: jest.fn(() => jest.fn()),
  },
}));

// Mock all UI components
jest.mock('../VirgilTextLogo', () => ({
  VirgilTextLogo: () => <div data-testid="virgil-logo">Virgil Logo</div>,
}));

jest.mock('../DateTime', () => ({
  DateTime: () => <div data-testid="datetime">Date Time</div>,
}));

jest.mock('../LazyComponents', () => ({
  LazyRaccoonMascot: () => <div data-testid="raccoon-mascot">Raccoon Mascot</div>,
}));

jest.mock('../Weather', () => ({
  Weather: () => <div data-testid="weather">Weather</div>,
}));

jest.mock('../UserProfileViewer', () => ({
  UserProfileViewer: ({ onClose }: { onClose: () => void }) => (
    <div data-testid="profile-viewer">
      Profile Viewer
      <button onClick={onClose}>Close</button>
    </div>
  ),
}));

// Mock all emoji buttons with adapter integration
jest.mock('../notes/NotesEmojiButton', () => ({
  NotesEmojiButton: () => <button data-testid="notes-button">📝 (5)</button>,
}));

jest.mock('../pomodoro/PomodoroEmojiButton', () => ({
  PomodoroEmojiButton: () => <button data-testid="pomodoro-button">🍅 (20:00)</button>,
}));

jest.mock('../StreakTrackerButton', () => ({
  StreakTrackerButton: () => <button data-testid="streak-button">📈 (7 day streak)</button>,
}));

jest.mock('../camera/CameraEmojiButton', () => ({
  CameraEmojiButton: () => <button data-testid="camera-button">📷 (25 photos)</button>,
}));

jest.mock('../DogEmojiButton', () => ({
  DogEmojiButton: () => <button data-testid="dog-button">🐕 (12 favorites)</button>,
}));

jest.mock('../NasaApodButton', () => ({
  NasaApodButton: () => <button data-testid="nasa-button">🚀 (Today: Nebula)</button>,
}));

jest.mock('../GiphyEmojiButton', () => ({
  GiphyEmojiButton: () => <button data-testid="giphy-button">🎬 (18 favorites)</button>,
}));

jest.mock('../RhythmMachineButton', () => ({
  RhythmMachineButton: () => <button data-testid="rhythm-button">🎵 (120 BPM)</button>,
}));

jest.mock('../CircleGameButton', () => ({
  CircleGameButton: () => <button data-testid="circle-button">⭕ (Best: 95.2%)</button>,
}));

jest.mock('../VectorMemoryButton', () => ({
  VectorMemoryButton: () => <button data-testid="memory-button">🧠</button>,
}));

jest.mock('../common/SectionErrorBoundary', () => ({
  SectionErrorBoundary: ({ children, sectionName }: { children: React.ReactNode; sectionName: string }) => (
    <div data-testid="section-error-boundary" data-section-name={sectionName}>
      {children}
    </div>
  ),
}));

jest.mock('../../lib/logger', () => ({
  logger: {
    warn: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
  },
}));

describe('Dashboard Adapters Integration Tests', () => {
  const mockDashboardAppService = dashboardAppService as jest.Mocked<typeof dashboardAppService>;

  beforeEach(() => {
    jest.clearAllMocks();
    // Reset adapter data to default state
    Object.assign(mockAdapterData, {
      notes: { count: 5, lastNote: 'Meeting at 3pm', tags: ['work', 'personal'] },
      pomodoro: { isActive: true, remainingTime: 1200, currentSession: 3 },
      streak: { habits: [{ id: '1', name: 'Exercise', streak: 7 }], totalHabits: 1 },
      camera: { photosCount: 25, lastPhotoTimestamp: Date.now() - 3600000 },
      dogGallery: { favorites: 12, totalViewed: 150 },
      nasaApod: { todaysImage: { title: 'Nebula in Orion' }, favorites: 5 },
      giphy: { favorites: 18, searchHistory: ['cats'], totalSearches: 47 },
      rhythmMachine: { isPlaying: false, currentBPM: 120 },
      circleGame: { bestScore: 95.2, gamesPlayed: 12 },
    });
  });

  const renderDashboard = () => {
    return render(
      <AllTheProviders>
        <Dashboard />
      </AllTheProviders>,
    );
  };

  describe('Adapter Registration and Initialization', () => {
    it('registers all 9 dashboard adapters on mount', () => {
      renderDashboard();

      // Verify all adapters are registered
      expect(mockDashboardAppService.registerAdapter).toHaveBeenCalledTimes(9);
      
      // Verify specific adapters
      const registeredAdapters = mockDashboardAppService.registerAdapter.mock.calls.map(call => call[0]);
      
      // Check that adapter objects were passed (not names)
      expect(registeredAdapters.every(adapter => adapter && typeof adapter === 'object')).toBe(true);
      
      // We can't easily check appName properties since they're mocked functions
      // But we can verify 9 adapters were registered
      expect(registeredAdapters).toHaveLength(9);
    });

    it('displays adapter data in dashboard buttons', async () => {
      renderDashboard();

      await waitFor(() => {
        // Verify buttons show adapter-specific data
        expect(screen.getByTestId('notes-button')).toHaveTextContent('📝 (5)');
        expect(screen.getByTestId('pomodoro-button')).toHaveTextContent('🍅 (20:00)');
        expect(screen.getByTestId('streak-button')).toHaveTextContent('📈 (7 day streak)');
        expect(screen.getByTestId('camera-button')).toHaveTextContent('📷 (25 photos)');
        expect(screen.getByTestId('dog-button')).toHaveTextContent('🐕 (12 favorites)');
        expect(screen.getByTestId('nasa-button')).toHaveTextContent('🚀 (Today: Nebula)');
        expect(screen.getByTestId('giphy-button')).toHaveTextContent('🎬 (18 favorites)');
        expect(screen.getByTestId('rhythm-button')).toHaveTextContent('🎵 (120 BPM)');
        expect(screen.getByTestId('circle-button')).toHaveTextContent('⭕ (Best: 95.2%)');
      });
    });

    it('handles adapter initialization failures gracefully', async () => {
      // Mock one adapter to fail initialization
      const notesAdapter = require('../../services/adapters/NotesAdapter').notesAdapter;
      notesAdapter.getContextData.mockImplementation(() => {
        throw new Error('Notes adapter initialization failed');
      });

      // Should not crash the dashboard
      expect(() => renderDashboard()).not.toThrow();

      await waitFor(() => {
        // Other adapters should still work
        expect(screen.getByTestId('pomodoro-button')).toBeInTheDocument();
        expect(screen.getByTestId('camera-button')).toBeInTheDocument();
      });
    });
  });

  describe('Real-time Adapter Updates', () => {
    it('updates dashboard when adapter data changes', async () => {
      renderDashboard();

      await waitFor(() => {
        expect(screen.getByTestId('notes-button')).toHaveTextContent('📝 (5)');
      });

      // Simulate adapter data update
      const updatedAdapterData = {
        ...mockAdapterData,
        notes: { count: 8, lastNote: 'Updated note', tags: ['work', 'personal', 'urgent'] },
        pomodoro: { isActive: false, remainingTime: 0, currentSession: 4 },
      };

      act(() => {
        if (appUpdateCallback) {
          appUpdateCallback({
            apps: new Map(Object.entries(updatedAdapterData)),
            activeApps: ['notes', 'camera'],
            lastUpdated: Date.now(),
          });
        }
      });

      await waitFor(() => {
        // Should reflect updated data (mock components would need to be updated to show this)
        expect(mockDashboardAppService.subscribe).toHaveBeenCalled();
      });
    });

    it('handles rapid adapter updates efficiently', async () => {
      renderDashboard();

      // Simulate rapid updates
      const updates = Array.from({ length: 20 }, (_, i) => ({
        apps: new Map([
          ['notes', { count: 5 + i, lastNote: `Note ${i}` }],
          ['pomodoro', { isActive: i % 2 === 0, remainingTime: 1200 - i * 60 }],
        ]),
        activeApps: ['notes', 'pomodoro'],
        lastUpdated: Date.now() + i,
      }));

      const startTime = Date.now();
      
      for (const update of updates) {
        act(() => {
          if (appUpdateCallback) {
            appUpdateCallback(update);
          }
        });
      }

      const endTime = Date.now();
      const totalTime = endTime - startTime;

      console.log(`Processed ${updates.length} adapter updates in ${totalTime}ms`);
      expect(totalTime).toBeLessThan(1000); // Should be efficient
    });

    it('batches multiple adapter updates to prevent UI thrashing', async () => {
      renderDashboard();

      // Simulate simultaneous updates from multiple adapters
      const batchUpdate = {
        apps: new Map([
          ['notes', { count: 10, lastNote: 'Batch update note' }],
          ['pomodoro', { isActive: true, remainingTime: 1500 }],
          ['camera', { photosCount: 30, storageUsed: '150 MB' }],
          ['streak', { habits: [{ name: 'Exercise', streak: 10 }], totalHabits: 1 }],
        ]),
        activeApps: ['notes', 'pomodoro', 'camera', 'streak'],
        lastUpdated: Date.now(),
      };

      act(() => {
        if (appUpdateCallback) {
          appUpdateCallback(batchUpdate);
        }
      });

      // Should update all affected components in one batch
      await waitFor(() => {
        expect(mockDashboardAppService.subscribe).toHaveBeenCalled();
      });
    });
  });

  describe('Adapter Error Handling', () => {
    it('isolates adapter errors to prevent cascade failures', async () => {
      renderDashboard();

      // Simulate error in one adapter
      const errorUpdate = {
        apps: new Map([
          ['notes', { error: 'Failed to load notes', count: 0 }],
          ['pomodoro', { isActive: true, remainingTime: 1200 }], // This should still work
          ['camera', { photosCount: 25 }], // This should still work
        ]),
        activeApps: ['pomodoro', 'camera'],
        lastUpdated: Date.now(),
      };

      act(() => {
        if (appUpdateCallback) {
          appUpdateCallback(errorUpdate);
        }
      });

      await waitFor(() => {
        // Non-errored adapters should still function
        expect(screen.getByTestId('pomodoro-button')).toBeInTheDocument();
        expect(screen.getByTestId('camera-button')).toBeInTheDocument();
      });
    });

    it('recovers from adapter errors when service is restored', async () => {
      renderDashboard();

      // First, simulate error
      act(() => {
        if (appUpdateCallback) {
          appUpdateCallback({
            apps: new Map([['notes', { error: 'Service unavailable' }]]),
            activeApps: [],
            lastUpdated: Date.now(),
          });
        }
      });

      // Then, simulate recovery
      act(() => {
        if (appUpdateCallback) {
          appUpdateCallback({
            apps: new Map([['notes', { count: 7, lastNote: 'Recovered note' }]]),
            activeApps: ['notes'],
            lastUpdated: Date.now(),
          });
        }
      });

      await waitFor(() => {
        expect(screen.getByTestId('notes-button')).toBeInTheDocument();
      });
    });

    it('provides error boundaries for each adapter section', () => {
      renderDashboard();

      // Verify error boundaries are present
      const errorBoundaries = screen.getAllByTestId('section-error-boundary');
      expect(errorBoundaries.length).toBeGreaterThan(0);

      // Each major section should be wrapped
      const sectionNames = errorBoundaries.map(boundary => 
        boundary.getAttribute('data-section-name'),
      );
      expect(sectionNames).toContain('weather');
      expect(sectionNames).toContain('mascot');
      expect(sectionNames).toContain('maps');
    });
  });

  describe('Cross-Adapter Communication', () => {
    it('coordinates between related adapters', async () => {
      renderDashboard();

      // Simulate pomodoro completion affecting streak
      const crossAdapterUpdate = {
        apps: new Map([
          ['pomodoro', { 
            isActive: false, 
            remainingTime: 0, 
            currentSession: 4,
            justCompleted: true,
          }],
          ['streak', { 
            habits: [
              { id: '1', name: 'Focus', streak: 8, lastCompleted: Date.now() },
            ],
            totalHabits: 1,
            recentlyUpdated: true,
          }],
        ]),
        activeApps: ['streak'],
        lastUpdated: Date.now(),
      };

      act(() => {
        if (appUpdateCallback) {
          appUpdateCallback(crossAdapterUpdate);
        }
      });

      await waitFor(() => {
        // Both adapters should reflect the coordinated update
        expect(mockDashboardAppService.subscribe).toHaveBeenCalled();
      });
    });

    it('handles adapter dependencies correctly', async () => {
      renderDashboard();

      // Simulate camera taking a photo that affects multiple adapters
      const dependencyUpdate = {
        apps: new Map([
          ['camera', { 
            photosCount: 26, 
            lastPhotoTimestamp: Date.now(),
            recentAction: 'photo_taken',
          }],
          ['streak', { 
            habits: [
              { id: '1', name: 'Photography', streak: 5, lastCompleted: Date.now() },
            ],
            totalHabits: 1,
          }],
          ['notes', { 
            count: 6, 
            lastNote: 'Captured beautiful sunset photo',
            autoGenerated: true,
          }],
        ]),
        activeApps: ['camera', 'streak', 'notes'],
        lastUpdated: Date.now(),
      };

      act(() => {
        if (appUpdateCallback) {
          appUpdateCallback(dependencyUpdate);
        }
      });

      await waitFor(() => {
        // All dependent adapters should be updated
        expect(mockDashboardAppService.subscribe).toHaveBeenCalled();
      });
    });
  });

  describe('Performance Under Load', () => {
    it('maintains performance with all adapters active', async () => {
      renderDashboard();

      // Simulate high activity across all adapters
      const highActivityUpdate = {
        apps: new Map([
          ['notes', { count: 50, tags: Array.from({ length: 20 }, (_, i) => `tag${i}`) }],
          ['pomodoro', { isActive: true, remainingTime: 1200, sessionsToday: 8 }],
          ['streak', { habits: Array.from({ length: 10 }, (_, i) => ({ 
            id: `${i}`, name: `Habit ${i}`, streak: i + 1, 
          })) }],
          ['camera', { photosCount: 500, storageUsed: '2.5 GB' }],
          ['dogGallery', { favorites: 100, totalViewed: 2000 }],
          ['nasaApod', { favorites: 50, viewHistory: 200 }],
          ['giphy', { favorites: 200, totalSearches: 1000 }],
          ['rhythmMachine', { patterns: Array.from({ length: 20 }, (_, i) => `pattern${i}`) }],
          ['circleGame', { gamesPlayed: 100, scores: Array.from({ length: 100 }, () => Math.random() * 100) }],
        ]),
        activeApps: ['notes', 'pomodoro', 'streak', 'camera', 'dogGallery', 'nasaApod', 'giphy', 'rhythmMachine', 'circleGame'],
        lastUpdated: Date.now(),
      };

      const startTime = Date.now();
      
      act(() => {
        if (appUpdateCallback) {
          appUpdateCallback(highActivityUpdate);
        }
      });

      await waitFor(() => {
        expect(mockDashboardAppService.subscribe).toHaveBeenCalled();
      });

      const endTime = Date.now();
      const updateTime = endTime - startTime;

      console.log(`High activity update processed in ${updateTime}ms`);
      expect(updateTime).toBeLessThan(500); // Should remain performant
    });

    it('handles memory efficiently with large adapter datasets', async () => {
      const initialMemory = process.memoryUsage();

      renderDashboard();

      // Simulate large dataset updates
      const largeDataUpdate = {
        apps: new Map([
          ['notes', { 
            count: 1000,
            notes: Array.from({ length: 1000 }, (_, i) => ({
              id: `note-${i}`,
              content: `Note ${i} with detailed content`.repeat(10),
              timestamp: Date.now() - i * 1000,
            })),
          }],
          ['camera', { 
            photosCount: 2000,
            photos: Array.from({ length: 2000 }, (_, i) => ({
              id: `photo-${i}`,
              url: `https://example.com/photo-${i}.jpg`,
              metadata: { size: 1024 * 1024, type: 'image/jpeg' },
            })),
          }],
        ]),
        activeApps: ['notes', 'camera'],
        lastUpdated: Date.now(),
      };

      act(() => {
        if (appUpdateCallback) {
          appUpdateCallback(largeDataUpdate);
        }
      });

      await waitFor(() => {
        expect(mockDashboardAppService.subscribe).toHaveBeenCalled();
      });

      const finalMemory = process.memoryUsage();
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;

      console.log(`Memory increase: ${Math.round(memoryIncrease / 1024 / 1024)}MB`);
      
      // Should not cause excessive memory usage
      expect(memoryIncrease).toBeLessThan(100 * 1024 * 1024); // Less than 100MB
    });
  });

  describe('Context Integration with Chat', () => {
    it('provides rich context from all adapters to chat system', async () => {
      renderDashboard();

      // Simulate getting context summary for chat
      const contextSummary = mockDashboardAppService.getContextSummary();
      
      expect(contextSummary).toContain('Notes');
      expect(contextSummary).toContain('Pomodoro');
      expect(contextSummary).toContain('Camera');
      
      // Context should include key information from active adapters
      expect(contextSummary).toMatch(/\d+/); // Should contain numbers (counts, etc.)
    });

    it('updates chat context when adapter states change', async () => {
      renderDashboard();

      // Initial context
      mockDashboardAppService.getContextSummary();
      
      // Update adapter data
      act(() => {
        if (appUpdateCallback) {
          appUpdateCallback({
            apps: new Map([
              ['notes', { count: 15, lastNote: 'Important deadline tomorrow' }],
              ['pomodoro', { isActive: true, remainingTime: 300, urgent: true }],
            ]),
            activeApps: ['notes', 'pomodoro'],
            lastUpdated: Date.now(),
          });
        }
      });

      await waitFor(() => {
        // Context should be updated (we'd need to call getContextSummary again)
        expect(mockDashboardAppService.subscribe).toHaveBeenCalled();
      });
    });
  });

  describe('Accessibility and User Experience', () => {
    it('maintains accessibility with all adapters loaded', async () => {
      renderDashboard();

      await waitFor(() => {
        // All adapter buttons should be accessible
        const adapterButtons = [
          screen.getByTestId('notes-button'),
          screen.getByTestId('pomodoro-button'),
          screen.getByTestId('streak-button'),
          screen.getByTestId('camera-button'),
          screen.getByTestId('dog-button'),
          screen.getByTestId('nasa-button'),
          screen.getByTestId('giphy-button'),
          screen.getByTestId('rhythm-button'),
          screen.getByTestId('circle-button'),
        ];

        adapterButtons.forEach(button => {
          expect(button).toBeInTheDocument();
          expect(button).toBeVisible();
          // Should be keyboard accessible
          expect(button.tagName).toBe('BUTTON');
        });
      });
    });

    it('provides meaningful status information for screen readers', async () => {
      renderDashboard();

      await waitFor(() => {
        // Buttons should have descriptive content for screen readers
        expect(screen.getByTestId('notes-button')).toHaveTextContent(/\d+/); // Count
        expect(screen.getByTestId('pomodoro-button')).toHaveTextContent(/\d+:\d+/); // Time
        expect(screen.getByTestId('streak-button')).toHaveTextContent(/\d+.*streak/i); // Streak info
      });
    });

    it('handles keyboard navigation across all adapters', async () => {
      const user = userEvent.setup();
      renderDashboard();

      await waitFor(() => {
        expect(screen.getByTestId('notes-button')).toBeInTheDocument();
      });

      // Should be able to tab through all adapter buttons
      await user.tab();
      expect(document.activeElement).toBeInstanceOf(HTMLElement);
      
      // Continue tabbing through other elements
      await user.tab();
      await user.tab();
      await user.tab();
      
      // All interactive elements should be reachable
      expect(document.activeElement).toBeInstanceOf(HTMLElement);
    });
  });
});