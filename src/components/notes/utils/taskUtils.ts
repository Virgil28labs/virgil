/**
 * Task-related utility functions for the Notes application
 * Centralizes task extraction, merging, and manipulation logic
 */

import { Task } from "../types";

/**
 * Regular expression patterns for task detection
 */
const TASK_PATTERNS = {
  checkbox: /^\s*(?:[-*]\s*)?\[([xX ])\]\s*(.+)/i,
  actionWords: [
    "call",
    "email",
    "buy",
    "send",
    "meet",
    "finish",
    "complete",
    "review",
    "prepare",
    "schedule",
  ],
  needToPatterns: [
    /(?:need to|should|must|have to)\s+(.+)/i,
    /(?:remember to|don't forget to)\s+(.+)/i,
    /^(?:todo|task):\s*(.+)/i,
  ],
} as const;

/**
 * Extracts checkbox tasks from content
 * @param content The content to parse
 * @returns Array of tasks found in the content
 */
export function extractTasksFromContent(content: string): Task[] {
  const tasks: Task[] = [];
  const lines = content.split("\n");

  lines.forEach((line) => {
    const checkboxMatch = line.match(TASK_PATTERNS.checkbox);
    if (checkboxMatch) {
      tasks.push({
        text: checkboxMatch[2].trim(),
        completed: checkboxMatch[1].toLowerCase() === "x",
        extracted: false,
      });
    }
  });

  return tasks;
}

/**
 * Extracts tasks from content using natural language patterns
 * Used as fallback when AI is unavailable
 * @param content The content to analyze
 * @returns Array of extracted task strings
 */
export function extractFallbackTasks(content: string): string[] {
  const tasks: string[] = [];
  const lines = content.split("\n");

  lines.forEach((line) => {
    const trimmedLine = line.trim();
    if (!trimmedLine) return;

    const lowerLine = trimmedLine.toLowerCase();

    // Check for action words at the beginning of lines
    if (TASK_PATTERNS.actionWords.some((word) => lowerLine.startsWith(word))) {
      tasks.push(trimmedLine);
    }

    // Check for pattern-based tasks
    for (const pattern of TASK_PATTERNS.needToPatterns) {
      const match = trimmedLine.match(pattern);
      if (match && match[1]) {
        tasks.push(match[1].trim());
        break;
      }
    }
  });

  // Remove duplicates (case-insensitive)
  const uniqueTasks: string[] = [];
  const seen = new Set<string>();

  tasks.forEach((task) => {
    const normalized = task.toLowerCase().trim();
    if (!seen.has(normalized)) {
      seen.add(normalized);
      uniqueTasks.push(task);
    }
  });

  return uniqueTasks;
}

/**
 * Merges manually created tasks with AI-extracted tasks
 * Prevents duplicates by checking for overlapping content
 * @param manualTasks Tasks created by the user
 * @param aiTasks Tasks extracted by AI
 * @returns Merged task list without duplicates
 */
export function mergeTasksWithAI(
  manualTasks: Task[],
  aiTasks: string[],
): Task[] {
  const merged = [...manualTasks];

  aiTasks.forEach((aiTask) => {
    const exists = merged.some(
      (task) =>
        task.text.toLowerCase().includes(aiTask.toLowerCase()) ||
        aiTask.toLowerCase().includes(task.text.toLowerCase()),
    );

    if (!exists) {
      merged.push({
        text: aiTask,
        completed: false,
        extracted: true,
      });
    }
  });

  return merged;
}

/**
 * Counts the number of completed tasks
 * @param tasks Array of tasks
 * @returns Number of completed tasks
 */
export function countCompletedTasks(tasks: Task[]): number {
  return tasks.filter((task) => task.completed).length;
}

/**
 * Checks if all tasks are completed
 * @param tasks Array of tasks
 * @returns True if all tasks are completed
 */
export function areAllTasksCompleted(tasks: Task[]): boolean {
  return tasks.length > 0 && tasks.every((task) => task.completed);
}

/**
 * Toggles the completion status of a task
 * @param tasks Array of tasks
 * @param index Index of the task to toggle
 * @returns New array with the task toggled
 */
export function toggleTaskAtIndex(tasks: Task[], index: number): Task[] {
  if (index < 0 || index >= tasks.length) return tasks;

  const updatedTasks = [...tasks];
  updatedTasks[index] = {
    ...updatedTasks[index],
    completed: !updatedTasks[index].completed,
  };

  return updatedTasks;
}
