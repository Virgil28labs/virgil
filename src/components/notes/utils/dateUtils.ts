/**
 * Date and time utilities for the Notes application
 * Provides consistent date formatting and relative time calculations
 */

import { timeService } from '../../../services/TimeService';

/**
 * Formats a timestamp into a relative time string
 * @param timestamp The timestamp to format
 * @returns Formatted string like "just now", "5 mins ago", "2 days ago"
 */
export function formatRelativeTime(timestamp: Date): string {
  return timeService.getTimeAgo(timestamp);
}

/**
 * Checks if two dates are on the same day
 * @param date1 First date
 * @param date2 Second date
 * @returns True if dates are on the same day
 */
export function isSameDay(date1: Date, date2: Date): boolean {
  return timeService.isSameDay(date1, date2);
}

/**
 * Gets the start of day for a given date
 * @param date The date to get start of day for
 * @returns Date object set to 00:00:00
 */
export function startOfDay(date: Date): Date {
  return timeService.startOfDay(date);
}

/**
 * Gets the end of day for a given date
 * @param date The date to get end of day for
 * @returns Date object set to 23:59:59.999
 */
export function endOfDay(date: Date): Date {
  return timeService.endOfDay(date);
}

/**
 * Formats a date for display in the UI
 * @param date The date to format
 * @returns Formatted date string
 */
export function formatDate(date: Date): string {
  return timeService.formatDateTimeToLocal(date);
}

/**
 * Parses an ISO date string and returns a Date object
 * @param isoString ISO date string
 * @returns Date object
 */
export function parseISODate(isoString: string): Date {
  return timeService.parseDate(isoString) || timeService.getCurrentDateTime();
}

/**
 * Converts a Date to ISO string for storage
 * @param date Date object
 * @returns ISO date string
 */
export function toISOString(date: Date): string {
  return timeService.toISOString(date);
}