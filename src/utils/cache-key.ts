/**
 * Cache Key Generation Utility
 * Generates consistent cache keys for duplicate detection
 */

import crypto from 'crypto';

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
export function getCacheKey(
  farmId: string,
  deviceId: string,
  sensorType: string,
  value: number | string
): string {
  // Create a normalized key string from the components
  const keyComponents = `${farmId}:${deviceId}:${sensorType}:${String(value)}`;

  // Hash the key components for a shorter, consistent key
  // Using SHA256 to ensure consistency across runs and prevent key collisions
  const hash = crypto.createHash('sha256').update(keyComponents).digest('hex');

  // Return a cache key with the full components for debugging and a hash for compactness
  return `duplicate:${hash}`;
}

/**
 * Generate a cache key with full component visibility (for debugging)
 * 
 * @param farmId - The farm identifier
 * @param deviceId - The device identifier
 * @param sensorType - The sensor type
 * @param value - The sensor value
 * @returns A human-readable cache key string
 */
export function getCacheKeyDebug(
  farmId: string,
  deviceId: string,
  sensorType: string,
  value: number | string
): string {
  return `duplicate:${farmId}:${deviceId}:${sensorType}:${String(value)}`;
}
