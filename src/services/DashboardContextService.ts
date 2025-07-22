/**
 * DashboardContextService - Smart Context Collection & Management
 * 
 * Collects real-time context from dashboard components to enhance
 * Virgil's AI responses with environmental awareness.
 */

import type { LocationContextValue } from '../types/location.types';
import type { WeatherContextType } from '../types/weather.types';
import type { AuthContextValue } from '../types/auth.types';
import { dashboardAppService, type DashboardAppData } from './DashboardAppService';

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
    preferences?: Record<string, any>;
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

  constructor() {
    this.sessionStartTime = Date.now();
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
        lastInteraction: Date.now(),
      },
      environment: {
        isOnline: navigator.onLine,
        deviceType: this.detectDeviceType(),
        prefersDarkMode: this.prefersDarkMode(),
        language: navigator.language || 'en-US',
      },
    };
  }

  private getCurrentTime(): string {
    return new Date().toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  }

  private getCurrentDate(): string {
    return new Date().toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  }

  private getDayOfWeek(): string {
    return new Date().toLocaleDateString('en-US', {
      weekday: 'long',
    }).toLowerCase();
  }

  private getTimeOfDay(): 'morning' | 'afternoon' | 'evening' | 'night' {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return 'morning';
    if (hour >= 12 && hour < 17) return 'afternoon';
    if (hour >= 17 && hour < 21) return 'evening';
    return 'night';
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

  updateUserContext(userData: AuthContextValue): void {
    this.context.user = {
      isAuthenticated: !!userData.user,
      name: userData.user?.user_metadata?.name,
      email: userData.user?.email,
      memberSince: userData.user?.created_at ? new Date(userData.user.created_at).toLocaleDateString() : undefined,
    };
    this.notifyListeners();
  }

  logActivity(action: string, component?: string): void {
    const timestamp = Date.now();
    this.activityLog.push({ action, timestamp });
    
    // Keep only recent activities (last 10 minutes)
    this.activityLog = this.activityLog.filter(
      log => timestamp - log.timestamp < 10 * 60 * 1000
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
    // Update time-sensitive context every minute
    setInterval(() => {
      this.context.currentTime = this.getCurrentTime();
      this.context.currentDate = this.getCurrentDate();
      this.context.timeOfDay = this.getTimeOfDay();
      this.context.dayOfWeek = this.getDayOfWeek();
      this.context.activity.timeSpentInSession = Date.now() - this.sessionStartTime;
      this.notifyListeners();
    }, 60000);

    // Update environment context when online status changes
    window.addEventListener('online', () => {
      this.context.environment.isOnline = true;
      this.notifyListeners();
    });
    window.addEventListener('offline', () => {
      this.context.environment.isOnline = false;
      this.notifyListeners();
    });
  }

  // Context access methods
  getContext(): DashboardContext {
    return { ...this.context };
  }

  getContextForPrompt(): string {
    const ctx = this.context;
    let contextString = '';

    // Time context
    contextString += `\n\nCURRENT CONTEXT:\n`;
    contextString += `- Current time: ${ctx.currentTime}\n`;
    contextString += `- Current date: ${ctx.currentDate} (${ctx.dayOfWeek})\n`;
    contextString += `- Time of day: ${ctx.timeOfDay}\n`;

    // Location context
    if (ctx.location.hasGPS) {
      contextString += `\nLOCATION:\n`;
      if (ctx.location.city) {
        contextString += `- Current location: ${ctx.location.city}`;
        if (ctx.location.region) contextString += `, ${ctx.location.region}`;
        if (ctx.location.country) contextString += `, ${ctx.location.country}`;
        contextString += '\n';
      }
      if (ctx.location.timezone) {
        contextString += `- Timezone: ${ctx.location.timezone}\n`;
      }
    }

    // Weather context
    if (ctx.weather.hasData) {
      contextString += `\nWEATHER:\n`;
      contextString += `- Temperature: ${ctx.weather.temperature}°${ctx.weather.unit === 'fahrenheit' ? 'F' : 'C'}`;
      if (ctx.weather.feelsLike) {
        contextString += ` (feels like ${ctx.weather.feelsLike}°${ctx.weather.unit === 'fahrenheit' ? 'F' : 'C'})`;
      }
      contextString += '\n';
      if (ctx.weather.description) {
        contextString += `- Conditions: ${ctx.weather.description}\n`;
      }
      if (ctx.weather.humidity) {
        contextString += `- Humidity: ${ctx.weather.humidity}%\n`;
      }
    }

    // User context
    if (ctx.user.isAuthenticated) {
      contextString += `\nUSER:\n`;
      if (ctx.user.name) {
        contextString += `- Name: ${ctx.user.name}\n`;
      }
      if (ctx.user.memberSince) {
        contextString += `- Member since: ${ctx.user.memberSince}\n`;
      }
    }

    // Activity context
    if (ctx.activity.activeComponents.length > 0) {
      contextString += `\nACTIVE FEATURES:\n`;
      contextString += `- Currently using: ${ctx.activity.activeComponents.join(', ')}\n`;
    }

    // Environment hints
    contextString += `\nENVIRONMENT:\n`;
    contextString += `- Device: ${ctx.environment.deviceType}\n`;
    contextString += `- Time in session: ${Math.floor(ctx.activity.timeSpentInSession / 1000 / 60)} minutes\n`;

    // Dashboard apps context
    if (ctx.apps) {
      const appSummary = dashboardAppService.getContextSummary();
      if (appSummary && appSummary !== 'No active dashboard apps') {
        contextString += `\n${appSummary}\n`;
      }
    }

    return contextString;
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
    this.listeners.forEach(listener => listener(this.context));
  }

  private subscribeToDashboardApps(): void {
    dashboardAppService.subscribe((appData) => {
      this.context.apps = appData;
      this.notifyListeners();
    });
  }

  // Cleanup
  destroy(): void {
    this.listeners = [];
    dashboardAppService.destroy();
  }
}

// Singleton instance
export const dashboardContextService = new DashboardContextService();