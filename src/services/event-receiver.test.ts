/**
 * NotificationHub - Event Receiver Tests
 * 
 * Tests for the Event Receiver service
 * Validates: Requirements 1.1, 1.2, 1.4
 */

import * as db from '../config/database';
import { EventReceiver } from './event-receiver';
import { v4 as uuidv4 } from 'uuid';

// Mock database module
jest.mock('../config/database', () => ({
  insertOne: jest.fn(),
}));

describe('EventReceiver', () => {
  let receiver: EventReceiver;

  beforeEach(() => {
    receiver = new EventReceiver();
    jest.clearAllMocks();
  });

  describe('receiveEvent - Basic Validation', () => {
    test('should reject empty payload', async () => {
      const result = await receiver.receiveEvent({});
      expect(result.success).toBe(false);
      expect(result.statusCode).toBe(400);
      expect(result.error).toContain('empty or invalid');
    });

    test('should reject null payload', async () => {
      const result = await receiver.receiveEvent(null);
      expect(result.success).toBe(false);
      expect(result.statusCode).toBe(400);
      expect(result.error).toContain('empty or invalid');
    });

    test('should reject undefined payload', async () => {
      const result = await receiver.receiveEvent(undefined);
      expect(result.success).toBe(false);
      expect(result.statusCode).toBe(400);
    });

    test('should reject payload that is not an object', async () => {
      const result = await receiver.receiveEvent('invalid');
      expect(result.success).toBe(false);
      expect(result.statusCode).toBe(400);
    });
  });

  describe('receiveEvent - Required Fields Validation', () => {
    test('should reject payload missing eventId', async () => {
      const payload = {
        farmId: 'farm-001',
        deviceId: 'device-001',
        sensorType: 'AIR_TEMPERATURE',
        value: 25.5,
        unit: '°C',
        timestamp: new Date().toISOString(),
      };
      const result = await receiver.receiveEvent(payload);
      expect(result.success).toBe(false);
      expect(result.statusCode).toBe(400);
      expect(result.error).toContain('Missing required fields');
      expect(result.error).toContain('eventId');
    });

    test('should reject payload missing farmId', async () => {
      const payload = {
        eventId: uuidv4(),
        deviceId: 'device-001',
        sensorType: 'AIR_TEMPERATURE',
        value: 25.5,
        unit: '°C',
        timestamp: new Date().toISOString(),
      };
      const result = await receiver.receiveEvent(payload);
      expect(result.success).toBe(false);
      expect(result.statusCode).toBe(400);
      expect(result.error).toContain('Missing required fields');
    });

    test('should reject payload missing deviceId', async () => {
      const payload = {
        eventId: uuidv4(),
        farmId: 'farm-001',
        sensorType: 'AIR_TEMPERATURE',
        value: 25.5,
        unit: '°C',
        timestamp: new Date().toISOString(),
      };
      const result = await receiver.receiveEvent(payload);
      expect(result.success).toBe(false);
      expect(result.statusCode).toBe(400);
      expect(result.error).toContain('Missing required fields');
    });

    test('should reject payload missing sensorType', async () => {
      const payload = {
        eventId: uuidv4(),
        farmId: 'farm-001',
        deviceId: 'device-001',
        value: 25.5,
        unit: '°C',
        timestamp: new Date().toISOString(),
      };
      const result = await receiver.receiveEvent(payload);
      expect(result.success).toBe(false);
      expect(result.statusCode).toBe(400);
      expect(result.error).toContain('Missing required fields');
    });

    test('should reject payload missing value', async () => {
      const payload = {
        eventId: uuidv4(),
        farmId: 'farm-001',
        deviceId: 'device-001',
        sensorType: 'AIR_TEMPERATURE',
        unit: '°C',
        timestamp: new Date().toISOString(),
      };
      const result = await receiver.receiveEvent(payload);
      expect(result.success).toBe(false);
      expect(result.statusCode).toBe(400);
      expect(result.error).toContain('Missing required fields');
    });

    test('should reject payload missing unit', async () => {
      const payload = {
        eventId: uuidv4(),
        farmId: 'farm-001',
        deviceId: 'device-001',
        sensorType: 'AIR_TEMPERATURE',
        value: 25.5,
        timestamp: new Date().toISOString(),
      };
      const result = await receiver.receiveEvent(payload);
      expect(result.success).toBe(false);
      expect(result.statusCode).toBe(400);
      expect(result.error).toContain('Missing required fields');
    });

    test('should reject payload missing timestamp', async () => {
      const payload = {
        eventId: uuidv4(),
        farmId: 'farm-001',
        deviceId: 'device-001',
        sensorType: 'AIR_TEMPERATURE',
        value: 25.5,
        unit: '°C',
      };
      const result = await receiver.receiveEvent(payload);
      expect(result.success).toBe(false);
      expect(result.statusCode).toBe(400);
      expect(result.error).toContain('Missing required fields');
    });
  });

  describe('receiveEvent - Field Type Validation', () => {
    test('should reject payload where eventId is not a string', async () => {
      const payload = {
        eventId: 123,
        farmId: 'farm-001',
        deviceId: 'device-001',
        sensorType: 'AIR_TEMPERATURE',
        value: 25.5,
        unit: '°C',
        timestamp: new Date().toISOString(),
      };
      const result = await receiver.receiveEvent(payload);
      expect(result.success).toBe(false);
      expect(result.statusCode).toBe(400);
      expect(result.error).toContain('Invalid field types');
    });

    test('should reject payload where farmId is not a string', async () => {
      const payload = {
        eventId: uuidv4(),
        farmId: 123,
        deviceId: 'device-001',
        sensorType: 'AIR_TEMPERATURE',
        value: 25.5,
        unit: '°C',
        timestamp: new Date().toISOString(),
      };
      const result = await receiver.receiveEvent(payload);
      expect(result.success).toBe(false);
      expect(result.statusCode).toBe(400);
    });

    test('should reject payload where sensorType is not a string', async () => {
      const payload = {
        eventId: uuidv4(),
        farmId: 'farm-001',
        deviceId: 'device-001',
        sensorType: 123,
        value: 25.5,
        unit: '°C',
        timestamp: new Date().toISOString(),
      };
      const result = await receiver.receiveEvent(payload);
      expect(result.success).toBe(false);
      expect(result.statusCode).toBe(400);
    });

    test('should reject payload where unit is not a string', async () => {
      const payload = {
        eventId: uuidv4(),
        farmId: 'farm-001',
        deviceId: 'device-001',
        sensorType: 'AIR_TEMPERATURE',
        value: 25.5,
        unit: 123,
        timestamp: new Date().toISOString(),
      };
      const result = await receiver.receiveEvent(payload);
      expect(result.success).toBe(false);
      expect(result.statusCode).toBe(400);
    });

    test('should reject payload where timestamp is not a string', async () => {
      const payload = {
        eventId: uuidv4(),
        farmId: 'farm-001',
        deviceId: 'device-001',
        sensorType: 'AIR_TEMPERATURE',
        value: 25.5,
        unit: '°C',
        timestamp: Date.now(),
      };
      const result = await receiver.receiveEvent(payload);
      expect(result.success).toBe(false);
      expect(result.statusCode).toBe(400);
    });
  });

  describe('receiveEvent - Successful Reception', () => {
    test('should accept valid event with numeric value', async () => {
      const eventId = uuidv4();
      const payload = {
        eventId,
        farmId: 'farm-001',
        deviceId: 'device-001',
        sensorType: 'AIR_TEMPERATURE',
        value: 25.5,
        unit: '°C',
        timestamp: new Date().toISOString(),
      };

      (db.insertOne as jest.Mock).mockResolvedValue({
        event_id: eventId,
        farm_id: 'farm-001',
        device_id: 'device-001',
        sensor_type: 'AIR_TEMPERATURE',
        value: '25.5',
        unit: '°C',
        timestamp: payload.timestamp,
        received_at: new Date().toISOString(),
      });

      const result = await receiver.receiveEvent(payload);
      expect(result.success).toBe(true);
      expect(result.statusCode).toBe(200);
      expect(result.eventId).toBe(eventId);
    });

    test('should accept valid event with string value', async () => {
      const eventId = uuidv4();
      const payload = {
        eventId,
        farmId: 'farm-001',
        deviceId: 'device-001',
        sensorType: 'EQUIPMENT_STATUS',
        value: 'OK',
        unit: 'status',
        timestamp: new Date().toISOString(),
      };

      (db.insertOne as jest.Mock).mockResolvedValue({
        event_id: eventId,
        farm_id: 'farm-001',
        device_id: 'device-001',
        sensor_type: 'EQUIPMENT_STATUS',
        value: 'OK',
        unit: 'status',
        timestamp: payload.timestamp,
        received_at: new Date().toISOString(),
      });

      const result = await receiver.receiveEvent(payload);
      expect(result.success).toBe(true);
      expect(result.statusCode).toBe(200);
      expect(result.eventId).toBe(eventId);
    });

    test('should persist event to database', async () => {
      const eventId = uuidv4();
      const payload = {
        eventId,
        farmId: 'farm-001',
        deviceId: 'device-001',
        sensorType: 'AIR_TEMPERATURE',
        value: 25.5,
        unit: '°C',
        timestamp: new Date().toISOString(),
      };

      (db.insertOne as jest.Mock).mockResolvedValue({
        event_id: eventId,
        farm_id: 'farm-001',
        device_id: 'device-001',
        sensor_type: 'AIR_TEMPERATURE',
        value: '25.5',
        unit: '°C',
        timestamp: payload.timestamp,
        received_at: new Date().toISOString(),
      });

      await receiver.receiveEvent(payload);

      expect(db.insertOne).toHaveBeenCalled();
      const callArgs = (db.insertOne as jest.Mock).mock.calls[0];
      expect(callArgs[0]).toContain('INSERT INTO events');
      expect(callArgs[1]).toContain(eventId);
      expect(callArgs[1]).toContain('farm-001');
      expect(callArgs[1]).toContain('device-001');
    });

    test('should include receivedAt timestamp in persisted event', async () => {
      const eventId = uuidv4();
      const payload = {
        eventId,
        farmId: 'farm-001',
        deviceId: 'device-001',
        sensorType: 'AIR_TEMPERATURE',
        value: 25.5,
        unit: '°C',
        timestamp: new Date(Date.now() - 5000).toISOString(), // 5 seconds ago
      };

      (db.insertOne as jest.Mock).mockResolvedValue({
        event_id: eventId,
        farm_id: 'farm-001',
        device_id: 'device-001',
        sensor_type: 'AIR_TEMPERATURE',
        value: '25.5',
        unit: '°C',
        timestamp: payload.timestamp,
        received_at: new Date().toISOString(),
      });

      await receiver.receiveEvent(payload);

      const callArgs = (db.insertOne as jest.Mock).mock.calls[0];
      const receivedAtParam = callArgs[1][7]; // received_at is the 8th parameter
      
      // Verify receivedAt is more recent than event timestamp
      const receivedAt = new Date(receivedAtParam);
      const eventTimestamp = new Date(payload.timestamp);
      expect(receivedAt.getTime()).toBeGreaterThan(eventTimestamp.getTime());
    });
  });

  describe('receiveEvent - Error Handling', () => {
    test('should handle database errors gracefully', async () => {
      const payload = {
        eventId: uuidv4(),
        farmId: 'farm-001',
        deviceId: 'device-001',
        sensorType: 'AIR_TEMPERATURE',
        value: 25.5,
        unit: '°C',
        timestamp: new Date().toISOString(),
      };

      (db.insertOne as jest.Mock).mockRejectedValue(new Error('Database connection failed'));

      const result = await receiver.receiveEvent(payload);
      expect(result.success).toBe(false);
      expect(result.statusCode).toBe(500);
      expect(result.error).toContain('Internal server error');
    });

    test('should return status 200 with eventId on successful persistence', async () => {
      const eventId = uuidv4();
      const payload = {
        eventId,
        farmId: 'farm-001',
        deviceId: 'device-001',
        sensorType: 'AIR_TEMPERATURE',
        value: 25.5,
        unit: '°C',
        timestamp: new Date().toISOString(),
      };

      (db.insertOne as jest.Mock).mockResolvedValue({
        event_id: eventId,
        farm_id: 'farm-001',
        device_id: 'device-001',
        sensor_type: 'AIR_TEMPERATURE',
        value: '25.5',
        unit: '°C',
        timestamp: payload.timestamp,
        received_at: new Date().toISOString(),
      });

      const result = await receiver.receiveEvent(payload);
      expect(result.statusCode).toBe(200);
      expect(result.success).toBe(true);
      expect(result.eventId).toBeDefined();
    });

    test('should return status 400 on validation failure', async () => {
      const result = await receiver.receiveEvent(null);
      expect(result.statusCode).toBe(400);
      expect(result.success).toBe(false);
    });
  });
});
