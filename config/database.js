"use strict";
/**
 * NotificationHub - Database Configuration
 *
 * Manages PostgreSQL connection pool and schema initialization
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.initializeDatabase = initializeDatabase;
exports.getPool = getPool;
exports.getConnection = getConnection;
exports.closeDatabase = closeDatabase;
exports.query = query;
exports.queryOne = queryOne;
exports.insertOne = insertOne;
const pg_1 = require("pg");
let pool;
/**
 * Initialize database connection pool
 */
async function initializeDatabase() {
    const host = process.env.DB_HOST || 'localhost';
    const port = parseInt(process.env.DB_PORT || '5432', 10);
    const database = process.env.DB_NAME || 'notificationhub';
    const user = process.env.DB_USER || 'postgres';
    const password = process.env.DB_PASSWORD || 'postgres';
    pool = new pg_1.Pool({
        host,
        port,
        database,
        user,
        password,
        max: 20,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 2000,
    });
    // Test connection
    const client = await pool.connect();
    try {
        const result = await client.query('SELECT NOW()');
        console.log('✓ Database connected:', result.rows[0]);
    }
    finally {
        client.release();
    }
    // Initialize schema
    await initializeSchema();
}
/**
 * Get database connection pool
 */
function getPool() {
    if (!pool) {
        throw new Error('Database not initialized. Call initializeDatabase() first.');
    }
    return pool;
}
/**
 * Get single database connection
 */
async function getConnection() {
    return getPool().connect();
}
/**
 * Close database pool
 */
async function closeDatabase() {
    if (pool) {
        await pool.end();
    }
}
/**
 * Initialize database schema with all required tables
 */
async function initializeSchema() {
    const client = await getConnection();
    try {
        // Create ENUM types
        await client.query(`
      DO $$ BEGIN
        CREATE TYPE sensor_type AS ENUM (
          'AIR_TEMPERATURE',
          'AIR_HUMIDITY',
          'SOIL_MOISTURE',
          'WATER_RESERVOIR_LEVEL',
          'SILO_LEVEL',
          'EQUIPMENT_STATUS'
        );
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$;
    `);
        // Create farms table
        await client.query(`
      CREATE TABLE IF NOT EXISTS farms (
        farm_id VARCHAR(255) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        producer_id VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
        // Create producers table
        await client.query(`
      CREATE TABLE IF NOT EXISTS producers (
        producer_id VARCHAR(255) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        phone VARCHAR(20) NOT NULL,
        email VARCHAR(255),
        notification_preferences JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
        // Create devices table
        await client.query(`
      CREATE TABLE IF NOT EXISTS devices (
        device_id VARCHAR(255) PRIMARY KEY,
        farm_id VARCHAR(255) NOT NULL REFERENCES farms(farm_id),
        name VARCHAR(255) NOT NULL,
        sensor_type sensor_type NOT NULL,
        status VARCHAR(20) DEFAULT 'active',
        last_reading_at TIMESTAMP,
        last_value VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
        // Create events table
        await client.query(`
      CREATE TABLE IF NOT EXISTS events (
        event_id VARCHAR(255) PRIMARY KEY,
        farm_id VARCHAR(255) NOT NULL,
        device_id VARCHAR(255) NOT NULL,
        sensor_type sensor_type NOT NULL,
        value VARCHAR(255) NOT NULL,
        unit VARCHAR(50) NOT NULL,
        timestamp TIMESTAMP NOT NULL,
        received_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (farm_id) REFERENCES farms(farm_id),
        FOREIGN KEY (device_id) REFERENCES devices(device_id)
      );
    `);
        // Create indexes for query performance
        await client.query(`
      CREATE INDEX IF NOT EXISTS idx_events_event_id ON events(event_id);
      CREATE INDEX IF NOT EXISTS idx_events_farm_id ON events(farm_id);
      CREATE INDEX IF NOT EXISTS idx_events_device_id ON events(device_id);
      CREATE INDEX IF NOT EXISTS idx_events_timestamp ON events(timestamp DESC);
      CREATE INDEX IF NOT EXISTS idx_events_received_at ON events(received_at DESC);
    `);
        // Create event_history table
        await client.query(`
      CREATE TABLE IF NOT EXISTS event_history (
        id VARCHAR(255) PRIMARY KEY,
        event_id VARCHAR(255) NOT NULL UNIQUE,
        farm_id VARCHAR(255) NOT NULL,
        device_id VARCHAR(255) NOT NULL,
        received_at TIMESTAMP NOT NULL,
        validation_status VARCHAR(50) NOT NULL,
        validation_error TEXT,
        is_duplicate BOOLEAN DEFAULT FALSE,
        previous_event_id VARCHAR(255),
        fired_rules JSONB DEFAULT '[]',
        notifications JSONB DEFAULT '[]',
        processed_at TIMESTAMP NOT NULL,
        processing_duration_ms INTEGER NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (farm_id) REFERENCES farms(farm_id),
        FOREIGN KEY (event_id) REFERENCES events(event_id)
      );
    `);
        // Create notifications table
        await client.query(`
      CREATE TABLE IF NOT EXISTS notifications (
        notification_id VARCHAR(255) PRIMARY KEY,
        event_id VARCHAR(255) NOT NULL,
        farm_id VARCHAR(255) NOT NULL,
        device_id VARCHAR(255) NOT NULL,
        rule_id VARCHAR(255) NOT NULL,
        rule_name VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        event_value VARCHAR(255) NOT NULL,
        event_timestamp TIMESTAMP NOT NULL,
        generated_at TIMESTAMP NOT NULL,
        dispatch_status VARCHAR(50) DEFAULT 'pending',
        dispatch_error TEXT,
        producer_id VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (event_id) REFERENCES events(event_id),
        FOREIGN KEY (farm_id) REFERENCES farms(farm_id),
        FOREIGN KEY (producer_id) REFERENCES producers(producer_id)
      );
    `);
        // Create indexes for event_history
        await client.query(`
      CREATE INDEX IF NOT EXISTS idx_event_history_event_id ON event_history(event_id);
      CREATE INDEX IF NOT EXISTS idx_event_history_farm_id ON event_history(farm_id);
      CREATE INDEX IF NOT EXISTS idx_event_history_device_id ON event_history(device_id);
      CREATE INDEX IF NOT EXISTS idx_event_history_processed_at ON event_history(processed_at DESC);
    `);
        console.log('✓ Database schema initialized');
    }
    catch (error) {
        console.error('Error initializing database schema:', error);
        throw error;
    }
    finally {
        client.release();
    }
}
/**
 * Execute a query
 */
async function query(text, params) {
    const client = await getConnection();
    try {
        const result = await client.query(text, params);
        return result.rows;
    }
    finally {
        client.release();
    }
}
/**
 * Execute a query and return single row
 */
async function queryOne(text, params) {
    const rows = await query(text, params);
    return rows.length > 0 ? rows[0] : null;
}
/**
 * Execute an insert query
 */
async function insertOne(text, params) {
    const rows = await query(text, params);
    if (rows.length === 0) {
        throw new Error('Insert query returned no rows');
    }
    return rows[0];
}
//# sourceMappingURL=database.js.map