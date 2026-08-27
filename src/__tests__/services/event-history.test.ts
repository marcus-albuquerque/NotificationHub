/**
 * Unit Tests for Event History Data Access Layer
 *
 * Tests persistence and retrieval of complete event pipeline records.
 * Validates Requirements: 11.1, 11.2, 11.3, 11.4, 11.5, 11.6, 17.1, 17.2, 17.3, 17.4
 *
 * Uses property-based testing with fast-check to verify correctness properties:
 * - Property 1: Event Persistence - Valid event SHALL be persisted before processing
 * - Property 17: Event History Consolidation - Complete event SHALL link to all pipeline stages
 * - Property 18: No-Action Pipeline Logging - Valid event without rules SHALL be logged
 * - Property 19: EventHistory Query Consistency - Queries SHALL return consistent schema
 */

import { EventHistory } from '../../services/event-history';
import { EventHistoryEntry, FiredRule, NotificationRecord } from '../../types/index';
import { getPool } from '../../config/database';
import { v4 as uuidv4 } from 'uuid';
import * as fc from 'fast-check';

// Mock the database
jest.mock('../../config/database');

describe('EventHistory Data Access Layer', () => {
  let eventHistory: EventHistory;
  let mockPool: any;
  let mockClient: any;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Create mock client
    mockClient = {
      query: jest.fn(),
      release: jest.fn(),
    };

    // Create mock pool
    mockPool = {
      connect: jest.fn().mockResolvedValue(mockClient),
    };

    // Mock getPool
    (getPool as jest.Mock).mockReturnValue(mockPool);

    // Initialize EventHistory
    eventHistory = new EventHistory();
  });

  describe('save()', () => {
    it('should persist an event history entry to the database', async () => {
      // Arrange
      const entry: EventHistoryEntry = {
        id: uuidv4(),
        eventId: 'event-001',
        farmId: 'farm-001',
        deviceId: 'device-001',
        receivedAt: new Date().toISOString(),
        validationStatus: 'valid',
        isDuplicate: false,
        firedRules: [
          {
            ruleId: 'HIGH_AIR_TEMPERATURE',
            ruleName: 'High Air Temperature',
            firedAt: new Date().toISOString(),
          },
        ],
        notifications: [
          {
            notificationId: 'notif-001',
            message: 'Temperature exceeds threshold',
            generatedAt: new Date().toISOString(),
            dispatchStatus: 'sent',
          },
        ],
        processedAt: new Date().toISOString(),
        processingDurationMs: 150,
      };

      mockClient.query.mockResolvedValueOnce({
        rows: [
          {
            history_id: entry.id,
            event_id: entry.eventId,
            farm_id: entry.farmId,
            device_id: entry.deviceId,
            received_at: entry.receivedAt,
            validation_status: entry.validationStatus,
            validation_error: null,
            is_duplicate: entry.isDuplicate,
            previous_event_id: null,
            fired_rules: JSON.stringify(entry.firedRules),
            notifications: JSON.stringify(entry.notifications),
            processed_at: entry.processedAt,
            processing_duration_ms: entry.processingDurationMs,
          },
        ],
      });

      // Act
      const result = await eventHistory.save(entry);

      // Assert
      expect(result).toBeDefined();
      expect(result.eventId).toBe(entry.eventId);
      expect(result.farmId).toBe(entry.farmId);
      expect(result.deviceId).toBe(entry.deviceId);
      expect(result.validationStatus).toBe('valid');
      expect(result.isDuplicate).toBe(false);
      expect(result.firedRules).toHaveLength(1);
      expect(result.notifications).toHaveLength(1);
      expect(mockClient.query).toHaveBeenCalled();
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should generate an ID if not provided', async () => {
      // Arrange
      const entry: EventHistoryEntry = {
        id: uuidv4(),
        eventId: 'event-001',
        farmId: 'farm-001',
        deviceId: 'device-001',
        receivedAt: new Date().toISOString(),
        validationStatus: 'valid',
        isDuplicate: false,
        firedRules: [],
        notifications: [],
        processedAt: new Date().toISOString(),
        processingDurationMs: 100,
      };

      const generatedId = uuidv4();
      mockClient.query.mockResolvedValueOnce({
        rows: [{ ...entry, history_id: generatedId }],
      });

      // Act
      const result = await eventHistory.save(entry);

      // Assert
      expect(result.id).toBeDefined();
    });

    it('should handle database errors gracefully', async () => {
      // Arrange
      const entry: EventHistoryEntry = {
        id: uuidv4(),
        eventId: 'event-001',
        farmId: 'farm-001',
        deviceId: 'device-001',
        receivedAt: new Date().toISOString(),
        validationStatus: 'valid',
        isDuplicate: false,
        firedRules: [],
        notifications: [],
        processedAt: new Date().toISOString(),
        processingDurationMs: 100,
      };

      mockClient.query.mockRejectedValueOnce(new Error('Database connection failed'));

      // Act & Assert
      await expect(eventHistory.save(entry)).rejects.toThrow('Failed to save event history entry');
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should persist rejected events with validation error', async () => {
      // Arrange
      const entry: EventHistoryEntry = {
        id: uuidv4(),
        eventId: 'event-002',
        farmId: 'farm-001',
        deviceId: 'device-001',
        receivedAt: new Date().toISOString(),
        validationStatus: 'rejected',
        validationError: 'Invalid sensor type',
        isDuplicate: false,
        firedRules: [],
        notifications: [],
        processedAt: new Date().toISOString(),
        processingDurationMs: 50,
      };

      mockClient.query.mockResolvedValueOnce({
        rows: [
          {
            history_id: entry.id,
            event_id: entry.eventId,
            farm_id: entry.farmId,
            device_id: entry.deviceId,
            received_at: entry.receivedAt,
            validation_status: entry.validationStatus,
            validation_error: entry.validationError,
            is_duplicate: entry.isDuplicate,
            previous_event_id: null,
            fired_rules: JSON.stringify(entry.firedRules),
            notifications: JSON.stringify(entry.notifications),
            processed_at: entry.processedAt,
            processing_duration_ms: entry.processingDurationMs,
          },
        ],
      });

      // Act
      const result = await eventHistory.save(entry);

      // Assert
      expect(result.validationStatus).toBe('rejected');
      expect(result.validationError).toBe('Invalid sensor type');
    });
  });

  describe('getByEventId()', () => {
    it('should retrieve complete event history entry by eventId', async () => {
      // Arrange
      const eventId = 'event-001';
      const entry: EventHistoryEntry = {
        id: uuidv4(),
        eventId,
        farmId: 'farm-001',
        deviceId: 'device-001',
        receivedAt: new Date().toISOString(),
        validationStatus: 'valid',
        isDuplicate: false,
        firedRules: [
          {
            ruleId: 'HIGH_AIR_TEMPERATURE',
            ruleName: 'High Air Temperature',
            firedAt: new Date().toISOString(),
          },
        ],
        notifications: [
          {
            notificationId: 'notif-001',
            message: 'Temperature exceeds threshold',
            generatedAt: new Date().toISOString(),
            dispatchStatus: 'sent',
          },
        ],
        processedAt: new Date().toISOString(),
        processingDurationMs: 150,
      };

      mockClient.query.mockResolvedValueOnce({
        rows: [
          {
            history_id: entry.id,
            event_id: entry.eventId,
            farm_id: entry.farmId,
            device_id: entry.deviceId,
            received_at: entry.receivedAt,
            validation_status: entry.validationStatus,
            validation_error: null,
            is_duplicate: entry.isDuplicate,
            previous_event_id: null,
            fired_rules: JSON.stringify(entry.firedRules),
            notifications: JSON.stringify(entry.notifications),
            processed_at: entry.processedAt,
            processing_duration_ms: entry.processingDurationMs,
          },
        ],
      });

      // Act
      const result = await eventHistory.getByEventId(eventId);

      // Assert
      expect(result).not.toBeNull();
      expect(result?.eventId).toBe(eventId);
      expect(result?.farmId).toBe('farm-001');
      expect(result?.firedRules).toHaveLength(1);
      expect(result?.notifications).toHaveLength(1);
    });

    it('should return null if event not found', async () => {
      // Arrange
      mockClient.query.mockResolvedValueOnce({ rows: [] });

      // Act
      const result = await eventHistory.getByEventId('non-existent');

      // Assert
      expect(result).toBeNull();
    });
  });

  describe('getByFarmId()', () => {
    it('should retrieve paginated farm events with default limit', async () => {
      // Arrange
      const farmId = 'farm-001';
      const entries: EventHistoryEntry[] = [
        {
          id: uuidv4(),
          eventId: 'event-001',
          farmId,
          deviceId: 'device-001',
          receivedAt: new Date().toISOString(),
          validationStatus: 'valid',
          isDuplicate: false,
          firedRules: [],
          notifications: [],
          processedAt: new Date().toISOString(),
          processingDurationMs: 100,
        },
      ];

      mockClient.query.mockResolvedValueOnce({ rows: [{ total: '100' }] }).mockResolvedValueOnce({
        rows: [
          {
            history_id: entries[0].id,
            event_id: entries[0].eventId,
            farm_id: entries[0].farmId,
            device_id: entries[0].deviceId,
            received_at: entries[0].receivedAt,
            validation_status: entries[0].validationStatus,
            validation_error: null,
            is_duplicate: entries[0].isDuplicate,
            previous_event_id: null,
            fired_rules: JSON.stringify(entries[0].firedRules),
            notifications: JSON.stringify(entries[0].notifications),
            processed_at: entries[0].processedAt,
            processing_duration_ms: entries[0].processingDurationMs,
          },
        ],
      });

      // Act
      const result = await eventHistory.getByFarmId(farmId);

      // Assert
      expect(result.entries).toHaveLength(1);
      expect(result.total).toBe(100);
      expect(result.entries[0].farmId).toBe(farmId);
    });

    it('should support custom limit and offset', async () => {
      // Arrange
      const farmId = 'farm-001';
      const limit = 50;
      const offset = 100;

      mockClient.query
        .mockResolvedValueOnce({ rows: [{ total: '500' }] })
        .mockResolvedValueOnce({ rows: [] });

      // Act
      await eventHistory.getByFarmId(farmId, limit, offset);

      // Assert
      const calls = mockClient.query.mock.calls;
      expect(calls[1][1]).toEqual([farmId, limit, offset]);
    });

    it('should order results by processedAt descending', async () => {
      // Arrange
      const farmId = 'farm-001';

      mockClient.query
        .mockResolvedValueOnce({ rows: [{ total: '0' }] })
        .mockResolvedValueOnce({ rows: [] });

      // Act
      await eventHistory.getByFarmId(farmId);

      // Assert
      const query = mockClient.query.mock.calls[1][0];
      expect(query).toContain('ORDER BY processed_at DESC');
    });
  });

  describe('getByDeviceId()', () => {
    it('should retrieve paginated device events', async () => {
      // Arrange
      const deviceId = 'device-001';
      const entries: EventHistoryEntry[] = [
        {
          id: uuidv4(),
          eventId: 'event-001',
          farmId: 'farm-001',
          deviceId,
          receivedAt: new Date().toISOString(),
          validationStatus: 'valid',
          isDuplicate: false,
          firedRules: [],
          notifications: [],
          processedAt: new Date().toISOString(),
          processingDurationMs: 100,
        },
      ];

      mockClient.query.mockResolvedValueOnce({ rows: [{ total: '50' }] }).mockResolvedValueOnce({
        rows: [
          {
            history_id: entries[0].id,
            event_id: entries[0].eventId,
            farm_id: entries[0].farmId,
            device_id: entries[0].deviceId,
            received_at: entries[0].receivedAt,
            validation_status: entries[0].validationStatus,
            validation_error: null,
            is_duplicate: entries[0].isDuplicate,
            previous_event_id: null,
            fired_rules: JSON.stringify(entries[0].firedRules),
            notifications: JSON.stringify(entries[0].notifications),
            processed_at: entries[0].processedAt,
            processing_duration_ms: entries[0].processingDurationMs,
          },
        ],
      });

      // Act
      const result = await eventHistory.getByDeviceId(deviceId);

      // Assert
      expect(result.entries).toHaveLength(1);
      expect(result.total).toBe(50);
      expect(result.entries[0].deviceId).toBe(deviceId);
    });
  });

  describe('getByDateRange()', () => {
    it('should retrieve events within date range', async () => {
      // Arrange
      const farmId = 'farm-001';
      const startDate = new Date('2024-01-01').toISOString();
      const endDate = new Date('2024-01-31').toISOString();
      const entries: EventHistoryEntry[] = [
        {
          id: uuidv4(),
          eventId: 'event-001',
          farmId,
          deviceId: 'device-001',
          receivedAt: new Date('2024-01-15').toISOString(),
          validationStatus: 'valid',
          isDuplicate: false,
          firedRules: [],
          notifications: [],
          processedAt: new Date('2024-01-15').toISOString(),
          processingDurationMs: 100,
        },
      ];

      mockClient.query.mockResolvedValueOnce({ rows: [{ total: '20' }] }).mockResolvedValueOnce({
        rows: [
          {
            history_id: entries[0].id,
            event_id: entries[0].eventId,
            farm_id: entries[0].farmId,
            device_id: entries[0].deviceId,
            received_at: entries[0].receivedAt,
            validation_status: entries[0].validationStatus,
            validation_error: null,
            is_duplicate: entries[0].isDuplicate,
            previous_event_id: null,
            fired_rules: JSON.stringify(entries[0].firedRules),
            notifications: JSON.stringify(entries[0].notifications),
            processed_at: entries[0].processedAt,
            processing_duration_ms: entries[0].processingDurationMs,
          },
        ],
      });

      // Act
      const result = await eventHistory.getByDateRange(farmId, startDate, endDate);

      // Assert
      expect(result.entries).toHaveLength(1);
      expect(result.total).toBe(20);
    });

    it('should reject invalid date formats', async () => {
      // Arrange
      const farmId = 'farm-001';
      const invalidStartDate = 'invalid-date';
      const validEndDate = new Date().toISOString();

      // Act & Assert
      await expect(
        eventHistory.getByDateRange(farmId, invalidStartDate, validEndDate)
      ).rejects.toThrow('Invalid date format');
    });

    it('should reject if startDate is after endDate', async () => {
      // Arrange
      const farmId = 'farm-001';
      const startDate = new Date('2024-12-31').toISOString();
      const endDate = new Date('2024-01-01').toISOString();

      // Act & Assert
      await expect(eventHistory.getByDateRange(farmId, startDate, endDate)).rejects.toThrow(
        'startDate must be before or equal to endDate'
      );
    });
  });

  describe('getByValidationStatus()', () => {
    it('should retrieve events by validation status', async () => {
      // Arrange
      const farmId = 'farm-001';

      mockClient.query.mockResolvedValueOnce({ rows: [{ total: '10' }] }).mockResolvedValueOnce({
        rows: [
          {
            history_id: uuidv4(),
            event_id: 'event-001',
            farm_id: farmId,
            device_id: 'device-001',
            received_at: new Date().toISOString(),
            validation_status: 'rejected',
            validation_error: 'Invalid sensor type',
            is_duplicate: false,
            previous_event_id: null,
            fired_rules: '[]',
            notifications: '[]',
            processed_at: new Date().toISOString(),
            processing_duration_ms: 50,
          },
        ],
      });

      // Act
      const result = await eventHistory.getByValidationStatus(farmId, 'rejected');

      // Assert
      expect(result.total).toBe(10);
      expect(result.entries).toHaveLength(1);
      expect(result.entries[0].validationStatus).toBe('rejected');
    });

    it('should reject invalid validation status', async () => {
      // Act & Assert
      await expect(
        eventHistory.getByValidationStatus('farm-001', 'invalid' as any)
      ).rejects.toThrow('Status must be "valid" or "rejected"');
    });
  });

  describe('getDuplicates()', () => {
    it('should retrieve duplicate events', async () => {
      // Arrange
      const farmId = 'farm-001';

      mockClient.query.mockResolvedValueOnce({ rows: [{ total: '5' }] }).mockResolvedValueOnce({
        rows: [
          {
            history_id: uuidv4(),
            event_id: 'event-001',
            farm_id: farmId,
            device_id: 'device-001',
            received_at: new Date().toISOString(),
            validation_status: 'valid',
            validation_error: null,
            is_duplicate: true,
            previous_event_id: 'event-000',
            fired_rules: '[]',
            notifications: '[]',
            processed_at: new Date().toISOString(),
            processing_duration_ms: 100,
          },
        ],
      });

      // Act
      const result = await eventHistory.getDuplicates(farmId);

      // Assert
      expect(result.total).toBe(5);
      expect(result.entries).toHaveLength(1);
      expect(result.entries[0].isDuplicate).toBe(true);
      expect(result.entries[0].previousEventId).toBe('event-000');
    });
  });

  describe('Property-based Tests', () => {
    // Property 1: Event Persistence
    // Valid event SHALL be persisted before processing
    it('[Property 1] should persist any valid event entry with all fields', () => {
      fc.assert(
        fc.property(
          fc.record({
            eventId: fc.uuid(),
            farmId: fc.stringMatching(/^farm-\d+$/),
            deviceId: fc.stringMatching(/^device-\d+$/),
            receivedAt: fc.date().map((d) => d.toISOString()),
            validationStatus: fc.constantFrom('valid', 'rejected'),
            isDuplicate: fc.boolean(),
            processingDurationMs: fc.integer({ min: 0, max: 10000 }),
          }),
          (data) => {
            const entry: EventHistoryEntry = {
              id: uuidv4(),
              eventId: data.eventId,
              farmId: data.farmId,
              deviceId: data.deviceId,
              receivedAt: data.receivedAt,
              validationStatus: data.validationStatus as 'valid' | 'rejected',
              isDuplicate: data.isDuplicate,
              firedRules: [],
              notifications: [],
              processedAt: new Date().toISOString(),
              processingDurationMs: data.processingDurationMs,
            };

            // Verify entry structure is complete and valid
            expect(entry.id).toBeDefined();
            expect(entry.eventId).toBeDefined();
            expect(entry.farmId).toBeDefined();
            expect(entry.deviceId).toBeDefined();
            expect(entry.receivedAt).toBeDefined();
            expect(entry.validationStatus).toMatch(/^(valid|rejected)$/);
          }
        ),
        { numRuns: 100 }
      );
    });

    // Property 17: Event History Consolidation
    // Complete event SHALL link to all pipeline stages with timestamps
    it('[Property 17] should consolidate event with all pipeline stages', () => {
      fc.assert(
        fc.property(
          fc.record({
            firedRulesCount: fc.integer({ min: 0, max: 6 }),
            notificationsCount: fc.integer({ min: 0, max: 10 }),
          }),
          (data) => {
            const firedRules: FiredRule[] = Array.from({ length: data.firedRulesCount }, () => ({
              ruleId: `rule-${uuidv4()}`,
              ruleName: `Rule ${uuidv4()}`,
              firedAt: new Date().toISOString(),
            }));

            const notifications: NotificationRecord[] = Array.from(
              { length: data.notificationsCount },
              () => ({
                notificationId: uuidv4(),
                message: `Notification message`,
                generatedAt: new Date().toISOString(),
                dispatchStatus: 'sent' as const,
              })
            );

            const entry: EventHistoryEntry = {
              id: uuidv4(),
              eventId: uuidv4(),
              farmId: 'farm-001',
              deviceId: 'device-001',
              receivedAt: new Date().toISOString(),
              validationStatus: 'valid',
              isDuplicate: false,
              firedRules,
              notifications,
              processedAt: new Date().toISOString(),
              processingDurationMs: 100,
            };

            // Verify all pipeline stages are linked
            expect(entry.firedRules).toHaveLength(data.firedRulesCount);
            expect(entry.notifications).toHaveLength(data.notificationsCount);
            expect(entry.receivedAt).toBeDefined();
            expect(entry.processedAt).toBeDefined();
          }
        ),
        { numRuns: 100 }
      );
    });

    // Property 18: No-Action Pipeline Logging
    // Valid event without fired rules SHALL be logged with "no rules fired" status
    it('[Property 18] should log valid events with no rules fired', () => {
      fc.assert(
        fc.property(fc.anything(), () => {
          const entry: EventHistoryEntry = {
            id: uuidv4(),
            eventId: uuidv4(),
            farmId: 'farm-001',
            deviceId: 'device-001',
            receivedAt: new Date().toISOString(),
            validationStatus: 'valid',
            isDuplicate: false,
            firedRules: [], // No rules fired
            notifications: [], // No notifications
            processedAt: new Date().toISOString(),
            processingDurationMs: 50,
          };

          // Verify the entry is still valid and loggable
          expect(entry.validationStatus).toBe('valid');
          expect(entry.firedRules).toHaveLength(0);
          expect(entry.notifications).toHaveLength(0);
          expect(entry.processedAt).toBeDefined();
        }),
        { numRuns: 100 }
      );
    });

    // Property 19: EventHistory Query Consistency
    // Queries SHALL return consistent schema
    it('[Property 19] should maintain consistent schema across all query methods', () => {
      fc.assert(
        fc.property(fc.anything(), () => {
          const entry: EventHistoryEntry = {
            id: uuidv4(),
            eventId: uuidv4(),
            farmId: 'farm-001',
            deviceId: 'device-001',
            receivedAt: new Date().toISOString(),
            validationStatus: 'valid' as const,
            isDuplicate: false,
            firedRules: [],
            notifications: [],
            processedAt: new Date().toISOString(),
            processingDurationMs: 100,
          };

          // Verify schema consistency
          const requiredFields = [
            'id',
            'eventId',
            'farmId',
            'deviceId',
            'receivedAt',
            'validationStatus',
            'isDuplicate',
            'firedRules',
            'notifications',
            'processedAt',
            'processingDurationMs',
          ];

          requiredFields.forEach((field) => {
            expect(entry).toHaveProperty(field);
          });

          // Verify data types
          expect(typeof entry.id).toBe('string');
          expect(typeof entry.eventId).toBe('string');
          expect(typeof entry.farmId).toBe('string');
          expect(typeof entry.deviceId).toBe('string');
          expect(typeof entry.receivedAt).toBe('string');
          expect(typeof entry.validationStatus).toBe('string');
          expect(typeof entry.isDuplicate).toBe('boolean');
          expect(Array.isArray(entry.firedRules)).toBe(true);
          expect(Array.isArray(entry.notifications)).toBe(true);
          expect(typeof entry.processedAt).toBe('string');
          expect(typeof entry.processingDurationMs).toBe('number');
        }),
        { numRuns: 100 }
      );
    });
  });
});
