/**
 * Cache Key Generation Utility
 * Generates consistent cache keys for duplicate detection
 */
/**
 * Generate a cache key for duplicate detection
 * Key is based on: farmId + deviceId + sensorType + value
 *
 * @param farmId - The farm identifier
 * @param deviceId - The device identifier
 * @param sensorType - The sensor type
 * @param value - The sensor value (numeric or string)
 * @returns A consistent cache key string
 */
export declare function getCacheKey(farmId: string, deviceId: string, sensorType: string, value: number | string): string;
/**
 * Generate a cache key with full component visibility (for debugging)
 *
 * @param farmId - The farm identifier
 * @param deviceId - The device identifier
 * @param sensorType - The sensor type
 * @param value - The sensor value
 * @returns A human-readable cache key string
 */
export declare function getCacheKeyDebug(farmId: string, deviceId: string, sensorType: string, value: number | string): string;
//# sourceMappingURL=cache-key.d.ts.map