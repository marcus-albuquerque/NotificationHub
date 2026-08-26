/**
 * NotificationHub - Event Receiver Service
 *
 * Handles HTTP event reception and persistence
 * Validates basic payload structure and persists events to database
 */

import { Event, SensorType } from '../types';
import { insertOne } from '../config/database';

/**
 * Event Receiver Service
 *
 * Responsible for:
 * - Validating basic payload structure (not empty, valid JSON)
 * - Persisting events to PostgreSQL with receivedAt timestamp
 * - Returning appropriate HTTP responses
 */
export class EventReceiver {
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
  async receiveEvent(payload: any): Promise<{
    success: boolean;
    eventId?: string;
    error?: string;
    statusCode: number;
  }> {
    const startTime = Date.now();

    try {
      // Check if payload exists and is not empty
      if (!payload || typeof payload !== 'object' || Object.keys(payload).length === 0) {
        return {
          success: false,
          error: 'Payload is empty or invalid',
          statusCode: 400,
        };
      }

      // Validate required fields exist
      const requiredFields = [
        'eventId',
        'farmId',
        'deviceId',
        'sensorType',
        'value',
        'unit',
        'timestamp',
      ];
      const missingFields = requiredFields.filter((field) => !(field in payload));

      if (missingFields.length > 0) {
        return {
          success: false,
          error: `Missing required fields: ${missingFields.join(', ')}`,
          statusCode: 400,
        };
      }

      // Basic type validation for required fields
      if (
        typeof payload.eventId !== 'string' ||
        typeof payload.farmId !== 'string' ||
        typeof payload.deviceId !== 'string' ||
        typeof payload.sensorType !== 'string' ||
        typeof payload.unit !== 'string' ||
        typeof payload.timestamp !== 'string'
      ) {
        return {
          success: false,
          error: 'Invalid field types in payload',
          statusCode: 400,
        };
      }

      // Extract event data
      const event: Event = {
        eventId: payload.eventId,
        farmId: payload.farmId,
        deviceId: payload.deviceId,
        sensorType: payload.sensorType as SensorType,
        value: payload.value, // Can be number or string
        unit: payload.unit,
        timestamp: payload.timestamp,
        receivedAt: new Date().toISOString(),
      };

      // Persist event to database
      const persistedEvent = await this.persistEvent(event);

      const processingTime = Date.now() - startTime;
      console.log(`Event ${event.eventId} received and persisted in ${processingTime}ms`);

      return {
        success: true,
        eventId: persistedEvent.event_id,
        statusCode: 200,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('Error receiving event:', errorMessage);
      return {
        success: false,
        error: `Internal server error: ${errorMessage}`,
        statusCode: 500,
      };
    }
  }

  /**
   * Persist event to PostgreSQL database
   *
   * @param event - The event to persist
   * @returns The persisted event row
   */
  private async persistEvent(event: Event): Promise<any> {
    const query = `
      INSERT INTO events (event_id, farm_id, device_id, sensor_type, value, unit, timestamp, received_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING event_id, farm_id, device_id, sensor_type, value, unit, timestamp, received_at
    `;

    const params = [
      event.eventId,
      event.farmId,
      event.deviceId,
      event.sensorType,
      String(event.value),
      event.unit,
      event.timestamp,
      event.receivedAt,
    ];

    const persistedEvent = await insertOne(query, params);
    return persistedEvent;
  }
}

/**
 * Create a singleton instance of EventReceiver
 */
export const eventReceiver = new EventReceiver();
