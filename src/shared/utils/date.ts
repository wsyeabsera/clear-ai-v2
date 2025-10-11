/**
 * Date and time utility functions
 */

import { DateRange } from '../types/common.js';

/**
 * Format date to ISO string (YYYY-MM-DD)
 */
export function formatDate(date: Date): string {
  return date.toISOString().split('T')[0] as string;
}

/**
 * Parse temporal reference to date range
 * Supports: today, yesterday, last week, this week, this month, last month
 */
export function parseTemporalReference(reference: string): DateRange {
  const today = new Date();
  
  switch (reference.toLowerCase()) {
    case 'today':
      return {
        date_from: formatDate(today),
        date_to: formatDate(today)
      };
      
    case 'yesterday':
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      return {
        date_from: formatDate(yesterday),
        date_to: formatDate(yesterday)
      };
      
    case 'last week':
      const lastWeek = new Date(today);
      lastWeek.setDate(lastWeek.getDate() - 7);
      return {
        date_from: formatDate(lastWeek),
        date_to: formatDate(today)
      };
      
    case 'this week':
      const monday = new Date(today);
      const dayOfWeek = monday.getDay();
      const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
      monday.setDate(monday.getDate() - daysToMonday);
      return {
        date_from: formatDate(monday),
        date_to: formatDate(today)
      };
      
    case 'this month':
      const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
      return {
        date_from: formatDate(firstDay),
        date_to: formatDate(today)
      };
      
    case 'last month':
      const lastMonth = new Date(today);
      lastMonth.setMonth(lastMonth.getMonth() - 1);
      const firstDayLastMonth = new Date(lastMonth.getFullYear(), lastMonth.getMonth(), 1);
      const lastDayLastMonth = new Date(lastMonth.getFullYear(), lastMonth.getMonth() + 1, 0);
      return {
        date_from: formatDate(firstDayLastMonth),
        date_to: formatDate(lastDayLastMonth)
      };
      
    default:
      throw new Error(`Unknown temporal reference: ${reference}`);
  }
}

/**
 * Get date N days ago
 */
export function getDaysAgo(days: number): Date {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date;
}

/**
 * Check if date is within range
 */
export function isDateInRange(date: string, range: DateRange): boolean {
  return date >= range.date_from && date <= range.date_to;
}

/**
 * Get current timestamp (ISO format)
 */
export function getCurrentTimestamp(): string {
  return new Date().toISOString();
}

