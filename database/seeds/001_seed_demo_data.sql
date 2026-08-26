-- NotificationHub Demo Data Seed Script
-- Seed: 001_seed_demo_data.sql
-- Description: Loads demonstration farm, producer, devices, and sample events

-- Clear existing demo data (optional - remove this line if you want to preserve data)
-- DELETE FROM notifications;
-- DELETE FROM event_history;
-- DELETE FROM events;
-- DELETE FROM devices;
-- DELETE FROM farms;
-- DELETE FROM producers;

-- Insert demo producer
INSERT INTO producers (producer_id, name, phone, email, notification_preferences, created_at, updated_at)
VALUES (
  'producer-001',
  'João Silva',
  '+5535999999999',
  'joao.silva@example.com',
  '{"channels": ["WhatsApp"], "quietHours": "22:00-06:00"}'::jsonb,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
) ON CONFLICT (producer_id) DO UPDATE
SET name = EXCLUDED.name, updated_at = CURRENT_TIMESTAMP;

-- Insert demo farm
INSERT INTO farms (farm_id, name, producer_id, created_at, updated_at)
VALUES (
  'farm-001',
  'Boa Esperança',
  'producer-001',
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
) ON CONFLICT (farm_id) DO UPDATE
SET name = EXCLUDED.name, updated_at = CURRENT_TIMESTAMP;

-- Insert demo devices (one for each sensor type)

-- Air Temperature Sensor
INSERT INTO devices (device_id, farm_id, name, sensor_type, status, created_at, updated_at)
VALUES (
  'temp-001',
  'farm-001',
  'Sensor de Temperatura - Estufa 1',
  'AIR_TEMPERATURE',
  'active',
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
) ON CONFLICT (device_id, farm_id) DO UPDATE
SET name = EXCLUDED.name, status = EXCLUDED.status, updated_at = CURRENT_TIMESTAMP;

-- Air Humidity Sensor
INSERT INTO devices (device_id, farm_id, name, sensor_type, status, created_at, updated_at)
VALUES (
  'humid-001',
  'farm-001',
  'Sensor de Umidade do Ar - Estufa 1',
  'AIR_HUMIDITY',
  'active',
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
) ON CONFLICT (device_id, farm_id) DO UPDATE
SET name = EXCLUDED.name, status = EXCLUDED.status, updated_at = CURRENT_TIMESTAMP;

-- Soil Moisture Sensor
INSERT INTO devices (device_id, farm_id, name, sensor_type, status, created_at, updated_at)
VALUES (
  'soil-001',
  'farm-001',
  'Sensor de Umidade do Solo - Canteiro 1',
  'SOIL_MOISTURE',
  'active',
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
) ON CONFLICT (device_id, farm_id) DO UPDATE
SET name = EXCLUDED.name, status = EXCLUDED.status, updated_at = CURRENT_TIMESTAMP;

-- Water Reservoir Level Sensor
INSERT INTO devices (device_id, farm_id, name, sensor_type, status, created_at, updated_at)
VALUES (
  'water-001',
  'farm-001',
  'Sensor de Nível de Reservatório - Principal',
  'WATER_RESERVOIR_LEVEL',
  'active',
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
) ON CONFLICT (device_id, farm_id) DO UPDATE
SET name = EXCLUDED.name, status = EXCLUDED.status, updated_at = CURRENT_TIMESTAMP;

-- Silo Level Sensor
INSERT INTO devices (device_id, farm_id, name, sensor_type, status, created_at, updated_at)
VALUES (
  'silo-001',
  'farm-001',
  'Sensor de Nível de Silo - Silo 1',
  'SILO_LEVEL',
  'active',
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
) ON CONFLICT (device_id, farm_id) DO UPDATE
SET name = EXCLUDED.name, status = EXCLUDED.status, updated_at = CURRENT_TIMESTAMP;

-- Equipment Status Sensor
INSERT INTO devices (device_id, farm_id, name, sensor_type, status, created_at, updated_at)
VALUES (
  'equip-001',
  'farm-001',
  'Monitor de Status - Bomba Principal',
  'EQUIPMENT_STATUS',
  'active',
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
) ON CONFLICT (device_id, farm_id) DO UPDATE
SET name = EXCLUDED.name, status = EXCLUDED.status, updated_at = CURRENT_TIMESTAMP;

-- Insert demo events that TRIGGER rules (critical scenarios)

-- Event 1: High Air Temperature (36°C - triggers HIGH_AIR_TEMPERATURE rule)
INSERT INTO events (event_id, farm_id, device_id, sensor_type, value, unit, timestamp, received_at, created_at)
VALUES (
  'evt-trigger-001',
  'farm-001',
  'temp-001',
  'AIR_TEMPERATURE',
  '36.5',
  '°C',
  CURRENT_TIMESTAMP - INTERVAL '5 minutes',
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
) ON CONFLICT (event_id) DO NOTHING;

-- Event 2: Low Air Humidity (25% - triggers LOW_AIR_HUMIDITY rule)
INSERT INTO events (event_id, farm_id, device_id, sensor_type, value, unit, timestamp, received_at, created_at)
VALUES (
  'evt-trigger-002',
  'farm-001',
  'humid-001',
  'AIR_HUMIDITY',
  '25.0',
  '%',
  CURRENT_TIMESTAMP - INTERVAL '4 minutes',
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
) ON CONFLICT (event_id) DO NOTHING;

-- Event 3: Low Soil Moisture (15% - triggers LOW_SOIL_MOISTURE rule)
INSERT INTO events (event_id, farm_id, device_id, sensor_type, value, unit, timestamp, received_at, created_at)
VALUES (
  'evt-trigger-003',
  'farm-001',
  'soil-001',
  'SOIL_MOISTURE',
  '15.0',
  '%',
  CURRENT_TIMESTAMP - INTERVAL '3 minutes',
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
) ON CONFLICT (event_id) DO NOTHING;

-- Event 4: Low Water Reservoir Level (10% - triggers LOW_WATER_RESERVOIR rule)
INSERT INTO events (event_id, farm_id, device_id, sensor_type, value, unit, timestamp, received_at, created_at)
VALUES (
  'evt-trigger-004',
  'farm-001',
  'water-001',
  'WATER_RESERVOIR_LEVEL',
  '10.0',
  '%',
  CURRENT_TIMESTAMP - INTERVAL '2 minutes',
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
) ON CONFLICT (event_id) DO NOTHING;

-- Event 5: Low Silo Level (12% - triggers LOW_SILO_LEVEL rule)
INSERT INTO events (event_id, farm_id, device_id, sensor_type, value, unit, timestamp, received_at, created_at)
VALUES (
  'evt-trigger-005',
  'farm-001',
  'silo-001',
  'SILO_LEVEL',
  '12.0',
  '%',
  CURRENT_TIMESTAMP - INTERVAL '1 minute',
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
) ON CONFLICT (event_id) DO NOTHING;

-- Event 6: Equipment Failure (triggers EQUIPMENT_FAILURE rule)
INSERT INTO events (event_id, farm_id, device_id, sensor_type, value, unit, timestamp, received_at, created_at)
VALUES (
  'evt-trigger-006',
  'farm-001',
  'equip-001',
  'EQUIPMENT_STATUS',
  'FAILURE',
  'status',
  CURRENT_TIMESTAMP - INTERVAL '30 seconds',
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
) ON CONFLICT (event_id) DO NOTHING;

-- Insert demo events that DO NOT TRIGGER rules (normal scenarios)

-- Event 7: Normal Air Temperature (25°C - no rule triggered)
INSERT INTO events (event_id, farm_id, device_id, sensor_type, value, unit, timestamp, received_at, created_at)
VALUES (
  'evt-normal-001',
  'farm-001',
  'temp-001',
  'AIR_TEMPERATURE',
  '25.0',
  '°C',
  CURRENT_TIMESTAMP - INTERVAL '10 minutes',
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
) ON CONFLICT (event_id) DO NOTHING;

-- Event 8: Normal Air Humidity (60% - no rule triggered)
INSERT INTO events (event_id, farm_id, device_id, sensor_type, value, unit, timestamp, received_at, created_at)
VALUES (
  'evt-normal-002',
  'farm-001',
  'humid-001',
  'AIR_HUMIDITY',
  '60.0',
  '%',
  CURRENT_TIMESTAMP - INTERVAL '9 minutes',
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
) ON CONFLICT (event_id) DO NOTHING;

-- Event 9: Normal Soil Moisture (45% - no rule triggered)
INSERT INTO events (event_id, farm_id, device_id, sensor_type, value, unit, timestamp, received_at, created_at)
VALUES (
  'evt-normal-003',
  'farm-001',
  'soil-001',
  'SOIL_MOISTURE',
  '45.0',
  '%',
  CURRENT_TIMESTAMP - INTERVAL '8 minutes',
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
) ON CONFLICT (event_id) DO NOTHING;

-- Event 10: Normal Water Reservoir Level (80% - no rule triggered)
INSERT INTO events (event_id, farm_id, device_id, sensor_type, value, unit, timestamp, received_at, created_at)
VALUES (
  'evt-normal-004',
  'farm-001',
  'water-001',
  'WATER_RESERVOIR_LEVEL',
  '80.0',
  '%',
  CURRENT_TIMESTAMP - INTERVAL '7 minutes',
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
) ON CONFLICT (event_id) DO NOTHING;

-- Event 11: Normal Silo Level (70% - no rule triggered)
INSERT INTO events (event_id, farm_id, device_id, sensor_type, value, unit, timestamp, received_at, created_at)
VALUES (
  'evt-normal-005',
  'farm-001',
  'silo-001',
  'SILO_LEVEL',
  '70.0',
  '%',
  CURRENT_TIMESTAMP - INTERVAL '6 minutes',
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
) ON CONFLICT (event_id) DO NOTHING;

-- Event 12: Equipment OK (no rule triggered)
INSERT INTO events (event_id, farm_id, device_id, sensor_type, value, unit, timestamp, received_at, created_at)
VALUES (
  'evt-normal-006',
  'farm-001',
  'equip-001',
  'EQUIPMENT_STATUS',
  'OK',
  'status',
  CURRENT_TIMESTAMP - INTERVAL '5 minutes',
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
) ON CONFLICT (event_id) DO NOTHING;
