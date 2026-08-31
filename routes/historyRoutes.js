"use strict";
/**
 * NotificationHub - Event History Routes
 *
 * Implements REST API endpoints for querying and retrieving event history records.
 * Provides complete auditability through four main query patterns:
 * - By event ID: retrieve complete event history entry
 * - By farm ID: retrieve paginated farm events
 * - By device ID: retrieve paginated device events
 * - By search criteria: advanced filtering with date range, status, and sensor type
 *
 * Requirements: 11.6, 17.2, 17.4
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.createHistoryRouter = createHistoryRouter;
const express_1 = require("express");
const event_history_1 = require("../services/event-history");
function createHistoryRouter() {
    const router = (0, express_1.Router)();
    /**
     * GET /api/history/search
     *
     * Advanced search endpoint for event history with multiple filter criteria
     * MUST be registered before /:eventId to take precedence in routing
     *
     * Query parameters (all optional, but at least farmId is recommended):
     * - farmId: Filter by farm ID (required for practical queries)
     * - startDate: ISO8601 datetime for range start (inclusive, optional)
     * - endDate: ISO8601 datetime for range end (inclusive, optional)
     * - status: Filter by validation status ("valid" or "rejected", optional)
     * - isDuplicate: Filter by duplicate status ("true" or "false", optional)
     * - page: Page number (default: 1, minimum: 1)
     * - limit: Items per page (default: 20, maximum: 100)
     *
     * Success response (200):
     * {
     *   success: true,
     *   data: [{ EventHistoryEntry }, ...],
     *   pagination: {
     *     total: number (total records matching all filters)
     *     page: number (current page)
     *     limit: number (items per page)
     *     totalPages: number (total pages available)
     *   },
     *   appliedFilters: {
     *     farmId?: string
     *     startDate?: ISO8601 datetime
     *     endDate?: ISO8601 datetime
     *     status?: "valid" | "rejected"
     *     isDuplicate?: boolean
     *   },
     *   timestamp: ISO8601 datetime
     * }
     *
     * Error response (400|500):
     * {
     *   success: false,
     *   error: string,
     *   timestamp: ISO8601 datetime
     * }
     *
     * Requirement: 11.6 - EventHistory SHALL be persistently queryable
     * Requirement: 17.2 - EventHistory SHALL be consultable via API
     * Requirement: 17.4 - EventHistory SHALL be queried by period of time
     *
     * @returns Filtered and paginated EventHistoryEntries based on search criteria
     */
    router.get('/search', async (req, res) => {
        try {
            const farmId = req.query.farmId;
            const startDate = req.query.startDate;
            const endDate = req.query.endDate;
            const status = req.query.status;
            const isDuplicateStr = req.query.isDuplicate;
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 20;
            // Validate pagination parameters
            if (page < 1) {
                const response = {
                    success: false,
                    error: 'page parameter must be at least 1',
                    timestamp: new Date().toISOString(),
                };
                res.status(400).json(response);
                return;
            }
            if (limit < 1 || limit > 100) {
                const response = {
                    success: false,
                    error: 'limit parameter must be between 1 and 100',
                    timestamp: new Date().toISOString(),
                };
                res.status(400).json(response);
                return;
            }
            // Validate status filter if provided
            if (status && status !== 'valid' && status !== 'rejected') {
                const response = {
                    success: false,
                    error: 'status parameter must be "valid" or "rejected"',
                    timestamp: new Date().toISOString(),
                };
                res.status(400).json(response);
                return;
            }
            // Validate isDuplicate filter if provided
            let isDuplicate;
            if (isDuplicateStr) {
                if (isDuplicateStr !== 'true' && isDuplicateStr !== 'false') {
                    const response = {
                        success: false,
                        error: 'isDuplicate parameter must be "true" or "false"',
                        timestamp: new Date().toISOString(),
                    };
                    res.status(400).json(response);
                    return;
                }
                isDuplicate = isDuplicateStr === 'true';
            }
            // Validate date range if provided
            if (startDate || endDate) {
                if (!startDate || !endDate) {
                    const response = {
                        success: false,
                        error: 'Both startDate and endDate must be provided for date range queries',
                        timestamp: new Date().toISOString(),
                    };
                    res.status(400).json(response);
                    return;
                }
                try {
                    const start = new Date(startDate);
                    const end = new Date(endDate);
                    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
                        const response = {
                            success: false,
                            error: 'Invalid date format. Expected ISO8601 format (e.g., 2024-01-15T14:30:00Z)',
                            timestamp: new Date().toISOString(),
                        };
                        res.status(400).json(response);
                        return;
                    }
                    if (start > end) {
                        const response = {
                            success: false,
                            error: 'startDate must be before or equal to endDate',
                            timestamp: new Date().toISOString(),
                        };
                        res.status(400).json(response);
                        return;
                    }
                }
                catch (error) {
                    const response = {
                        success: false,
                        error: 'Invalid date format',
                        timestamp: new Date().toISOString(),
                    };
                    res.status(400).json(response);
                    return;
                }
            }
            // If date range is specified, use date range query
            // Otherwise, use farm-based query with optional status filter
            const offset = (page - 1) * limit;
            let result;
            if (startDate && endDate) {
                // Date range query
                if (!farmId) {
                    const response = {
                        success: false,
                        error: 'farmId is required for date range queries',
                        timestamp: new Date().toISOString(),
                    };
                    res.status(400).json(response);
                    return;
                }
                result = await event_history_1.eventHistory.getByDateRange(farmId, startDate, endDate, limit, offset);
            }
            else if (status) {
                // Status-based query
                if (!farmId) {
                    const response = {
                        success: false,
                        error: 'farmId is required for status filter queries',
                        timestamp: new Date().toISOString(),
                    };
                    res.status(400).json(response);
                    return;
                }
                result = await event_history_1.eventHistory.getByValidationStatus(farmId, status, limit, offset);
            }
            else if (isDuplicate !== undefined) {
                // Duplicate filter query
                if (!farmId) {
                    const response = {
                        success: false,
                        error: 'farmId is required for duplicate filter queries',
                        timestamp: new Date().toISOString(),
                    };
                    res.status(400).json(response);
                    return;
                }
                if (isDuplicate) {
                    result = await event_history_1.eventHistory.getDuplicates(farmId, limit, offset);
                }
                else {
                    // Query non-duplicate events (requires farm-based query)
                    result = await event_history_1.eventHistory.getByFarmId(farmId, limit, offset);
                }
            }
            else {
                // Default: query by farm if provided
                if (!farmId) {
                    const response = {
                        success: false,
                        error: 'At least one filter parameter (farmId, date range, status, or isDuplicate) is required',
                        timestamp: new Date().toISOString(),
                    };
                    res.status(400).json(response);
                    return;
                }
                result = await event_history_1.eventHistory.getByFarmId(farmId, limit, offset);
            }
            const totalPages = Math.ceil(result.total / limit);
            // Build applied filters object
            const appliedFilters = {};
            if (farmId)
                appliedFilters.farmId = farmId;
            if (startDate)
                appliedFilters.startDate = startDate;
            if (endDate)
                appliedFilters.endDate = endDate;
            if (status)
                appliedFilters.status = status;
            if (isDuplicate !== undefined)
                appliedFilters.isDuplicate = isDuplicate;
            const response = {
                success: true,
                data: result.entries,
                timestamp: new Date().toISOString(),
            };
            // Return search results with applied filters
            res.json({
                ...response,
                pagination: {
                    total: result.total,
                    page,
                    limit,
                    totalPages,
                },
                appliedFilters,
            });
        }
        catch (error) {
            console.error('Error searching event history:', error);
            const response = {
                success: false,
                error: 'Failed to search event history',
                timestamp: new Date().toISOString(),
            };
            res.status(500).json(response);
        }
    });
    /**
     * GET /api/history/:eventId
     *
     * Retrieve complete event history entry for a specific event
     *
     * Path parameters:
     * - eventId: The unique event identifier (UUID)
     *
     * Success response (200):
     * {
     *   success: true,
     *   data: {
     *     id: string (UUID)
     *     eventId: string
     *     farmId: string
     *     deviceId: string
     *     receivedAt: ISO8601 datetime
     *     validationStatus: "valid" | "rejected"
     *     validationError?: string
     *     isDuplicate: boolean
     *     previousEventId?: string
     *     firedRules: array of { ruleId, ruleName, firedAt }
     *     notifications: array of { notificationId, message, generatedAt, dispatchStatus, dispatchError }
     *     processedAt: ISO8601 datetime
     *     processingDurationMs: number
     *   },
     *   timestamp: ISO8601 datetime
     * }
     *
     * Error response (404):
     * {
     *   success: false,
     *   error: "Event history not found",
     *   timestamp: ISO8601 datetime
     * }
     *
     * Requirement: 11.1 - EventHistory SHALL be consultable by eventId
     * Requirement: 17.2 - EventHistory SHALL be consultable via API
     *
     * @param eventId - The unique event identifier
     * @returns Complete EventHistoryEntry with all pipeline stages
     */
    router.get('/:eventId', async (req, res) => {
        try {
            const { eventId } = req.params;
            // Validate eventId is provided and non-empty
            if (!eventId || eventId.trim() === '') {
                const response = {
                    success: false,
                    error: 'eventId parameter is required and cannot be empty',
                    timestamp: new Date().toISOString(),
                };
                res.status(400).json(response);
                return;
            }
            const entry = await event_history_1.eventHistory.getByEventId(eventId);
            if (!entry) {
                const response = {
                    success: false,
                    error: 'Event history not found for the provided eventId',
                    timestamp: new Date().toISOString(),
                };
                res.status(404).json(response);
                return;
            }
            const response = {
                success: true,
                data: entry,
                timestamp: new Date().toISOString(),
            };
            res.json(response);
        }
        catch (error) {
            console.error('Error fetching event history by eventId:', error);
            const response = {
                success: false,
                error: 'Failed to retrieve event history',
                timestamp: new Date().toISOString(),
            };
            res.status(500).json(response);
        }
    });
    /**
     * GET /api/history/farm/:farmId
     *
     * Retrieve paginated event history for a specific farm
     *
     * Path parameters:
     * - farmId: The unique farm identifier
     *
     * Query parameters:
     * - page: Page number (default: 1, minimum: 1)
     * - limit: Items per page (default: 20, maximum: 100)
     * - status: Filter by validation status ("valid" or "rejected", optional)
     *
     * Success response (200):
     * {
     *   success: true,
     *   data: [{ EventHistoryEntry }, ...],
     *   pagination: {
     *     total: number (total records matching filters)
     *     page: number (current page)
     *     limit: number (items per page)
     *     totalPages: number (total pages available)
     *   },
     *   timestamp: ISO8601 datetime
     * }
     *
     * Error response (400|404|500):
     * {
     *   success: false,
     *   error: string,
     *   timestamp: ISO8601 datetime
     * }
     *
     * Requirement: 11.2 - EventHistory SHALL register each rule dispatched with timestamp
     * Requirement: 11.3 - EventHistory SHALL register each notification generated
     * Requirement: 17.2 - EventHistory SHALL be consultable via API
     *
     * @param farmId - The unique farm identifier
     * @returns Paginated list of EventHistoryEntries for the farm
     */
    router.get('/farm/:farmId', async (req, res) => {
        try {
            const { farmId } = req.params;
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 20;
            const status = req.query.status;
            // Validate farmId
            if (!farmId || farmId.trim() === '') {
                const response = {
                    success: false,
                    error: 'farmId parameter is required and cannot be empty',
                    timestamp: new Date().toISOString(),
                };
                res.status(400).json(response);
                return;
            }
            // Validate pagination parameters
            if (page < 1) {
                const response = {
                    success: false,
                    error: 'page parameter must be at least 1',
                    timestamp: new Date().toISOString(),
                };
                res.status(400).json(response);
                return;
            }
            if (limit < 1 || limit > 100) {
                const response = {
                    success: false,
                    error: 'limit parameter must be between 1 and 100',
                    timestamp: new Date().toISOString(),
                };
                res.status(400).json(response);
                return;
            }
            // Validate status filter if provided
            if (status && status !== 'valid' && status !== 'rejected') {
                const response = {
                    success: false,
                    error: 'status parameter must be "valid" or "rejected"',
                    timestamp: new Date().toISOString(),
                };
                res.status(400).json(response);
                return;
            }
            const offset = (page - 1) * limit;
            // Get results based on filters
            let result;
            if (status) {
                // Query by validation status
                result = await event_history_1.eventHistory.getByValidationStatus(farmId, status, limit, offset);
            }
            else {
                // Query by farm ID (no additional filters in base implementation)
                result = await event_history_1.eventHistory.getByFarmId(farmId, limit, offset);
            }
            const totalPages = Math.ceil(result.total / limit);
            const response = {
                success: true,
                data: result.entries,
                timestamp: new Date().toISOString(),
            };
            // Return paginated response
            res.json({
                ...response,
                pagination: {
                    total: result.total,
                    page,
                    limit,
                    totalPages,
                },
            });
        }
        catch (error) {
            console.error('Error fetching event history by farmId:', error);
            const response = {
                success: false,
                error: 'Failed to retrieve event history for farm',
                timestamp: new Date().toISOString(),
            };
            res.status(500).json(response);
        }
    });
    /**
     * GET /api/history/device/:deviceId
     *
     * Retrieve paginated event history for a specific device
     *
     * Path parameters:
     * - deviceId: The unique device identifier
     *
     * Query parameters:
     * - page: Page number (default: 1, minimum: 1)
     * - limit: Items per page (default: 20, maximum: 100)
     * - status: Filter by validation status ("valid" or "rejected", optional)
     *
     * Success response (200):
     * {
     *   success: true,
     *   data: [{ EventHistoryEntry }, ...],
     *   pagination: {
     *     total: number (total records matching filters)
     *     page: number (current page)
     *     limit: number (items per page)
     *     totalPages: number (total pages available)
     *   },
     *   timestamp: ISO8601 datetime
     * }
     *
     * Error response (400|404|500):
     * {
     *   success: false,
     *   error: string,
     *   timestamp: ISO8601 datetime
     * }
     *
     * Requirement: 11.2 - EventHistory SHALL register each rule dispatched with timestamp
     * Requirement: 11.3 - EventHistory SHALL register each notification generated
     * Requirement: 17.2 - EventHistory SHALL be consultable via API
     *
     * @param deviceId - The unique device identifier
     * @returns Paginated list of EventHistoryEntries for the device
     */
    router.get('/device/:deviceId', async (req, res) => {
        try {
            const { deviceId } = req.params;
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 20;
            const status = req.query.status;
            // Validate deviceId
            if (!deviceId || deviceId.trim() === '') {
                const response = {
                    success: false,
                    error: 'deviceId parameter is required and cannot be empty',
                    timestamp: new Date().toISOString(),
                };
                res.status(400).json(response);
                return;
            }
            // Validate pagination parameters
            if (page < 1) {
                const response = {
                    success: false,
                    error: 'page parameter must be at least 1',
                    timestamp: new Date().toISOString(),
                };
                res.status(400).json(response);
                return;
            }
            if (limit < 1 || limit > 100) {
                const response = {
                    success: false,
                    error: 'limit parameter must be between 1 and 100',
                    timestamp: new Date().toISOString(),
                };
                res.status(400).json(response);
                return;
            }
            // Validate status filter if provided
            if (status && status !== 'valid' && status !== 'rejected') {
                const response = {
                    success: false,
                    error: 'status parameter must be "valid" or "rejected"',
                    timestamp: new Date().toISOString(),
                };
                res.status(400).json(response);
                return;
            }
            const offset = (page - 1) * limit;
            // Query by device ID
            const result = await event_history_1.eventHistory.getByDeviceId(deviceId, limit, offset);
            const totalPages = Math.ceil(result.total / limit);
            const response = {
                success: true,
                data: result.entries,
                timestamp: new Date().toISOString(),
            };
            // Return paginated response
            res.json({
                ...response,
                pagination: {
                    total: result.total,
                    page,
                    limit,
                    totalPages,
                },
            });
        }
        catch (error) {
            console.error('Error fetching event history by deviceId:', error);
            const response = {
                success: false,
                error: 'Failed to retrieve event history for device',
                timestamp: new Date().toISOString(),
            };
            res.status(500).json(response);
        }
    });
    return router;
}
//# sourceMappingURL=historyRoutes.js.map