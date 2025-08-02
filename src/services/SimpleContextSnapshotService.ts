import { indexedDBService } from './IndexedDBService';
import { useContextStore } from '../stores/ContextStore';
import { weatherService } from '../lib/weatherService';
import { timeService } from './TimeService';
import type { Context } from '../types/context.types';
import type { WeatherSliceState } from '../stores/types/store.types';

export class SimpleContextSnapshotService {
  private static instance: SimpleContextSnapshotService | null = null;
  private snapshots: Array<Context & { timestamp: number }> = [];
  private intervalId: number | null = null;
  private timeoutId: number | null = null;
  private initialized = false;
  private lastCleanup = 0;
  
  // User info stored at startup
  private userInfo = {
    name: 'User',
    email: '',
    username: 'user',
  };
  
  // Activity tracking
  private lastActivity = {
    mouse: 0,
    keyboard: 0,
    scroll: 0,
    click: 0,
    any: 0,
  };
  
  private activityListeners = new Map<string, (e: Event) => void>();
  
  static getInstance(): SimpleContextSnapshotService {
    if (!SimpleContextSnapshotService.instance) {
      SimpleContextSnapshotService.instance = new SimpleContextSnapshotService();
    }
    return SimpleContextSnapshotService.instance;
  }
  
  async init() {
    if (this.initialized) return;
    
    
    // Register simple IndexedDB schema
    indexedDBService.registerDatabase({
      name: 'VirgilContextDB',
      version: 1,
      stores: [{
        name: 'snapshots',
        keyPath: 'id',
        indexes: [
          { name: 'timestamp', keyPath: 'timestamp' },
        ],
      }],
    });
    
    // Set up activity listeners
    this.setupActivityListeners();
    
    // Initialize activity timestamps
    const now = timeService.getTimestamp();
    this.lastActivity = {
      mouse: now,
      keyboard: now,
      scroll: now,
      click: now,
      any: now,
    };
    
    // Load recent snapshots from DB to memory
    const dbSnapshots = await this.loadSnapshotsFromDB(60);
    this.snapshots = dbSnapshots;
    
    this.initialized = true;
  }
  
  isInitialized(): boolean {
    return this.initialized;
  }
  
  private setupActivityListeners() {
    // Use passive listeners for better performance
    const options = { passive: true, capture: true };
    
    // Mouse movement
    const mouseHandler = () => {
      this.lastActivity.mouse = timeService.getTimestamp();
      this.lastActivity.any = timeService.getTimestamp();
    };
    this.activityListeners.set('mousemove', mouseHandler);
    document.addEventListener('mousemove', mouseHandler, options);
    
    // Keyboard
    const keyHandler = () => {
      this.lastActivity.keyboard = timeService.getTimestamp();
      this.lastActivity.any = timeService.getTimestamp();
    };
    this.activityListeners.set('keydown', keyHandler);
    document.addEventListener('keydown', keyHandler, options);
    
    // Scroll
    const scrollHandler = () => {
      this.lastActivity.scroll = timeService.getTimestamp();
      this.lastActivity.any = timeService.getTimestamp();
    };
    this.activityListeners.set('scroll', scrollHandler);
    document.addEventListener('scroll', scrollHandler, options);
    
    // Click
    const clickHandler = () => {
      this.lastActivity.click = timeService.getTimestamp();
      this.lastActivity.any = timeService.getTimestamp();
    };
    this.activityListeners.set('click', clickHandler);
    document.addEventListener('click', clickHandler, options);
  }
  
  private cleanupActivityListeners() {
    this.activityListeners.forEach((handler, event) => {
      document.removeEventListener(event, handler);
    });
    this.activityListeners.clear();
  }
  
  startCapture(user?: { email?: string; user_metadata?: { name?: string; nickname?: string } }) {
    // Always stop any existing capture first
    this.stopCapture();
    
    // Store user info if provided
    if (user) {
      // Get the username from context store which has the generated "Ben28" style username
      const contextStore = useContextStore.getState();
      const contextUsername = contextStore.user.user?.username;
      
      this.userInfo = {
        name: user.user_metadata?.name || user.email || 'User',
        email: user.email || '',
        username: contextUsername || user.user_metadata?.nickname || user.email?.split('@')[0] || 'user',
      };
    }
    
    // Capture immediately so we have fresh data
    this.captureSnapshot();
    
    // Then capture every 60 seconds
    this.intervalId = window.setInterval(() => {
      this.captureSnapshot();
    }, 60000);
    
  }
  
  stopCapture() {
    
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
    
    // Clean up activity listeners
    this.cleanupActivityListeners();
  }
  
  private calculateActivityLevel(): 'active' | 'idle' | 'away' {
    const now = timeService.getTimestamp();
    const timeSinceLastActivity = now - this.lastActivity.any;
    
    if (timeSinceLastActivity < 5000) return 'active';      // < 5 seconds
    if (timeSinceLastActivity < 60000) return 'idle';       // < 1 minute  
    return 'away';                                           // > 1 minute
  }
  
  private async cleanupOldSnapshots() {
    try {
      const sevenDaysAgo = timeService.getTimestamp() - (7 * 24 * 60 * 60 * 1000);
      
      // Get all snapshots
      const allSnapshotsResult = await indexedDBService.getAll<Context & { timestamp: number }>('VirgilContextDB', 'snapshots');
      
      if (!allSnapshotsResult.success || !allSnapshotsResult.data) {
        return;
      }
      
      const allSnapshots = allSnapshotsResult.data;
      
      // Find and delete old ones
      const toDelete = allSnapshots.filter((snap: Context & { timestamp: number }) => snap.timestamp < sevenDaysAgo);
      
      for (const snap of toDelete) {
        const snapWithId = snap as Context & { timestamp: number; id: string };
        if (snapWithId.id) {
          await indexedDBService.delete('VirgilContextDB', 'snapshots', snapWithId.id);
        }
      }
    } catch (error) {
      console.error('Failed to cleanup old snapshots:', error);
    }
  }
  
  private parseUserAgent(): { browser: string; os: string } {
    const ua = navigator.userAgent;
    let os = 'Unknown OS';
    let browser = 'Unknown Browser';

    // Detect OS
    if (ua.includes('Mac')) os = 'macOS';
    else if (ua.includes('Windows')) os = 'Windows';
    else if (ua.includes('Linux')) os = 'Linux';
    else if (ua.includes('Android')) os = 'Android';
    else if (ua.includes('iOS')) os = 'iOS';

    // Detect Browser
    if (ua.includes('Chrome/') && !ua.includes('Edg/')) {
      browser = 'Chrome';
    } else if (ua.includes('Safari/') && !ua.includes('Chrome')) {
      browser = 'Safari';
    } else if (ua.includes('Firefox/')) {
      browser = 'Firefox';
    } else if (ua.includes('Edg/')) {
      browser = 'Edge';
    }

    return { browser, os };
  }

  private async captureSnapshot() {
    try {
      const context = await this.collectBasicContext();
      const snapshotWithTimestamp = {
        ...context,
        timestamp: timeService.getTimestamp(),
      };
      
      // Store in memory (last 60 snapshots)
      this.snapshots.push(snapshotWithTimestamp);
      if (this.snapshots.length > 60) {
        this.snapshots.shift();
      }
      
      // Store in IndexedDB
      const dbResult = await indexedDBService.add('VirgilContextDB', 'snapshots', {
        id: `snap_${timeService.getTimestamp()}`,
        ...snapshotWithTimestamp,
      });
      
      if (!dbResult.success) {
        console.error('❌ Failed to save snapshot to IndexedDB:', dbResult.error);
      }
      
      // Run cleanup once per day
      const now = timeService.getTimestamp();
      if (now - this.lastCleanup > 24 * 60 * 60 * 1000) {
        this.lastCleanup = now;
        this.cleanupOldSnapshots(); // Don't await, run in background
      }
      
    } catch (error) {
      console.error('❌ Failed to capture snapshot:', error);
      // Don't throw - continue capturing even if one fails
    }
  }
  
  private async collectBasicContext(): Promise<Context> {
    const store = useContextStore.getState();
    const currentDateTime = timeService.getCurrentDateTime();
    const hour = timeService.getHours(currentDateTime);
    const { browser, os } = this.parseUserAgent();
    
    return {
      time: {
        iso: timeService.toISOString(currentDateTime),
        local: timeService.formatDate(currentDateTime) + ', ' + timeService.getCurrentTime(),
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        partOfDay: hour < 6 ? 'night' : hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : hour < 21 ? 'evening' : 'night',
      },
      
      user: {
        name: store.user.user?.name || this.userInfo.name,
        dob: store.user.user?.dob || '',
        username: store.user.user?.username || this.userInfo.username,
      },
      
      env: {
        ip: store.user?.env?.ip || store.location?.ipLocation?.ip || '',
        city: store.user?.env?.city || store.location?.ipLocation?.city || store.location?.address?.city || '',
        lat: store.user?.env?.lat || store.location?.coordinates?.latitude || 0,
        long: store.user?.env?.long || store.location?.coordinates?.longitude || 0,
        weather: this.formatWeatherFromStore(store.weather),
        deviceType: store.user?.env?.deviceType || store.environment?.deviceType || 'desktop',
        browser: browser,
        os: os,
      },
      
      sensors: {
        visibility: document.visibilityState as 'visible' | 'hidden',
        pageFocus: document.hasFocus(),
        systemIdleTime: Math.floor((timeService.getTimestamp() - (store.activity?.lastInteraction || timeService.getTimestamp())) / 1000),
        inputActivity: {
          mouse: timeService.getTimestamp() - this.lastActivity.mouse < 5000,
          keyboard: timeService.getTimestamp() - this.lastActivity.keyboard < 5000,
          lastInteraction: store.activity?.lastInteraction || this.lastActivity.any,
        },
        motion: this.calculateActivityLevel() as 'still' | 'moving' | 'unknown',
        battery: store.device?.batteryLevel !== null && store.device?.batteryLevel !== undefined ? {
          level: store.device.batteryLevel || 0,
          charging: store.device?.batteryCharging || false,
        } : undefined,
      },
      
      system: {
        pageTitle: document.title,
        windowVisibility: document.visibilityState as 'visible' | 'hidden',
        idleTime: Math.floor((timeService.getTimestamp() - (store.activity?.lastInteraction || timeService.getTimestamp())) / 1000),
        userAgent: navigator.userAgent,
        platform: navigator.platform,
        language: store.environment?.language || navigator.language || 'en-US',
        screen: {
          width: store.environment?.viewport?.width || window.innerWidth,
          height: store.environment?.viewport?.height || window.innerHeight,
          pixelDepth: store.device?.pixelRatio || window.devicePixelRatio || 1,
        },
      },
      
      network: {
        online: store.environment?.isOnline ?? navigator.onLine,
        connectionType: store.device?.networkType,
        effectiveType: store.device?.downlink,
      },
      
      locationContext: await this.determineLocationContext(),
    };
  }
  
  private formatWeatherFromStore(weather: WeatherSliceState): string {
    if (!weather.hasWeather || !weather.data) return '';
    
    const temp = Math.round(weather.data.temperature);
    const unit = weather.unit === 'fahrenheit' ? 'F' : 'C';
    const conditionId = weather.data.condition.id || 0;
    
    // Use weatherService to get consistent emoji with Weather component
    const emoji = weatherService.getWeatherEmoji(conditionId);
    return `${emoji} ${temp}°${unit}`;
  }
  
  // Helper methods
  
  private simpleTimeRules(): { 
    probablePlace: 'Home' | 'Work' | 'Travel' | 'Unknown',
    confidence: number,
    basedOn: string[]
    } {
    const now = timeService.getCurrentDateTime();
    const hour = timeService.getHours(now);
    const isWeekend = [0, 6].includes(timeService.getDay(now));
    
    if (hour >= 22 || hour < 6) {
      return { probablePlace: 'Home', confidence: 0.5, basedOn: ['nightTime'] };
    }
    
    if (!isWeekend && hour >= 9 && hour <= 17) {
      return { probablePlace: 'Work', confidence: 0.5, basedOn: ['workHours'] };
    }
    
    if (isWeekend) {
      return { probablePlace: 'Home', confidence: 0.4, basedOn: ['weekend'] };
    }
    
    return { probablePlace: 'Unknown', confidence: 0.3, basedOn: ['default'] };
  }
  
  private async determineLocationContext(): Promise<{ 
    probablePlace: 'Home' | 'Work' | 'Travel' | 'Unknown',
    confidence: number,
    basedOn: string[]
  }> {
    try {
      const now = timeService.getCurrentDateTime();
      const currentHour = timeService.getHours(now);
      const currentDay = timeService.getDay(now);
      
      // Get recent snapshots from IndexedDB
      const recentSnapsResult = await indexedDBService.getAll<Context & { timestamp: number }>('VirgilContextDB', 'snapshots');
      
      // Check if operation was successful
      if (!recentSnapsResult.success || !recentSnapsResult.data) {
        return this.simpleTimeRules();
      }
      
      const recentSnaps = recentSnapsResult.data;
      
      // Filter snapshots from same hour and similar day type (weekend vs weekday)
      const isWeekend = [0, 6].includes(currentDay);
      const similarTimeSnaps = recentSnaps.filter((snap) => {
        const snapDate = timeService.fromTimestamp(snap.timestamp);
        const snapHour = timeService.getHours(snapDate);
        const snapIsWeekend = [0, 6].includes(timeService.getDay(snapDate));
        
        return snapHour === currentHour && snapIsWeekend === isWeekend;
      });
      
      // Not enough history? Use simple rules
      if (similarTimeSnaps.length < 3) {
        return this.simpleTimeRules();
      }
      
      // Count how many times each location appears
      const locationCounts: Record<string, number> = {};
      similarTimeSnaps.forEach((snap) => {
        const key = snap.env?.ip || 'unknown';
        locationCounts[key] = (locationCounts[key] || 0) + 1;
      });
      
      // Most common location at this time = probable current location type
      const mostCommon = Object.keys(locationCounts).reduce((a, b) => 
        locationCounts[a] > locationCounts[b] ? a : b,
      );
      
      // Simple classification based on when we see this IP most
      const confidence = Math.min(locationCounts[mostCommon] / similarTimeSnaps.length, 0.9);
      
      if (currentHour >= 22 || currentHour < 7) {
        return { probablePlace: 'Home', confidence, basedOn: ['history'] };
      } else if (!isWeekend && currentHour >= 9 && currentHour <= 17) {
        return { probablePlace: 'Work', confidence, basedOn: ['history'] };
      }
      
      return { probablePlace: 'Unknown', confidence: 0.5, basedOn: ['history'] };
    } catch (_error) {
      // If anything fails, fall back to simple rules
      return this.simpleTimeRules();
    }
  }
  
  // Public API
  getRecentSnapshots(count = 10): Array<Context & { timestamp: number }> {
    return this.snapshots.slice(-count);
  }
  
  async loadSnapshotsFromDB(count = 28): Promise<Array<Context & { timestamp: number }>> {
    try {
      const result = await indexedDBService.getAll<Context & { timestamp: number }>('VirgilContextDB', 'snapshots');
      if (!result.success || !result.data) return [];
      
      // Sort by timestamp ascending (oldest to newest) and take the most recent ones
      const sortedSnapshots = result.data
        .sort((a, b) => a.timestamp - b.timestamp) // Sort ascending
        .slice(-count); // Take last 'count' items (most recent)
      
      
      return sortedSnapshots;
    } catch (error) {
      console.error('Failed to load snapshots from DB:', error);
      return [];
    }
  }
}