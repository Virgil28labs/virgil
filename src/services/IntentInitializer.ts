/**
 * IntentInitializer - Initialize semantic intent embeddings for dashboard adapters
 * 
 * Creates and stores embeddings for each adapter's intents to enable
 * semantic confidence scoring instead of just keyword matching.
 */

import { vectorMemoryService } from './VectorMemoryService';
import { logger } from '../lib/logger';

interface AdapterIntent {
  appName: string;
  keywords: string[];
  exampleQueries: string[];
}

export class IntentInitializer {
  private static instance: IntentInitializer;
  private initialized = false;

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
    if (this.initialized) {
      logger.info('Intent embeddings already initialized');
      return;
    }

    // Wait for vector service health check
    const isHealthy = await vectorMemoryService.waitForHealthCheck();
    if (!isHealthy) {
      logger.warn('Vector service not healthy, skipping intent initialization');
      return;
    }

    logger.info('Initializing intent embeddings for dashboard adapters...');

    try {
      // Define intents for each adapter with example queries
      const adapterIntents: AdapterIntent[] = [
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

      // Store intent embeddings for each adapter
      for (const intent of adapterIntents) {
        await this.storeAdapterIntent(intent);
      }

      this.initialized = true;
      logger.info('Intent embeddings initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize intent embeddings', error as Error, {
        component: 'IntentInitializer',
        action: 'initializeIntents',
      });
      // Don't throw - this is an enhancement, not critical functionality
    }
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

      await vectorMemoryService.storeIntentEmbedding(intent.appName, allExamples);

      logger.info(`Stored intent embeddings for ${intent.appName}`, {
        component: 'IntentInitializer',
        action: 'storeAdapterIntent',
        metadata: { 
          appName: intent.appName, 
          exampleCount: allExamples.length,
        },
      });
    } catch (error) {
      logger.error(`Failed to store intent for ${intent.appName}`, error as Error, {
        component: 'IntentInitializer',
        action: 'storeAdapterIntent',
        metadata: { appName: intent.appName },
      });
    }
  }

  /**
   * Re-initialize intents (useful for updates or debugging)
   */
  async reinitializeIntents(): Promise<void> {
    this.initialized = false;
    await this.initializeIntents();
  }
}

// Export singleton instance
export const intentInitializer = IntentInitializer.getInstance();