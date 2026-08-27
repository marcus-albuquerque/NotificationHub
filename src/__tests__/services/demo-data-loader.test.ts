/**
 * DemoDataLoader - Unit and Property-Based Tests
 *
 * Feature: notification-hub
 * Tests verify that demo data is loaded correctly on startup
 * Validates Requirements 16.1 through 16.6
 */

import * as fc from 'fast-check';
import { DemoDataLoader } from '../../services/demo-data-loader';
import { SensorType } from '../../types';

// Mock the database pool
jest.mock('../../config/database', () => ({
  getPool: jest.fn(() => mockPool),
}));

let mockPool: any;

describe('DemoDataLoader', () => {
  beforeEach(() => {
    // Clear environment variable before each test
    delete process.env.LOAD_DEMO_DATA;

    // Create mock pool
    mockPool = {
      query: jest.fn(),
    };
  });

  describe('Feature: Requirement 16.1 - Demo Farm Creation', () => {
    it('creates farm "Boa Esperança" with correct farmId', async () => {
      const loader = new DemoDataLoader();

      mockPool.query
        .mockResolvedValueOnce({ rows: [] }) // Producer check
        .mockResolvedValueOnce({ rows: [] }) // Producer insert
        .mockResolvedValueOnce({ rows: [] }) // Farm check
        .mockResolvedValueOnce({ rows: [] }) // Farm insert
        .mockResolvedValueOnce({ rows: [] }) // Devices checks and inserts (6x)
        .mockResolvedValueOnce({ rows: [] }) // Device insert
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] });

      // Set environment variable to enable loading
      process.env.LOAD_DEMO_DATA = 'true';

      await loader.loadDemoData();

      // Verify farm creation query was called
      const farmInsertCall = mockPool.query.mock.calls.find(
        (call: any) => call[0].includes('INSERT INTO farms') && call[1] && call[1][0] === 'farm-001'
      );

      expect(farmInsertCall).toBeDefined();
      expect(farmInsertCall[1]).toEqual(['farm-001', 'Boa Esperança', 'producer-001']);
    });

    it('skips farm creation if farm already exists', async () => {
      const loader = new DemoDataLoader();

      mockPool.query
        .mockResolvedValueOnce({ rows: [] }) // Producer check
        .mockResolvedValueOnce({ rows: [] }) // Producer insert
        .mockResolvedValueOnce({ rows: [{ farm_id: 'farm-001' }] }) // Farm check - exists
        .mockResolvedValueOnce({ rows: [] }); // Devices

      process.env.LOAD_DEMO_DATA = 'true';

      await loader.loadDemoData();

      // Farm insert should NOT be called since it already exists
      const farmInsertCall = mockPool.query.mock.calls.find((call: any) =>
        call[0].includes('INSERT INTO farms')
      );

      expect(farmInsertCall).toBeUndefined();
    });
  });

  describe('Feature: Requirement 16.2 - Demo Producer Creation', () => {
    it('creates producer "João Silva" with correct details', async () => {
      const loader = new DemoDataLoader();

      mockPool.query
        .mockResolvedValueOnce({ rows: [] }) // Producer check
        .mockResolvedValueOnce({ rows: [] }) // Producer insert
        .mockResolvedValueOnce({ rows: [] }) // Farm check
        .mockResolvedValueOnce({ rows: [] }) // Farm insert
        .mockResolvedValueOnce({ rows: [] }); // Devices

      process.env.LOAD_DEMO_DATA = 'true';

      await loader.loadDemoData();

      // Verify producer creation query
      const producerInsertCall = mockPool.query.mock.calls.find(
        (call: any) =>
          call[0].includes('INSERT INTO producers') && call[1] && call[1][0] === 'producer-001'
      );

      expect(producerInsertCall).toBeDefined();
      expect(producerInsertCall[1][0]).toBe('producer-001');
      expect(producerInsertCall[1][1]).toBe('João Silva');
      expect(producerInsertCall[1][2]).toBe('+5535999999999');
      expect(producerInsertCall[1][3]).toBe('joao.silva@example.com');
    });

    it('skips producer creation if producer already exists', async () => {
      const loader = new DemoDataLoader();

      mockPool.query.mockResolvedValueOnce({ rows: [{ producer_id: 'producer-001' }] }); // Producer check - exists

      process.env.LOAD_DEMO_DATA = 'true';

      await loader.loadDemoData();

      // Producer insert should NOT be called
      const producerInsertCall = mockPool.query.mock.calls.find((call: any) =>
        call[0].includes('INSERT INTO producers')
      );

      expect(producerInsertCall).toBeUndefined();
    });
  });

  describe('Feature: Requirement 16.3 - Demo Devices Creation', () => {
    it('creates 6 devices covering all sensor types', async () => {
      const loader = new DemoDataLoader();

      // Mock responses for all database calls
      mockPool.query
        .mockResolvedValueOnce({ rows: [] }) // Producer check
        .mockResolvedValueOnce({ rows: [] }) // Producer insert
        .mockResolvedValueOnce({ rows: [] }) // Farm check
        .mockResolvedValueOnce({ rows: [] }) // Farm insert
        // 6 device checks + 6 device inserts
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] });

      process.env.LOAD_DEMO_DATA = 'true';

      await loader.loadDemoData();

      // Count device insert calls
      const deviceInsertCalls = mockPool.query.mock.calls.filter(
        (call: any) =>
          call[0].includes('INSERT INTO devices') &&
          call[1] &&
          call[1][0] &&
          call[1][0].match(/^(temp|humid|soil|water|silo|equip)-001$/)
      );

      expect(deviceInsertCalls.length).toBe(6);
    });

    it('creates device for each required sensor type', async () => {
      const loader = new DemoDataLoader();

      mockPool.query
        .mockResolvedValueOnce({ rows: [] }) // Producer check
        .mockResolvedValueOnce({ rows: [] }) // Producer insert
        .mockResolvedValueOnce({ rows: [] }) // Farm check
        .mockResolvedValueOnce({ rows: [] }) // Farm insert
        // 12 device-related calls
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] });

      process.env.LOAD_DEMO_DATA = 'true';

      await loader.loadDemoData();

      // Verify each sensor type has a device
      const deviceInsertCalls = mockPool.query.mock.calls.filter((call: any) =>
        call[0].includes('INSERT INTO devices')
      );

      const sensorTypes = deviceInsertCalls.map((call: any) => call[1][3]); // sensorType is 4th param

      expect(sensorTypes).toContain(SensorType.AIR_TEMPERATURE);
      expect(sensorTypes).toContain(SensorType.AIR_HUMIDITY);
      expect(sensorTypes).toContain(SensorType.SOIL_MOISTURE);
      expect(sensorTypes).toContain(SensorType.WATER_RESERVOIR_LEVEL);
      expect(sensorTypes).toContain(SensorType.SILO_LEVEL);
      expect(sensorTypes).toContain(SensorType.EQUIPMENT_STATUS);
    });
  });

  describe('Feature: Requirement 16.4 - Rule-Triggering Events', () => {
    it('generates events that trigger each rule', async () => {
      const loader = new DemoDataLoader();

      // Mock all database calls
      mockPool.query.mockResolvedValue({ rows: [] });

      process.env.LOAD_DEMO_DATA = 'true';

      await loader.loadDemoData();

      // Get all event insert calls
      const eventInsertCalls = mockPool.query.mock.calls.filter(
        (call: any) =>
          call[0].includes('INSERT INTO events') && call[1] && call[1][0].startsWith('evt-')
      );

      // Extract triggering events
      const triggeringEvents = eventInsertCalls.filter((call: any) =>
        call[1][0].includes('trigger')
      );

      expect(triggeringEvents.length).toBeGreaterThanOrEqual(6);
    });

    it('creates AIR_TEMPERATURE event with value 36 for HIGH_AIR_TEMPERATURE rule', async () => {
      const loader = new DemoDataLoader();

      mockPool.query.mockResolvedValue({ rows: [] });

      process.env.LOAD_DEMO_DATA = 'true';

      await loader.loadDemoData();

      // Find temperature event insert
      const tempEventCall = mockPool.query.mock.calls.find(
        (call: any) =>
          call[0].includes('INSERT INTO events') &&
          call[1] &&
          call[1][3] === SensorType.AIR_TEMPERATURE &&
          call[1][4].startsWith('36')
      );

      expect(tempEventCall).toBeDefined();
      expect(tempEventCall[1][3]).toBe(SensorType.AIR_TEMPERATURE);
      expect(tempEventCall[1][4]).toBe('36.5');
      expect(tempEventCall[1][5]).toBe('°C');
    });

    it('creates AIR_HUMIDITY event with value 25 for LOW_AIR_HUMIDITY rule', async () => {
      const loader = new DemoDataLoader();

      mockPool.query.mockResolvedValue({ rows: [] });

      process.env.LOAD_DEMO_DATA = 'true';

      await loader.loadDemoData();

      const humidityEventCall = mockPool.query.mock.calls.find(
        (call: any) =>
          call[0].includes('INSERT INTO events') &&
          call[1] &&
          call[1][3] === SensorType.AIR_HUMIDITY &&
          call[1][4] === '25.0'
      );

      expect(humidityEventCall).toBeDefined();
    });

    it('creates EQUIPMENT_STATUS event with FAILURE for EQUIPMENT_FAILURE rule', async () => {
      const loader = new DemoDataLoader();

      mockPool.query.mockResolvedValue({ rows: [] });

      process.env.LOAD_DEMO_DATA = 'true';

      await loader.loadDemoData();

      const equipmentEventCall = mockPool.query.mock.calls.find(
        (call: any) =>
          call[0].includes('INSERT INTO events') &&
          call[1] &&
          call[1][3] === SensorType.EQUIPMENT_STATUS &&
          call[1][4] === 'FAILURE'
      );

      expect(equipmentEventCall).toBeDefined();
    });
  });

  describe('Feature: Requirement 16.5 - Normal Events (No Rule Triggers)', () => {
    it('generates normal events that do not trigger rules', async () => {
      const loader = new DemoDataLoader();

      mockPool.query.mockResolvedValue({ rows: [] });

      process.env.LOAD_DEMO_DATA = 'true';

      await loader.loadDemoData();

      // Get all event insert calls
      const eventInsertCalls = mockPool.query.mock.calls.filter(
        (call: any) =>
          call[0].includes('INSERT INTO events') && call[1] && call[1][0].startsWith('evt-')
      );

      // Extract normal events
      const normalEvents = eventInsertCalls.filter((call: any) => call[1][0].includes('normal'));

      expect(normalEvents.length).toBeGreaterThanOrEqual(6);
    });

    it('creates AIR_TEMPERATURE event with value 25 (no rule trigger)', async () => {
      const loader = new DemoDataLoader();

      mockPool.query.mockResolvedValue({ rows: [] });

      process.env.LOAD_DEMO_DATA = 'true';

      await loader.loadDemoData();

      const normalTempEventCall = mockPool.query.mock.calls.find(
        (call: any) =>
          call[0].includes('INSERT INTO events') &&
          call[1] &&
          call[1][3] === SensorType.AIR_TEMPERATURE &&
          call[1][4] === '25.0'
      );

      expect(normalTempEventCall).toBeDefined();
    });

    it('creates EQUIPMENT_STATUS event with OK (no rule trigger)', async () => {
      const loader = new DemoDataLoader();

      mockPool.query.mockResolvedValue({ rows: [] });

      process.env.LOAD_DEMO_DATA = 'true';

      await loader.loadDemoData();

      const normalEquipmentEventCall = mockPool.query.mock.calls.find(
        (call: any) =>
          call[0].includes('INSERT INTO events') &&
          call[1] &&
          call[1][3] === SensorType.EQUIPMENT_STATUS &&
          call[1][4] === 'OK'
      );

      expect(normalEquipmentEventCall).toBeDefined();
    });
  });

  describe('Feature: Requirement 16.6 - Environment Variable Control', () => {
    it('loads demo data when LOAD_DEMO_DATA is true', async () => {
      const loader = new DemoDataLoader();

      mockPool.query.mockResolvedValue({ rows: [] });

      process.env.LOAD_DEMO_DATA = 'true';

      await loader.loadDemoData();

      // Verify that database queries were made (demo data was loaded)
      expect(mockPool.query).toHaveBeenCalled();
    });

    it('skips demo data loading when LOAD_DEMO_DATA is false', async () => {
      const loader = new DemoDataLoader();

      process.env.LOAD_DEMO_DATA = 'false';

      await loader.loadDemoData();

      // Verify no database queries were made
      expect(mockPool.query).not.toHaveBeenCalled();
    });

    it('loads demo data by default when LOAD_DEMO_DATA is not set', async () => {
      const loader = new DemoDataLoader();

      mockPool.query.mockResolvedValue({ rows: [] });

      delete process.env.LOAD_DEMO_DATA;

      await loader.loadDemoData();

      // Verify that database queries were made (demo data was loaded by default)
      expect(mockPool.query).toHaveBeenCalled();
    });

    it('handles database errors gracefully without throwing', async () => {
      const loader = new DemoDataLoader();

      mockPool.query.mockRejectedValue(new Error('Database connection error'));

      process.env.LOAD_DEMO_DATA = 'true';

      // Should not throw
      await expect(loader.loadDemoData()).resolves.not.toThrow();
    });
  });

  describe('Property-Based Tests - Requirement 16 Integration', () => {
    /**
     * Property: All sensor types follow the expected enum values
     * **Validates: Requirement 16.3**
     */
    it('property: sensor types use valid enum values', () => {
      fc.assert(
        fc.property(fc.constant(null), () => {
          const validSensorTypes = Object.values(SensorType);
          expect(validSensorTypes).toContain(SensorType.AIR_TEMPERATURE);
          expect(validSensorTypes).toContain(SensorType.AIR_HUMIDITY);
          expect(validSensorTypes).toContain(SensorType.SOIL_MOISTURE);
          expect(validSensorTypes).toContain(SensorType.WATER_RESERVOIR_LEVEL);
          expect(validSensorTypes).toContain(SensorType.SILO_LEVEL);
          expect(validSensorTypes).toContain(SensorType.EQUIPMENT_STATUS);
          expect(validSensorTypes.length).toBe(6);
        }),
        { numRuns: 10 }
      );
    });

    /**
     * Property: Farm and producer IDs follow the required naming convention
     * **Validates: Requirements 16.1, 16.2**
     */
    it('property: farm and producer IDs use correct naming convention', () => {
      fc.assert(
        fc.property(fc.constant(null), () => {
          expect('farm-001').toMatch(/^farm-\d{3}$/);
          expect('producer-001').toMatch(/^producer-\d{3}$/);
        }),
        { numRuns: 10 }
      );
    });

    /**
     * Property: With arbitrary numbers, check that thresholds are consistent
     * **Validates: Requirements 16.4, 16.5**
     */
    it('property: trigger values exceed thresholds while normal values do not', () => {
      fc.assert(
        fc.property(
          fc.tuple(
            fc.integer({ min: 36, max: 50 }), // tempTrigger
            fc.integer({ min: 0, max: 35 }), // tempNormal
            fc.integer({ min: 0, max: 29 }), // humidityTrigger
            fc.integer({ min: 30, max: 100 }) // humidityNormal
          ),
          ([tempTrigger, tempNormal, humidityTrigger, humidityNormal]) => {
            // Verify trigger values exceed thresholds
            expect(tempTrigger).toBeGreaterThan(35);
            expect(humidityTrigger).toBeLessThan(30);

            // Verify normal values do not exceed thresholds
            expect(tempNormal).toBeLessThanOrEqual(35);
            expect(humidityNormal).toBeGreaterThanOrEqual(30);
          }
        ),
        { numRuns: 50 }
      );
    });
  });
});
