/**
 * Tag pattern matching utilities for the Notes application
 * Centralizes linguistic patterns for tag and action type detection
 */

import { TagType, ActionType } from "../types";

/**
 * Domain-specific keyword patterns for tag detection
 */
export const TAG_PATTERNS: Record<TagType, RegExp> = {
  work: /\b(work|job|career|meeting|project|deadline|client|office|boss|colleague|team|business|professional|presentation|report|email|task|assignment|study|school|university|college|degree)\b/i,
  health:
    /\b(health|doctor|medicine|exercise|workout|gym|diet|sleep|pain|symptom|wellness|mental|therapy|sick|hospital|fitness|meditation|stress|anxiety|energy|weight|nutrition)\b/i,
  money:
    /\b(money|finance|budget|bill|expense|pay|salary|invest|save|spend|cost|price|tax|loan|debt|credit|shopping|purchase|rent|mortgage|income|wealth)\b/i,
  people:
    /\b(family|friend|relationship|wife|husband|partner|child|parent|sibling|social|party|birthday|wedding|date|love|friendship|colleague|neighbor|community|network)\b/i,
  growth:
    /\b(learn|growth|skill|course|class|book|read|improve|develop|practice|training|spiritual|religion|faith|meditation|mindfulness|self-improvement|goal|achievement)\b/i,
  life: /\b(home|house|apartment|chore|clean|cook|hobby|game|music|art|movie|show|travel|vacation|weekend|routine|lifestyle|entertainment|fun|relax)\b/i,
};

/**
 * Action type linguistic patterns
 */
export const ACTION_PATTERNS = {
  task: [
    /\b(need to|must|should|have to|will do|going to)\b/,
    /\b(todo|task|deadline|schedule|meet|call|email|buy|send|finish|complete|fix|prepare)\b/,
    /\b(remind me|don't forget|remember to)\b/,
    /^(call|email|buy|send|meet|finish|complete|review|prepare|schedule|fix)/i,
  ],
  goal: [
    /\b(goal|aim|objective|target|aspire|achieve|accomplish)\b/,
    /\b(by \d{4}|by next|by end of|within \d+)\b/,
    /\b(want to become|plan to achieve|working towards|long-term)\b/,
    /\b(resolution|ambition|dream|vision)\b/,
  ],
  idea: [
    /\b(idea|what if|maybe|perhaps|could|might|possibly|imagine)\b/,
    /\b(brainstorm|concept|suggestion|proposal|thought about)\b/,
    /\b(wonder if|thinking about|consider|explore)\b/,
    /\b(creative|innovative|new way|different approach)\b/,
  ],
  reflect: [
    /\b(feel|feeling|felt|emotion|mood)\b/,
    /\b(today was|yesterday|this morning|tonight)\b/,
    /\b(grateful|thankful|appreciate|realize|understand now)\b/,
    /\b(journal|diary|reflection|looking back|remember when)\b/,
    /^(i feel|i felt|i'm feeling|today i|yesterday i)/i,
  ],
};

/**
 * Detects tags based on content keywords
 * @param content The content to analyze
 * @returns Array of detected tags (1-2 tags max)
 */
export function detectTags(content: string): TagType[] {
  const tags: TagType[] = [];
  const lowerContent = content.toLowerCase();

  // Check each tag pattern
  for (const [tag, pattern] of Object.entries(TAG_PATTERNS)) {
    if (pattern.test(lowerContent)) {
      tags.push(tag as TagType);
    }
  }

  // If no specific tags matched, default to 'life'
  if (tags.length === 0) {
    tags.push("life");
  }

  // Return 1-2 tags maximum for simplicity
  return [...new Set(tags)].slice(0, 2);
}

/**
 * Detects action type based on linguistic patterns
 * @param content The content to analyze
 * @returns Detected action type (defaults to 'note')
 */
export function detectActionType(content: string): ActionType {
  const lowerContent = content.toLowerCase();

  // Check patterns in order of specificity
  // Goal patterns first (most specific)
  for (const pattern of ACTION_PATTERNS.goal) {
    if (pattern.test(lowerContent)) {
      return "goal";
    }
  }

  // Task patterns
  for (const pattern of ACTION_PATTERNS.task) {
    if (pattern.test(lowerContent)) {
      return "task";
    }
  }

  // Idea patterns
  for (const pattern of ACTION_PATTERNS.idea) {
    if (pattern.test(lowerContent)) {
      return "idea";
    }
  }

  // Reflect patterns
  for (const pattern of ACTION_PATTERNS.reflect) {
    if (pattern.test(lowerContent)) {
      return "reflect";
    }
  }

  // Default to 'note' for informational content
  return "note";
}

/**
 * Validates that tags are from the allowed set
 * @param tags Array of tags to validate
 * @returns Validated tags array
 */
export function validateTags(tags: string[]): TagType[] {
  const allowedTags: TagType[] = [
    "work",
    "health",
    "money",
    "people",
    "growth",
    "life",
  ];

  return tags
    .filter(
      (tag): tag is TagType =>
        typeof tag === "string" &&
        allowedTags.includes(tag.toLowerCase() as TagType),
    )
    .map((tag) => tag.toLowerCase() as TagType);
}

/**
 * Validates that action type is from the allowed set
 * @param actionType Action type to validate
 * @returns Validated action type or undefined
 */
export function validateActionType(
  actionType: string | undefined,
): ActionType | undefined {
  const allowedActionTypes: ActionType[] = [
    "task",
    "note",
    "idea",
    "goal",
    "reflect",
  ];

  if (!actionType || typeof actionType !== "string") {
    return undefined;
  }

  const normalized = actionType.toLowerCase();
  return allowedActionTypes.includes(normalized as ActionType)
    ? (normalized as ActionType)
    : undefined;
}
