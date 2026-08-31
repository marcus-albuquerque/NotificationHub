/**
 * NotificationHub - Event History Data Access Layer
 *
 * Provides data access methods for persisting and querying complete event pipeline records.
 * Maintains the audit trail of all events from reception through notification dispatch.
 *
 * Requirements: 11.1, 11.2, 11.3, 11.4, 11.5, 11.6, 17.1, 17.2, 17.3, 17.4
 */
import { EventHistoryEntry } from '../types/index';
/**
 * EventHistory Data Access Layer
 *
 * Manages persistence and retrieval of complete event pipeline records.
 * Each entry consolidates information from all pipeline stages with timestamps.
 */
export declare class EventHistory {
    /**
     * Save an event history entry to the database
     *
     * Persists a complete EventHistoryEntry that links all pipeline stages:
     * - eventId, farmId, deviceId
     * - receivedAt timestamp
     * - validationStatus and validationError
     * - isDuplicate flag and previousEventId
     * - firedRules array with ruleId, ruleName, firedAt
     * - notifications array with notificationId, message, generatedAt, dispatchStatus, dispatchError
     * - processedAt and processingDurationMs
     *
     * Requirement 11.1: EventHistory SHALL register each event received with status
     * Requirement 11.5: EventHistory SHALL create consolidated entry relating all stages
     *
     * @param entry - The EventHistoryEntry to persist
     * @returns Promise resolving to the saved entry with database confirmation
     * @throws Error if database operation fails
     */
    save(entry: EventHistoryEntry): Promise<EventHistoryEntry>;
    /**
     * Retrieve event history entry by eventId
     *
     * Fetches the complete consolidated entry for a single event,
     * showing all pipeline stages and their results.
     *
     * Requirement 11.1: EventHistory SHALL be consultable by eventId
     * Requirement 17.2: EventHistory SHALL be consultable via API
     *
     * @param eventId - The unique event identifier
     * @returns Promise resolving to the EventHistoryEntry or null if not found
     * @throws Error if database operation fails
     */
    getByEventId(eventId: string): Promise<EventHistoryEntry | null>;
    /**
     * Retrieve paginated farm events
     *
     * Fetches all events for a specific farm with pagination support.
     * Results are ordered by processedAt timestamp (descending - most recent first).
     *
     * Requirement 11.2: EventHistory SHALL register each rule dispatched with timestamp
     * Requirement 11.3: EventHistory SHALL register each notification generated
     * Requirement 17.2: EventHistory SHALL be consultable via API
     *
     * @param farmId - The farm identifier
     * @param limit - Number of records per page (default: 20)
     * @param offset - Number of records to skip (default: 0)
     * @returns Promise resolving to array of EventHistoryEntries and total count
     * @throws Error if database operation fails
     */
    getByFarmId(farmId: string, limit?: number, offset?: number): Promise<{
        entries: EventHistoryEntry[];
        total: number;
    }>;
    /**
     * Retrieve paginated device events
     *
     * Fetches all events from a specific device with pagination support.
     * Results are ordered by processedAt timestamp (descending - most recent first).
     *
     * Requirement 11.2: EventHistory SHALL register each rule dispatched with timestamp
     * Requirement 11.3: EventHistory SHALL register each notification generated
     * Requirement 17.2: EventHistory SHALL be consultable via API
     *
     * @param deviceId - The device identifier
     * @param limit - Number of records per page (default: 20)
     * @param offset - Number of records to skip (default: 0)
     * @returns Promise resolving to array of EventHistoryEntries and total count
     * @throws Error if database operation fails
     */
    getByDeviceId(deviceId: string, limit?: number, offset?: number): Promise<{
        entries: EventHistoryEntry[];
        total: number;
    }>;
    /**
     * Retrieve events within a date/time range for a specific farm
     *
     * Fetches all events for a farm within a specified time window.
     * Results are ordered by processedAt timestamp (descending - most recent first).
     * Useful for auditing and analysis of events during specific periods.
     *
     * Requirement 11.6: EventHistory SHALL be persistently queryable
     * Requirement 17.2: EventHistory SHALL be consultable via API
     * Requirement 17.4: EventHistory SHALL be queried by period of time
     *
     * @param farmId - The farm identifier
     * @param startDate - ISO8601 datetime string for range start (inclusive)
     * @param endDate - ISO8601 datetime string for range end (inclusive)
     * @param limit - Number of records per page (default: 100)
     * @param offset - Number of records to skip (default: 0)
     * @returns Promise resolving to array of EventHistoryEntries and total count
     * @throws Error if database operation fails or dates are invalid
     */
    getByDateRange(farmId: string, startDate: string, endDate: string, limit?: number, offset?: number): Promise<{
        entries: EventHistoryEntry[];
        total: number;
    }>;
    /**
     * Retrieve events by validation status
     *
     * Fetches events filtered by their validation status (valid or rejected).
     * Useful for finding rejected events to debug validation issues.
     *
     * Requirement 11.1: EventHistory SHALL register each event received with status
     * Requirement 17.2: EventHistory SHALL be consultable via API
     *
     * @param farmId - The farm identifier
     * @param status - Validation status filter ('valid' or 'rejected')
     * @param limit - Number of records per page (default: 20)
     * @param offset - Number of records to skip (default: 0)
     * @returns Promise resolving to array of EventHistoryEntries and total count
     * @throws Error if database operation fails
     */
    getByValidationStatus(farmId: string, status: 'valid' | 'rejected', limit?: number, offset?: number): Promise<{
        entries: EventHistoryEntry[];
        total: number;
    }>;
    /**
     * Retrieve duplicate events
     *
     * Fetches all events that were detected as duplicates for a specific farm.
     * Useful for auditing and understanding duplicate patterns.
     *
     * Requirement 3.2: DuplicateDetector SHALL discard and log duplicate events
     * Requirement 17.2: EventHistory SHALL be consultable via API
     *
     * @param farmId - The farm identifier
     * @param limit - Number of records per page (default: 20)
     * @param offset - Number of records to skip (default: 0)
     * @returns Promise resolving to array of duplicate EventHistoryEntries and total count
     * @throws Error if database operation fails
     */
    getDuplicates(farmId: string, limit?: number, offset?: number): Promise<{
        entries: EventHistoryEntry[];
        total: number;
    }>;
    /**
     * Map database row to EventHistoryEntry object
     *
     * Transforms raw database row into a strongly-typed EventHistoryEntry,
     * parsing JSON fields and converting timestamp strings.
     *
     * @private
     * @param row - Raw database row from event_history table
     * @returns Parsed EventHistoryEntry object
     */
    private mapRowToEntry;
}
export declare const eventHistory: EventHistory;
//# sourceMappingURL=event-history.d.ts.map