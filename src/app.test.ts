/**
 * NotificationHub - Express App Tests
 *
 * Tests for the Express API endpoints
 * Validates: Requirements 1.1, 1.2, 1.4
 */

import request from 'supertest';
import { createApp } from './app';
import * as db from './config/database';
import { v4 as uuidv4 } from 'uuid';
import { Express } from 'express';

// Mock database module
jest.mock('./config/database', () => ({
  insertOne: jest.fn(),
  query: jest.fn(),
  queryOne: jest.fn(),
  getConnection: jest.fn(),
}));

describe('Express App - API Endpoints', () => {
  let app: Express;

  beforeEach(() => {
    app = createApp();
    jest.clearAllMocks();
  });

  describe('GET /health', () => {
    test('should return 200 with status ok', async () => {
      const response = await request(app).get('/health');
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('ok');
      expect(response.body.timestamp).toBeDefined();
    });
  });

  describe('POST /api/events', () => {
    describe('Success Cases', () => {
      test('should accept valid event and return 200 with eventId', async () => {
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

        const response = await request(app).post('/api/events').send(payload);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data.eventId).toBe(eventId);
        expect(response.body.timestamp).toBeDefined();
      });

      test('should accept event with string value', async () => {
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

        const response = await request(app).post('/api/events').send(payload);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data.eventId).toBe(eventId);
      });

      test('should handle different sensor types', async () => {
        const sensorTypes = [
          'AIR_TEMPERATURE',
          'AIR_HUMIDITY',
          'SOIL_MOISTURE',
          'WATER_RESERVOIR_LEVEL',
          'SILO_LEVEL',
          'EQUIPMENT_STATUS',
        ];

        for (const sensorType of sensorTypes) {
          const eventId = uuidv4();
          const value = sensorType === 'EQUIPMENT_STATUS' ? 'OK' : 50;
          const payload = {
            eventId,
            farmId: 'farm-001',
            deviceId: 'device-001',
            sensorType,
            value,
            unit: sensorType === 'EQUIPMENT_STATUS' ? 'status' : '%',
            timestamp: new Date().toISOString(),
          };

          (db.insertOne as jest.Mock).mockResolvedValue({
            event_id: eventId,
            farm_id: 'farm-001',
            device_id: 'device-001',
            sensor_type: sensorType,
            value: String(value),
            unit: payload.unit,
            timestamp: payload.timestamp,
            received_at: new Date().toISOString(),
          });

          const response = await request(app).post('/api/events').send(payload);

          expect(response.status).toBe(200);
          expect(response.body.success).toBe(true);
        }
      });
    });

    describe('Empty Payload', () => {
      test('should reject empty object with 400', async () => {
        const response = await request(app).post('/api/events').send({});
        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
        expect(response.body.error).toContain('empty or invalid');
      });

      test('should reject empty string with 400', async () => {
        const response = await request(app)
          .post('/api/events')
          .set('Content-Type', 'application/json')
          .send('');
        expect(response.status).toBeGreaterThanOrEqual(400);
      });

      test('should reject null payload with 400', async () => {
        const response = await request(app)
          .post('/api/events')
          .send(null as any);
        expect(response.status).toBe(400);
      });
    });

    describe('Missing Required Fields', () => {
      test('should reject payload missing eventId', async () => {
        const payload = {
          farmId: 'farm-001',
          deviceId: 'device-001',
          sensorType: 'AIR_TEMPERATURE',
          value: 25.5,
          unit: '°C',
          timestamp: new Date().toISOString(),
        };

        const response = await request(app).post('/api/events').send(payload);
        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
        expect(response.body.error).toContain('Missing required fields');
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

        const response = await request(app).post('/api/events').send(payload);
        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
      });

      test('should reject payload missing multiple fields', async () => {
        const payload = {
          eventId: uuidv4(),
          farmId: 'farm-001',
          // missing deviceId, sensorType, value, unit, timestamp
        };

        const response = await request(app).post('/api/events').send(payload);
        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
        expect(response.body.error).toContain('Missing required fields');
      });
    });

    describe('Invalid Field Types', () => {
      test('should reject eventId that is not a string', async () => {
        const payload = {
          eventId: 123,
          farmId: 'farm-001',
          deviceId: 'device-001',
          sensorType: 'AIR_TEMPERATURE',
          value: 25.5,
          unit: '°C',
          timestamp: new Date().toISOString(),
        };

        const response = await request(app).post('/api/events').send(payload);
        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
      });

      test('should reject sensorType that is not a string', async () => {
        const payload = {
          eventId: uuidv4(),
          farmId: 'farm-001',
          deviceId: 'device-001',
          sensorType: 123,
          value: 25.5,
          unit: '°C',
          timestamp: new Date().toISOString(),
        };

        const response = await request(app).post('/api/events').send(payload);
        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
      });

      test('should reject unit that is not a string', async () => {
        const payload = {
          eventId: uuidv4(),
          farmId: 'farm-001',
          deviceId: 'device-001',
          sensorType: 'AIR_TEMPERATURE',
          value: 25.5,
          unit: 123,
          timestamp: new Date().toISOString(),
        };

        const response = await request(app).post('/api/events').send(payload);
        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
      });

      test('should reject timestamp that is not a string', async () => {
        const payload = {
          eventId: uuidv4(),
          farmId: 'farm-001',
          deviceId: 'device-001',
          sensorType: 'AIR_TEMPERATURE',
          value: 25.5,
          unit: '°C',
          timestamp: Date.now(),
        };

        const response = await request(app).post('/api/events').send(payload);
        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
      });
    });

    describe('Response Format', () => {
      test('should return proper response structure on success', async () => {
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

        const response = await request(app).post('/api/events').send(payload);

        expect(response.body).toHaveProperty('success');
        expect(response.body).toHaveProperty('data');
        expect(response.body).toHaveProperty('timestamp');
        expect(response.body.data).toHaveProperty('eventId');
      });

      test('should return proper error response on failure', async () => {
        const response = await request(app).post('/api/events').send({});

        expect(response.body).toHaveProperty('success');
        expect(response.body).toHaveProperty('error');
        expect(response.body).toHaveProperty('timestamp');
        expect(response.body.success).toBe(false);
      });
    });

    describe('Content Type Handling', () => {
      test('should handle JSON content type correctly', async () => {
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

        const response = await request(app)
          .post('/api/events')
          .set('Content-Type', 'application/json')
          .send(payload);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
      });
    });
  });

  describe('404 Not Found', () => {
    test('should return 404 for non-existent route', async () => {
      const response = await request(app).get('/api/non-existent');
      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Route not found');
    });
  });
});
