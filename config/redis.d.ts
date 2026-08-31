/**
 * Redis Configuration and Connection Management
 * Handles connection pooling, configuration, and error handling
 */
import { createClient } from 'redis';
type RedisClientType = ReturnType<typeof createClient>;
/**
 * Get or create a Redis client with connection pooling
 * @returns Promise resolving to a Redis client instance
 */
export declare function getRedisClient(): Promise<RedisClientType>;
/**
 * Disconnect Redis client
 */
export declare function disconnectRedis(): Promise<void>;
/**
 * Health check for Redis connection
 */
export declare function checkRedisHealth(): Promise<boolean>;
export {};
//# sourceMappingURL=redis.d.ts.map