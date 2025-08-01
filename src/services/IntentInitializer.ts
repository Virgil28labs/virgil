/**
 * IntentInitializer - Initialize semantic intent embeddings for dashboard adapters
 * 
 * Creates and stores embeddings for each adapter's intents to enable
 * semantic confidence scoring instead of just keyword matching.
 */

import { vectorService } from './vectorService';
import { logger } from '../lib/logger';
import { timeService } from './TimeService';

interface AdapterIntent {
  appName: string;
  keywords: string[];
  exampleQueries: string[];
}

interface IntentCache {
  timestamp: number;
  intents: string[];
}

const INTENT_CACHE_KEY = 'virgil_intent_cache';
const INTENT_CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

export class IntentInitializer {
  private static instance: IntentInitializer;
  private initialized = false;
  private initializationPromise: Promise<void> | null = null;
  private initializedIntents = new Set<string>();

  private constructor() {}

  static getInstance(): IntentInitializer {
    if (!IntentInitializer.instance) {
      IntentInitializer.instance = new IntentInitializer();
    }
    return IntentInitializer.instance;
  }

  /**
   * Initialize intent embeddings for all adapters
   * This should be called once when the app starts
   */
  async initializeIntents(): Promise<void> {
    // If already initialized, return immediately
    if (this.initialized) {
      return;
    }

    // If initialization is in progress, return the existing promise
    if (this.initializationPromise) {
      return this.initializationPromise;
    }

    // Create and store the initialization promise
    this.initializationPromise = this.performInitialization();
    
    try {
      await this.initializationPromise;
    } catch (error) {
      // Reset the promise on error so it can be retried
      this.initializationPromise = null;
      throw error;
    }
  }

  /**
   * Perform the actual initialization
   */
  private async performInitialization(): Promise<void> {
    // Wait for vector service health check - use dynamic import to avoid circular dependency
    const { vectorMemoryService } = await import('./VectorMemoryService');
    const isHealthy = await vectorMemoryService.waitForHealthCheck();
    if (!isHealthy) {
      return;
    }


    try {
      // Check localStorage cache first
      const cachedIntents = this.getCachedIntents();
      if (cachedIntents.length > 0) {
        logger.info('✓ Intent system ready (cached)');
        this.initialized = true;
        cachedIntents.forEach(intent => this.initializedIntents.add(intent));
        return;
      }

      // Initialize only critical app intents (5 most common)
      const criticalIntents: AdapterIntent[] = [
        {
          appName: 'streaks',
          keywords: ['habit', 'habits', 'streak', 'streaks', 'check in', 'daily', 'routine', 'progress', 'perfect day'],
          exampleQueries: [
            // Status/tracking queries (what we handle)
            'What are my habits?',
            'Show me my streaks',
            'How many days have I done my meditation habit?',
            'What\'s my longest streak?',
            'Did I check in today?',
            'Show me my daily progress',
            'How many perfect days do I have?',
            'What habits did I complete today?',
            'Tell me about my morning routine streak',
            'What\'s my current streak for exercise?',
            'Check my gym habit',
            'What\'s my gym streak?',
            'How long is my gym streak?',
            // Clarify what we DON'T handle (advice/recommendations)
            'track habits not workout advice',
            'habit progress not exercise recommendations',
            'streak status not fitness guidance',
          ],
        },
        {
          appName: 'notes',
          keywords: ['note', 'notes', 'idea', 'ideas', 'reminder', 'memo', 'notebook', 'write', 'wrote', 'save'],
          exampleQueries: [
            // Status/retrieval queries (what we handle)
            'Show me my notes',
            'What notes do I have?',
            'Find my notes about the meeting',
            'Show me my recent ideas',
            'What did I write yesterday?',
            'Search my notes for project ideas',
            'Do I have any notes about React?',
            'Show me my saved reminders',
            'What\'s in my notebook?',
            'Find notes from last week',
            'Count my notes',
            'List my tasks',
            // Clarify what we DON'T handle (advice/methods)
            'retrieve notes not note-taking advice',
            'find notes not organization tips',
            'search notes not writing guidance',
          ],
        },
        {
          appName: 'pomodoro',
          keywords: ['pomodoro', 'timer', 'focus', 'work', 'break', 'session', 'productivity', 'time', 'minutes'],
          exampleQueries: [
            'Start a pomodoro timer',
            'How much time is left?',
            'Show me my pomodoro stats',
            'How many pomodoros did I complete today?',
            'Take a break',
            'Start a 25 minute focus session',
            'What\'s my productivity today?',
            'How many work sessions have I done?',
            'Show me my focus time stats',
            'Pause the timer',
          ],
        },
      ];

      // Store only critical intents
      await this.storeAdapterIntents(criticalIntents);
      
      // Cache the initialized intents
      const initializedIntentNames = criticalIntents.map(i => i.appName);
      this.setCachedIntents(initializedIntentNames);
      initializedIntentNames.forEach(intent => this.initializedIntents.add(intent));

      this.initialized = true;
      
      logger.info('✓ Intent system ready (lazy)');
    } catch (error) {
      logger.error('Failed to initialize intent embeddings', error as Error, {
        component: 'IntentInitializer',
        action: 'initializeIntents',
      });
      // Don't throw - this is an enhancement, not critical functionality
    }
  }

  /**
   * Store adapter intents individually
   */
  private async storeAdapterIntents(intents: AdapterIntent[]): Promise<number> {
    let successCount = 0;
    for (const intent of intents) {
      try {
        await this.storeAdapterIntent(intent);
        successCount++;
      } catch {
        // Individual errors already logged in storeAdapterIntent
      }
    }
    return successCount;
  }

  /**
   * Store intent embeddings for a specific adapter
   */
  private async storeAdapterIntent(intent: AdapterIntent): Promise<void> {
    try {
      // Combine keywords and example queries for richer embeddings
      const allExamples = [
        ...intent.exampleQueries,
        ...intent.keywords.map(keyword => `${keyword} app`),
      ];

      // Combine examples into a single text for better embedding
      const combinedText = allExamples.join(' | ');
      const contentWithMetadata = `${combinedText}\n[Intent: ${intent.appName}]`;

      // Store in vector database
      await vectorService.store(contentWithMetadata);

      // Stored intent embeddings
    } catch (error) {
      logger.error(`Failed to store intent for ${intent.appName}`, error as Error, {
        component: 'IntentInitializer',
        action: 'storeAdapterIntent',
        metadata: { appName: intent.appName },
      });
    }
  }

  /**
   * Get all available adapter intents (for lazy loading)
   */
  private getAllAdapterIntents(): AdapterIntent[] {
    return [
      {
        appName: 'streaks',
        keywords: ['habit', 'habits', 'streak', 'streaks', 'check in', 'daily', 'routine', 'progress', 'perfect day'],
        exampleQueries: [
          'What are my habits?',
          'Show me my streaks',
          'How many days have I done my meditation habit?',
          'What\'s my longest streak?',
          'Did I check in today?',
          'Show me my daily progress',
          'How many perfect days do I have?',
          'What habits did I complete today?',
          'Tell me about my morning routine streak',
          'What\'s my current streak for exercise?',
          'Check my gym habit',
          'What\'s my gym streak?',
          'How long is my gym streak?',
          'track habits not workout advice',
          'habit progress not exercise recommendations',
          'streak status not fitness guidance',
        ],
      },
      {
        appName: 'notes',
        keywords: ['note', 'notes', 'idea', 'ideas', 'reminder', 'memo', 'notebook', 'write', 'wrote', 'save'],
        exampleQueries: [
          'Show me my notes',
          'What notes do I have?',
          'Find my notes about the meeting',
          'Show me my recent ideas',
          'What did I write yesterday?',
          'Search my notes for project ideas',
          'Do I have any notes about React?',
          'Show me my saved reminders',
          'What\'s in my notebook?',
          'Find notes from last week',
          'Count my notes',
          'List my tasks',
          'retrieve notes not note-taking advice',
          'find notes not organization tips',
          'search notes not writing guidance',
        ],
      },
      {
        appName: 'pomodoro',
        keywords: ['pomodoro', 'timer', 'focus', 'work', 'break', 'session', 'productivity', 'time', 'minutes'],
        exampleQueries: [
          'Start a pomodoro timer',
          'How much time is left?',
          'Show me my pomodoro stats',
          'How many pomodoros did I complete today?',
          'Take a break',
          'Start a 25 minute focus session',
          'What\'s my productivity today?',
          'How many work sessions have I done?',
          'Show me my focus time stats',
          'Pause the timer',
        ],
      },
      {
        appName: 'dogGallery',
        keywords: ['dog', 'dogs', 'photo', 'photos', 'picture', 'gallery', 'cute', 'puppy', 'favorite'],
        exampleQueries: [
          'Show me dog photos',
          'Do I have any dog pictures?',
          'Show me my favorite dogs',
          'How many dog photos do I have?',
          'Show me cute puppies',
          'What dogs have I saved?',
          'Show me my dog gallery',
          'Find golden retriever photos',
          'Show me my most recent dog pictures',
          'How many favorites do I have in the dog gallery?',
        ],
      },
      {
        appName: 'nasaAPOD',
        keywords: ['nasa', 'space', 'astronomy', 'apod', 'picture of the day', 'cosmos', 'universe', 'star', 'planet'],
        exampleQueries: [
          'Show me NASA picture of the day',
          'What\'s today\'s astronomy picture?',
          'Show me space photos',
          'Do I have any NASA favorites?',
          'What cosmic images have I saved?',
          'Show me the APOD',
          'Tell me about today\'s space picture',
          'How many NASA images do I have?',
          'Show me my favorite space photos',
          'What was yesterday\'s astronomy picture?',
        ],
      },
    ];
  }

  /**
   * Lazy load an intent on demand
   */
  async ensureIntentLoaded(appName: string): Promise<void> {
    if (this.initializedIntents.has(appName)) {
      return; // Already loaded
    }

    const allIntents = this.getAllAdapterIntents();
    const intent = allIntents.find(i => i.appName === appName);
    if (!intent) {
      return; // Unknown intent
    }

    try {
      await this.storeAdapterIntent(intent);
      this.initializedIntents.add(appName);
      
      // Update cache
      const cachedIntents = [...this.initializedIntents];
      this.setCachedIntents(cachedIntents);
    } catch (error) {
      logger.error(`Failed to lazy load intent: ${appName}`, error as Error);
    }
  }

  /**
   * Get cached intents from localStorage
   */
  private getCachedIntents(): string[] {
    try {
      const cached = localStorage.getItem(INTENT_CACHE_KEY);
      if (!cached) return [];
      
      const data: IntentCache = JSON.parse(cached);
      const now = timeService.getTimestamp();
      
      // Check if cache is expired
      if (now - data.timestamp > INTENT_CACHE_TTL) {
        localStorage.removeItem(INTENT_CACHE_KEY);
        return [];
      }
      
      return data.intents;
    } catch {
      return [];
    }
  }

  /**
   * Set cached intents in localStorage
   */
  private setCachedIntents(intents: string[]): void {
    try {
      const data: IntentCache = {
        timestamp: timeService.getTimestamp(),
        intents,
      };
      localStorage.setItem(INTENT_CACHE_KEY, JSON.stringify(data));
    } catch (error) {
      logger.error('Failed to cache intents', error as Error);
    }
  }

  /**
   * Re-initialize intents (useful for updates or debugging)
   */
  async reinitializeIntents(): Promise<void> {
    this.initialized = false;
    this.initializationPromise = null;
    this.initializedIntents.clear();
    localStorage.removeItem(INTENT_CACHE_KEY);
    await this.initializeIntents();
  }
}

// Export singleton instance
export const intentInitializer = IntentInitializer.getInstance();