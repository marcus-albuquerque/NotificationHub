"use strict";
/**
 * Duplicate Detector Component
 * Identifies and flags duplicate events within a 5-minute window using Redis cache
 *
 * A duplicate event is defined as: same farmId, deviceId, sensorType, and value
 * within 5 minutes of a previous event.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.duplicateDetector = exports.DuplicateDetector = void 0;
const redis_1 = require("../config/redis");
const cache_key_1 = require("../utils/cache-key");
const logger_1 = __importDefault(require("../utils/logger"));
// TTL for duplicate detection window in seconds (5 minutes)
const DUPLICATE_DETECTION_TTL = 300;
/**
 * DuplicateDetector class handles duplicate event detection using Redis cache
 */
class DuplicateDetector {
    /**
     * Check if an event is a duplicate within the 5-minute window
     *
     * @param farmId - The farm identifier
     * @param deviceId - The device identifier
     * @param sensorType - The sensor type
     * @param value - The sensor value
     * @param eventId - The event ID to store if not a duplicate
     * @returns DuplicateDetectionResult with isDuplicate flag and cached event info
     */
    async detect(farmId, deviceId, sensorType, value, eventId) {
        try {
            const cacheKey = (0, cache_key_1.getCacheKey)(farmId, deviceId, sensorType, value);
            const client = await (0, redis_1.getRedisClient)();
            // Check if a recent event exists in cache
            const cachedEventId = await client.get(cacheKey);
            if (cachedEventId) {
                // Duplicate detected
                logger_1.default.info(`Duplicate event detected`, {
                    farmId,
                    deviceId,
                    sensorType,
                    value,
                    eventId,
                    previousEventId: cachedEventId,
                });
                return {
                    isDuplicate: true,
                    previousEventId: cachedEventId,
                    cachedAt: new Date().toISOString(),
                };
            }
            // Not a duplicate - store this event in cache with TTL
            try {
                await client.setEx(cacheKey, DUPLICATE_DETECTION_TTL, eventId);
                logger_1.default.debug(`Event cached for duplicate detection`, {
                    farmId,
                    deviceId,
                    sensorType,
                    value,
                    eventId,
                    ttl: DUPLICATE_DETECTION_TTL,
                });
            }
            catch (cacheError) {
                logger_1.default.error(`Failed to cache event for duplicate detection`, {
                    eventId,
                    error: cacheError instanceof Error ? cacheError.message : String(cacheError),
                });
                // Continue processing even if caching fails - don't block the pipeline
                // This means we might miss duplicates in this specific window, but the event still gets processed
            }
            return {
                isDuplicate: false,
            };
        }
        catch (error) {
            logger_1.default.error(`Error during duplicate detection`, {
                farmId,
                deviceId,
                sensorType,
                value,
                eventId,
                error: error instanceof Error ? error.message : String(error),
            });
            // Fail open: if Redis is unavailable, allow the event through
            // This is a safety measure to prevent losing events during Redis outages
            logger_1.default.warn(`Duplicate detection failed - allowing event through (fail-safe)`);
            return {
                isDuplicate: false,
            };
        }
    }
    /**
     * Clear duplicate detection cache for testing purposes
     * @param farmId - The farm identifier (optional - clears all if not provided)
     */
    async clearCache(farmId) {
        try {
            const client = await (0, redis_1.getRedisClient)();
            if (farmId) {
                // Clear cache for specific farm - find all keys matching pattern
                const pattern = `duplicate:*:${farmId}:*`;
                const keys = await client.keys(pattern);
                if (keys.length > 0) {
                    await client.del(keys);
                    logger_1.default.info(`Cleared ${keys.length} cache entries for farm ${farmId}`);
                }
            }
            else {
                // Clear all duplicate detection cache
                const pattern = 'duplicate:*';
                const keys = await client.keys(pattern);
                if (keys.length > 0) {
                    await client.del(keys);
                    logger_1.default.info(`Cleared ${keys.length} duplicate detection cache entries`);
                }
            }
        }
        catch (error) {
            logger_1.default.error(`Error clearing cache`, {
                farmId,
                error: error instanceof Error ? error.message : String(error),
            });
        }
    }
    /**
     * Get cache statistics for monitoring
     */
    async getStats() {
        try {
            const client = await (0, redis_1.getRedisClient)();
            const keys = await client.keys('duplicate:*');
            return {
                totalDuplicateEntries: keys.length,
                redisConnected: true,
            };
        }
        catch (error) {
            logger_1.default.error(`Error getting cache stats`, {
                error: error instanceof Error ? error.message : String(error),
            });
            return {
                totalDuplicateEntries: 0,
                redisConnected: false,
            };
        }
    }
}
exports.DuplicateDetector = DuplicateDetector;
// Export singleton instance
exports.duplicateDetector = new DuplicateDetector();
//# sourceMappingURL=duplicate-detector.js.map