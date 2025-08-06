/**
 * DashboardContextService - Smart Context Collection & Management
 *
 * Collects real-time context from dashboard components to enhance
 * Virgil's AI responses with environmental awareness.
 */

import type { LocationContextValue } from '../types/location.types';
import type { WeatherContextType } from '../types/weather.types';
import type { AuthContextValue } from '../types/auth.types';
import type { UserProfile } from '../hooks/useUserProfile';
import type { DeviceInfo } from '../hooks/useDeviceInfo';
import { dashboardAppService, type DashboardAppData } from './DashboardAppService';
import { logger } from '../lib/logger';
import { userProfileAdapter } from './adapters/UserProfileAdapter';
import { timeService } from './TimeService';

export interface DashboardContext {
  // Time context
  currentTime: string;
  currentDate: string;
  timeOfDay: 'morning' | 'afternoon' | 'evening' | 'night';
  dayOfWeek: string;

  // Location context
  location: {
    hasGPS: boolean;
    city?: string;
    region?: string;
    country?: string;
    coordinates?: { latitude: number; longitude: number; accuracy: number };
    timezone?: string;
    address?: string;
    ipAddress?: string;
    isp?: string;
    postal?: string;
  };

  // Weather context
  weather: {
    hasData: boolean;
    temperature?: number;
    feelsLike?: number;
    condition?: string;
    description?: string;
    humidity?: number;
    windSpeed?: number;
    unit: 'celsius' | 'fahrenheit';
  };

  // User context
  user: {
    isAuthenticated: boolean;
    name?: string;
    email?: string;
    memberSince?: string;
    preferences?: Record<string, unknown>;
    profile?: UserProfile;
  };

  // Activity context
  activity: {
    activeComponents: string[];
    recentActions: string[];
    timeSpentInSession: number;
    lastInteraction: number;
  };

  // Environment context
  environment: {
    isOnline: boolean;
    deviceType: 'mobile' | 'tablet' | 'desktop';
    prefersDarkMode: boolean;
    language: string;
  };

  // Device context (from useDeviceInfo)
  device: {
    hasData: boolean;
    // Hardware & System
    os?: string;
    browser?: string;
    device?: string;
    cpu?: number | string;
    memory?: string;
    screen?: string;
    pixelRatio?: number;
    windowSize?: string;
    // Network
    networkType?: string;
    downlink?: string;
    rtt?: string;
    // Battery
    batteryLevel?: number | null;
    batteryCharging?: boolean | null;
    // Storage
    storageQuota?: string;
    // Features
    cookiesEnabled?: boolean;
    doNotTrack?: string | null;
    // Session
    tabVisible?: boolean;
    sessionDuration?: number;
  };

  // Dashboard apps context
  apps?: DashboardAppData;
}

export interface ContextualSuggestion {
  id: string;
  type: 'action' | 'information' | 'recommendation';
  priority: 'high' | 'medium' | 'low';
  content: string;
  reasoning: string;
  triggers: string[];
  component?: string;
}

export class DashboardContextService {
  private context: DashboardContext;
  private listeners: ((context: DashboardContext) => void)[] = [];
  private activityLog: { action: string; timestamp: number }[] = [];
  private sessionStartTime: number;

  // Unified timer system for periodic updates (context only, not time)
  private mainTimer?: NodeJS.Timeout;
  private lastMinuteUpdate: number = 0;

  // Event listener references for cleanup
  private onlineHandler?: () => void;
  private offlineHandler?: () => void;
  constructor() {
    this.sessionStartTime = this.getTimestamp();
    this.context = this.getInitialContext();
    this.startPeriodicUpdates();
    this.subscribeToDashboardApps();
  }

  private getInitialContext(): DashboardContext {
    return {
      currentTime: this.getCurrentTime(),
      currentDate: this.getCurrentDate(),
      timeOfDay: this.getTimeOfDay(),
      dayOfWeek: this.getDayOfWeek(),
      location: {
        hasGPS: false,
      },
      weather: {
        hasData: false,
        unit: 'fahrenheit',
      },
      user: {
        isAuthenticated: false,
      },
      activity: {
        activeComponents: [],
        recentActions: [],
        timeSpentInSession: 0,
        lastInteraction: this.getTimestamp(),
      },
      environment: {
        isOnline: navigator.onLine,
        deviceType: this.detectDeviceType(),
        prefersDarkMode: this.prefersDarkMode(),
        language: navigator.language || 'en-US',
      },
      device: {
        hasData: false,
      },
    };
  }

  private getCurrentTime(): string {
    try {
      return timeService.getCurrentTime();
    } catch (error) {
      logger.error('Error getting current time', { component: 'DashboardContextService', action: 'getCurrentTime' }, error as Error);
      // Safe fallback: return default time format to maintain interface compliance
      return '12:00';
    }
  }

  private getCurrentDate(): string {
    try {
      return timeService.getCurrentDate();
    } catch (error) {
      logger.error('Error getting current date', { component: 'DashboardContextService', action: 'getCurrentDate' }, error as Error);
      // Safe fallback: return default date format to maintain interface compliance
      return 'January 1, 2024';
    }
  }

  private getDayOfWeek(): string {
    try {
      return timeService.getDayOfWeek();
    } catch (error) {
      logger.error('Error getting day of week', { component: 'DashboardContextService', action: 'getDayOfWeek' }, error as Error);
      // Safe fallback: return default day to maintain interface compliance
      return 'monday';
    }
  }

  private getTimeOfDay(): 'morning' | 'afternoon' | 'evening' | 'night' {
    try {
      return timeService.getTimeOfDay();
    } catch (error) {
      logger.error('Error getting time of day', { component: 'DashboardContextService', action: 'getTimeOfDay' }, error as Error);
      // Safe fallback: return default time period to maintain interface compliance
      return 'morning';
    }
  }

  // =============================================================================
  // TimeService Methods - Single Source of Truth for Time/Date Operations
  // =============================================================================

  /**
   * Get current date in local YYYY-MM-DD format
   * @returns Local date string (e.g., "2024-01-15")
   */
  getLocalDate(): string {
    return timeService.getLocalDate();
  }

  /**
   * Format any date to local YYYY-MM-DD format
   * @param date Date object to format
   * @returns Local date string (e.g., "2024-01-15")
   */
  formatDateToLocal(date: Date): string {
    return timeService.formatDateToLocal(date);
  }

  /**
   * Get current Date object (local timezone)
   * @returns Current local Date object
   */
  getCurrentDateTime(): Date {
    return timeService.getCurrentDateTime();
  }

  /**
   * Get current timestamp
   * @returns Current timestamp in milliseconds
   */
  getTimestamp(): number {
    try {
      return timeService.getTimestamp();
    } catch (error) {
      logger.error('Error getting timestamp', { component: 'DashboardContextService', action: 'getTimestamp' }, error as Error);
      // Safe fallback: use performance API which doesn't violate TimeService rules
      return performance.now() + performance.timeOrigin;
    }
  }

  /**
   * Format a date for display purposes
   * @param date Date to format (optional, defaults to current date)
   * @returns Formatted date string
   */
  formatDate(date?: Date): string {
    return timeService.formatDate(date);
  }

  /**
   * Subscribe to real-time time updates (1-second precision)
   * @param callback Function called with time updates
   * @returns Unsubscribe function
   */
  subscribeToTimeUpdates(callback: (time: { currentTime: string; currentDate: string; dateObject: Date }) => void): () => void {
    return timeService.subscribeToTimeUpdates(callback);
  }

  private detectDeviceType(): 'mobile' | 'tablet' | 'desktop' {
    const width = window.innerWidth;
    if (width <= 768) return 'mobile';
    if (width <= 1024) return 'tablet';
    return 'desktop';
  }

  private prefersDarkMode(): boolean {
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  }

  // Update methods for different context sources
  updateLocationContext(locationData: LocationContextValue): void {
    this.context.location = {
      hasGPS: locationData.hasGPSLocation,
      city: locationData.ipLocation?.city || locationData.address?.city,
      region: locationData.ipLocation?.region,
      country: locationData.ipLocation?.country || locationData.address?.country,
      coordinates: locationData.coordinates ? {
        latitude: locationData.coordinates.latitude,
        longitude: locationData.coordinates.longitude,
        accuracy: locationData.coordinates.accuracy,
      } : undefined,
      timezone: locationData.ipLocation?.timezone,
      address: locationData.address?.formatted,
      ipAddress: locationData.ipLocation?.ip,
      isp: locationData.ipLocation?.isp || locationData.ipLocation?.org,
      postal: locationData.ipLocation?.postal || locationData.address?.postcode,
    };
    this.notifyListeners();
  }

  updateWeatherContext(weatherData: WeatherContextType): void {
    if (weatherData.data) {
      this.context.weather = {
        hasData: true,
        temperature: weatherData.data.temperature,
        feelsLike: weatherData.data.feelsLike,
        condition: weatherData.data.condition.main,
        description: weatherData.data.condition.description,
        humidity: weatherData.data.humidity,
        windSpeed: weatherData.data.windSpeed,
        unit: weatherData.unit,
      };
    } else {
      this.context.weather = {
        hasData: false,
        unit: weatherData.unit,
      };
    }
    this.notifyListeners();
  }

  updateUserContext(userData: AuthContextValue, userProfile?: UserProfile): void {
    this.context.user = {
      isAuthenticated: !!userData.user,
      name: userData.user?.user_metadata?.name,
      email: userData.user?.email,
      memberSince: userData.user?.created_at ? this.formatDateToLocal(timeService.parseDate(userData.user.created_at) || this.getCurrentDateTime()) : undefined,
      profile: userProfile,
    };

    // Update the user profile adapter
    if (userProfile) {
      userProfileAdapter.updateProfile(userProfile, userData);
      // Register adapter if not already registered
      if (!dashboardAppService.getAppData('userProfile')) {
        dashboardAppService.registerAdapter(userProfileAdapter);
      }
    }

    this.notifyListeners();
  }

  updateDeviceContext(deviceInfo: DeviceInfo): void {
    if (!deviceInfo) {
      this.context.device = { hasData: false };
    } else {
      this.context.device = {
        hasData: true,
        // Hardware & System
        os: deviceInfo.os,
        browser: deviceInfo.browser,
        device: deviceInfo.device,
        cpu: deviceInfo.cpu,
        memory: deviceInfo.memory,
        screen: deviceInfo.screen,
        pixelRatio: deviceInfo.pixelRatio,
        windowSize: deviceInfo.windowSize,
        // Network
        networkType: deviceInfo.networkType,
        downlink: deviceInfo.downlink,
        rtt: deviceInfo.rtt,
        // Battery
        batteryLevel: deviceInfo.batteryLevel,
        batteryCharging: deviceInfo.batteryCharging,
        // Storage
        storageQuota: deviceInfo.storageQuota,
        // Features
        cookiesEnabled: deviceInfo.cookiesEnabled,
        doNotTrack: deviceInfo.doNotTrack,
        // Session
        tabVisible: deviceInfo.tabVisible,
        sessionDuration: deviceInfo.sessionDuration,
      };
    }
    this.notifyListeners();
  }

  logActivity(action: string, component?: string): void {
    const timestamp = this.getTimestamp();
    this.activityLog.push({ action, timestamp });

    // Keep only recent activities (last 10 minutes)
    this.activityLog = this.activityLog.filter(
      log => timestamp - log.timestamp < 10 * 60 * 1000,
    );

    // Update activity context
    this.context.activity = {
      ...this.context.activity,
      recentActions: this.activityLog.map(log => log.action),
      timeSpentInSession: timestamp - this.sessionStartTime,
      lastInteraction: timestamp,
    };

    // Track active components
    if (component) {
      if (!this.context.activity.activeComponents.includes(component)) {
        this.context.activity.activeComponents.push(component);
      }
    }

    this.notifyListeners();
  }

  private startPeriodicUpdates(): void {
    // Initialize last minute update timestamp
    this.lastMinuteUpdate = this.getTimestamp();

    // Context update timer (runs every minute)
    this.mainTimer = setInterval(() => {
      const now = this.getTimestamp();

      // Update dashboard context every minute
      if (now - this.lastMinuteUpdate >= 60000) {
        this.lastMinuteUpdate = now;
        this.context.currentTime = this.getCurrentTime();
        this.context.currentDate = this.getCurrentDate();
        this.context.timeOfDay = this.getTimeOfDay();
        this.context.dayOfWeek = this.getDayOfWeek();
        this.context.activity.timeSpentInSession = now - this.sessionStartTime;
        this.notifyListeners();
      }
    }, 60000); // Check every minute instead of every second for efficiency

    // Update environment context when online status changes
    this.onlineHandler = () => {
      this.context.environment.isOnline = true;
      this.notifyListeners();
    };
    this.offlineHandler = () => {
      this.context.environment.isOnline = false;
      this.notifyListeners();
    };

    window.addEventListener('online', this.onlineHandler);
    window.addEventListener('offline', this.offlineHandler);
  }

  // Context access methods
  getContext(): DashboardContext {
    return { ...this.context };
  }

  getContextForPrompt(): string {
    const ctx = this.context;
    const contextParts: string[] = [];

    // Time context
    contextParts.push('\n\nCURRENT CONTEXT:');
    contextParts.push(`- Current time: ${ctx.currentTime}`);
    contextParts.push(`- Current date: ${ctx.currentDate} (${ctx.dayOfWeek})`);
    contextParts.push(`- Time of day: ${ctx.timeOfDay}`);

    // Location context
    if (ctx.location.hasGPS || ctx.location.ipAddress) {
      contextParts.push('\nLOCATION:');
      if (ctx.location.city) {
        let locationStr = `- Current location: ${ctx.location.city}`;
        if (ctx.location.region) locationStr += `, ${ctx.location.region}`;
        if (ctx.location.country) locationStr += `, ${ctx.location.country}`;
        contextParts.push(locationStr);
      }
      if (ctx.location.address) {
        contextParts.push(`- Address: ${ctx.location.address}`);
      }
      if (ctx.location.timezone) {
        contextParts.push(`- Timezone: ${ctx.location.timezone}`);
      }
      if (ctx.location.ipAddress) {
        contextParts.push(`- IP Address: ${ctx.location.ipAddress}`);
        if (ctx.location.isp) {
          contextParts.push(`- ISP: ${ctx.location.isp}`);
        }
      }
    }

    // Weather context
    if (ctx.weather.hasData) {
      contextParts.push('\nWEATHER:');
      let tempStr = `- Temperature: ${ctx.weather.temperature}°${ctx.weather.unit === 'fahrenheit' ? 'F' : 'C'}`;
      if (ctx.weather.feelsLike) {
        tempStr += ` (feels like ${ctx.weather.feelsLike}°${ctx.weather.unit === 'fahrenheit' ? 'F' : 'C'})`;
      }
      contextParts.push(tempStr);
      if (ctx.weather.description) {
        contextParts.push(`- Conditions: ${ctx.weather.description}`);
      }
      if (ctx.weather.humidity) {
        contextParts.push(`- Humidity: ${ctx.weather.humidity}%`);
      }
    }

    // User context
    if (ctx.user.isAuthenticated) {
      contextParts.push('\nUSER:');
      if (ctx.user.profile?.fullName || ctx.user.profile?.nickname || ctx.user.name) {
        const displayName = ctx.user.profile?.nickname || ctx.user.profile?.fullName || ctx.user.name;
        contextParts.push(`- Name: ${displayName}`);
        if (ctx.user.profile?.fullName && ctx.user.profile?.nickname && ctx.user.profile.fullName !== ctx.user.profile.nickname) {
          contextParts.push(`- Full name: ${ctx.user.profile.fullName}`);
        }
      }
      if (ctx.user.profile?.uniqueId) {
        contextParts.push(`- Unique ID: ${ctx.user.profile.uniqueId}`);
      }
      if (ctx.user.email || ctx.user.profile?.email) {
        contextParts.push(`- Email: ${ctx.user.profile?.email || ctx.user.email}`);
      }
      if (ctx.user.profile?.phone) {
        contextParts.push(`- Phone: ${ctx.user.profile.phone}`);
      }
      if (ctx.user.profile?.dateOfBirth) {
        const birthDate = timeService.parseDate(ctx.user.profile.dateOfBirth);
        if (birthDate) {
          const age = Math.floor((this.getTimestamp() - birthDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000)); // eslint-disable-line no-restricted-syntax -- Valid use: calculating age from birthDate
          contextParts.push(`- Age: ${age} years old (born ${this.formatDateToLocal(birthDate)})`);
        }
      }
      if (ctx.user.profile?.gender) {
        contextParts.push(`- Gender: ${ctx.user.profile.gender}`);
      }
      if (ctx.user.profile?.maritalStatus) {
        contextParts.push(`- Marital status: ${ctx.user.profile.maritalStatus}`);
      }
      if (ctx.user.profile?.address && (ctx.user.profile.address.street || ctx.user.profile.address.city)) {
        const addr = ctx.user.profile.address;
        if (addr.street && addr.city && addr.state && addr.zip) {
          let addressStr = `- Home address: ${addr.street}, ${addr.city}, ${addr.state} ${addr.zip}`;
          if (addr.country) addressStr += `, ${addr.country}`;
          contextParts.push(addressStr);
        } else if (addr.city) {
          let livesInStr = `- Lives in: ${addr.city}`;
          if (addr.state) livesInStr += `, ${addr.state}`;
          contextParts.push(livesInStr);
        }
      }
      if (ctx.user.memberSince) {
        contextParts.push(`- Member since: ${ctx.user.memberSince}`);
      }
    }

    // Activity context
    if (ctx.activity.activeComponents.length > 0) {
      contextParts.push('\nACTIVE FEATURES:');
      contextParts.push(`- Currently using: ${ctx.activity.activeComponents.join(', ')}`);
    }

    // Environment hints
    contextParts.push('\nENVIRONMENT:');
    contextParts.push(`- Device: ${ctx.environment.deviceType}`);
    contextParts.push(`- Time in session: ${Math.floor(ctx.activity.timeSpentInSession / 1000 / 60)} minutes`);

    // Device context
    if (ctx.device.hasData) {
      contextParts.push('\nDEVICE INFO:');
      if (ctx.device.browser) contextParts.push(`- Browser: ${ctx.device.browser}`);
      if (ctx.device.os) contextParts.push(`- Operating System: ${ctx.device.os}`);
      if (ctx.device.device) contextParts.push(`- Device Type: ${ctx.device.device}`);
      if (ctx.device.screen) {
        let screenStr = `- Screen Resolution: ${ctx.device.screen}`;
        if (ctx.device.pixelRatio && ctx.device.pixelRatio > 1) screenStr += ` @${ctx.device.pixelRatio}x`;
        contextParts.push(screenStr);
      }
      if (ctx.device.windowSize) contextParts.push(`- Window Size: ${ctx.device.windowSize}`);
      if (ctx.device.cpu) contextParts.push(`- CPU: ${ctx.device.cpu}${typeof ctx.device.cpu === 'number' ? ' cores' : ''}`);
      if (ctx.device.memory) contextParts.push(`- Memory: ${ctx.device.memory}`);
      if (ctx.device.networkType) contextParts.push(`- Network Type: ${ctx.device.networkType}`);
      if (ctx.device.downlink) contextParts.push(`- Network Speed: ${ctx.device.downlink}`);
      if (ctx.device.batteryLevel !== null && ctx.device.batteryLevel !== undefined) {
        let batteryStr = `- Battery: ${ctx.device.batteryLevel}%`;
        if (ctx.device.batteryCharging !== null) {
          batteryStr += ` (${ctx.device.batteryCharging ? 'charging' : 'not charging'})`;
        }
        contextParts.push(batteryStr);
      }
      if (ctx.device.storageQuota) contextParts.push(`- Storage Quota: ${ctx.device.storageQuota}`);
    }

    // Dashboard apps context
    if (ctx.apps) {
      const appSummary = dashboardAppService.getContextSummary();
      if (appSummary && appSummary !== 'No active dashboard apps') {
        contextParts.push(`\n${appSummary}`);
      }
    }

    return contextParts.join('\n');
  }

  // Generate contextual suggestions
  generateSuggestions(): ContextualSuggestion[] {
    const suggestions: ContextualSuggestion[] = [];
    const ctx = this.context;

    // Time-based suggestions
    if (ctx.timeOfDay === 'morning') {
      suggestions.push({
        id: 'morning-greeting',
        type: 'information',
        priority: 'medium',
        content: `Good morning${ctx.user.name ? `, ${ctx.user.name}` : ''}! Ready to start your day?`,
        reasoning: 'Morning greeting based on time of day',
        triggers: ['time_of_day:morning'],
      });
    }

    // Weather-based suggestions
    if (ctx.weather.hasData && ctx.weather.temperature !== undefined) {
      if (ctx.weather.temperature < 40) {
        suggestions.push({
          id: 'cold-weather',
          type: 'recommendation',
          priority: 'medium',
          content: `It's quite cold today at ${ctx.weather.temperature}°${ctx.weather.unit === 'fahrenheit' ? 'F' : 'C'}. Don't forget a warm coat!`,
          reasoning: 'Cold temperature detected',
          triggers: ['weather:cold'],
        });
      } else if (ctx.weather.temperature > 80) {
        suggestions.push({
          id: 'hot-weather',
          type: 'recommendation',
          priority: 'medium',
          content: `It's warm today at ${ctx.weather.temperature}°${ctx.weather.unit === 'fahrenheit' ? 'F' : 'C'}. Perfect weather for outdoor activities!`,
          reasoning: 'Warm temperature detected',
          triggers: ['weather:hot'],
        });
      }
    }

    // Location-based suggestions
    if (ctx.location.city) {
      suggestions.push({
        id: 'location-aware',
        type: 'information',
        priority: 'low',
        content: `I can help you with local information for ${ctx.location.city}${ctx.location.region ? `, ${ctx.location.region}` : ''}.`,
        reasoning: 'Location data available for local suggestions',
        triggers: ['location:available'],
      });
    }

    return suggestions.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
  }

  // Subscription methods
  subscribe(callback: (context: DashboardContext) => void): () => void {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(listener => listener !== callback);
    };
  }

  private notifyListeners(): void {
    this.listeners.forEach(listener => {
      try {
        listener(this.context);
      } catch (error) {
        // Log the error but don't let it break other listeners
        logger.error('Listener error', { component: 'DashboardContextService', action: 'notifyListeners' }, error as Error);
      }
    });
  }

  private subscribeToDashboardApps(): void {
    dashboardAppService.subscribe((appData) => {
      this.context.apps = appData;
      this.notifyListeners();
    });
  }

  // Cleanup
  destroy(): void {
    // Clear unified timer
    if (this.mainTimer) {
      clearInterval(this.mainTimer);
      this.mainTimer = undefined;
    }

    // Remove event listeners
    if (this.onlineHandler) {
      window.removeEventListener('online', this.onlineHandler);
      this.onlineHandler = undefined;
    }
    if (this.offlineHandler) {
      window.removeEventListener('offline', this.offlineHandler);
      this.offlineHandler = undefined;
    }

    // Clear listeners
    this.listeners = [];

    dashboardAppService.destroy();
  }
}

// Singleton instance
export const dashboardContextService = new DashboardContextService();
