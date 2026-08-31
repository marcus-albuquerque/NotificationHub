"use strict";
/**
 * Redis Configuration and Connection Management
 * Handles connection pooling, configuration, and error handling
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getRedisClient = getRedisClient;
exports.disconnectRedis = disconnectRedis;
exports.checkRedisHealth = checkRedisHealth;
const redis_1 = require("redis");
const logger_1 = __importDefault(require("../utils/logger"));
let redisClient = null;
/**
 * Get or create a Redis client with connection pooling
 * @returns Promise resolving to a Redis client instance
 */
async function getRedisClient() {
    if (redisClient) {
        return redisClient;
    }
    try {
        const url = `redis://${process.env.REDIS_HOST || 'localhost'}:${process.env.REDIS_PORT || '6379'}/${process.env.REDIS_DB || '0'}`;
        redisClient = (0, redis_1.createClient)({
            url: process.env.REDIS_PASSWORD
                ? `redis://:${process.env.REDIS_PASSWORD}@${process.env.REDIS_HOST || 'localhost'}:${process.env.REDIS_PORT || '6379'}/${process.env.REDIS_DB || '0'}`
                : url,
            socket: {
                reconnectStrategy: (retries) => {
                    if (retries > 10) {
                        logger_1.default.error('Redis: Max reconnection attempts reached');
                        return new Error('Max Redis reconnection attempts exceeded');
                    }
                    const delay = Math.min(retries * 50, 5000);
                    logger_1.default.warn(`Redis: Reconnecting in ${delay}ms (attempt ${retries})`);
                    return delay;
                },
                connectTimeout: 10000,
                noDelay: true,
                keepAlive: 30000,
            },
        });
        // Error handling
        redisClient.on('error', (err) => {
            logger_1.default.error('Redis client error:', err);
        });
        redisClient.on('connect', () => {
            logger_1.default.info('Redis client connected');
        });
        redisClient.on('reconnecting', () => {
            logger_1.default.warn('Redis client reconnecting...');
        });
        // Connect to Redis
        await redisClient.connect();
        logger_1.default.info('Redis connection established successfully');
        return redisClient;
    }
    catch (error) {
        logger_1.default.error('Failed to initialize Redis client:', error);
        throw new Error(`Redis initialization failed: ${error instanceof Error ? error.message : String(error)}`);
    }
}
/**
 * Disconnect Redis client
 */
async function disconnectRedis() {
    if (redisClient) {
        try {
            await redisClient.quit();
            logger_1.default.info('Redis client disconnected');
            redisClient = null;
        }
        catch (error) {
            logger_1.default.error('Error disconnecting Redis:', error);
        }
    }
}
/**
 * Health check for Redis connection
 */
async function checkRedisHealth() {
    try {
        const client = await getRedisClient();
        const pong = await client.ping();
        return pong === 'PONG';
    }
    catch (error) {
        logger_1.default.error('Redis health check failed:', error);
        return false;
    }
}
//# sourceMappingURL=redis.js.map