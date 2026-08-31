/**
 * Duplicate Detector Component
 * Identifies and flags duplicate events within a 5-minute window using Redis cache
 *
 * A duplicate event is defined as: same farmId, deviceId, sensorType, and value
 * within 5 minutes of a previous event.
 */
export interface DuplicateDetectionResult {
    isDuplicate: boolean;
    previousEventId?: string;
    cachedAt?: string;
}
/**
 * DuplicateDetector class handles duplicate event detection using Redis cache
 */
export declare class DuplicateDetector {
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
    detect(farmId: string, deviceId: string, sensorType: string, value: number | string, eventId: string): Promise<DuplicateDetectionResult>;
    /**
     * Clear duplicate detection cache for testing purposes
     * @param farmId - The farm identifier (optional - clears all if not provided)
     */
    clearCache(farmId?: string): Promise<void>;
    /**
     * Get cache statistics for monitoring
     */
    getStats(): Promise<{
        totalDuplicateEntries: number;
        redisConnected: boolean;
    }>;
}
export declare const duplicateDetector: DuplicateDetector;
//# sourceMappingURL=duplicate-detector.d.ts.map