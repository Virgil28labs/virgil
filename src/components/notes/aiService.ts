/**
 * AI service for processing notes entries
 * Handles tag generation, task extraction, and mood detection
 */

import type { AIResponse } from './types';
import { NotesError, ErrorType } from './types';
import { LLMService } from '../../services/llm';
import { detectTags, detectActionType, validateTags, validateActionType } from './utils/tagPatterns';
import { extractFallbackTasks } from './utils/taskUtils';
import { AI_CONFIG, TAG_DESCRIPTIONS, ACTION_DESCRIPTIONS } from './constants';

const llmService = new LLMService();

/**
 * Builds the system prompt for AI analysis
 * @returns Formatted system prompt with current tag and action descriptions
 */
function buildSystemPrompt(): string {
  const tagDescriptions = Object.entries(TAG_DESCRIPTIONS)
    .map(([tag, desc]) => `   - ${tag}: ${desc}`)
    .join('\n');
  
  const actionDescriptions = Object.entries(ACTION_DESCRIPTIONS)
    .map(([action, desc]) => `   - ${action}: ${desc}`)
    .join('\n');
  
  return `You are an AI assistant that analyzes journal entries and notes. Extract actionable tasks, generate relevant tags based on life domains, and classify the action type.

Rules:
1. Extract clear action items (things that need to be done)
2. Generate 1-2 relevant tags from these life domains ONLY: ${Object.keys(TAG_DESCRIPTIONS).join(', ')}
3. Classify the action type as ONE of: ${Object.keys(ACTION_DESCRIPTIONS).join(', ')}
4. Detect mood if clearly expressed: positive, neutral, or negative
5. Be concise and accurate

Category descriptions (WHERE in life):
${tagDescriptions}

Action type descriptions (WHAT kind of entry):
${actionDescriptions}

Respond in JSON format:
{
  "tags": ["tag1", "tag2"],
  "actionType": "task", // or "note", "idea", "goal", "reflect"
  "tasks": ["task 1", "task 2"],
  "mood": "positive" // or "neutral" or "negative", optional
}`;
}

/**
 * Processes a note entry with AI to extract tags, tasks, and mood
 * Falls back to rule-based extraction if AI fails
 * 
 * @param content The note content to analyze
 * @returns Promise<AIResponse | null> Extracted data or null if processing fails
 */
export async function processEntryWithAI(content: string): Promise<AIResponse | null> {
  // Don't process empty content
  if (!content.trim()) {
    return null;
  }

  let lastError: Error | null = null;

  // Retry logic for transient failures
  for (let attempt = 0; attempt < AI_CONFIG.MAX_RETRIES; attempt++) {
    try {
      const response = await callAIService(content);
      return response;
    } catch (error) {
      lastError = error as Error;
      
      // Don't retry on specific error types
      if (error instanceof NotesError && 
          (error.type === ErrorType.VALIDATION_ERROR || 
           error.type === ErrorType.AI_SERVICE_ERROR)) {
        break;
      }

      // Wait before retrying
      if (attempt < AI_CONFIG.MAX_RETRIES - 1) {
        await new Promise(resolve => setTimeout(resolve, AI_CONFIG.RETRY_DELAY * (attempt + 1)));
      }
    }
  }

  // Log the error but don't throw - use fallback instead
  console.error('AI processing failed after retries:', lastError);
  
  // Return fallback response
  return {
    tags: detectTags(content),
    actionType: detectActionType(content),
    tasks: extractFallbackTasks(content),
  };
}

/**
 * Calls the AI service to analyze content
 * @param content The content to analyze
 * @returns Promise<AIResponse> The AI response
 * @throws {NotesError} If the AI service fails
 */
async function callAIService(content: string): Promise<AIResponse> {
  const systemPrompt = buildSystemPrompt();

  try {
    const response = await llmService.complete({
      messages: [
        {
          role: 'user',
          content: `Analyze this entry and extract tasks and tags:\n\n${content}`,
        },
      ],
      model: AI_CONFIG.MODEL,
      temperature: AI_CONFIG.TEMPERATURE,
      maxTokens: AI_CONFIG.MAX_TOKENS,
      systemPrompt,
    });

    // Parse and validate the response
    try {
      const parsed = JSON.parse(response.content);
      
      // Validate the response structure
      if (!Array.isArray(parsed.tags) || !Array.isArray(parsed.tasks)) {
        throw new NotesError(
          ErrorType.AI_SERVICE_ERROR,
          'Invalid AI response structure',
        );
      }

      // Validate tags and action type using utility functions
      const validTags = validateTags(parsed.tags).slice(0, 2);
      const validActionType = validateActionType(parsed.actionType);
      
      return {
        tags: validTags,
        actionType: validActionType,
        tasks: parsed.tasks.filter((task: any) => typeof task === 'string'),
        mood: parsed.mood && ['positive', 'neutral', 'negative'].includes(parsed.mood) 
          ? parsed.mood 
          : undefined,
      };
    } catch (parseError) {
      throw new NotesError(
        ErrorType.AI_SERVICE_ERROR,
        'Failed to parse AI response',
        parseError,
      );
    }
  } catch (error) {
    if (error instanceof NotesError) {
      throw error;
    }
    
    throw new NotesError(
      ErrorType.NETWORK_ERROR,
      'Failed to contact AI service',
      error,
    );
  }
}


/**
 * Validates that content is appropriate for AI processing
 * @param content The content to validate
 * @returns boolean Whether the content should be processed
 */
export function shouldProcessContent(content: string): boolean {
  // Don't process very short content
  if (content.trim().length < AI_CONFIG.MIN_CONTENT_LENGTH) {
    return false;
  }
  
  // Don't process content that's just whitespace or special characters
  if (!/[a-zA-Z0-9]/.test(content)) {
    return false;
  }
  
  return true;
}