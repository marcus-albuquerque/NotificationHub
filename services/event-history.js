"use strict";
/**
 * NotificationHub - Event History Data Access Layer
 *
 * Provides data access methods for persisting and querying complete event pipeline records.
 * Maintains the audit trail of all events from reception through notification dispatch.
 *
 * Requirements: 11.1, 11.2, 11.3, 11.4, 11.5, 11.6, 17.1, 17.2, 17.3, 17.4
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.eventHistory = exports.EventHistory = void 0;
const database_1 = require("../config/database");
const uuid_1 = require("uuid");
/**
 * EventHistory Data Access Layer
 *
 * Manages persistence and retrieval of complete event pipeline records.
 * Each entry consolidates information from all pipeline stages with timestamps.
 */
class EventHistory {
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
    async save(entry) {
        const pool = (0, database_1.getPool)();
        const client = await pool.connect();
        try {
            // Generate ID if not provided
            const historyId = entry.id || (0, uuid_1.v4)();
            const query = `
        INSERT INTO event_history (
          history_id,
          event_id,
          farm_id,
          device_id,
          received_at,
          validation_status,
          validation_error,
          is_duplicate,
          previous_event_id,
          fired_rules,
          notifications,
          processed_at,
          processing_duration_ms
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        RETURNING *
      `;
            const result = await client.query(query, [
                historyId,
                entry.eventId,
                entry.farmId,
                entry.deviceId,
                entry.receivedAt,
                entry.validationStatus,
                entry.validationError || null,
                entry.isDuplicate,
                entry.previousEventId || null,
                JSON.stringify(entry.firedRules),
                JSON.stringify(entry.notifications),
                entry.processedAt,
                entry.processingDurationMs,
            ]);
            const row = result.rows[0];
            return this.mapRowToEntry(row);
        }
        catch (error) {
            throw new Error(`Failed to save event history entry: ${error instanceof Error ? error.message : String(error)}`);
        }
        finally {
            client.release();
        }
    }
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
    async getByEventId(eventId) {
        const pool = (0, database_1.getPool)();
        const client = await pool.connect();
        try {
            const query = `
        SELECT * FROM event_history
        WHERE event_id = $1
      `;
            const result = await client.query(query, [eventId]);
            if (result.rows.length === 0) {
                return null;
            }
            return this.mapRowToEntry(result.rows[0]);
        }
        catch (error) {
            throw new Error(`Failed to retrieve event history by eventId: ${error instanceof Error ? error.message : String(error)}`);
        }
        finally {
            client.release();
        }
    }
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
    async getByFarmId(farmId, limit = 20, offset = 0) {
        const pool = (0, database_1.getPool)();
        const client = await pool.connect();
        try {
            // Get total count
            const countQuery = `
        SELECT COUNT(*) as total FROM event_history
        WHERE farm_id = $1
      `;
            const countResult = await client.query(countQuery, [farmId]);
            const total = parseInt(countResult.rows[0].total, 10);
            // Get paginated results
            const query = `
        SELECT * FROM event_history
        WHERE farm_id = $1
        ORDER BY processed_at DESC
        LIMIT $2 OFFSET $3
      `;
            const result = await client.query(query, [farmId, limit, offset]);
            const entries = result.rows.map((row) => this.mapRowToEntry(row));
            return { entries, total };
        }
        catch (error) {
            throw new Error(`Failed to retrieve event history by farmId: ${error instanceof Error ? error.message : String(error)}`);
        }
        finally {
            client.release();
        }
    }
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
    async getByDeviceId(deviceId, limit = 20, offset = 0) {
        const pool = (0, database_1.getPool)();
        const client = await pool.connect();
        try {
            // Get total count
            const countQuery = `
        SELECT COUNT(*) as total FROM event_history
        WHERE device_id = $1
      `;
            const countResult = await client.query(countQuery, [deviceId]);
            const total = parseInt(countResult.rows[0].total, 10);
            // Get paginated results
            const query = `
        SELECT * FROM event_history
        WHERE device_id = $1
        ORDER BY processed_at DESC
        LIMIT $2 OFFSET $3
      `;
            const result = await client.query(query, [deviceId, limit, offset]);
            const entries = result.rows.map((row) => this.mapRowToEntry(row));
            return { entries, total };
        }
        catch (error) {
            throw new Error(`Failed to retrieve event history by deviceId: ${error instanceof Error ? error.message : String(error)}`);
        }
        finally {
            client.release();
        }
    }
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
    async getByDateRange(farmId, startDate, endDate, limit = 100, offset = 0) {
        const pool = (0, database_1.getPool)();
        const client = await pool.connect();
        try {
            // Validate dates
            const start = new Date(startDate);
            const end = new Date(endDate);
            if (isNaN(start.getTime()) || isNaN(end.getTime())) {
                throw new Error('Invalid date format. Expected ISO8601 format.');
            }
            if (start > end) {
                throw new Error('startDate must be before or equal to endDate');
            }
            // Get total count
            const countQuery = `
        SELECT COUNT(*) as total FROM event_history
        WHERE farm_id = $1
        AND processed_at >= $2
        AND processed_at <= $3
      `;
            const countResult = await client.query(countQuery, [farmId, startDate, endDate]);
            const total = parseInt(countResult.rows[0].total, 10);
            // Get paginated results
            const query = `
        SELECT * FROM event_history
        WHERE farm_id = $1
        AND processed_at >= $2
        AND processed_at <= $3
        ORDER BY processed_at DESC
        LIMIT $4 OFFSET $5
      `;
            const result = await client.query(query, [farmId, startDate, endDate, limit, offset]);
            const entries = result.rows.map((row) => this.mapRowToEntry(row));
            return { entries, total };
        }
        catch (error) {
            throw new Error(`Failed to retrieve event history by date range: ${error instanceof Error ? error.message : String(error)}`);
        }
        finally {
            client.release();
        }
    }
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
    async getByValidationStatus(farmId, status, limit = 20, offset = 0) {
        const pool = (0, database_1.getPool)();
        const client = await pool.connect();
        try {
            // Validate status parameter
            if (status !== 'valid' && status !== 'rejected') {
                throw new Error('Status must be "valid" or "rejected"');
            }
            // Get total count
            const countQuery = `
        SELECT COUNT(*) as total FROM event_history
        WHERE farm_id = $1
        AND validation_status = $2
      `;
            const countResult = await client.query(countQuery, [farmId, status]);
            const total = parseInt(countResult.rows[0].total, 10);
            // Get paginated results
            const query = `
        SELECT * FROM event_history
        WHERE farm_id = $1
        AND validation_status = $2
        ORDER BY processed_at DESC
        LIMIT $3 OFFSET $4
      `;
            const result = await client.query(query, [farmId, status, limit, offset]);
            const entries = result.rows.map((row) => this.mapRowToEntry(row));
            return { entries, total };
        }
        catch (error) {
            throw new Error(`Failed to retrieve event history by validation status: ${error instanceof Error ? error.message : String(error)}`);
        }
        finally {
            client.release();
        }
    }
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
    async getDuplicates(farmId, limit = 20, offset = 0) {
        const pool = (0, database_1.getPool)();
        const client = await pool.connect();
        try {
            // Get total count
            const countQuery = `
        SELECT COUNT(*) as total FROM event_history
        WHERE farm_id = $1
        AND is_duplicate = true
      `;
            const countResult = await client.query(countQuery, [farmId]);
            const total = parseInt(countResult.rows[0].total, 10);
            // Get paginated results
            const query = `
        SELECT * FROM event_history
        WHERE farm_id = $1
        AND is_duplicate = true
        ORDER BY processed_at DESC
        LIMIT $2 OFFSET $3
      `;
            const result = await client.query(query, [farmId, limit, offset]);
            const entries = result.rows.map((row) => this.mapRowToEntry(row));
            return { entries, total };
        }
        catch (error) {
            throw new Error(`Failed to retrieve duplicate events: ${error instanceof Error ? error.message : String(error)}`);
        }
        finally {
            client.release();
        }
    }
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
    mapRowToEntry(row) {
        return {
            id: row.history_id,
            eventId: row.event_id,
            farmId: row.farm_id,
            deviceId: row.device_id,
            receivedAt: row.received_at,
            validationStatus: row.validation_status,
            validationError: row.validation_error,
            isDuplicate: row.is_duplicate,
            previousEventId: row.previous_event_id,
            firedRules: Array.isArray(row.fired_rules)
                ? row.fired_rules
                : JSON.parse(row.fired_rules || '[]'),
            notifications: Array.isArray(row.notifications)
                ? row.notifications
                : JSON.parse(row.notifications || '[]'),
            processedAt: row.processed_at,
            processingDurationMs: parseInt(row.processing_duration_ms, 10),
        };
    }
}
exports.EventHistory = EventHistory;
// Export singleton instance
exports.eventHistory = new EventHistory();
//# sourceMappingURL=event-history.js.map