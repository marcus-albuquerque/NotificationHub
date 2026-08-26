/**
 * NotificationHub - Express Application
 *
 * Sets up the Express server with all routes and middleware
 */

import express, { Express, Request, Response, NextFunction } from 'express';
import { eventReceiver } from './services/event-receiver';
import { ApiResponse } from './types';

export function createApp(): Express {
  const app = express();

  // Middleware
  app.use(express.json({ limit: '10mb' }));

  // Request logging middleware
  app.use((req: Request, res: Response, next: NextFunction) => {
    const start = Date.now();
    res.on('finish', () => {
      const duration = Date.now() - start;
      console.log(`${req.method} ${req.path} ${res.statusCode} ${duration}ms`);
    });
    next();
  });

  // Health check endpoint
  app.get('/health', (_req: Request, res: Response) => {
    const response: ApiResponse<{ status: string }> = {
      success: true,
      data: { status: 'ok' },
      timestamp: new Date().toISOString(),
    };
    res.json(response);
  });

  /**
   * POST /api/events
   *
   * Receive a sensor event
   *
   * Request body:
   * {
   *   eventId: string (UUID)
   *   farmId: string
   *   deviceId: string
   *   sensorType: string (one of: AIR_TEMPERATURE, AIR_HUMIDITY, SOIL_MOISTURE, WATER_RESERVOIR_LEVEL, SILO_LEVEL, EQUIPMENT_STATUS)
   *   value: number | string
   *   unit: string
   *   timestamp: ISO8601 datetime
   * }
   *
   * Success response (200):
   * {
   *   success: true,
   *   data: { eventId: string },
   *   timestamp: ISO8601 datetime
   * }
   *
   * Error response (400):
   * {
   *   success: false,
   *   error: string,
   *   timestamp: ISO8601 datetime
   * }
   */
  app.post('/api/events', async (req: Request, res: Response) => {
    const result = await eventReceiver.receiveEvent(req.body);

    if (result.success) {
      const response: ApiResponse<{ eventId: string }> = {
        success: true,
        data: { eventId: result.eventId! },
        timestamp: new Date().toISOString(),
      };
      res.status(result.statusCode).json(response);
    } else {
      const response: ApiResponse<null> = {
        success: false,
        error: result.error,
        timestamp: new Date().toISOString(),
      };
      res.status(result.statusCode).json(response);
    }
  });

  // 404 handler
  app.use((req: Request, res: Response) => {
    const response: ApiResponse<null> = {
      success: false,
      error: `Route not found: ${req.method} ${req.path}`,
      timestamp: new Date().toISOString(),
    };
    res.status(404).json(response);
  });

  // Error handler
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    console.error('Unhandled error:', err);
    const response: ApiResponse<null> = {
      success: false,
      error: 'Internal server error',
      timestamp: new Date().toISOString(),
    };
    res.status(500).json(response);
  });

  return app;
}
