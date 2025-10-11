/**
 * Tests for date utilities
 */

import {
  formatDate,
  parseTemporalReference,
  getDaysAgo,
  isDateInRange,
  getCurrentTimestamp
} from '../../../shared/utils/date.js';

describe('Date Utilities', () => {
  describe('formatDate', () => {
    it('should format date to YYYY-MM-DD', () => {
      const date = new Date('2025-10-11T12:30:00.000Z');
      expect(formatDate(date)).toBe('2025-10-11');
    });
    
    it('should handle dates with different months', () => {
      const date = new Date('2025-01-05T00:00:00.000Z');
      expect(formatDate(date)).toBe('2025-01-05');
    });
  });
  
  describe('parseTemporalReference', () => {
    it('should parse "today"', () => {
      const result = parseTemporalReference('today');
      const today = formatDate(new Date());
      
      expect(result.date_from).toBe(today);
      expect(result.date_to).toBe(today);
    });
    
    it('should parse "yesterday"', () => {
      const result = parseTemporalReference('yesterday');
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      
      expect(result.date_from).toBe(formatDate(yesterday));
      expect(result.date_to).toBe(formatDate(yesterday));
    });
    
    it('should parse "last week"', () => {
      const result = parseTemporalReference('last week');
      const today = formatDate(new Date());
      const lastWeek = new Date();
      lastWeek.setDate(lastWeek.getDate() - 7);
      
      expect(result.date_from).toBe(formatDate(lastWeek));
      expect(result.date_to).toBe(today);
    });
    
    it('should parse "this week"', () => {
      const result = parseTemporalReference('this week');
      expect(result.date_from).toBeDefined();
      expect(result.date_to).toBeDefined();
      expect(result.date_from <= result.date_to).toBe(true);
    });
    
    it('should parse "this month"', () => {
      const result = parseTemporalReference('this month');
      const today = new Date();
      const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
      
      expect(result.date_from).toBe(formatDate(firstDay));
      expect(result.date_to).toBe(formatDate(today));
    });
    
    it('should parse "last month"', () => {
      const result = parseTemporalReference('last month');
      expect(result.date_from).toBeDefined();
      expect(result.date_to).toBeDefined();
      expect(result.date_from <= result.date_to).toBe(true);
    });
    
    it('should throw on invalid reference', () => {
      expect(() => parseTemporalReference('invalid')).toThrow('Unknown temporal reference: invalid');
    });
    
    it('should be case insensitive', () => {
      const result = parseTemporalReference('TODAY');
      const today = formatDate(new Date());
      expect(result.date_from).toBe(today);
    });
  });
  
  describe('getDaysAgo', () => {
    it('should get date N days ago', () => {
      const result = getDaysAgo(7);
      const expected = new Date();
      expected.setDate(expected.getDate() - 7);
      
      expect(formatDate(result)).toBe(formatDate(expected));
    });
    
    it('should handle 0 days', () => {
      const result = getDaysAgo(0);
      const today = new Date();
      
      expect(formatDate(result)).toBe(formatDate(today));
    });
  });
  
  describe('isDateInRange', () => {
    it('should return true for date within range', () => {
      const result = isDateInRange('2025-10-08', {
        date_from: '2025-10-01',
        date_to: '2025-10-31'
      });
      
      expect(result).toBe(true);
    });
    
    it('should return false for date before range', () => {
      const result = isDateInRange('2025-09-30', {
        date_from: '2025-10-01',
        date_to: '2025-10-31'
      });
      
      expect(result).toBe(false);
    });
    
    it('should return false for date after range', () => {
      const result = isDateInRange('2025-11-01', {
        date_from: '2025-10-01',
        date_to: '2025-10-31'
      });
      
      expect(result).toBe(false);
    });
    
    it('should include boundary dates', () => {
      expect(isDateInRange('2025-10-01', {
        date_from: '2025-10-01',
        date_to: '2025-10-31'
      })).toBe(true);
      
      expect(isDateInRange('2025-10-31', {
        date_from: '2025-10-01',
        date_to: '2025-10-31'
      })).toBe(true);
    });
  });
  
  describe('getCurrentTimestamp', () => {
    it('should return ISO timestamp string', () => {
      const result = getCurrentTimestamp();
      
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
      expect(() => new Date(result)).not.toThrow();
    });
  });
});

