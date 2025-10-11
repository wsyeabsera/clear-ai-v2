/**
 * Logger tests
 */

import {
  Logger,
  LogLevel,
  createLogger,
  initLogger,
  getLogger,
} from '../../../shared/utils/logger.js';

describe('Logger', () => {
  let mockConsoleLog: jest.SpyInstance;
  let mockConsoleWarn: jest.SpyInstance;
  let mockConsoleError: jest.SpyInstance;
  
  beforeEach(() => {
    // Create fresh mocks before each test
    mockConsoleLog = jest.spyOn(console, 'log').mockImplementation(() => {});
    mockConsoleWarn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    mockConsoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
  });
  
  afterEach(() => {
    // Restore after each test
    mockConsoleLog.mockRestore();
    mockConsoleWarn.mockRestore();
    mockConsoleError.mockRestore();
  });
  
  describe('initialization', () => {
    it('should create logger with default options', () => {
      const logger = createLogger();
      
      expect(logger).toBeInstanceOf(Logger);
      expect(logger.getLevel()).toBe(LogLevel.INFO);
    });
    
    it('should create logger with custom level', () => {
      const logger = createLogger({ level: LogLevel.DEBUG });
      
      expect(logger.getLevel()).toBe(LogLevel.DEBUG);
    });
    
    it('should create logger with context', () => {
      const logger = createLogger({
        context: { requestId: '123' },
      });
      
      logger.info('Test message');
      
      // Context should be included in log output
      expect(mockConsoleLog).toHaveBeenCalled();
    });
  });
  
  describe('log levels', () => {
    it('should log debug messages', () => {
      const logger = createLogger({ level: LogLevel.DEBUG });
      
      logger.debug('Debug message');
      
      expect(mockConsoleLog).toHaveBeenCalled();
    });
    
    it('should log info messages', () => {
      const logger = createLogger({ level: LogLevel.INFO });
      
      logger.info('Info message');
      
      expect(mockConsoleLog).toHaveBeenCalled();
    });
    
    it('should log warn messages', () => {
      const logger = createLogger({ level: LogLevel.WARN });
      
      logger.warn('Warning message');
      
      expect(mockConsoleWarn).toHaveBeenCalled();
    });
    
    it('should log error messages', () => {
      const logger = createLogger({ level: LogLevel.ERROR });
      
      logger.error('Error message');
      
      expect(mockConsoleError).toHaveBeenCalled();
    });
    
    it('should include error object in error logs', () => {
      const logger = createLogger({ level: LogLevel.ERROR });
      const error = new Error('Test error');
      
      logger.error('Failed operation', error);
      
      expect(mockConsoleError).toHaveBeenCalled();
    });
  });
  
  describe('log level filtering', () => {
    it('should not log below minimum level', () => {
      const logger = createLogger({ level: LogLevel.WARN });
      
      logger.debug('Debug');
      logger.info('Info');
      logger.warn('Warn');
      logger.error('Error');
      
      expect(mockConsoleLog).not.toHaveBeenCalled(); // DEBUG and INFO filtered
      expect(mockConsoleWarn).toHaveBeenCalledTimes(1);
      expect(mockConsoleError).toHaveBeenCalledTimes(1);
    });
    
    it('should log all levels with DEBUG', () => {
      const logger = createLogger({ level: LogLevel.DEBUG });
      
      logger.debug('Debug');
      logger.info('Info');
      logger.warn('Warn');
      logger.error('Error');
      
      expect(mockConsoleLog).toHaveBeenCalledTimes(2); // DEBUG and INFO
      expect(mockConsoleWarn).toHaveBeenCalledTimes(1);
      expect(mockConsoleError).toHaveBeenCalledTimes(1);
    });
    
    it('should allow changing log level', () => {
      const logger = createLogger({ level: LogLevel.INFO });
      
      logger.debug('Should not log');
      expect(mockConsoleLog).not.toHaveBeenCalled();
      
      logger.setLevel(LogLevel.DEBUG);
      logger.debug('Should log now');
      
      expect(mockConsoleLog).toHaveBeenCalled();
    });
  });
  
  describe('output formats', () => {
    it('should output JSON format', () => {
      const logger = createLogger({
        level: LogLevel.INFO,
        format: 'json',
      });
      
      logger.info('Test message', { key: 'value' });
      
      expect(mockConsoleLog).toHaveBeenCalled();
      const output = mockConsoleLog.mock.calls[0]?.[0];
      
      // Should be valid JSON
      expect(() => JSON.parse(output)).not.toThrow();
      
      const parsed = JSON.parse(output);
      expect(parsed.level).toBe('INFO');
      expect(parsed.message).toBe('Test message');
      expect(parsed.key).toBe('value');
    });
    
    it('should output pretty format', () => {
      const logger = createLogger({
        level: LogLevel.INFO,
        format: 'pretty',
      });
      
      logger.info('Test message', { key: 'value' });
      
      expect(mockConsoleLog).toHaveBeenCalled();
      const output = mockConsoleLog.mock.calls[0]?.[0];
      
      // Should contain ANSI color codes
      expect(output).toContain('[INFO]');
      expect(output).toContain('Test message');
    });
  });
  
  describe('context', () => {
    it('should include global context in all logs', () => {
      const logger = createLogger({
        format: 'json',
        context: { appName: 'clear-ai', version: '1.0' },
      });
      
      logger.info('Test');
      
      const output = mockConsoleLog.mock.calls[0]?.[0];
      const parsed = JSON.parse(output);
      
      expect(parsed.appName).toBe('clear-ai');
      expect(parsed.version).toBe('1.0');
    });
    
    it('should merge local context with global', () => {
      const logger = createLogger({
        format: 'json',
        context: { global: 'value' },
      });
      
      logger.info('Test', { local: 'value' });
      
      const output = mockConsoleLog.mock.calls[0]?.[0];
      const parsed = JSON.parse(output);
      
      expect(parsed.global).toBe('value');
      expect(parsed.local).toBe('value');
    });
    
    it('should allow creating child logger', () => {
      const parent = createLogger({
        format: 'json',
        context: { parent: 'value' },
      });
      
      const child = parent.child({ child: 'value' });
      
      child.info('Test');
      
      const output = mockConsoleLog.mock.calls[0]?.[0];
      const parsed = JSON.parse(output);
      
      expect(parsed.parent).toBe('value');
      expect(parsed.child).toBe('value');
    });
  });
  
  describe('timestamp', () => {
    it('should include timestamp by default', () => {
      const logger = createLogger({ format: 'json' });
      
      logger.info('Test');
      
      const output = mockConsoleLog.mock.calls[0]?.[0];
      const parsed = JSON.parse(output);
      
      expect(parsed.timestamp).toBeDefined();
      expect(typeof parsed.timestamp).toBe('string');
    });
    
    it('should allow disabling timestamp', () => {
      const logger = createLogger({
        format: 'json',
        includeTimestamp: false,
      });
      
      logger.info('Test');
      
      const output = mockConsoleLog.mock.calls[0]?.[0];
      const parsed = JSON.parse(output);
      
      expect(parsed.timestamp).toBeUndefined();
    });
  });
  
  describe('global logger', () => {
    it('should initialize global logger', () => {
      const logger = initLogger({ level: LogLevel.DEBUG });
      
      expect(logger).toBeInstanceOf(Logger);
      expect(getLogger()).toBe(logger);
    });
    
    it('should auto-initialize global logger if not set', () => {
      const logger = getLogger();
      
      expect(logger).toBeInstanceOf(Logger);
    });
  });
  
  describe('error logging', () => {
    it('should handle Error objects', () => {
      const logger = createLogger({ format: 'json' });
      const error = new Error('Test error');
      error.stack = 'stack trace';
      
      logger.error('Operation failed', error);
      
      expect(mockConsoleError).toHaveBeenCalled();
      const output = mockConsoleError.mock.calls[0]?.[0];
      const parsed = JSON.parse(output);
      
      expect(parsed.error).toBeDefined();
      expect(parsed.error.message).toBe('Test error');
      expect(parsed.error.name).toBe('Error');
      expect(parsed.error.stack).toBe('stack trace');
    });
    
    it('should handle non-Error objects', () => {
      const logger = createLogger({ format: 'json' });
      
      logger.error('Operation failed', { custom: 'error' });
      
      expect(mockConsoleError).toHaveBeenCalled();
      const output = mockConsoleError.mock.calls[0]?.[0];
      const parsed = JSON.parse(output);
      
      expect(parsed.error).toEqual({ custom: 'error' });
    });
    
    it('should handle error without error object', () => {
      const logger = createLogger({ format: 'json' });
      
      logger.error('Simple error message');
      
      expect(mockConsoleError).toHaveBeenCalled();
    });
  });
});

