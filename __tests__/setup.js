"use strict";
/**
 * Jest setup file
 * Runs before all tests to configure the test environment
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
// Load environment variables from .env file
dotenv_1.default.config({ path: '.env.example' });
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
console.log = (...args) => {
    if (process.env.VERBOSE_TESTS === 'true') {
        originalLog(...args);
    }
};
console.error = originalError;
console.warn = originalWarn;
//# sourceMappingURL=setup.js.map