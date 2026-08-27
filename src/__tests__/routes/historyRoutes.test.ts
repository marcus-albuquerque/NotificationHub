/**
 * Tests for Event History Routes
 *
 * Tests the REST API endpoints for querying and retrieving event history records:
 * - GET /api/history/:eventId - retrieve complete event history entry
 * - GET /api/history/farm/:farmId - retrieve paginated farm events
 * - GET /api/history/device/:deviceId - retrieve paginated device events
 * - GET /api/history/search - search events by criteria
 *
 * Requirements: 11.6, 17.2, 17.4
 *
 * Note: These are unit tests that mock the EventHistory service.
 * For full integration tests, a database setup would be needed.
 */

import request from 'supertest';
import { createApp } from '../../app';
import { Express } from 'express';
import { v4 as uuidv4 } from 'uuid';

// Mock the EventHistory service
jest.mock('../../services/event-history', () => {
  return {
    eventHistory: {
      getByEventId: jest.fn(),
      getByFarmId: jest.fn(),
      getByDeviceId: jest.fn(),
      getByDateRange: jest.fn(),
      getByValidationStatus: jest.fn(),
      getDuplicates: jest.fn(),
    },
  };
});

import { eventHistory } from '../../services/event-history';

describe('Event History Routes', () => {
  let app: Express;

  // Test data
  const testEventId = `evt-${uuidv4()}`;
  const testFarmId = 'farm-test-001';
  const testDeviceId = 'device-test-001';
  const now = new Date().toISOString();

  const mockHistoryEntry = {
    id: uuidv4(),
    eventId: testEventId,
    farmId: testFarmId,
    deviceId: testDeviceId,
    receivedAt: now,
    validationStatus: 'valid' as const,
    isDuplicate: false,
    firedRules: [
      {
        ruleId: 'HIGH_AIR_TEMPERATURE',
        ruleName: 'High Air Temperature',
        firedAt: now,
      },
    ],
    notifications: [
      {
        notificationId: uuidv4(),
        message: 'Temperature is high: 36°C',
        generatedAt: now,
        dispatchStatus: 'sent' as const,
      },
    ],
    processedAt: now,
    processingDurationMs: 100,
  };

  beforeAll(() => {
    app = createApp();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/history/:eventId', () => {
    it('should retrieve event history by eventId', async () => {
      (eventHistory.getByEventId as jest.Mock).mockResolvedValueOnce(mockHistoryEntry);

      const response = await request(app).get(`/api/history/${testEventId}`).expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.eventId).toBe(testEventId);
      expect(response.body.data.farmId).toBe(testFarmId);
      expect(response.body.data.validationStatus).toBe('valid');
      expect(response.body.timestamp).toBeDefined();
      expect(eventHistory.getByEventId).toHaveBeenCalledWith(testEventId);
    });

    it('should return 404 for non-existent eventId', async () => {
      (eventHistory.getByEventId as jest.Mock).mockResolvedValueOnce(null);

      const response = await request(app)
        .get(`/api/history/non-existent-event-${uuidv4()}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('not found');
    });
  });

  describe('GET /api/history/farm/:farmId', () => {
    it('should retrieve paginated farm events', async () => {
      (eventHistory.getByFarmId as jest.Mock).mockResolvedValueOnce({
        entries: [mockHistoryEntry],
        total: 1,
      });

      const response = await request(app).get(`/api/history/farm/${testFarmId}`).expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.pagination).toBeDefined();
      expect(response.body.pagination.page).toBe(1);
      expect(response.body.pagination.limit).toBe(20);
      expect(response.body.timestamp).toBeDefined();
    });

    it('should support custom pagination parameters', async () => {
      (eventHistory.getByFarmId as jest.Mock).mockResolvedValueOnce({
        entries: [mockHistoryEntry],
        total: 1,
      });

      const response = await request(app)
        .get(`/api/history/farm/${testFarmId}?page=2&limit=10`)
        .expect(200);

      expect(response.body.pagination.page).toBe(2);
      expect(response.body.pagination.limit).toBe(10);
    });

    it('should filter by validation status', async () => {
      (eventHistory.getByValidationStatus as jest.Mock).mockResolvedValueOnce({
        entries: [mockHistoryEntry],
        total: 1,
      });

      const response = await request(app)
        .get(`/api/history/farm/${testFarmId}?status=valid`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(eventHistory.getByValidationStatus).toHaveBeenCalledWith(testFarmId, 'valid', 20, 0);
    });

    it('should reject search without any filters', async () => {
      const response = await request(app).get('/api/history/search').expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('filter');
    });
  });

  describe('GET /api/history/device/:deviceId', () => {
    it('should retrieve paginated device events', async () => {
      (eventHistory.getByDeviceId as jest.Mock).mockResolvedValueOnce({
        entries: [mockHistoryEntry],
        total: 1,
      });

      const response = await request(app).get(`/api/history/device/${testDeviceId}`).expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.pagination).toBeDefined();
      expect(response.body.pagination.page).toBe(1);
      expect(response.body.pagination.limit).toBe(20);
    });

    it('should support custom pagination parameters', async () => {
      (eventHistory.getByDeviceId as jest.Mock).mockResolvedValueOnce({
        entries: [mockHistoryEntry],
        total: 1,
      });

      const response = await request(app)
        .get(`/api/history/device/${testDeviceId}?page=1&limit=5`)
        .expect(200);

      expect(response.body.pagination.limit).toBe(5);
    });
  });

  describe('GET /api/history/search', () => {
    it('should search by farmId', async () => {
      (eventHistory.getByFarmId as jest.Mock).mockResolvedValueOnce({
        entries: [mockHistoryEntry],
        total: 1,
      });

      const response = await request(app)
        .get(`/api/history/search?farmId=${testFarmId}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.appliedFilters).toBeDefined();
      expect(response.body.appliedFilters.farmId).toBe(testFarmId);
    });

    it('should search with date range', async () => {
      const startDate = new Date(new Date().getTime() - 24 * 60 * 60 * 1000).toISOString();
      const endDate = new Date().toISOString();

      (eventHistory.getByDateRange as jest.Mock).mockResolvedValueOnce({
        entries: [mockHistoryEntry],
        total: 1,
      });

      const response = await request(app)
        .get(`/api/history/search?farmId=${testFarmId}&startDate=${startDate}&endDate=${endDate}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.appliedFilters.startDate).toBe(startDate);
      expect(response.body.appliedFilters.endDate).toBe(endDate);
    });

    it('should search by validation status', async () => {
      (eventHistory.getByValidationStatus as jest.Mock).mockResolvedValueOnce({
        entries: [mockHistoryEntry],
        total: 1,
      });

      const response = await request(app)
        .get(`/api/history/search?farmId=${testFarmId}&status=valid`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.appliedFilters.status).toBe('valid');
    });

    it('should search by duplicate status', async () => {
      (eventHistory.getDuplicates as jest.Mock).mockResolvedValueOnce({
        entries: [mockHistoryEntry],
        total: 1,
      });

      const response = await request(app)
        .get(`/api/history/search?farmId=${testFarmId}&isDuplicate=true`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.appliedFilters.isDuplicate).toBe(true);
    });

    it('should support pagination in search results', async () => {
      (eventHistory.getByFarmId as jest.Mock).mockResolvedValueOnce({
        entries: [mockHistoryEntry],
        total: 1,
      });

      const response = await request(app)
        .get(`/api/history/search?farmId=${testFarmId}&page=1&limit=10`)
        .expect(200);

      expect(response.body.pagination).toBeDefined();
      expect(response.body.pagination.page).toBe(1);
      expect(response.body.pagination.limit).toBe(10);
    });
  });
});
