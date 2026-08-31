/**
 * NotificationHub - Event Receiver Service
 *
 * Handles HTTP event reception and persistence
 * Validates basic payload structure and persists events to database
 */
/**
 * Event Receiver Service
 *
 * Responsible for:
 * - Validating basic payload structure (not empty, valid JSON)
 * - Persisting events to PostgreSQL with receivedAt timestamp
 * - Returning appropriate HTTP responses
 */
export declare class EventReceiver {
    /**
     * Receive and persist an event from the API
     *
     * Validates basic payload structure:
     * - Payload is not null or undefined
     * - Payload has required fields: eventId, farmId, deviceId, sensorType, value, unit, timestamp
     *
     * @param payload - The raw event payload from the request
     * @returns ApiResponse with eventId on success, error message on failure
     */
    receiveEvent(payload: any): Promise<{
        success: boolean;
        eventId?: string;
        error?: string;
        statusCode: number;
    }>;
    /**
     * Persist event to PostgreSQL database
     *
     * @param event - The event to persist
     * @returns The persisted event row
     */
    private persistEvent;
}
/**
 * Create a singleton instance of EventReceiver
 */
export declare const eventReceiver: EventReceiver;
//# sourceMappingURL=event-receiver.d.ts.map