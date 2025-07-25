/**
 * Type guard utilities for the Notes application
 * Provides runtime type checking for safer code
 */

import type { Entry, Task, TagType, ActionType } from '../types';
import { NotesError, ErrorType } from '../types';
import { timeService } from '../../../services/TimeService';

/**
 * Checks if a value is a valid Entry
 */
export function isEntry(value: unknown): value is Entry {
  if (!value || typeof value !== 'object') return false;
  
  const entry = value as Record<string, unknown>;
  
  return (
    typeof entry.id === 'string' &&
    entry.timestamp instanceof Date &&
    typeof entry.content === 'string' &&
    Array.isArray(entry.tags) &&
    entry.tags.every(isTagType) &&
    Array.isArray(entry.tasks) &&
    entry.tasks.every(isTask) &&
    typeof entry.aiProcessed === 'boolean' &&
    typeof entry.isEdited === 'boolean' &&
    (entry.actionType === undefined || isActionType(entry.actionType))
  );
}

/**
 * Checks if a value is a valid Task
 */
export function isTask(value: unknown): value is Task {
  if (!value || typeof value !== 'object') return false;
  
  const task = value as Record<string, unknown>;
  
  return (
    typeof task.text === 'string' &&
    typeof task.completed === 'boolean' &&
    typeof task.extracted === 'boolean'
  );
}

/**
 * Checks if a value is a valid TagType
 */
export function isTagType(value: unknown): value is TagType {
  return (
    typeof value === 'string' &&
    ['work', 'health', 'money', 'people', 'growth', 'life'].includes(value)
  );
}

/**
 * Checks if a value is a valid ActionType
 */
export function isActionType(value: unknown): value is ActionType {
  return (
    typeof value === 'string' &&
    ['task', 'note', 'idea', 'goal', 'reflect'].includes(value)
  );
}

/**
 * Checks if a value is a NotesError
 */
export function isNotesError(value: unknown): value is NotesError {
  return (
    value instanceof NotesError ||
    (value instanceof Error && 'type' in value && isErrorType((value as any).type))
  );
}

/**
 * Checks if a value is a valid ErrorType
 */
export function isErrorType(value: unknown): value is ErrorType {
  return (
    typeof value === 'string' &&
    Object.values(ErrorType).includes(value as ErrorType)
  );
}

/**
 * Safely parses JSON with type checking
 */
export function safeJSONParse<T>(
  json: string,
  validator: (value: unknown) => value is T,
): T | null {
  try {
    const parsed = JSON.parse(json);
    return validator(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

/**
 * Creates a validated array from unknown input
 */
export function toValidatedArray<T>(
  value: unknown,
  validator: (item: unknown) => item is T,
): T[] {
  if (!Array.isArray(value)) return [];
  return value.filter(validator);
}

/**
 * Ensures a value is a valid Date
 */
export function toValidDate(value: unknown): Date | null {
  if (value instanceof Date && !isNaN(value.getTime())) { // eslint-disable-line no-restricted-syntax -- Valid use: checking if Date is valid
    return value;
  }
  
  if (typeof value === 'string' || typeof value === 'number') {
    return timeService.parseDate(value.toString());
  }
  
  return null;
}

/**
 * Type-safe property access
 */
export function hasProperty<K extends PropertyKey>(
  obj: unknown,
  key: K,
): obj is Record<K, unknown> {
  return obj != null && typeof obj === 'object' && key in obj;
}

/**
 * Validates and sanitizes entry data
 */
export function sanitizeEntry(data: unknown): Partial<Entry> | null {
  if (!data || typeof data !== 'object') return null;
  
  const obj = data as Record<string, unknown>;
  const sanitized: Partial<Entry> = {};
  
  if (typeof obj.id === 'string') sanitized.id = obj.id;
  if (typeof obj.content === 'string') sanitized.content = obj.content;
  
  const timestamp = toValidDate(obj.timestamp);
  if (timestamp) sanitized.timestamp = timestamp;
  
  if (Array.isArray(obj.tags)) {
    sanitized.tags = obj.tags.filter(isTagType);
  }
  
  if (Array.isArray(obj.tasks)) {
    sanitized.tasks = obj.tasks.filter(isTask);
  }
  
  if (typeof obj.aiProcessed === 'boolean') {
    sanitized.aiProcessed = obj.aiProcessed;
  }
  
  if (typeof obj.isEdited === 'boolean') {
    sanitized.isEdited = obj.isEdited;
  }
  
  if (isActionType(obj.actionType)) {
    sanitized.actionType = obj.actionType;
  }
  
  return sanitized;
}