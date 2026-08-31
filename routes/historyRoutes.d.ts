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
import { Router } from 'express';
export declare function createHistoryRouter(): Router;
//# sourceMappingURL=historyRoutes.d.ts.map