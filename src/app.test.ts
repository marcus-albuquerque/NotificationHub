/**
 * NotificationHub - Express App Tests
 *
 * Tests for the Express API endpoints
 * Validates: Requirements 1.1, 1.2, 1.4, 18.1, 18.2, 18.3, 18.4, 18.5
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
  getPool: jest.fn(),
}));

describe('Express App - API Endpoints', () => {
  let app: Express;
  let mockPool: any;

  beforeEach(() => {
    app = createApp();
    mockPool = {
      query: jest.fn(),
    };
    (db.getPool as jest.Mock).mockReturnValue(mockPool);
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

  describe('POST /api/farms', () => {
    describe('Success Cases', () => {
      test('should create farm with valid data and return 201', async () => {
        const payload = {
          farmId: 'farm-001',
          name: 'Boa Esperança',
          producerId: 'producer-001',
        };

        // Mock producer lookup (succeeds)
        mockPool.query
          .mockResolvedValueOnce({ rows: [{ producer_id: 'producer-001', name: 'João Silva' }] })
          // Mock farm existence check (does not exist)
          .mockResolvedValueOnce({ rows: [] })
          // Mock farm insert
          .mockResolvedValueOnce({
            rows: [
              {
                farm_id: 'farm-001',
                name: 'Boa Esperança',
                producer_id: 'producer-001',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              },
            ],
          });

        const response = await request(app).post('/api/farms').send(payload);

        expect(response.status).toBe(201);
        expect(response.body.success).toBe(true);
        expect(response.body.data.farm_id).toBe('farm-001');
        expect(response.body.data.name).toBe('Boa Esperança');
        expect(response.body.data.producer_id).toBe('producer-001');
        expect(response.body.timestamp).toBeDefined();
      });
    });

    describe('Validation Errors', () => {
      test('should reject farm creation missing farmId', async () => {
        const payload = {
          name: 'Boa Esperança',
          producerId: 'producer-001',
        };

        const response = await request(app).post('/api/farms').send(payload);

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
        expect(response.body.error).toContain('Missing required fields');
      });

      test('should reject farm creation missing name', async () => {
        const payload = {
          farmId: 'farm-001',
          producerId: 'producer-001',
        };

        const response = await request(app).post('/api/farms').send(payload);

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
        expect(response.body.error).toContain('Missing required fields');
      });

      test('should reject farm creation missing producerId', async () => {
        const payload = {
          farmId: 'farm-001',
          name: 'Boa Esperança',
        };

        const response = await request(app).post('/api/farms').send(payload);

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
        expect(response.body.error).toContain('Missing required fields');
      });

      test('should reject farm with non-string fields', async () => {
        const payload = {
          farmId: 123,
          name: 'Boa Esperança',
          producerId: 'producer-001',
        };

        const response = await request(app).post('/api/farms').send(payload);

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
        expect(response.body.error).toContain('Invalid field types');
      });

      test('should reject farm with empty string fields', async () => {
        const payload = {
          farmId: '',
          name: 'Boa Esperança',
          producerId: 'producer-001',
        };

        const response = await request(app).post('/api/farms').send(payload);

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
        // Empty string is caught by the required fields check
        expect(response.body.error).toContain('Missing required fields');
      });

      test('should reject farm creation if producer does not exist', async () => {
        const payload = {
          farmId: 'farm-001',
          name: 'Boa Esperança',
          producerId: 'producer-999',
        };

        // Mock producer lookup (not found)
        mockPool.query.mockResolvedValueOnce({ rows: [] });

        const response = await request(app).post('/api/farms').send(payload);

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
        expect(response.body.error).toContain('Producer not found');
      });

      test('should reject farm creation if farm already exists', async () => {
        const payload = {
          farmId: 'farm-001',
          name: 'Boa Esperança',
          producerId: 'producer-001',
        };

        // Mock producer lookup (succeeds)
        mockPool.query
          .mockResolvedValueOnce({ rows: [{ producer_id: 'producer-001' }] })
          // Mock farm existence check (already exists)
          .mockResolvedValueOnce({ rows: [{ farm_id: 'farm-001' }] });

        const response = await request(app).post('/api/farms').send(payload);

        expect(response.status).toBe(409);
        expect(response.body.success).toBe(false);
        expect(response.body.error).toContain('already exists');
      });
    });
  });

  describe('GET /api/farms', () => {
    test('should return paginated farms list with default pagination', async () => {
      const mockFarms = [
        {
          farm_id: 'farm-001',
          name: 'Boa Esperança',
          producer_id: 'producer-001',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          device_count: '3',
        },
        {
          farm_id: 'farm-002',
          name: 'Solar Verde',
          producer_id: 'producer-002',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          device_count: '2',
        },
      ];

      // Mock total count
      mockPool.query
        .mockResolvedValueOnce({ rows: [{ total: '2' }] })
        // Mock farms query
        .mockResolvedValueOnce({ rows: mockFarms });

      const response = await request(app).get('/api/farms');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(2);
      expect(response.body.total).toBe(2);
      expect(response.body.page).toBe(1);
      expect(response.body.limit).toBe(20);
      expect(response.body.totalPages).toBe(1);
      expect(response.body.data[0].farm_id).toBe('farm-001');
      expect(response.body.data[0].device_count).toBe(3);
    });

    test('should support custom pagination parameters', async () => {
      mockPool.query
        .mockResolvedValueOnce({ rows: [{ total: '50' }] })
        .mockResolvedValueOnce({ rows: [{ farm_id: 'farm-001', device_count: '3' }] });

      const response = await request(app).get('/api/farms?page=2&limit=10');

      expect(response.status).toBe(200);
      expect(response.body.page).toBe(2);
      expect(response.body.limit).toBe(10);
      expect(response.body.totalPages).toBe(5);
    });
  });

  describe('GET /api/farms/:farmId', () => {
    test('should return farm details when found', async () => {
      const mockFarm = {
        farm_id: 'farm-001',
        name: 'Boa Esperança',
        producer_id: 'producer-001',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      mockPool.query.mockResolvedValueOnce({ rows: [mockFarm] });

      const response = await request(app).get('/api/farms/farm-001');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.farm_id).toBe('farm-001');
      expect(response.body.data.name).toBe('Boa Esperança');
    });

    test('should return 404 when farm not found', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [] });

      const response = await request(app).get('/api/farms/farm-999');

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('not found');
    });
  });

  describe('POST /api/producers', () => {
    describe('Success Cases', () => {
      test('should create producer with valid data and return 201', async () => {
        const payload = {
          producerId: 'producer-001',
          name: 'João Silva',
          phone: '+5535999999999',
          email: 'joao@example.com',
        };

        // Mock producer existence check (does not exist)
        mockPool.query
          .mockResolvedValueOnce({ rows: [] })
          // Mock producer insert
          .mockResolvedValueOnce({
            rows: [
              {
                producer_id: 'producer-001',
                name: 'João Silva',
                phone: '+5535999999999',
                email: 'joao@example.com',
                notification_preferences: JSON.stringify({
                  channels: ['WhatsApp'],
                  quietHours: '22:00-06:00',
                }),
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              },
            ],
          });

        const response = await request(app).post('/api/producers').send(payload);

        expect(response.status).toBe(201);
        expect(response.body.success).toBe(true);
        expect(response.body.data.producer_id).toBe('producer-001');
        expect(response.body.data.name).toBe('João Silva');
        expect(response.body.timestamp).toBeDefined();
      });

      test('should create producer with default notification preferences', async () => {
        const payload = {
          producerId: 'producer-001',
          name: 'João Silva',
          phone: '+5535999999999',
        };

        mockPool.query.mockResolvedValueOnce({ rows: [] }).mockResolvedValueOnce({
          rows: [
            {
              producer_id: 'producer-001',
              name: 'João Silva',
              phone: '+5535999999999',
              email: null,
              notification_preferences: JSON.stringify({
                channels: ['WhatsApp'],
                quietHours: '22:00-06:00',
              }),
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            },
          ],
        });

        const response = await request(app).post('/api/producers').send(payload);

        expect(response.status).toBe(201);
        expect(response.body.success).toBe(true);
        expect(response.body.data.producer_id).toBe('producer-001');
      });
    });

    describe('Validation Errors', () => {
      test('should reject producer creation missing producerId', async () => {
        const payload = {
          name: 'João Silva',
          phone: '+5535999999999',
        };

        const response = await request(app).post('/api/producers').send(payload);

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
        expect(response.body.error).toContain('Missing required fields');
      });

      test('should reject producer creation missing phone', async () => {
        const payload = {
          producerId: 'producer-001',
          name: 'João Silva',
        };

        const response = await request(app).post('/api/producers').send(payload);

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
        expect(response.body.error).toContain('Missing required fields');
      });

      test('should reject producer with non-string fields', async () => {
        const payload = {
          producerId: 123,
          name: 'João Silva',
          phone: '+5535999999999',
        };

        const response = await request(app).post('/api/producers').send(payload);

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
        expect(response.body.error).toContain('Invalid field types');
      });

      test('should reject producer with empty string fields', async () => {
        const payload = {
          producerId: '',
          name: 'João Silva',
          phone: '+5535999999999',
        };

        const response = await request(app).post('/api/producers').send(payload);

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
        // Empty string is caught by the required fields check
        expect(response.body.error).toContain('Missing required fields');
      });

      test('should reject invalid email format', async () => {
        const payload = {
          producerId: 'producer-001',
          name: 'João Silva',
          phone: '+5535999999999',
          email: 'invalid-email',
        };

        const response = await request(app).post('/api/producers').send(payload);

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
        expect(response.body.error).toContain('email');
      });

      test('should reject producer creation if producer already exists', async () => {
        const payload = {
          producerId: 'producer-001',
          name: 'João Silva',
          phone: '+5535999999999',
        };

        // Mock producer existence check (already exists)
        mockPool.query.mockResolvedValueOnce({ rows: [{ producer_id: 'producer-001' }] });

        const response = await request(app).post('/api/producers').send(payload);

        expect(response.status).toBe(409);
        expect(response.body.success).toBe(false);
        expect(response.body.error).toContain('already exists');
      });
    });
  });

  describe('GET /api/producers', () => {
    test('should return paginated producers list with default pagination', async () => {
      const mockProducers = [
        {
          producer_id: 'producer-001',
          name: 'João Silva',
          phone: '+5535999999999',
          email: 'joao@example.com',
          notification_preferences: JSON.stringify({
            channels: ['WhatsApp'],
            quietHours: '22:00-06:00',
          }),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          producer_id: 'producer-002',
          name: 'Maria Santos',
          phone: '+5535888888888',
          email: 'maria@example.com',
          notification_preferences: JSON.stringify({
            channels: ['WhatsApp'],
            quietHours: '22:00-06:00',
          }),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ];

      // Mock total count
      mockPool.query
        .mockResolvedValueOnce({ rows: [{ total: '2' }] })
        // Mock producers query
        .mockResolvedValueOnce({ rows: mockProducers });

      const response = await request(app).get('/api/producers');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(2);
      expect(response.body.total).toBe(2);
      expect(response.body.page).toBe(1);
      expect(response.body.limit).toBe(20);
      expect(response.body.totalPages).toBe(1);
      expect(response.body.data[0].producer_id).toBe('producer-001');
    });

    test('should support custom pagination parameters', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [{ total: '100' }] }).mockResolvedValueOnce({
        rows: [
          {
            producer_id: 'producer-001',
            name: 'João Silva',
            phone: '+5535999999999',
            email: 'joao@example.com',
            notification_preferences: JSON.stringify({}),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        ],
      });

      const response = await request(app).get('/api/producers?page=3&limit=15');

      expect(response.status).toBe(200);
      expect(response.body.page).toBe(3);
      expect(response.body.limit).toBe(15);
      expect(response.body.totalPages).toBe(7);
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
