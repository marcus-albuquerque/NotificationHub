# Database Schema Quick Reference

## Table Overview

```
┌─────────────┐
│ producers   │  (Producer information)
└──────┬──────┘
       │
       ├──────┬────────────────────────────────────────┐
       │      │                                        │
┌──────▼──────┐                                  ┌─────▼─────┐
│ farms       │                                  │ devices   │  (IoT Sensors)
└──────┬──────┘                                  └─────┬─────┘
       │                                               │
       ├─────────────────┬──────────────────────────┬──┘
       │                 │                          │
       │          ┌──────▼──────┐           ┌──────▼─────┐
       │          │ events      │           │ (CASCADE   │
       │          │(IoT Data)   │           │ Deletes)  │
       │          └──────┬──────┘           │           │
       │                 │                  │           │
       │                 ├──────────┬───────┘           │
       │                 │          │                   │
       │          ┌──────▼──────────▼──────┐            │
       │          │ event_history          │            │
       │          │ (Audit Trail)          │            │
       │          └────────────────────────┘            │
       │                                                │
       └────────────┬──────────────────────────────────┘
                    │
            ┌───────▼──────────┐
            │ notifications    │
            │ (Alerts Sent)    │
            └──────────────────┘
```

## Sensor Types

| Type | Unit | Valid Range | Description |
|------|------|-------------|-------------|
| AIR_TEMPERATURE | °C | -50 to 60 | Air temperature measurement |
| AIR_HUMIDITY | % | 0 to 100 | Relative air humidity |
| SOIL_MOISTURE | % | 0 to 100 | Soil moisture level |
| WATER_RESERVOIR_LEVEL | % | 0 to 100 | Water tank level |
| SILO_LEVEL | % | 0 to 100 | Grain/feed silo level |
| EQUIPMENT_STATUS | status | OK/FAILURE | Equipment operational status |

## Rule Thresholds

| Rule | Sensor | Condition | Action |
|------|--------|-----------|--------|
| HIGH_AIR_TEMPERATURE | AIR_TEMPERATURE | value > 35°C | Alert producer |
| LOW_AIR_HUMIDITY | AIR_HUMIDITY | value < 30% | Alert producer |
| LOW_SOIL_MOISTURE | SOIL_MOISTURE | value < 20% | Alert producer |
| LOW_WATER_RESERVOIR | WATER_RESERVOIR_LEVEL | value < 15% | Alert producer |
| LOW_SILO_LEVEL | SILO_LEVEL | value < 15% | Alert producer |
| EQUIPMENT_FAILURE | EQUIPMENT_STATUS | value = "FAILURE" | Alert producer |

## Data Lifecycle

### Event Flow
```
1. IoT Device sends event → EventReceiver (HTTP POST /api/events)
2. Event persisted to events table
3. DataValidator validates fields
4. DuplicateDetector checks cache for duplicates
5. RuleEngine applies business rules
6. NotificationGenerator creates alerts if rules fired
7. NotificationDispatcher sends notifications
8. Complete pipeline logged to event_history
```

### Status Transitions
```
Event:
  ├─ Created (received_at)
  └─ Processed (created_at)

Validation:
  ├─ valid → Continue processing
  └─ rejected → Stop, log error

Duplicate:
  ├─ FALSE → Process normally
  └─ TRUE → Discard, log as duplicate

Rules:
  ├─ Fired → Generate notifications
  └─ Not fired → Log as processed

Notification:
  ├─ Generated → Queue for dispatch
  └─ Dispatch → pending → sent/failed → (retry if needed)
```

## Quick SQL Queries

### Farm Events (Last 24 hours)
```sql
SELECT e.* FROM events e
WHERE e.farm_id = $1 AND e.timestamp > NOW() - INTERVAL '1 day'
ORDER BY e.timestamp DESC LIMIT 100;
```

### Device Status (Latest reading)
```sql
SELECT DISTINCT ON (device_id) 
  device_id, sensor_type, value, unit, timestamp
FROM events
WHERE farm_id = $1
ORDER BY device_id, timestamp DESC;
```

### Failed Notifications (For retry)
```sql
SELECT * FROM notifications
WHERE farm_id = $1 AND dispatch_status IN ('failed', 'retrying')
AND retry_count < 3
ORDER BY last_retry_at NULLS FIRST LIMIT 50;
```

### Rule Firing Statistics
```sql
SELECT 
  jsonb_array_elements(fired_rules)->>'ruleName' as rule,
  COUNT(*) FROM event_history
WHERE processed_at > NOW() - INTERVAL '24 hours'
AND fired_rules != '[]'::jsonb
GROUP BY rule ORDER BY COUNT(*) DESC;
```

### Event Validation Report
```sql
SELECT 
  validation_status,
  COUNT(*) as count,
  COUNT(CASE WHEN validation_error IS NOT NULL THEN 1 END) as with_error
FROM event_history
WHERE processed_at > NOW() - INTERVAL '24 hours'
GROUP BY validation_status;
```

## Index Reference

**For Best Performance:**

- Query by event ID → Use `idx_events_event_id`
- Query by farm → Use `idx_events_farm_id` or `idx_event_history_farm_id`
- Query by time range → Use `idx_events_timestamp` or `idx_event_history_processed_at`
- Query by device → Use `idx_events_device_id`
- Filter by status → Use `idx_event_history_validation_status` or `idx_notifications_dispatch_status`

## Connection Info

**Default Connection String:**
```
postgresql://postgres:@localhost:5432/notificationhub
```

**Connection Parameters:**
- Host: `localhost` (or set via `DB_HOST`)
- Port: `5432` (or set via `DB_PORT`)
- Database: `notificationhub` (or set via `DB_NAME`)
- User: `postgres` (or set via `DB_USER`)
- Password: `` (empty, or set via `DB_PASSWORD`)

## Backup Strategy

**Daily backup command:**
```bash
pg_dump -U postgres -d notificationhub | gzip > backups/notificationhub_$(date +%Y%m%d).sql.gz
```

**Retention: Keep last 30 days**

## Maintenance Tasks

| Task | Frequency | Command |
|------|-----------|---------|
| Backup | Daily | `pg_dump ... > backup.sql` |
| Analyze | Weekly | `ANALYZE;` |
| Vacuum | Weekly | `VACUUM ANALYZE;` |
| Monitor Slow Queries | Daily | Check PostgreSQL logs |
| Archive Old Events | Monthly | `DELETE FROM events WHERE timestamp < NOW() - INTERVAL '90 days'` |

## Common Issues

| Issue | Cause | Solution |
|-------|-------|----------|
| Connection refused | PostgreSQL not running | Start PostgreSQL service |
| "database notificationhub does not exist" | DB not created | Run `createdb notificationhub` |
| Migrations won't run | Wrong permissions | Check user permissions |
| Slow queries | Missing indexes | Run migrations: `node migrate.js` |
| Duplicate detection not working | Redis down | Check Redis connection |

---

See `README.md` for detailed documentation.
