"use strict";
/**
 * NotificationHub - Express Application
 *
 * Sets up the Express server with all routes and middleware
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createApp = createApp;
const express_1 = __importDefault(require("express"));
const database_1 = require("./config/database");
const event_receiver_1 = require("./services/event-receiver");
const historyRoutes_1 = require("./routes/historyRoutes");
function createApp() {
    const app = (0, express_1.default)();
    // Middleware
    app.use(express_1.default.json({ limit: '10mb' }));
    // Request logging middleware
    app.use((req, res, next) => {
        const start = Date.now();
        res.on('finish', () => {
            const duration = Date.now() - start;
            console.log(`${req.method} ${req.path} ${res.statusCode} ${duration}ms`);
        });
        next();
    });
    // Health check endpoint
    app.get('/health', (_req, res) => {
        const response = {
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
    app.post('/api/events', async (req, res) => {
        const result = await event_receiver_1.eventReceiver.receiveEvent(req.body);
        if (result.success) {
            const response = {
                success: true,
                data: { eventId: result.eventId },
                timestamp: new Date().toISOString(),
            };
            res.status(result.statusCode).json(response);
        }
        else {
            const response = {
                success: false,
                error: result.error,
                timestamp: new Date().toISOString(),
            };
            res.status(result.statusCode).json(response);
        }
    });
    /**
     * POST /api/farms
     * Create a new farm
     *
     * Request body:
     * {
     *   farmId: string (unique identifier)
     *   name: string
     *   producerId: string (must exist in producers table)
     * }
     *
     * Success response (201):
     * {
     *   success: true,
     *   data: { farm_id, name, producer_id, created_at, updated_at },
     *   timestamp: ISO8601 datetime
     * }
     *
     * Error response (400|409|500):
     * {
     *   success: false,
     *   error: string,
     *   timestamp: ISO8601 datetime
     * }
     */
    app.post('/api/farms', async (req, res) => {
        try {
            const { farmId, name, producerId } = req.body;
            // Validate required fields
            if (!farmId || !name || !producerId) {
                const response = {
                    success: false,
                    error: 'Missing required fields: farmId, name, producerId',
                    timestamp: new Date().toISOString(),
                };
                res.status(400).json(response);
                return;
            }
            // Validate field types
            if (typeof farmId !== 'string' ||
                typeof name !== 'string' ||
                typeof producerId !== 'string') {
                const response = {
                    success: false,
                    error: 'Invalid field types: farmId, name, and producerId must be strings',
                    timestamp: new Date().toISOString(),
                };
                res.status(400).json(response);
                return;
            }
            // Validate non-empty strings
            if (farmId.trim() === '' || name.trim() === '' || producerId.trim() === '') {
                const response = {
                    success: false,
                    error: 'Field values cannot be empty strings',
                    timestamp: new Date().toISOString(),
                };
                res.status(400).json(response);
                return;
            }
            const pool = (0, database_1.getPool)();
            // Check if producer exists
            const producerResult = await pool.query('SELECT * FROM producers WHERE producer_id = $1', [
                producerId,
            ]);
            if (producerResult.rows.length === 0) {
                const response = {
                    success: false,
                    error: 'Producer not found',
                    timestamp: new Date().toISOString(),
                };
                res.status(400).json(response);
                return;
            }
            // Check if farm already exists
            const existingFarm = await pool.query('SELECT * FROM farms WHERE farm_id = $1', [farmId]);
            if (existingFarm.rows.length > 0) {
                const response = {
                    success: false,
                    error: 'Farm with this ID already exists',
                    timestamp: new Date().toISOString(),
                };
                res.status(409).json(response);
                return;
            }
            // Insert new farm
            const insertResult = await pool.query(`INSERT INTO farms (farm_id, name, producer_id, created_at, updated_at)
         VALUES ($1, $2, $3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
         RETURNING farm_id, name, producer_id, created_at, updated_at`, [farmId, name, producerId]);
            const farm = insertResult.rows[0];
            const response = {
                success: true,
                data: {
                    farm_id: farm.farm_id,
                    name: farm.name,
                    producer_id: farm.producer_id,
                    created_at: farm.created_at,
                    updated_at: farm.updated_at,
                },
                timestamp: new Date().toISOString(),
            };
            res.status(201).json(response);
        }
        catch (error) {
            console.error('Error creating farm:', error);
            const response = {
                success: false,
                error: 'Failed to create farm',
                timestamp: new Date().toISOString(),
            };
            res.status(500).json(response);
        }
    });
    /**
     * GET /api/farms
     * Get all farms with device counts and pagination
     *
     * Query parameters:
     * - page: page number (default: 1)
     * - limit: items per page (default: 20)
     *
     * Success response (200):
     * {
     *   success: true,
     *   data: [{ farm_id, name, producer_id, device_count, created_at, updated_at }, ...],
     *   total: number,
     *   page: number,
     *   limit: number,
     *   totalPages: number,
     *   timestamp: ISO8601 datetime
     * }
     */
    app.get('/api/farms', async (req, res) => {
        try {
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 20;
            const offset = (page - 1) * limit;
            const pool = (0, database_1.getPool)();
            // Get total count
            const countResult = await pool.query('SELECT COUNT(*) as total FROM farms');
            const total = parseInt(countResult.rows[0].total, 10);
            // Get paginated results
            const result = await pool.query(`SELECT 
          f.farm_id,
          f.name,
          f.producer_id,
          f.created_at,
          f.updated_at,
          COUNT(d.device_id) as device_count
        FROM farms f
        LEFT JOIN devices d ON f.farm_id = d.farm_id
        GROUP BY f.farm_id, f.name, f.producer_id, f.created_at, f.updated_at
        ORDER BY f.name
        LIMIT $1 OFFSET $2`, [limit, offset]);
            const farms = result.rows.map((row) => ({
                farm_id: row.farm_id,
                name: row.name,
                producer_id: row.producer_id,
                created_at: row.created_at,
                updated_at: row.updated_at,
                device_count: parseInt(row.device_count, 10),
            }));
            const totalPages = Math.ceil(total / limit);
            res.json({
                success: true,
                data: farms,
                total,
                page,
                limit,
                totalPages,
                timestamp: new Date().toISOString(),
            });
        }
        catch (error) {
            console.error('Error fetching farms:', error);
            const response = {
                success: false,
                error: 'Failed to fetch farms',
                timestamp: new Date().toISOString(),
            };
            res.status(500).json(response);
        }
    });
    /**
     * GET /api/farms/:farmId
     * Get a specific farm by ID
     */
    app.get('/api/farms/:farmId', async (req, res) => {
        try {
            const { farmId } = req.params;
            const pool = (0, database_1.getPool)();
            const result = await pool.query('SELECT * FROM farms WHERE farm_id = $1', [farmId]);
            if (result.rows.length === 0) {
                const response = {
                    success: false,
                    error: 'Farm not found',
                    timestamp: new Date().toISOString(),
                };
                res.status(404).json(response);
                return;
            }
            const farm = result.rows[0];
            const response = {
                success: true,
                data: {
                    farm_id: farm.farm_id,
                    name: farm.name,
                    producer_id: farm.producer_id,
                    created_at: farm.created_at,
                    updated_at: farm.updated_at,
                },
                timestamp: new Date().toISOString(),
            };
            res.json(response);
        }
        catch (error) {
            console.error('Error fetching farm:', error);
            const response = {
                success: false,
                error: 'Failed to fetch farm',
                timestamp: new Date().toISOString(),
            };
            res.status(500).json(response);
        }
    });
    /**
     * GET /api/farms/:farmId/devices
     * Get all devices for a farm
     */
    app.get('/api/farms/:farmId/devices', async (req, res) => {
        try {
            const { farmId } = req.params;
            const pool = (0, database_1.getPool)();
            const result = await pool.query('SELECT * FROM devices WHERE farm_id = $1 ORDER BY sensor_type, name', [farmId]);
            const devices = result.rows.map((row) => ({
                device_id: row.device_id,
                farm_id: row.farm_id,
                name: row.name,
                sensor_type: row.sensor_type,
                status: row.status,
                last_reading_at: row.last_reading_at,
                last_value: row.last_value,
                created_at: row.created_at,
                updated_at: row.updated_at,
            }));
            const response = {
                success: true,
                data: devices,
                timestamp: new Date().toISOString(),
            };
            res.json(response);
        }
        catch (error) {
            console.error('Error fetching devices:', error);
            const response = {
                success: false,
                error: 'Failed to fetch devices',
                timestamp: new Date().toISOString(),
            };
            res.status(500).json(response);
        }
    });
    /**
     * GET /api/farms/:farmId/devices/:deviceId
     * Get a specific device
     */
    app.get('/api/farms/:farmId/devices/:deviceId', async (req, res) => {
        try {
            const { farmId, deviceId } = req.params;
            const pool = (0, database_1.getPool)();
            const result = await pool.query('SELECT * FROM devices WHERE device_id = $1 AND farm_id = $2', [deviceId, farmId]);
            if (result.rows.length === 0) {
                const response = {
                    success: false,
                    error: 'Device not found',
                    timestamp: new Date().toISOString(),
                };
                res.status(404).json(response);
                return;
            }
            const device = result.rows[0];
            const response = {
                success: true,
                data: {
                    device_id: device.device_id,
                    farm_id: device.farm_id,
                    name: device.name,
                    sensor_type: device.sensor_type,
                    status: device.status,
                    last_reading_at: device.last_reading_at,
                    last_value: device.last_value,
                    created_at: device.created_at,
                    updated_at: device.updated_at,
                },
                timestamp: new Date().toISOString(),
            };
            res.json(response);
        }
        catch (error) {
            console.error('Error fetching device:', error);
            const response = {
                success: false,
                error: 'Failed to fetch device',
                timestamp: new Date().toISOString(),
            };
            res.status(500).json(response);
        }
    });
    /**
     * POST /api/producers
     * Create a new producer
     *
     * Request body:
     * {
     *   producerId: string (unique identifier)
     *   name: string
     *   phone: string
     *   email?: string
     *   notificationPreferences?: {
     *     channels: string[]
     *     quietHours?: string (format: "HH:MM-HH:MM")
     *   }
     * }
     *
     * Success response (201):
     * {
     *   success: true,
     *   data: { producer_id, name, phone, email, notification_preferences, created_at, updated_at },
     *   timestamp: ISO8601 datetime
     * }
     *
     * Error response (400|409|500):
     * {
     *   success: false,
     *   error: string,
     *   timestamp: ISO8601 datetime
     * }
     */
    app.post('/api/producers', async (req, res) => {
        try {
            const { producerId, name, phone, email, notificationPreferences } = req.body;
            // Validate required fields
            if (!producerId || !name || !phone) {
                const response = {
                    success: false,
                    error: 'Missing required fields: producerId, name, phone',
                    timestamp: new Date().toISOString(),
                };
                res.status(400).json(response);
                return;
            }
            // Validate field types
            if (typeof producerId !== 'string' || typeof name !== 'string' || typeof phone !== 'string') {
                const response = {
                    success: false,
                    error: 'Invalid field types: producerId, name, and phone must be strings',
                    timestamp: new Date().toISOString(),
                };
                res.status(400).json(response);
                return;
            }
            // Validate non-empty strings
            if (producerId.trim() === '' || name.trim() === '' || phone.trim() === '') {
                const response = {
                    success: false,
                    error: 'Field values cannot be empty strings',
                    timestamp: new Date().toISOString(),
                };
                res.status(400).json(response);
                return;
            }
            // Validate email format if provided
            if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
                const response = {
                    success: false,
                    error: 'Invalid email format',
                    timestamp: new Date().toISOString(),
                };
                res.status(400).json(response);
                return;
            }
            const pool = (0, database_1.getPool)();
            // Check if producer already exists
            const existingProducer = await pool.query('SELECT * FROM producers WHERE producer_id = $1', [
                producerId,
            ]);
            if (existingProducer.rows.length > 0) {
                const response = {
                    success: false,
                    error: 'Producer with this ID already exists',
                    timestamp: new Date().toISOString(),
                };
                res.status(409).json(response);
                return;
            }
            // Set default notification preferences if not provided
            const prefs = notificationPreferences || {
                channels: ['WhatsApp'],
                quietHours: '22:00-06:00',
            };
            // Insert new producer
            const insertResult = await pool.query(`INSERT INTO producers (producer_id, name, phone, email, notification_preferences, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
         RETURNING producer_id, name, phone, email, notification_preferences, created_at, updated_at`, [producerId, name, phone, email || null, JSON.stringify(prefs)]);
            const producer = insertResult.rows[0];
            const response = {
                success: true,
                data: {
                    producer_id: producer.producer_id,
                    name: producer.name,
                    phone: producer.phone,
                    email: producer.email,
                    notification_preferences: producer.notification_preferences,
                    created_at: producer.created_at,
                    updated_at: producer.updated_at,
                },
                timestamp: new Date().toISOString(),
            };
            res.status(201).json(response);
        }
        catch (error) {
            console.error('Error creating producer:', error);
            const response = {
                success: false,
                error: 'Failed to create producer',
                timestamp: new Date().toISOString(),
            };
            res.status(500).json(response);
        }
    });
    /**
     * GET /api/producers
     * Get all producers with pagination
     *
     * Query parameters:
     * - page: page number (default: 1)
     * - limit: items per page (default: 20)
     *
     * Success response (200):
     * {
     *   success: true,
     *   data: [{ producer_id, name, phone, email, notification_preferences, created_at, updated_at }, ...],
     *   total: number,
     *   page: number,
     *   limit: number,
     *   totalPages: number,
     *   timestamp: ISO8601 datetime
     * }
     */
    app.get('/api/producers', async (req, res) => {
        try {
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 20;
            const offset = (page - 1) * limit;
            const pool = (0, database_1.getPool)();
            // Get total count
            const countResult = await pool.query('SELECT COUNT(*) as total FROM producers');
            const total = parseInt(countResult.rows[0].total, 10);
            // Get paginated results
            const result = await pool.query(`SELECT producer_id, name, phone, email, notification_preferences, created_at, updated_at
         FROM producers
         ORDER BY name
         LIMIT $1 OFFSET $2`, [limit, offset]);
            const producers = result.rows.map((row) => ({
                producer_id: row.producer_id,
                name: row.name,
                phone: row.phone,
                email: row.email,
                notification_preferences: row.notification_preferences,
                created_at: row.created_at,
                updated_at: row.updated_at,
            }));
            const totalPages = Math.ceil(total / limit);
            res.json({
                success: true,
                data: producers,
                total,
                page,
                limit,
                totalPages,
                timestamp: new Date().toISOString(),
            });
        }
        catch (error) {
            console.error('Error fetching producers:', error);
            const response = {
                success: false,
                error: 'Failed to fetch producers',
                timestamp: new Date().toISOString(),
            };
            res.status(500).json(response);
        }
    });
    /**
     * GET /api/producers/:producerId
     * Get a specific producer
     */
    app.get('/api/producers/:producerId', async (req, res) => {
        try {
            const { producerId } = req.params;
            const pool = (0, database_1.getPool)();
            const result = await pool.query('SELECT * FROM producers WHERE producer_id = $1', [
                producerId,
            ]);
            if (result.rows.length === 0) {
                const response = {
                    success: false,
                    error: 'Producer not found',
                    timestamp: new Date().toISOString(),
                };
                res.status(404).json(response);
                return;
            }
            const producer = result.rows[0];
            const response = {
                success: true,
                data: {
                    producer_id: producer.producer_id,
                    name: producer.name,
                    phone: producer.phone,
                    email: producer.email,
                    notification_preferences: producer.notification_preferences,
                    created_at: producer.created_at,
                    updated_at: producer.updated_at,
                },
                timestamp: new Date().toISOString(),
            };
            res.json(response);
        }
        catch (error) {
            console.error('Error fetching producer:', error);
            const response = {
                success: false,
                error: 'Failed to fetch producer',
                timestamp: new Date().toISOString(),
            };
            res.status(500).json(response);
        }
    });
    /**
     * GET /api/notifications
     * Get all notifications with pagination and optional filters
     */
    app.get('/api/notifications', async (req, res) => {
        try {
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 20;
            const offset = (page - 1) * limit;
            const pool = (0, database_1.getPool)();
            // Base query
            let countQuery = 'SELECT COUNT(*) as total FROM notifications';
            let dataQuery = `SELECT * FROM notifications ORDER BY generated_at DESC LIMIT $1 OFFSET $2`;
            const countResult = await pool.query(countQuery);
            const total = parseInt(countResult.rows[0].total, 10);
            const dataResult = await pool.query(dataQuery, [limit, offset]);
            const notifications = dataResult.rows.map((row) => ({
                notification_id: row.notification_id,
                event_id: row.event_id,
                farm_id: row.farm_id,
                device_id: row.device_id,
                producer_id: row.producer_id,
                rule_id: row.rule_id,
                rule_name: row.rule_name,
                message: row.message,
                event_value: row.event_value,
                event_timestamp: row.event_timestamp,
                generated_at: row.generated_at,
                dispatch_status: row.dispatch_status,
                dispatch_error: row.dispatch_error,
                retry_count: row.retry_count,
                last_retry_at: row.last_retry_at,
                created_at: row.created_at,
                updated_at: row.updated_at,
            }));
            const totalPages = Math.ceil(total / limit);
            const response = {
                success: true,
                data: notifications,
                timestamp: new Date().toISOString(),
            };
            // Return paginated response
            res.json({
                ...response,
                total,
                page,
                limit,
                totalPages,
            });
        }
        catch (error) {
            console.error('Error fetching notifications:', error);
            const response = {
                success: false,
                error: 'Failed to fetch notifications',
                timestamp: new Date().toISOString(),
            };
            res.status(500).json(response);
        }
    });
    /**
     * GET /api/notifications/:notificationId
     * Get a specific notification
     */
    app.get('/api/notifications/:notificationId', async (req, res) => {
        try {
            const { notificationId } = req.params;
            const pool = (0, database_1.getPool)();
            const result = await pool.query('SELECT * FROM notifications WHERE notification_id = $1', [
                notificationId,
            ]);
            if (result.rows.length === 0) {
                const response = {
                    success: false,
                    error: 'Notification not found',
                    timestamp: new Date().toISOString(),
                };
                res.status(404).json(response);
                return;
            }
            const row = result.rows[0];
            const notification = {
                notification_id: row.notification_id,
                event_id: row.event_id,
                farm_id: row.farm_id,
                device_id: row.device_id,
                producer_id: row.producer_id,
                rule_id: row.rule_id,
                rule_name: row.rule_name,
                message: row.message,
                event_value: row.event_value,
                event_timestamp: row.event_timestamp,
                generated_at: row.generated_at,
                dispatch_status: row.dispatch_status,
                dispatch_error: row.dispatch_error,
                retry_count: row.retry_count,
                last_retry_at: row.last_retry_at,
                created_at: row.created_at,
                updated_at: row.updated_at,
            };
            const response = {
                success: true,
                data: notification,
                timestamp: new Date().toISOString(),
            };
            res.json(response);
        }
        catch (error) {
            console.error('Error fetching notification:', error);
            const response = {
                success: false,
                error: 'Failed to fetch notification',
                timestamp: new Date().toISOString(),
            };
            res.status(500).json(response);
        }
    });
    /**
     * GET /api/farms/:farmId/notifications
     * Get notifications for a specific farm with filters
     */
    app.get('/api/farms/:farmId/notifications', async (req, res) => {
        try {
            const { farmId } = req.params;
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 20;
            const offset = (page - 1) * limit;
            // Optional filters
            const ruleName = req.query.ruleName;
            const status = req.query.status;
            const startDate = req.query.startDate;
            const endDate = req.query.endDate;
            const pool = (0, database_1.getPool)();
            // Build dynamic query with filters
            let countQuery = 'SELECT COUNT(*) as total FROM notifications WHERE farm_id = $1';
            let dataQuery = 'SELECT * FROM notifications WHERE farm_id = $1';
            const params = [farmId];
            let paramIndex = 2;
            if (ruleName) {
                countQuery += ` AND rule_name = $${paramIndex}`;
                dataQuery += ` AND rule_name = $${paramIndex}`;
                params.push(ruleName);
                paramIndex++;
            }
            if (status) {
                countQuery += ` AND dispatch_status = $${paramIndex}`;
                dataQuery += ` AND dispatch_status = $${paramIndex}`;
                params.push(status);
                paramIndex++;
            }
            if (startDate) {
                const startDateISO = new Date(startDate).toISOString();
                countQuery += ` AND generated_at >= $${paramIndex}`;
                dataQuery += ` AND generated_at >= $${paramIndex}`;
                params.push(startDateISO);
                paramIndex++;
            }
            if (endDate) {
                const endDateISO = new Date(new Date(endDate).getTime() + 86400000).toISOString();
                countQuery += ` AND generated_at < $${paramIndex}`;
                dataQuery += ` AND generated_at < $${paramIndex}`;
                params.push(endDateISO);
                paramIndex++;
            }
            dataQuery += ` ORDER BY generated_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
            const countResult = await pool.query(countQuery, params);
            const total = parseInt(countResult.rows[0].total, 10);
            const dataResult = await pool.query(dataQuery, [...params, limit, offset]);
            const notifications = dataResult.rows.map((row) => ({
                notification_id: row.notification_id,
                event_id: row.event_id,
                farm_id: row.farm_id,
                device_id: row.device_id,
                producer_id: row.producer_id,
                rule_id: row.rule_id,
                rule_name: row.rule_name,
                message: row.message,
                event_value: row.event_value,
                event_timestamp: row.event_timestamp,
                generated_at: row.generated_at,
                dispatch_status: row.dispatch_status,
                dispatch_error: row.dispatch_error,
                retry_count: row.retry_count,
                last_retry_at: row.last_retry_at,
                created_at: row.created_at,
                updated_at: row.updated_at,
            }));
            const totalPages = Math.ceil(total / limit);
            res.json({
                success: true,
                data: notifications,
                total,
                page,
                limit,
                totalPages,
                timestamp: new Date().toISOString(),
            });
        }
        catch (error) {
            console.error('Error fetching farm notifications:', error);
            const response = {
                success: false,
                error: 'Failed to fetch farm notifications',
                timestamp: new Date().toISOString(),
            };
            res.status(500).json(response);
        }
    });
    /**
     * POST /api/notifications/:notificationId/retry
     * Retry a failed notification
     */
    app.post('/api/notifications/:notificationId/retry', async (req, res) => {
        try {
            const { notificationId } = req.params;
            const pool = (0, database_1.getPool)();
            // Get the notification
            const notificationResult = await pool.query('SELECT * FROM notifications WHERE notification_id = $1', [notificationId]);
            if (notificationResult.rows.length === 0) {
                const response = {
                    success: false,
                    error: 'Notification not found',
                    timestamp: new Date().toISOString(),
                };
                res.status(404).json(response);
                return;
            }
            const notification = notificationResult.rows[0];
            // Only allow retry for failed notifications
            if (notification.dispatch_status !== 'failed') {
                const response = {
                    success: false,
                    error: 'Only failed notifications can be retried',
                    timestamp: new Date().toISOString(),
                };
                res.status(400).json(response);
                return;
            }
            // Update notification status to retrying
            const updateResult = await pool.query(`UPDATE notifications 
         SET dispatch_status = 'retrying', 
             retry_count = retry_count + 1,
             last_retry_at = CURRENT_TIMESTAMP,
             updated_at = CURRENT_TIMESTAMP
         WHERE notification_id = $1
         RETURNING *`, [notificationId]);
            const updatedNotification = updateResult.rows[0];
            // In a real implementation, this would queue the notification for retry
            // For now, we'll just simulate success after a delay
            setTimeout(async () => {
                try {
                    await pool.query(`UPDATE notifications 
             SET dispatch_status = 'sent',
                 dispatch_error = NULL,
                 updated_at = CURRENT_TIMESTAMP
             WHERE notification_id = $1`, [notificationId]);
                }
                catch (error) {
                    console.error('Error completing notification retry:', error);
                }
            }, 1000);
            const result = {
                notification_id: updatedNotification.notification_id,
                event_id: updatedNotification.event_id,
                farm_id: updatedNotification.farm_id,
                device_id: updatedNotification.device_id,
                producer_id: updatedNotification.producer_id,
                rule_id: updatedNotification.rule_id,
                rule_name: updatedNotification.rule_name,
                message: updatedNotification.message,
                event_value: updatedNotification.event_value,
                event_timestamp: updatedNotification.event_timestamp,
                generated_at: updatedNotification.generated_at,
                dispatch_status: updatedNotification.dispatch_status,
                dispatch_error: updatedNotification.dispatch_error,
                retry_count: updatedNotification.retry_count,
                last_retry_at: updatedNotification.last_retry_at,
                created_at: updatedNotification.created_at,
                updated_at: updatedNotification.updated_at,
            };
            const response = {
                success: true,
                data: result,
                timestamp: new Date().toISOString(),
            };
            res.json(response);
        }
        catch (error) {
            console.error('Error retrying notification:', error);
            const response = {
                success: false,
                error: 'Failed to retry notification',
                timestamp: new Date().toISOString(),
            };
            res.status(500).json(response);
        }
    });
    // Register history routes
    const historyRouter = (0, historyRoutes_1.createHistoryRouter)();
    app.use('/api/history', historyRouter);
    app.use((req, res) => {
        const response = {
            success: false,
            error: `Route not found: ${req.method} ${req.path}`,
            timestamp: new Date().toISOString(),
        };
        res.status(404).json(response);
    });
    // Error handler
    app.use((err, _req, res, _next) => {
        console.error('Unhandled error:', err);
        const response = {
            success: false,
            error: 'Internal server error',
            timestamp: new Date().toISOString(),
        };
        res.status(500).json(response);
    });
    return app;
}
//# sourceMappingURL=app.js.map