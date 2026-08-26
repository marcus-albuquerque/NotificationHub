/**
 * Redis Configuration and Connection Management
 * Handles connection pooling, configuration, and error handling
 */

import { createClient } from 'redis';
import logger from '../utils/logger';

type RedisClientType = ReturnType<typeof createClient>;
let redisClient: RedisClientType | null = null;

/**
 * Get or create a Redis client with connection pooling
 * @returns Promise resolving to a Redis client instance
 */
export async function getRedisClient(): Promise<RedisClientType> {
  if (redisClient) {
    return redisClient;
  }

  try {
    const url = `redis://${process.env.REDIS_HOST || 'localhost'}:${process.env.REDIS_PORT || '6379'}/${process.env.REDIS_DB || '0'}`;

    redisClient = createClient({
      url: process.env.REDIS_PASSWORD
        ? `redis://:${process.env.REDIS_PASSWORD}@${process.env.REDIS_HOST || 'localhost'}:${process.env.REDIS_PORT || '6379'}/${process.env.REDIS_DB || '0'}`
        : url,
      socket: {
        reconnectStrategy: (retries) => {
          if (retries > 10) {
            logger.error('Redis: Max reconnection attempts reached');
            return new Error('Max Redis reconnection attempts exceeded');
          }
          const delay = Math.min(retries * 50, 5000);
          logger.warn(`Redis: Reconnecting in ${delay}ms (attempt ${retries})`);
          return delay;
        },
        connectTimeout: 10000,
        noDelay: true,
        keepAlive: 30000,
      },
    });

    // Error handling
    redisClient.on('error', (err) => {
      logger.error('Redis client error:', err);
    });

    redisClient.on('connect', () => {
      logger.info('Redis client connected');
    });

    redisClient.on('reconnecting', () => {
      logger.warn('Redis client reconnecting...');
    });

    // Connect to Redis
    await redisClient.connect();
    logger.info('Redis connection established successfully');

    return redisClient;
  } catch (error) {
    logger.error('Failed to initialize Redis client:', error);
    throw new Error(
      `Redis initialization failed: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Disconnect Redis client
 */
export async function disconnectRedis(): Promise<void> {
  if (redisClient) {
    try {
      await redisClient.quit();
      logger.info('Redis client disconnected');
      redisClient = null;
    } catch (error) {
      logger.error('Error disconnecting Redis:', error);
    }
  }
}

/**
 * Health check for Redis connection
 */
export async function checkRedisHealth(): Promise<boolean> {
  try {
    const client = await getRedisClient();
    const pong = await client.ping();
    return pong === 'PONG';
  } catch (error) {
    logger.error('Redis health check failed:', error);
    return false;
  }
}
