"use strict";
/**
 * NotificationHub - Demo Data Loader Service
 *
 * Loads demonstration data on application startup (if enabled)
 * Creates a sample farm, producer, devices, and events to test the system
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.demoDataLoader = exports.DemoDataLoader = void 0;
exports.getDemoDataLoader = getDemoDataLoader;
const uuid_1 = require("uuid");
const database_1 = require("../config/database");
const types_1 = require("../types");
/**
 * Demo Data Loader Service
 *
 * Responsible for:
 * - Creating demo producer (João Silva)
 * - Creating demo farm (Boa Esperança)
 * - Creating 6 demo devices (one for each sensor type)
 * - Generating events that trigger each rule
 * - Generating normal events (no rule triggers)
 * - Can be disabled via LOAD_DEMO_DATA environment variable
 */
class DemoDataLoader {
    constructor() {
        this.pool = (0, database_1.getPool)();
    }
    /**
     * Load demo data into the database
     * Checks LOAD_DEMO_DATA environment variable to determine if loading should happen
     *
     * @returns void
     */
    async loadDemoData() {
        const shouldLoadDemo = process.env.LOAD_DEMO_DATA !== 'false';
        if (!shouldLoadDemo) {
            console.log('ℹ Demo data loading disabled (LOAD_DEMO_DATA=false)');
            return;
        }
        try {
            console.log('Loading demo data...');
            // Create producer
            await this.createDemoProducer();
            console.log('✓ Demo producer created');
            // Create farm
            await this.createDemoFarm();
            console.log('✓ Demo farm created');
            // Create devices
            await this.createDemoDevices();
            console.log('✓ Demo devices created');
            // Generate events that trigger rules
            await this.generateTriggeringEvents();
            console.log('✓ Rule-triggering events generated');
            // Generate normal events (no rules)
            await this.generateNormalEvents();
            console.log('✓ Normal events generated');
            console.log('✓ Demo data loaded successfully');
        }
        catch (error) {
            console.error('Error loading demo data:', error);
            // Don't throw - allow app to continue even if demo data fails
            // This prevents the entire application from failing due to demo data issues
        }
    }
    /**
     * Create demo producer: "João Silva" (producer-001)
     */
    async createDemoProducer() {
        const producerId = 'producer-001';
        const name = 'João Silva';
        const phone = '+5535999999999';
        const email = 'joao.silva@example.com';
        const notificationPreferences = JSON.stringify({
            channels: ['WhatsApp'],
            quietHours: '22:00-06:00',
        });
        // Check if producer already exists
        const existing = await this.pool.query('SELECT * FROM producers WHERE producer_id = $1', [
            producerId,
        ]);
        if (existing.rows.length > 0) {
            console.log(`  Producer ${producerId} already exists, skipping creation`);
            return;
        }
        await this.pool.query(`INSERT INTO producers (producer_id, name, phone, email, notification_preferences, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`, [producerId, name, phone, email, notificationPreferences]);
    }
    /**
     * Create demo farm: "Boa Esperança" (farm-001)
     */
    async createDemoFarm() {
        const farmId = 'farm-001';
        const name = 'Boa Esperança';
        const producerId = 'producer-001';
        // Check if farm already exists
        const existing = await this.pool.query('SELECT * FROM farms WHERE farm_id = $1', [farmId]);
        if (existing.rows.length > 0) {
            console.log(`  Farm ${farmId} already exists, skipping creation`);
            return;
        }
        await this.pool.query(`INSERT INTO farms (farm_id, name, producer_id, created_at, updated_at)
       VALUES ($1, $2, $3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`, [farmId, name, producerId]);
    }
    /**
     * Create 6 demo devices (one for each sensor type)
     */
    async createDemoDevices() {
        const farmId = 'farm-001';
        const devices = [
            {
                deviceId: 'temp-001',
                name: 'Sensor de Temperatura - Estufa 1',
                sensorType: types_1.SensorType.AIR_TEMPERATURE,
            },
            {
                deviceId: 'humid-001',
                name: 'Sensor de Umidade do Ar - Estufa 1',
                sensorType: types_1.SensorType.AIR_HUMIDITY,
            },
            {
                deviceId: 'soil-001',
                name: 'Sensor de Umidade do Solo - Canteiro 1',
                sensorType: types_1.SensorType.SOIL_MOISTURE,
            },
            {
                deviceId: 'water-001',
                name: 'Sensor de Nível de Reservatório - Principal',
                sensorType: types_1.SensorType.WATER_RESERVOIR_LEVEL,
            },
            {
                deviceId: 'silo-001',
                name: 'Sensor de Nível de Silo - Silo 1',
                sensorType: types_1.SensorType.SILO_LEVEL,
            },
            {
                deviceId: 'equip-001',
                name: 'Monitor de Status - Bomba Principal',
                sensorType: types_1.SensorType.EQUIPMENT_STATUS,
            },
        ];
        for (const device of devices) {
            // Check if device already exists
            const existing = await this.pool.query('SELECT * FROM devices WHERE device_id = $1 AND farm_id = $2', [device.deviceId, farmId]);
            if (existing.rows.length > 0) {
                console.log(`  Device ${device.deviceId} already exists, skipping creation`);
                continue;
            }
            await this.pool.query(`INSERT INTO devices (device_id, farm_id, name, sensor_type, status, created_at, updated_at)
         VALUES ($1, $2, $3, $4, 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`, [device.deviceId, farmId, device.name, device.sensorType]);
        }
    }
    /**
     * Generate events that trigger each rule
     *
     * These events are designed to fire the notification rules:
     * - AIR_TEMPERATURE = 36°C (triggers HIGH_AIR_TEMPERATURE, threshold > 35)
     * - AIR_HUMIDITY = 25% (triggers LOW_AIR_HUMIDITY, threshold < 30)
     * - SOIL_MOISTURE = 15% (triggers LOW_SOIL_MOISTURE, threshold < 20)
     * - WATER_RESERVOIR_LEVEL = 10% (triggers LOW_WATER_RESERVOIR, threshold < 15)
     * - SILO_LEVEL = 12% (triggers LOW_SILO_LEVEL, threshold < 15)
     * - EQUIPMENT_STATUS = "FAILURE" (triggers EQUIPMENT_FAILURE)
     */
    async generateTriggeringEvents() {
        const farmId = 'farm-001';
        const triggeringEvents = [
            {
                eventId: `evt-trigger-${(0, uuid_1.v4)().substring(0, 8)}`,
                deviceId: 'temp-001',
                sensorType: types_1.SensorType.AIR_TEMPERATURE,
                value: '36.5',
                unit: '°C',
                offsetMinutes: 5,
            },
            {
                eventId: `evt-trigger-${(0, uuid_1.v4)().substring(0, 8)}`,
                deviceId: 'humid-001',
                sensorType: types_1.SensorType.AIR_HUMIDITY,
                value: '25.0',
                unit: '%',
                offsetMinutes: 4,
            },
            {
                eventId: `evt-trigger-${(0, uuid_1.v4)().substring(0, 8)}`,
                deviceId: 'soil-001',
                sensorType: types_1.SensorType.SOIL_MOISTURE,
                value: '15.0',
                unit: '%',
                offsetMinutes: 3,
            },
            {
                eventId: `evt-trigger-${(0, uuid_1.v4)().substring(0, 8)}`,
                deviceId: 'water-001',
                sensorType: types_1.SensorType.WATER_RESERVOIR_LEVEL,
                value: '10.0',
                unit: '%',
                offsetMinutes: 2,
            },
            {
                eventId: `evt-trigger-${(0, uuid_1.v4)().substring(0, 8)}`,
                deviceId: 'silo-001',
                sensorType: types_1.SensorType.SILO_LEVEL,
                value: '12.0',
                unit: '%',
                offsetMinutes: 1,
            },
            {
                eventId: `evt-trigger-${(0, uuid_1.v4)().substring(0, 8)}`,
                deviceId: 'equip-001',
                sensorType: types_1.SensorType.EQUIPMENT_STATUS,
                value: 'FAILURE',
                unit: 'status',
                offsetMinutes: 0,
            },
        ];
        for (const event of triggeringEvents) {
            const timestamp = new Date(Date.now() - event.offsetMinutes * 60 * 1000).toISOString();
            const receivedAt = new Date().toISOString();
            // Check if event already exists
            const existing = await this.pool.query('SELECT * FROM events WHERE device_id = $1 AND value = $2 AND sensor_type = $3 AND event_id LIKE $4', [event.deviceId, event.value, event.sensorType, 'evt-trigger-%']);
            if (existing.rows.length > 0) {
                console.log(`  Triggering event for ${event.sensorType} already exists, skipping`);
                continue;
            }
            await this.pool.query(`INSERT INTO events (event_id, farm_id, device_id, sensor_type, value, unit, timestamp, received_at, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP)`, [
                event.eventId,
                farmId,
                event.deviceId,
                event.sensorType,
                event.value,
                event.unit,
                timestamp,
                receivedAt,
            ]);
        }
    }
    /**
     * Generate normal events (that do not trigger any rules)
     *
     * These events are designed NOT to fire notification rules:
     * - AIR_TEMPERATURE = 25°C (no rule, threshold > 35)
     * - AIR_HUMIDITY = 60% (no rule, threshold < 30)
     * - SOIL_MOISTURE = 45% (no rule, threshold < 20)
     * - WATER_RESERVOIR_LEVEL = 80% (no rule, threshold < 15)
     * - SILO_LEVEL = 70% (no rule, threshold < 15)
     * - EQUIPMENT_STATUS = "OK" (no rule)
     */
    async generateNormalEvents() {
        const farmId = 'farm-001';
        const normalEvents = [
            {
                eventId: `evt-normal-${(0, uuid_1.v4)().substring(0, 8)}`,
                deviceId: 'temp-001',
                sensorType: types_1.SensorType.AIR_TEMPERATURE,
                value: '25.0',
                unit: '°C',
                offsetMinutes: 10,
            },
            {
                eventId: `evt-normal-${(0, uuid_1.v4)().substring(0, 8)}`,
                deviceId: 'humid-001',
                sensorType: types_1.SensorType.AIR_HUMIDITY,
                value: '60.0',
                unit: '%',
                offsetMinutes: 9,
            },
            {
                eventId: `evt-normal-${(0, uuid_1.v4)().substring(0, 8)}`,
                deviceId: 'soil-001',
                sensorType: types_1.SensorType.SOIL_MOISTURE,
                value: '45.0',
                unit: '%',
                offsetMinutes: 8,
            },
            {
                eventId: `evt-normal-${(0, uuid_1.v4)().substring(0, 8)}`,
                deviceId: 'water-001',
                sensorType: types_1.SensorType.WATER_RESERVOIR_LEVEL,
                value: '80.0',
                unit: '%',
                offsetMinutes: 7,
            },
            {
                eventId: `evt-normal-${(0, uuid_1.v4)().substring(0, 8)}`,
                deviceId: 'silo-001',
                sensorType: types_1.SensorType.SILO_LEVEL,
                value: '70.0',
                unit: '%',
                offsetMinutes: 6,
            },
            {
                eventId: `evt-normal-${(0, uuid_1.v4)().substring(0, 8)}`,
                deviceId: 'equip-001',
                sensorType: types_1.SensorType.EQUIPMENT_STATUS,
                value: 'OK',
                unit: 'status',
                offsetMinutes: 5,
            },
        ];
        for (const event of normalEvents) {
            const timestamp = new Date(Date.now() - event.offsetMinutes * 60 * 1000).toISOString();
            const receivedAt = new Date().toISOString();
            // Check if normal event already exists
            const existing = await this.pool.query('SELECT * FROM events WHERE device_id = $1 AND value = $2 AND sensor_type = $3 AND event_id LIKE $4', [event.deviceId, event.value, event.sensorType, 'evt-normal-%']);
            if (existing.rows.length > 0) {
                console.log(`  Normal event for ${event.sensorType} already exists, skipping`);
                continue;
            }
            await this.pool.query(`INSERT INTO events (event_id, farm_id, device_id, sensor_type, value, unit, timestamp, received_at, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP)`, [
                event.eventId,
                farmId,
                event.deviceId,
                event.sensorType,
                event.value,
                event.unit,
                timestamp,
                receivedAt,
            ]);
        }
    }
}
exports.DemoDataLoader = DemoDataLoader;
/**
 * Create a singleton instance of DemoDataLoader
 * Lazy initialization to avoid issues with mocking in tests
 */
let demoDataLoaderInstance = null;
function getDemoDataLoader() {
    if (!demoDataLoaderInstance) {
        demoDataLoaderInstance = new DemoDataLoader();
    }
    return demoDataLoaderInstance;
}
// For backward compatibility
exports.demoDataLoader = {
    loadDemoData: async () => getDemoDataLoader().loadDemoData(),
};
//# sourceMappingURL=demo-data-loader.js.map