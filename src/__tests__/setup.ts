/**
 * Jest setup file
 * Runs before all tests to configure the test environment
 */

import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config({ path: '.env.example' });

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.LOG_LEVEL = 'error'; // Reduce noise in test output
process.env.REDIS_HOST = process.env.REDIS_HOST || 'localhost';
process.env.REDIS_PORT = process.env.REDIS_PORT || '6379';
process.env.REDIS_DB = process.env.REDIS_DB || '15'; // Use DB 15 for testing to avoid conflicts

// Suppress console logs during tests
const originalLog = console.log;
const originalError = console.error;
const originalWarn = console.warn;

// Only show errors and warnings
console.log = (...args: any[]) => {
  if (process.env.VERBOSE_TESTS === 'true') {
    originalLog(...args);
  }
};

console.error = originalError;
console.warn = originalWarn;
