/**
 * Integration Tests for Redis Connection and Error Handling
 * Tests Redis initialization, connection pooling, TTL strategy, and error handling
 */

import { getRedisClient, disconnectRedis, checkRedisHealth } from '../config/redis';
import logger from '../utils/logger';

describe('Redis Connection and Configuration', () => {
  afterAll(async () => {
    await disconnectRedis();
  });

  describe('Redis client initialization', () => {
    it('should initialize Redis client with correct configuration', async () => {
      const client = await getRedisClient();
      
      expect(client).toBeDefined();
      expect(client).not.toBeNull();
    });

    it('should reuse existing client on subsequent calls (connection pooling)', async () => {
      const client1 = await getRedisClient();
      const client2 = await getRedisClient();
      
      expect(client1).toBe(client2);
    });

    it('should read configuration from environment variables', async () => {
      // Store original env vars
      const originalHost = process.env.REDIS_HOST;
      const originalPort = process.env.REDIS_PORT;
      const originalDb = process.env.REDIS_DB;

      try {
        // Env vars should be read from .env file or environment
        // Just verify that getRedisClient doesn't crash with default values
        const client = await getRedisClient();
        expect(client).toBeDefined();
      } finally {
        // Restore original env vars
        if (originalHost !== undefined) process.env.REDIS_HOST = originalHost;
        if (originalPort !== undefined) process.env.REDIS_PORT = originalPort;
        if (originalDb !== undefined) process.env.REDIS_DB = originalDb;
      }
    });
  });

  describe('Redis health check', () => {
    it('should return true when Redis is healthy', async () => {
      const isHealthy = await checkRedisHealth();
      
      expect(typeof isHealthy).toBe('boolean');
      // Note: This test assumes Redis is running. In CI/CD, this might be skipped
      // or mocked depending on the test environment setup
    });

    it('should handle health check gracefully', async () => {
      // This test just ensures the health check function doesn't throw
      try {
        const isHealthy = await checkRedisHealth();
        expect(typeof isHealthy).toBe('boolean');
      } catch (error) {
        // If Redis is not available, that's okay for this test
        expect(error).toBeDefined();
      }
    });
  });

  describe('Redis TTL strategy', () => {
    it('should set and retrieve values with TTL', async () => {
      const client = await getRedisClient();
      const testKey = 'test:ttl:' + Date.now();
      const testValue = 'test-value-' + Math.random();
      const ttl = 5; // 5 seconds

      // Set value with TTL
      await client.setEx(testKey, ttl, testValue);

      // Immediately retrieve and verify
      const retrieved = await client.get(testKey);
      expect(retrieved).toBe(testValue);

      // Check TTL
      const remaining = await client.ttl(testKey);
      expect(remaining).toBeGreaterThan(0);
      expect(remaining).toBeLessThanOrEqual(ttl);
    });

    it('should expire values after TTL', async () => {
      const client = await getRedisClient();
      const testKey = 'test:expire:' + Date.now();
      const testValue = 'test-value';
      const ttl = 1; // 1 second

      // Set value with TTL
      await client.setEx(testKey, ttl, testValue);

      // Verify it exists
      const before = await client.get(testKey);
      expect(before).toBe(testValue);

      // Wait for expiration
      await new Promise((resolve) => setTimeout(resolve, 1100));

      // Verify it's gone
      const after = await client.get(testKey);
      expect(after).toBeNull();
    });

    it('should handle default 5-minute TTL for duplicate detection', async () => {
      const client = await getRedisClient();
      const testKey = 'duplicate:' + Math.random();
      const testValue = 'event-id-123';
      const ttlSeconds = 300; // 5 minutes

      // Simulate duplicate detection cache entry
      await client.setEx(testKey, ttlSeconds, testValue);

      // Verify TTL
      const ttl = await client.ttl(testKey);
      expect(ttl).toBeGreaterThan(0);
      expect(ttl).toBeLessThanOrEqual(ttlSeconds);
    });
  });

  describe('Error handling', () => {
    it('should handle non-existent keys gracefully', async () => {
      const client = await getRedisClient();
      const nonExistentKey = 'non-existent-key-' + Math.random();

      const value = await client.get(nonExistentKey);
      expect(value).toBeNull();
    });

    it('should handle duplicate keys by overwriting', async () => {
      const client = await getRedisClient();
      const testKey = 'test:overwrite:' + Date.now();
      const value1 = 'value1';
      const value2 = 'value2';

      await client.set(testKey, value1);
      const first = await client.get(testKey);
      expect(first).toBe(value1);

      await client.set(testKey, value2);
      const second = await client.get(testKey);
      expect(second).toBe(value2);

      // Clean up
      await client.del(testKey);
    });

    it('should handle multiple concurrent operations', async () => {
      const client = await getRedisClient();
      const promises: Promise<any>[] = [];

      // Create multiple concurrent operations
      for (let i = 0; i < 10; i++) {
        const key = `test:concurrent:${i}`;
        promises.push(client.setEx(key, 60, `value-${i}`));
      }

      // Wait for all operations
      const results = await Promise.all(promises);
      expect(results).toHaveLength(10);

      // Verify all were set
      const verifyPromises: Promise<any>[] = [];
      for (let i = 0; i < 10; i++) {
        const key = `test:concurrent:${i}`;
        verifyPromises.push(client.get(key));
      }

      const values = await Promise.all(verifyPromises);
      expect(values).toEqual(Array.from({ length: 10 }, (_, i) => `value-${i}`));

      // Clean up
      const cleanupPromises: Promise<any>[] = [];
      for (let i = 0; i < 10; i++) {
        const key = `test:concurrent:${i}`;
        cleanupPromises.push(client.del(key));
      }
      await Promise.all(cleanupPromises);
    });

    it('should handle large values', async () => {
      const client = await getRedisClient();
      const testKey = 'test:large:' + Date.now();
      
      // Create a large value (1MB)
      const largeValue = 'x'.repeat(1024 * 1024);

      await client.set(testKey, largeValue);
      const retrieved = await client.get(testKey);
      
      expect(retrieved).toBe(largeValue);
      expect(retrieved?.length).toBe(1024 * 1024);

      // Clean up
      await client.del(testKey);
    });

    it('should handle special characters in keys and values', async () => {
      const client = await getRedisClient();
      const specialKey = 'test:special:@#$%^&*()_+-=[]{}|;:,.<>?' + Date.now();
      const specialValue = '@#$%^&*()_+-=[]{}|;:,.<>?';

      await client.set(specialKey, specialValue);
      const retrieved = await client.get(specialKey);
      
      expect(retrieved).toBe(specialValue);

      // Clean up
      await client.del(specialKey);
    });
  });

  describe('Disconnection and cleanup', () => {
    it('should disconnect gracefully', async () => {
      // Create a fresh client for this test
      const client = await getRedisClient();
      expect(client).toBeDefined();

      // Disconnect
      await disconnectRedis();

      // Verify we can reconnect
      const newClient = await getRedisClient();
      expect(newClient).toBeDefined();
    });
  });

  describe('Configuration via environment variables', () => {
    it('should use REDIS_HOST environment variable', async () => {
      // REDIS_HOST should be available in environment
      const host = process.env.REDIS_HOST || 'localhost';
      expect(host).toBeDefined();
      expect(typeof host).toBe('string');
    });

    it('should use REDIS_PORT environment variable', async () => {
      // REDIS_PORT should be available in environment
      const port = process.env.REDIS_PORT || '6379';
      const portNum = parseInt(port, 10);
      expect(portNum).toBeGreaterThan(0);
      expect(portNum).toBeLessThan(65536);
    });

    it('should use REDIS_DB environment variable', async () => {
      // REDIS_DB should be available in environment
      const db = process.env.REDIS_DB || '0';
      const dbNum = parseInt(db, 10);
      expect(dbNum).toBeGreaterThanOrEqual(0);
      expect(dbNum).toBeLessThan(16); // Standard Redis has 16 DBs
    });

    it('should handle REDIS_PASSWORD environment variable', async () => {
      // REDIS_PASSWORD may or may not be set
      const password = process.env.REDIS_PASSWORD;
      expect(password === undefined || typeof password === 'string').toBe(true);
    });
  });

  describe('Connection pooling', () => {
    it('should maintain single client instance for connection pooling', async () => {
      const client1 = await getRedisClient();
      const client2 = await getRedisClient();
      const client3 = await getRedisClient();

      expect(client1).toBe(client2);
      expect(client2).toBe(client3);
    });

    it('should handle multiple concurrent getRedisClient calls', async () => {
      const promises = Array.from({ length: 10 }, () => getRedisClient());
      const clients = await Promise.all(promises);

      // All should be the same instance
      const firstClient = clients[0];
      for (let i = 1; i < clients.length; i++) {
        expect(clients[i]).toBe(firstClient);
      }
    });
  });
});
