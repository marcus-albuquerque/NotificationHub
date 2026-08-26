/**
 * Unit Tests for Duplicate Detector
 * Property-based tests using fast-check to validate duplicate detection logic
 */

import { getCacheKey, getCacheKeyDebug } from '../utils/cache-key';
import * as fc from 'fast-check';

describe('DuplicateDetector - Unit Tests', () => {
  describe('getCacheKey utility', () => {
    it('should generate consistent cache keys for identical inputs', () => {
      const key1 = getCacheKey('farm-001', 'device-001', 'AIR_TEMPERATURE', 25);
      const key2 = getCacheKey('farm-001', 'device-001', 'AIR_TEMPERATURE', 25);

      expect(key1).toBe(key2);
      expect(key1).toMatch(/^duplicate:[a-f0-9]{64}$/); // SHA256 hash format
    });

    it('should generate different keys for different inputs', () => {
      const key1 = getCacheKey('farm-001', 'device-001', 'AIR_TEMPERATURE', 25);
      const key2 = getCacheKey('farm-001', 'device-001', 'AIR_TEMPERATURE', 26);
      const key3 = getCacheKey('farm-002', 'device-001', 'AIR_TEMPERATURE', 25);

      expect(key1).not.toBe(key2);
      expect(key1).not.toBe(key3);
      expect(key2).not.toBe(key3);
    });

    it('should handle string and numeric values correctly', () => {
      const key1 = getCacheKey('farm-001', 'device-001', 'EQUIPMENT_STATUS', 'FAILURE');
      const key2 = getCacheKey('farm-001', 'device-001', 'EQUIPMENT_STATUS', 'OK');

      expect(key1).not.toBe(key2);
      // Note: numeric 25 and string "25" will produce the same key because
      // they're both converted to string in the key generation
      // This is acceptable for duplicate detection - same value = same key
    });

    it('should handle special characters in inputs', () => {
      const key1 = getCacheKey('farm-001', 'device:001', 'AIR_TEMPERATURE', 25);
      const key2 = getCacheKey('farm/001', 'device-001', 'AIR_TEMPERATURE', 25);

      expect(key1).toBeDefined();
      expect(key2).toBeDefined();
      expect(key1).not.toBe(key2);
    });
  });

  describe('getCacheKeyDebug utility', () => {
    it('should generate human-readable debug keys', () => {
      const key = getCacheKeyDebug('farm-001', 'device-001', 'AIR_TEMPERATURE', 25);

      expect(key).toContain('duplicate:');
      expect(key).toContain('farm-001');
      expect(key).toContain('device-001');
      expect(key).toContain('AIR_TEMPERATURE');
      expect(key).toContain('25');
    });

    it('should generate different debug keys for different values', () => {
      const key1 = getCacheKeyDebug('farm-001', 'device-001', 'AIR_TEMPERATURE', 25);
      const key2 = getCacheKeyDebug('farm-001', 'device-001', 'AIR_TEMPERATURE', 26);

      expect(key1).not.toBe(key2);
    });
  });

  describe('Property 8: Duplicate Detection Within Window', () => {
    /**
     * Feature: notification-hub
     * Property 8: Duplicate Detection Within Window
     *
     * For any two events with identical (farmId, deviceId, sensorType, value)
     * received within 5 minutes of each other, the DuplicateDetector SHALL
     * classify the second event as a duplicate and discard it without generating notifications.
     *
     * This property tests that cache key generation is deterministic and differentiates
     * based on all components.
     */
    it('should return consistent results for duplicate detection (deterministic behavior)', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 50 }),
          fc.string({ minLength: 1, maxLength: 50 }),
          fc.oneof(
            fc.constant('AIR_TEMPERATURE'),
            fc.constant('AIR_HUMIDITY'),
            fc.constant('SOIL_MOISTURE'),
            fc.constant('WATER_RESERVOIR_LEVEL'),
            fc.constant('SILO_LEVEL'),
            fc.constant('EQUIPMENT_STATUS')
          ),
          fc.oneof(fc.integer({ min: -100, max: 200 }), fc.constant('FAILURE'), fc.constant('OK')),
          (farmId, deviceId, sensorType, value) => {
            const key1 = getCacheKey(farmId, deviceId, sensorType, value);
            const key2 = getCacheKey(farmId, deviceId, sensorType, value);

            // Cache key generation should be deterministic (same inputs = same key)
            expect(key1).toBe(key2);
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should generate different keys for different sensor values', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 50 }),
          fc.string({ minLength: 1, maxLength: 50 }),
          fc.integer({ min: -100, max: 100 }),
          fc.integer({ min: -100, max: 100 }),
          (farmId, deviceId, value1, value2) => {
            fc.pre(value1 !== value2); // Only test when values are different

            const key1 = getCacheKey(farmId, deviceId, 'AIR_TEMPERATURE', value1);
            const key2 = getCacheKey(farmId, deviceId, 'AIR_TEMPERATURE', value2);

            // Different values should produce different keys
            expect(key1).not.toBe(key2);
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should generate different keys for different farms', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 50 }),
          fc.string({ minLength: 1, maxLength: 50 }),
          fc.string({ minLength: 1, maxLength: 50 }),
          (farmId1, farmId2, deviceId) => {
            fc.pre(farmId1 !== farmId2); // Only test when farm IDs are different

            const key1 = getCacheKey(farmId1, deviceId, 'AIR_TEMPERATURE', 25);
            const key2 = getCacheKey(farmId2, deviceId, 'AIR_TEMPERATURE', 25);

            // Different farms should produce different keys
            expect(key1).not.toBe(key2);
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should generate different keys for different devices', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 50 }),
          fc.string({ minLength: 1, maxLength: 50 }),
          fc.string({ minLength: 1, maxLength: 50 }),
          (farmId, deviceId1, deviceId2) => {
            fc.pre(deviceId1 !== deviceId2); // Only test when device IDs are different

            const key1 = getCacheKey(farmId, deviceId1, 'AIR_TEMPERATURE', 25);
            const key2 = getCacheKey(farmId, deviceId2, 'AIR_TEMPERATURE', 25);

            // Different devices should produce different keys
            expect(key1).not.toBe(key2);
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should format cache keys as hex hashes', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 50 }),
          fc.string({ minLength: 1, maxLength: 50 }),
          fc.integer({ min: -100, max: 200 }),
          (farmId, deviceId, value) => {
            const key = getCacheKey(farmId, deviceId, 'AIR_TEMPERATURE', value);

            // Key should start with 'duplicate:' and followed by hex characters
            expect(key).toMatch(/^duplicate:[a-f0-9]+$/);
          }
        ),
        { numRuns: 50 }
      );
    });
  });

  describe('Edge cases', () => {
    it('should handle empty strings in components', () => {
      const key1 = getCacheKey('', 'device-001', 'AIR_TEMPERATURE', 25);
      const key2 = getCacheKey('farm-001', '', 'AIR_TEMPERATURE', 25);

      expect(key1).toBeDefined();
      expect(key2).toBeDefined();
      expect(key1).not.toBe(key2);
    });

    it('should handle very large numeric values', () => {
      const key1 = getCacheKey('farm-001', 'device-001', 'AIR_TEMPERATURE', 999999999);
      const key2 = getCacheKey('farm-001', 'device-001', 'AIR_TEMPERATURE', 1000000000);

      expect(key1).toBeDefined();
      expect(key2).toBeDefined();
      expect(key1).not.toBe(key2);
    });

    it('should handle negative numeric values', () => {
      const key1 = getCacheKey('farm-001', 'device-001', 'AIR_TEMPERATURE', -100);
      const key2 = getCacheKey('farm-001', 'device-001', 'AIR_TEMPERATURE', 100);

      expect(key1).toBeDefined();
      expect(key2).toBeDefined();
      expect(key1).not.toBe(key2);
    });

    it('should handle decimal numeric values', () => {
      const key1 = getCacheKey('farm-001', 'device-001', 'AIR_TEMPERATURE', 25.5);
      const key2 = getCacheKey('farm-001', 'device-001', 'AIR_TEMPERATURE', 25.6);

      expect(key1).toBeDefined();
      expect(key2).toBeDefined();
      expect(key1).not.toBe(key2);
    });

    it('should distinguish between different string equipment statuses', () => {
      const keyFailure = getCacheKey('farm-001', 'device-001', 'EQUIPMENT_STATUS', 'FAILURE');
      const keyOk = getCacheKey('farm-001', 'device-001', 'EQUIPMENT_STATUS', 'OK');

      expect(keyFailure).not.toBe(keyOk);
    });
  });
});
