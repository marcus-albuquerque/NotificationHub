# NotificationHub Database Documentation

This document describes the database schema, migrations, and setup procedures for NotificationHub.

## Overview

NotificationHub uses **PostgreSQL** as its primary database for storing:
- Farm configurations and producer information
- IoT sensor devices and readings
- Event history and audit trails
- Generated notifications and dispatch status

## Database Schema

### Tables

#### 1. **producers**
Stores producer (farmer) information who own farms and receive notifications.

| Column | Type | Constraints | Description |
|--------|------|-----------|-------------|
| producer_id | VARCHAR(50) | PRIMARY KEY | Unique identifier for producer |
| name | VARCHAR(255) | NOT NULL | Full name of producer |
| phone | VARCHAR(20) | NOT NULL | Phone number for notifications |
| email | VARCHAR(255) | - | Email address |
| notification_preferences | JSONB | DEFAULT '{"channels": ["WhatsApp"], "quietHours": "22:00-06:00"}' | JSON object with notification channels and quiet hours |
| created_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Record creation timestamp |
| updated_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Last update timestamp |

**Example:**
```json
{
  "producer_id": "producer-001",
  "name": "João Silva",
  "phone": "+5535999999999",
  "email": "joao@example.com",
  "notification_preferences": {
    "channels": ["WhatsApp"],
    "quietHours": "22:00-06:00"
  }
}
```

---

#### 2. **farms**
Stores farm information linked to a producer.

| Column | Type | Constraints | Description |
|--------|------|-----------|-------------|
| farm_id | VARCHAR(50) | PRIMARY KEY | Unique farm identifier |
| name | VARCHAR(255) | NOT NULL | Farm name/display name |
| producer_id | VARCHAR(50) | NOT NULL, FOREIGN KEY | Reference to producer |
| created_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Record creation timestamp |
| updated_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Last update timestamp |

**Example:**
```json
{
  "farm_id": "farm-001",
  "name": "Boa Esperança",
  "producer_id": "producer-001"
}
```

---

#### 3. **devices**
Stores IoT sensor devices deployed on farms.

| Column | Type | Constraints | Description |
|--------|------|-----------|-------------|
| device_id | VARCHAR(50) | PRIMARY KEY (composite) | Unique device identifier |
| farm_id | VARCHAR(50) | PRIMARY KEY (composite), FOREIGN KEY | Reference to farm |
| name | VARCHAR(255) | NOT NULL | Device display name |
| sensor_type | VARCHAR(50) | NOT NULL, CHECK | Type of sensor: AIR_TEMPERATURE, AIR_HUMIDITY, SOIL_MOISTURE, WATER_RESERVOIR_LEVEL, SILO_LEVEL, EQUIPMENT_STATUS |
| status | VARCHAR(20) | DEFAULT 'active', CHECK | Device status: active, inactive, error |
| last_reading_at | TIMESTAMP | - | Timestamp of last event received |
| last_value | VARCHAR(255) | - | Most recent sensor reading value |
| created_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Record creation timestamp |
| updated_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Last update timestamp |

**Supported Sensor Types:**
- `AIR_TEMPERATURE` - Temperature measurement in °C
- `AIR_HUMIDITY` - Humidity percentage (%)
- `SOIL_MOISTURE` - Soil moisture percentage (%)
- `WATER_RESERVOIR_LEVEL` - Water level percentage (%)
- `SILO_LEVEL` - Silo level percentage (%)
- `EQUIPMENT_STATUS` - Equipment state (OK, FAILURE, etc.)

---

#### 4. **events**
Stores all sensor events received from devices.

| Column | Type | Constraints | Description |
|--------|------|-----------|-------------|
| event_id | VARCHAR(100) | PRIMARY KEY | Unique event identifier (UUID) |
| farm_id | VARCHAR(50) | NOT NULL, FOREIGN KEY | Reference to farm |
| device_id | VARCHAR(50) | NOT NULL, FOREIGN KEY | Reference to device |
| sensor_type | VARCHAR(50) | NOT NULL, CHECK | Type of sensor measurement |
| value | VARCHAR(255) | NOT NULL | Sensor reading value |
| unit | VARCHAR(20) | NOT NULL | Unit of measurement (°C, %, mm, L, etc.) |
| timestamp | TIMESTAMP | NOT NULL | When the measurement was taken (IoT device time) |
| received_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | When the event was received by system |
| created_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Record creation timestamp |

**Example:**
```json
{
  "event_id": "evt-001-uuid",
  "farm_id": "farm-001",
  "device_id": "temp-001",
  "sensor_type": "AIR_TEMPERATURE",
  "value": "36.5",
  "unit": "°C",
  "timestamp": "2024-01-15T14:30:00Z",
  "received_at": "2024-01-15T14:30:01Z"
}
```

---

#### 5. **event_history**
Complete audit trail linking events through the processing pipeline.

| Column | Type | Constraints | Description |
|--------|------|-----------|-------------|
| history_id | VARCHAR(100) | PRIMARY KEY | Unique history entry identifier |
| event_id | VARCHAR(100) | NOT NULL, FOREIGN KEY | Reference to event |
| farm_id | VARCHAR(50) | NOT NULL, FOREIGN KEY | Reference to farm |
| device_id | VARCHAR(50) | NOT NULL | Reference to device |
| received_at | TIMESTAMP | NOT NULL | Event reception time |
| validation_status | VARCHAR(20) | DEFAULT 'valid', CHECK | Status: valid, rejected |
| validation_error | VARCHAR(500) | - | Error reason if validation failed |
| is_duplicate | BOOLEAN | DEFAULT FALSE | Whether event is a duplicate |
| previous_event_id | VARCHAR(100) | - | ID of previous event if duplicate |
| fired_rules | JSONB | DEFAULT '[]' | Array of rules that fired |
| notifications | JSONB | DEFAULT '[]' | Array of generated notifications |
| processed_at | TIMESTAMP | NOT NULL | When event completed processing |
| processing_duration_ms | INTEGER | - | Time taken to process in milliseconds |
| created_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Record creation timestamp |
| updated_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Last update timestamp |

**Example - Valid Event with Rules:**
```json
{
  "history_id": "hist-001",
  "event_id": "evt-001",
  "farm_id": "farm-001",
  "device_id": "temp-001",
  "validation_status": "valid",
  "is_duplicate": false,
  "fired_rules": [
    {
      "ruleId": "HIGH_AIR_TEMPERATURE",
      "ruleName": "High Air Temperature",
      "firedAt": "2024-01-15T14:30:02Z"
    }
  ],
  "notifications": [
    {
      "notificationId": "notif-001",
      "ruleId": "HIGH_AIR_TEMPERATURE",
      "message": "Temperatura do ar acima do normal: 36.5°C",
      "generatedAt": "2024-01-15T14:30:02Z",
      "dispatchStatus": "sent"
    }
  ],
  "processing_duration_ms": 125
}
```

---

#### 6. **notifications**
Stores generated notifications and their delivery status.

| Column | Type | Constraints | Description |
|--------|------|-----------|-------------|
| notification_id | VARCHAR(100) | PRIMARY KEY | Unique notification identifier |
| event_id | VARCHAR(100) | NOT NULL, FOREIGN KEY | Reference to triggering event |
| farm_id | VARCHAR(50) | NOT NULL, FOREIGN KEY | Reference to farm |
| device_id | VARCHAR(50) | NOT NULL | Reference to device |
| producer_id | VARCHAR(50) | NOT NULL, FOREIGN KEY | Reference to producer receiving notification |
| rule_id | VARCHAR(100) | NOT NULL | ID of rule that fired |
| rule_name | VARCHAR(255) | NOT NULL | Name of fired rule |
| message | TEXT | NOT NULL | Notification message text |
| event_value | VARCHAR(255) | - | The event value that triggered rule |
| event_timestamp | TIMESTAMP | - | Timestamp of triggering event |
| generated_at | TIMESTAMP | NOT NULL | When notification was generated |
| dispatch_status | VARCHAR(20) | DEFAULT 'pending', CHECK | Status: pending, sent, failed, retrying |
| dispatch_error | VARCHAR(500) | - | Error reason if dispatch failed |
| retry_count | INTEGER | DEFAULT 0 | Number of retry attempts |
| last_retry_at | TIMESTAMP | - | Last retry attempt timestamp |
| created_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Record creation timestamp |
| updated_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Last update timestamp |

**Example:**
```json
{
  "notification_id": "notif-001",
  "event_id": "evt-001",
  "farm_id": "farm-001",
  "device_id": "temp-001",
  "producer_id": "producer-001",
  "rule_id": "HIGH_AIR_TEMPERATURE",
  "rule_name": "High Air Temperature",
  "message": "Temperatura do ar acima do normal: 36.5°C",
  "event_value": "36.5",
  "dispatch_status": "sent",
  "generated_at": "2024-01-15T14:30:02Z",
  "retry_count": 0
}
```

---

## Indexes

The schema includes strategic indexes for query performance:

### Events Table Indexes
```sql
idx_events_event_id          -- Fast lookup by event ID
idx_events_farm_id           -- Fast lookup by farm
idx_events_device_id         -- Fast lookup by device
idx_events_timestamp         -- Fast sorted queries by time
idx_events_farm_timestamp    -- Fast farm event history queries
idx_events_device_timestamp  -- Fast device event history queries
idx_events_sensor_type       -- Fast lookup by sensor type
```

### Event History Indexes
```sql
idx_event_history_event_id        -- Fast lookup by event
idx_event_history_farm_id         -- Fast farm history queries
idx_event_history_device_id       -- Fast device history queries
idx_event_history_processed_at    -- Fast time-range queries
idx_event_history_validation_status -- Fast lookup by status
idx_event_history_is_duplicate    -- Fast duplicate queries
```

### Notifications Indexes
```sql
idx_notifications_event_id    -- Fast lookup by event
idx_notifications_farm_id     -- Fast farm notifications
idx_notifications_producer_id -- Fast producer notifications
idx_notifications_dispatch_status -- Fast status queries
idx_notifications_generated_at    -- Fast time-range queries
idx_notifications_rule_id     -- Fast rule-based queries
```

---

## Migration System

### Overview

NotificationHub uses a simple SQL-based migration system that:
1. Tracks executed migrations in the `schema_migrations` table
2. Prevents duplicate execution of migrations
3. Supports automatic rollback on failure (via transaction)
4. Can be run standalone or integrated into deployment pipelines

### Directory Structure

```
database/
├── migrations/         # SQL migration files
│   └── 001_create_tables.sql
├── seeds/             # Demo data seed scripts
│   └── 001_seed_demo_data.sql
├── migrate.js         # Migration runner script
└── README.md          # This documentation
```

### Running Migrations

#### Prerequisites

1. **Node.js** installed (v14+)
2. **PostgreSQL** server running and accessible
3. **pg** npm package installed globally or locally:
   ```bash
   npm install pg
   ```

#### Basic Usage

**Run pending migrations:**
```bash
node database/migrate.js migrate
```

**Run migrations and load seed data:**
```bash
node database/migrate.js migrate --seed
```

**Check migration status:**
```bash
node database/migrate.js status
```

### Configuration

The migration runner uses environment variables for database connection:

```bash
# Option 1: Connection string
export DATABASE_URL="postgresql://user:password@localhost:5432/notificationhub"

# Option 2: Individual parameters
export DB_HOST="localhost"
export DB_PORT="5432"
export DB_NAME="notificationhub"
export DB_USER="postgres"
export DB_PASSWORD="your_password"
```

### Example Setup

**1. Create PostgreSQL database:**
```bash
createdb -U postgres notificationhub
```

**2. Set environment variables:**
```bash
export DB_HOST="localhost"
export DB_NAME="notificationhub"
export DB_USER="postgres"
export DB_PASSWORD="your_password"
```

**3. Run migrations with seed data:**
```bash
cd database
node migrate.js migrate --seed
```

**4. Verify setup:**
```bash
# Connect to database
psql -U postgres -d notificationhub

# List tables
\dt

# Check migrations
SELECT * FROM schema_migrations;

# Check seed data
SELECT COUNT(*) FROM events;
```

### Creating New Migrations

**1. Create new SQL file in `migrations/` directory:**
```bash
touch database/migrations/002_add_new_column.sql
```

**2. Write SQL statements:**
```sql
-- Migration: 002_add_new_column.sql
ALTER TABLE events ADD COLUMN severity VARCHAR(20);
CREATE INDEX idx_events_severity ON events(severity);
```

**3. Run migrations:**
```bash
node database/migrate.js migrate
```

**Note:** Migration files should be idempotent (safe to run multiple times). Use `IF NOT EXISTS` clauses where applicable.

---

## Database Connection

### Connection String Format

```
postgresql://[user[:password]@][netloc][:port][/dbname][?param1=value1&...]
```

**Example:**
```
postgresql://postgres:password@localhost:5432/notificationhub
```

### Node.js Connection (using pg library)

```javascript
const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'notificationhub',
  user: 'postgres',
  password: 'password',
});

// Query example
const result = await pool.query('SELECT * FROM events WHERE farm_id = $1', ['farm-001']);
```

### Connection Pooling

For production, use connection pooling:

```javascript
const pool = new Pool({
  host: 'localhost',
  database: 'notificationhub',
  user: 'postgres',
  password: 'password',
  max: 20,                    // Maximum connections
  idleTimeoutMillis: 30000,   // Idle timeout
  connectionTimeoutMillis: 2000, // Connection timeout
});
```

### Environment Variables

Set these in your `.env` file:

```env
# Database Connection
DB_HOST=localhost
DB_PORT=5432
DB_NAME=notificationhub
DB_USER=postgres
DB_PASSWORD=your_password

# Optional: Connection string (overrides individual parameters)
DATABASE_URL=postgresql://postgres:password@localhost:5432/notificationhub
```

---

## Data Integrity

### Foreign Key Constraints

All tables maintain referential integrity:

```
events → farms (farm_id)
events → devices (device_id, farm_id)
event_history → events (event_id)
event_history → farms (farm_id)
notifications → events (event_id)
notifications → farms (farm_id)
notifications → producers (producer_id)
farms → producers (producer_id)
devices → farms (farm_id)
```

**Cascade Behavior:**
- Deleting a farm cascades delete to: devices, events, event_history, notifications
- Deleting a producer restricts delete (to prevent orphaned farms)

### Check Constraints

Enforce valid values:

```sql
-- Sensor types validation
sensor_type IN (
  'AIR_TEMPERATURE',
  'AIR_HUMIDITY',
  'SOIL_MOISTURE',
  'WATER_RESERVOIR_LEVEL',
  'SILO_LEVEL',
  'EQUIPMENT_STATUS'
)

-- Device status validation
status IN ('active', 'inactive', 'error')

-- Validation status
validation_status IN ('valid', 'rejected')

-- Dispatch status
dispatch_status IN ('pending', 'sent', 'failed', 'retrying')
```

---

## Query Examples

### Get latest readings by device

```sql
SELECT 
  d.device_id,
  d.name,
  d.sensor_type,
  e.value,
  e.unit,
  e.timestamp
FROM devices d
LEFT JOIN events e ON (d.device_id = e.device_id AND d.farm_id = e.farm_id)
WHERE d.farm_id = 'farm-001'
ORDER BY e.timestamp DESC
LIMIT 1;
```

### Get farm event history with status

```sql
SELECT 
  eh.event_id,
  eh.validation_status,
  eh.fired_rules,
  eh.processed_at,
  eh.processing_duration_ms
FROM event_history eh
WHERE eh.farm_id = 'farm-001'
  AND eh.processed_at >= NOW() - INTERVAL '7 days'
ORDER BY eh.processed_at DESC
LIMIT 100;
```

### Get failed notifications for retry

```sql
SELECT 
  n.notification_id,
  n.message,
  n.dispatch_error,
  n.retry_count,
  n.last_retry_at
FROM notifications n
WHERE n.dispatch_status IN ('failed', 'retrying')
  AND n.retry_count < 3
ORDER BY n.last_retry_at ASC NULLS FIRST;
```

### Get rule firing statistics

```sql
SELECT 
  jsonb_array_elements(eh.fired_rules)->>'ruleName' as rule_name,
  COUNT(*) as count,
  MAX(eh.processed_at) as last_fired
FROM event_history eh
WHERE eh.fired_rules != '[]'::jsonb
  AND eh.processed_at >= NOW() - INTERVAL '24 hours'
GROUP BY rule_name
ORDER BY count DESC;
```

---

## Backup and Recovery

### Backup Database

```bash
# Full backup
pg_dump -U postgres -d notificationhub > backup.sql

# Compressed backup
pg_dump -U postgres -d notificationhub | gzip > backup.sql.gz
```

### Restore Database

```bash
# From SQL file
psql -U postgres -d notificationhub < backup.sql

# From compressed file
gunzip -c backup.sql.gz | psql -U postgres -d notificationhub
```

---

## Performance Considerations

### Query Optimization

1. **Always use indexed columns in WHERE clauses:**
   - Use `farm_id` for farm-specific queries
   - Use `timestamp` range queries efficiently
   - Use `device_id` for device-specific queries

2. **Pagination for large result sets:**
   ```sql
   SELECT * FROM events 
   WHERE farm_id = 'farm-001'
   ORDER BY timestamp DESC
   LIMIT 20 OFFSET 40;
   ```

3. **Archive old events periodically:**
   ```sql
   DELETE FROM events 
   WHERE timestamp < NOW() - INTERVAL '90 days';
   ```

### Connection Pooling

For production deployments:
- Set connection pool size based on expected concurrent requests
- Monitor idle connections and set appropriate timeout
- Use persistent connections for background workers

---

## Troubleshooting

### Connection Issues

```bash
# Test PostgreSQL connection
psql -U postgres -h localhost -d notificationhub

# Check PostgreSQL status
sudo systemctl status postgresql

# View PostgreSQL logs
tail -f /var/log/postgresql/postgresql.log
```

### Migration Issues

```bash
# Check current migration status
node database/migrate.js status

# Manually view migrations table
psql -d notificationhub -c "SELECT * FROM schema_migrations;"

# Clear migrations table (careful!)
# psql -d notificationhub -c "DELETE FROM schema_migrations;"
```

### Slow Queries

```sql
-- Enable query logging
SET log_min_duration_statement = 1000; -- Log queries > 1 second

-- Analyze slow query
EXPLAIN ANALYZE SELECT * FROM events WHERE farm_id = 'farm-001';

-- Check index usage
SELECT * FROM pg_stat_user_indexes;
```

---

## Support

For issues or questions about the database setup, refer to:
- PostgreSQL Documentation: https://www.postgresql.org/docs/
- Migration Runner Source: `database/migrate.js`
- Schema Definition: `database/migrations/001_create_tables.sql`
