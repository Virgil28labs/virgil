/**
 * DynamicContextBuilder - Intelligent Context Enhancement for AI Prompts
 * 
 * Analyzes user queries and dynamically selects the most relevant context
 * to enhance AI responses with environmental awareness.
 */

import type { DashboardContext, ContextualSuggestion } from './DashboardContextService';
import { dashboardAppService } from './DashboardAppService';

export interface ContextRelevance {
  timeContext: number;      // 0-1 relevance score
  locationContext: number;  // 0-1 relevance score  
  weatherContext: number;   // 0-1 relevance score
  userContext: number;      // 0-1 relevance score
  activityContext: number;  // 0-1 relevance score
}

export interface EnhancedPrompt {
  originalPrompt: string;
  enhancedPrompt: string;
  contextUsed: string[];
  relevanceScores: ContextRelevance;
  suggestions: ContextualSuggestion[];
}

export class DynamicContextBuilder {
  // Keywords that indicate different types of context relevance
  private static readonly TIME_KEYWORDS = [
    'time', 'when', 'today', 'now', 'current', 'morning', 'afternoon', 'evening', 'night',
    'schedule', 'plan', 'later', 'soon', 'tomorrow', 'yesterday', 'week', 'weekend'
  ];

  private static readonly LOCATION_KEYWORDS = [
    'where', 'location', 'here', 'near', 'nearby', 'local', 'around', 'area',
    'city', 'place', 'address', 'map', 'directions', 'distance', 'travel', 'go'
  ];

  private static readonly WEATHER_KEYWORDS = [
    'weather', 'temperature', 'hot', 'cold', 'warm', 'cool', 'rain', 'sunny', 'cloudy',
    'outside', 'outdoor', 'climate', 'forecast', 'umbrella', 'coat', 'jacket'
  ];

  private static readonly ACTIVITY_KEYWORDS = [
    'doing', 'activity', 'working', 'using', 'help', 'show', 'open', 'start',
    'dashboard', 'feature', 'component', 'tool', 'app', 'function'
  ];

  private static readonly USER_KEYWORDS = [
    'my', 'me', 'I', 'personal', 'profile', 'account', 'settings', 'preferences',
    'name', 'remember', 'save', 'history', 'past', 'before'
  ];

  /**
   * Analyzes a user query and calculates relevance scores for different context types
   */
  static calculateRelevance(query: string): ContextRelevance {
    const normalizedQuery = query.toLowerCase();
    const words = normalizedQuery.split(/\s+/);

    const timeScore = this.calculateKeywordRelevance(words, this.TIME_KEYWORDS);
    const locationScore = this.calculateKeywordRelevance(words, this.LOCATION_KEYWORDS);
    const weatherScore = this.calculateKeywordRelevance(words, this.WEATHER_KEYWORDS);
    const userScore = this.calculateKeywordRelevance(words, this.USER_KEYWORDS);
    const activityScore = this.calculateKeywordRelevance(words, this.ACTIVITY_KEYWORDS);

    return {
      timeContext: timeScore,
      locationContext: locationScore,
      weatherContext: weatherScore,
      userContext: userScore,
      activityContext: activityScore,
    };
  }

  private static calculateKeywordRelevance(words: string[], keywords: string[]): number {
    const matches = words.filter(word => 
      keywords.some(keyword => word.includes(keyword) || keyword.includes(word))
    );
    
    // Base score from keyword matches
    let score = Math.min(matches.length / words.length, 1.0);
    
    // Boost score for exact matches
    const exactMatches = words.filter(word => keywords.includes(word));
    score += (exactMatches.length * 0.2);
    
    return Math.min(score, 1.0);
  }

  /**
   * Builds an enhanced prompt with relevant context based on the user's query
   */
  static buildEnhancedPrompt(
    originalPrompt: string,
    userQuery: string,
    context: DashboardContext,
    suggestions: ContextualSuggestion[] = []
  ): EnhancedPrompt {
    const relevanceScores = this.calculateRelevance(userQuery);
    const contextUsed: string[] = [];
    let enhancedPrompt = originalPrompt;

    // Add relevant context sections based on relevance scores
    const contextSections: string[] = [];

    // Time context (always include basic time info, enhance if relevant)
    if (relevanceScores.timeContext > 0.1 || this.isTimeQuery(userQuery)) {
      contextSections.push(this.buildTimeContext(context));
      contextUsed.push('time');
    }

    // Location context
    if (relevanceScores.locationContext > 0.2 && context.location.hasGPS) {
      contextSections.push(this.buildLocationContext(context));
      contextUsed.push('location');
    }

    // Weather context  
    if (relevanceScores.weatherContext > 0.2 && context.weather.hasData) {
      contextSections.push(this.buildWeatherContext(context));
      contextUsed.push('weather');
    }

    // User context
    if (relevanceScores.userContext > 0.2 && context.user.isAuthenticated) {
      contextSections.push(this.buildUserContext(context));
      contextUsed.push('user');
    }

    // Activity context
    if (relevanceScores.activityContext > 0.3) {
      contextSections.push(this.buildActivityContext(context));
      contextUsed.push('activity');
    }

    // Add context sections to prompt
    if (contextSections.length > 0) {
      const contextString = '\n\nCONTEXTUAL AWARENESS:\n' + contextSections.join('\n');
      enhancedPrompt = originalPrompt + contextString;
    }

    // Check if query is asking about dashboard apps
    const relevantApps = dashboardAppService.findAppsForQuery(userQuery);
    if (relevantApps.length > 0) {
      const appContext = dashboardAppService.getDetailedContext(
        relevantApps.map(app => app.appName)
      );
      if (appContext) {
        enhancedPrompt += `\n\nDASHBOARD APP DATA:${appContext}`;
        contextUsed.push('dashboard-apps');
      }
    }

    // Add relevant suggestions
    const relevantSuggestions = this.filterRelevantSuggestions(suggestions, relevanceScores);

    return {
      originalPrompt,
      enhancedPrompt,
      contextUsed,
      relevanceScores,
      suggestions: relevantSuggestions,
    };
  }

  private static isTimeQuery(query: string): boolean {
    const timeQueries = ['what time', 'current time', 'time is', 'what\'s the time'];
    return timeQueries.some(timeQuery => query.toLowerCase().includes(timeQuery));
  }

  private static buildTimeContext(context: DashboardContext): string {
    let timeContext = `Time: ${context.currentTime} on ${context.currentDate} (${context.dayOfWeek})`;
    timeContext += `\nTime of day: ${context.timeOfDay}`;
    
    if (context.location.timezone) {
      timeContext += `\nTimezone: ${context.location.timezone}`;
    }
    
    return timeContext;
  }

  private static buildLocationContext(context: DashboardContext): string {
    let locationContext = '';
    
    if (context.location.city) {
      locationContext += `Location: ${context.location.city}`;
      if (context.location.region) locationContext += `, ${context.location.region}`;
      if (context.location.country) locationContext += `, ${context.location.country}`;
    }
    
    if (context.location.coordinates) {
      const { latitude, longitude, accuracy } = context.location.coordinates;
      locationContext += `\nCoordinates: ${latitude.toFixed(4)}, ${longitude.toFixed(4)} (±${Math.round(accuracy)}m)`;
    }
    
    return locationContext;
  }

  private static buildWeatherContext(context: DashboardContext): string {
    const weather = context.weather;
    let weatherContext = '';
    
    if (weather.temperature !== undefined) {
      weatherContext += `Weather: ${weather.temperature}°${weather.unit === 'fahrenheit' ? 'F' : 'C'}`;
      if (weather.feelsLike) {
        weatherContext += ` (feels like ${weather.feelsLike}°${weather.unit === 'fahrenheit' ? 'F' : 'C'})`;
      }
    }
    
    if (weather.description) {
      weatherContext += `\nConditions: ${weather.description}`;
    }
    
    if (weather.humidity) {
      weatherContext += `\nHumidity: ${weather.humidity}%`;
    }
    
    if (weather.windSpeed) {
      weatherContext += `\nWind: ${weather.windSpeed} mph`;
    }
    
    return weatherContext;
  }

  private static buildUserContext(context: DashboardContext): string {
    const user = context.user;
    let userContext = '';
    
    if (user.name) {
      userContext += `User: ${user.name}`;
    }
    
    if (user.memberSince) {
      userContext += `\nMember since: ${user.memberSince}`;
    }
    
    const sessionTime = Math.floor(context.activity.timeSpentInSession / 1000 / 60);
    userContext += `\nSession time: ${sessionTime} minutes`;
    
    return userContext;
  }

  private static buildActivityContext(context: DashboardContext): string {
    const activity = context.activity;
    let activityContext = '';
    
    if (activity.activeComponents.length > 0) {
      activityContext += `Active features: ${activity.activeComponents.join(', ')}`;
    }
    
    if (activity.recentActions.length > 0) {
      const recentActions = activity.recentActions.slice(-3).join(', ');
      activityContext += `\nRecent actions: ${recentActions}`;
    }
    
    return activityContext;
  }

  private static filterRelevantSuggestions(
    suggestions: ContextualSuggestion[],
    relevanceScores: ContextRelevance
  ): ContextualSuggestion[] {
    return suggestions.filter(suggestion => {
      // Check if suggestion triggers match relevance scores
      const hasRelevantTrigger = suggestion.triggers.some(trigger => {
        if (trigger.startsWith('time:') && relevanceScores.timeContext > 0.2) return true;
        if (trigger.startsWith('location:') && relevanceScores.locationContext > 0.2) return true;
        if (trigger.startsWith('weather:') && relevanceScores.weatherContext > 0.2) return true;
        if (trigger.startsWith('user:') && relevanceScores.userContext > 0.2) return true;
        if (trigger.startsWith('activity:') && relevanceScores.activityContext > 0.2) return true;
        return false;
      });
      
      return hasRelevantTrigger || suggestion.priority === 'high';
    });
  }

  /**
   * Creates a smart context summary for memory storage
   */
  static createContextSummary(context: DashboardContext): string {
    const summary: string[] = [];
    
    // Add time context
    summary.push(`${context.timeOfDay} on ${context.dayOfWeek}`);
    
    // Add location if available
    if (context.location.city) {
      summary.push(`in ${context.location.city}`);
    }
    
    // Add weather if notable
    if (context.weather.hasData && context.weather.temperature !== undefined) {
      const temp = context.weather.temperature;
      if (temp < 40 || temp > 80) {
        summary.push(`${temp}°${context.weather.unit === 'fahrenheit' ? 'F' : 'C'} weather`);
      }
    }
    
    // Add activity context
    if (context.activity.activeComponents.length > 0) {
      summary.push(`using ${context.activity.activeComponents.join(', ')}`);
    }
    
    return `Context: ${summary.join(', ')}`;
  }
}