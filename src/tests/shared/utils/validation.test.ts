/**
 * Tests for validation utilities
 */

import { z } from 'zod';
import {
  validate,
  safeValidate,
  isValidEmail,
  isValidUrl,
  isValidISODate,
  isValidUUID
} from '../../../shared/utils/validation.js';

describe('Validation Utilities', () => {
  describe('validate', () => {
    it('should validate valid data', () => {
      const schema = z.object({
        name: z.string(),
        age: z.number()
      });
      
      const data = { name: 'John', age: 30 };
      const result = validate(schema, data);
      
      expect(result).toEqual(data);
    });
    
    it('should throw on invalid data', () => {
      const schema = z.object({
        name: z.string(),
        age: z.number()
      });
      
      const data = { name: 'John', age: 'thirty' };
      
      expect(() => validate(schema, data)).toThrow();
    });
  });
  
  describe('safeValidate', () => {
    it('should return success for valid data', () => {
      const schema = z.object({
        name: z.string(),
        age: z.number()
      });
      
      const data = { name: 'John', age: 30 };
      const result = safeValidate(schema, data);
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(data);
      }
    });
    
    it('should return error for invalid data', () => {
      const schema = z.object({
        name: z.string(),
        age: z.number()
      });
      
      const data = { name: 'John', age: 'thirty' };
      const result = safeValidate(schema, data);
      
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBeDefined();
      }
    });
  });
  
  describe('isValidEmail', () => {
    it('should validate correct email addresses', () => {
      expect(isValidEmail('test@example.com')).toBe(true);
      expect(isValidEmail('user.name@example.co.uk')).toBe(true);
      expect(isValidEmail('user+tag@example.com')).toBe(true);
    });
    
    it('should reject invalid email addresses', () => {
      expect(isValidEmail('invalid')).toBe(false);
      expect(isValidEmail('invalid@')).toBe(false);
      expect(isValidEmail('@example.com')).toBe(false);
      expect(isValidEmail('invalid@.com')).toBe(false);
      expect(isValidEmail('invalid@example')).toBe(false);
    });
  });
  
  describe('isValidUrl', () => {
    it('should validate correct URLs', () => {
      expect(isValidUrl('https://example.com')).toBe(true);
      expect(isValidUrl('http://localhost:3000')).toBe(true);
      expect(isValidUrl('https://api.example.com/v1/endpoint')).toBe(true);
    });
    
    it('should reject invalid URLs', () => {
      expect(isValidUrl('not-a-url')).toBe(false);
      expect(isValidUrl('ftp://invalid')).toBe(true); // FTP is still valid URL
      expect(isValidUrl('')).toBe(false);
    });
  });
  
  describe('isValidISODate', () => {
    it('should validate correct ISO date strings', () => {
      expect(isValidISODate('2025-10-11')).toBe(true);
      expect(isValidISODate('2025-01-01')).toBe(true);
      expect(isValidISODate('2025-12-31')).toBe(true);
    });
    
    it('should reject invalid ISO date strings', () => {
      expect(isValidISODate('2025-13-01')).toBe(false); // Invalid month
      expect(isValidISODate('2025-10-32')).toBe(false); // Invalid day
      expect(isValidISODate('25-10-11')).toBe(false); // Wrong format
      expect(isValidISODate('2025/10/11')).toBe(false); // Wrong separator
      expect(isValidISODate('not-a-date')).toBe(false);
      expect(isValidISODate('')).toBe(false);
    });
  });
  
  describe('isValidUUID', () => {
    it('should validate correct UUIDs', () => {
      expect(isValidUUID('123e4567-e89b-12d3-a456-426614174000')).toBe(true);
      expect(isValidUUID('00000000-0000-0000-0000-000000000000')).toBe(true);
      expect(isValidUUID('FFFFFFFF-FFFF-FFFF-FFFF-FFFFFFFFFFFF')).toBe(true);
    });
    
    it('should reject invalid UUIDs', () => {
      expect(isValidUUID('123e4567-e89b-12d3-a456-42661417400')).toBe(false); // Too short
      expect(isValidUUID('123e4567-e89b-12d3-a456-4266141740000')).toBe(false); // Too long
      expect(isValidUUID('not-a-uuid')).toBe(false);
      expect(isValidUUID('123e4567e89b12d3a456426614174000')).toBe(false); // No dashes
      expect(isValidUUID('')).toBe(false);
    });
  });
});

