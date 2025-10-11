/**
 * Tests for formatting utilities
 */

import {
  formatNumber,
  formatPercentage,
  formatDuration,
  truncate,
  capitalize,
  toTitleCase,
  formatBytes,
  prettyJSON
} from '../../../shared/utils/formatting.js';

describe('Formatting Utilities', () => {
  describe('formatNumber', () => {
    it('should format numbers with commas', () => {
      expect(formatNumber(1000)).toBe('1,000');
      expect(formatNumber(1000000)).toBe('1,000,000');
      expect(formatNumber(123456789)).toBe('123,456,789');
    });
    
    it('should handle small numbers', () => {
      expect(formatNumber(0)).toBe('0');
      expect(formatNumber(100)).toBe('100');
    });
    
    it('should handle decimals', () => {
      expect(formatNumber(1234.56)).toMatch(/1,234/);
    });
  });
  
  describe('formatPercentage', () => {
    it('should format percentages with default decimals', () => {
      expect(formatPercentage(0.5)).toBe('50.0%');
      expect(formatPercentage(0.75)).toBe('75.0%');
      expect(formatPercentage(1)).toBe('100.0%');
    });
    
    it('should format percentages with custom decimals', () => {
      expect(formatPercentage(0.12345, 2)).toBe('12.35%');
      expect(formatPercentage(0.5, 0)).toBe('50%');
    });
    
    it('should handle small percentages', () => {
      expect(formatPercentage(0.001, 3)).toBe('0.100%');
    });
  });
  
  describe('formatDuration', () => {
    it('should format milliseconds', () => {
      expect(formatDuration(500)).toBe('500ms');
      expect(formatDuration(999)).toBe('999ms');
    });
    
    it('should format seconds', () => {
      expect(formatDuration(1000)).toBe('1.0s');
      expect(formatDuration(5500)).toBe('5.5s');
      expect(formatDuration(30000)).toBe('30.0s');
    });
    
    it('should format minutes', () => {
      expect(formatDuration(60000)).toBe('1.0m');
      expect(formatDuration(120000)).toBe('2.0m');
      expect(formatDuration(90000)).toBe('1.5m');
    });
    
    it('should format hours', () => {
      expect(formatDuration(3600000)).toBe('1.0h');
      expect(formatDuration(7200000)).toBe('2.0h');
    });
  });
  
  describe('truncate', () => {
    it('should truncate long strings', () => {
      expect(truncate('This is a very long string', 10)).toBe('This is...');
    });
    
    it('should not truncate short strings', () => {
      expect(truncate('Short', 10)).toBe('Short');
    });
    
    it('should handle exact length', () => {
      expect(truncate('Exactly10!', 10)).toBe('Exactly10!');
    });
  });
  
  describe('capitalize', () => {
    it('should capitalize first letter', () => {
      expect(capitalize('hello')).toBe('Hello');
      expect(capitalize('world')).toBe('World');
    });
    
    it('should handle already capitalized', () => {
      expect(capitalize('Hello')).toBe('Hello');
    });
    
    it('should handle single character', () => {
      expect(capitalize('a')).toBe('A');
    });
    
    it('should handle empty string', () => {
      expect(capitalize('')).toBe('');
    });
  });
  
  describe('toTitleCase', () => {
    it('should convert to title case', () => {
      expect(toTitleCase('hello world')).toBe('Hello World');
      expect(toTitleCase('the quick brown fox')).toBe('The Quick Brown Fox');
    });
    
    it('should handle single word', () => {
      expect(toTitleCase('hello')).toBe('Hello');
    });
    
    it('should handle already title case', () => {
      expect(toTitleCase('Hello World')).toBe('Hello World');
    });
  });
  
  describe('formatBytes', () => {
    it('should format bytes', () => {
      expect(formatBytes(0)).toBe('0 Bytes');
      expect(formatBytes(500)).toBe('500 Bytes');
    });
    
    it('should format kilobytes', () => {
      expect(formatBytes(1024)).toBe('1 KB');
      expect(formatBytes(2048)).toBe('2 KB');
    });
    
    it('should format megabytes', () => {
      expect(formatBytes(1048576)).toBe('1 MB');
      expect(formatBytes(5242880)).toBe('5 MB');
    });
    
    it('should format gigabytes', () => {
      expect(formatBytes(1073741824)).toBe('1 GB');
    });
    
    it('should handle decimals', () => {
      expect(formatBytes(1536)).toBe('1.5 KB');
    });
  });
  
  describe('prettyJSON', () => {
    it('should format JSON with indentation', () => {
      const obj = { name: 'John', age: 30 };
      const result = prettyJSON(obj);
      
      expect(result).toContain('  '); // Has indentation
      expect(result).toContain('"name": "John"');
      expect(result).toContain('"age": 30');
    });
    
    it('should handle nested objects', () => {
      const obj = { user: { name: 'John', address: { city: 'NYC' } } };
      const result = prettyJSON(obj);
      
      expect(result).toContain('  ');
      expect(result).toContain('    ');
    });
  });
});

