# Redis Cache for Duplicate Detection

## Overview

This module implements Redis-based caching for duplicate event detection in the NotificationHub system. It provides a 5-minute sliding window to identify and discard duplicate sensor readings.

## Architecture

### Components

1. **Redis Configuration** (`src/config/redis.ts`)
   - Manages Redis client initialization and connection pooling
   - Handles reconnection logic and error scenarios
   - Provides health checks and graceful shutdown

2. **Cache Key Generation** (`src/utils/cache-key.ts`)
   - Generates consistent cache keys based on event components
   - Uses SHA256 hashing for key compression
   - Provides debug keys for troubleshooting

3. **Duplicate Detector** (`src/services/duplicate-detector.ts`)
   - Implements the duplicate detection algorithm
   - Manages cache entry lifecycle with TTL
   - Handles Redis failures gracefully with fail-safe logic

## Configuration

### Environment Variables

All Redis configuration is managed through environment variables:

```bash
# Redis Connection
REDIS_HOST=localhost          # Default: localhost
REDIS_PORT=6379              # Default: 6379
REDIS_PASSWORD=              # Optional password
REDIS_DB=0                   # Redis database number (0-15)

# Duplicate Detection TTL
# TTL is hardcoded to 300 seconds (5 minutes) in the code
```

Set these variables in your `.env` file (see `.env.example` for template).

### Connection Pooling

The Redis client implements connection pooling with the following features:

- **Singleton Pattern**: Only one Redis client instance is maintained
- **Reconnection Strategy**: Exponential backoff with max 10 retries
- **Keep-Alive**: 30-second keep-alive interval to maintain connection
- **Socket Configuration**: 10-second connection timeout

## Usage

### Basic Usage

```typescript
import { DuplicateDetector } from '../services/duplicate-detector';

const detector = new DuplicateDetector();

// Check if event is a duplicate
const result = await detector.detect(
  'farm-001',           // farmId
  'sensor-001',         // deviceId
  'AIR_TEMPERATURE',    // sensorType
  25.5,                 // value
  'evt-12345'           // eventId
);

if (result.isDuplicate) {
  console.log(`Duplicate of event: ${result.previousEventId}`);
} else {
  console.log('New event cached for 5 minutes');
}
```

### Cache Key Generation

```typescript
import { getCacheKey, getCacheKeyDebug } from '../utils/cache-key';

// Production cache key (hashed)
const key = getCacheKey('farm-001', 'sensor-001', 'AIR_TEMPERATURE', 25.5);
// Output: 'duplicate:af1ee1d8bb799a4f3cfeab5366d87aa0142d66b73418539f1701fcc8accae4af'

// Debug cache key (human-readable)
const debugKey = getCacheKeyDebug('farm-001', 'sensor-001', 'AIR_TEMPERATURE', 25.5);
// Output: 'duplicate:farm-001:sensor-001:AIR_TEMPERATURE:25.5'
```

## How Duplicate Detection Works

### Algorithm

```
1. Generate cache key from: farmId + deviceId + sensorType + value
2. Check if key exists in Redis cache
   - If YES: Event is a duplicate → return {isDuplicate: true, previousEventId}
   - If NO:  Event is new → store in cache with 300-second TTL → return {isDuplicate: false}
3. After 5 minutes, cache entry expires → same event is no longer considered duplicate
```

### Example Scenario

```
Time 00:00 - Event received: temp=36°C from farm-001/sensor-001
  → Cache key generated and stored with 5-minute TTL

Time 00:02 - Same event received: temp=36°C from farm-001/sensor-001
  → Cache key found → DUPLICATE DETECTED → Event discarded

Time 00:05 - Cache entry expires (TTL reached)
  → Previous event removed from cache

Time 00:06 - Same event received: temp=36°C from farm-001/sensor-001
  → Cache key NOT found (expired) → NEW EVENT → Stored in cache
```

## Cache Key Components

The cache key is generated from:

| Component    | Type    | Purpose                           |
|-------------|---------|-----------------------------------|
| farmId      | string  | Identifies the farm/property      |
| deviceId    | string  | Identifies the sensor device      |
| sensorType  | string  | Type of sensor (e.g., TEMPERATURE)|
| value       | number\|string | The sensor reading value     |

**Note**: The same (farmId, deviceId, sensorType, value) tuple always generates the same cache key, ensuring consistency.

## Error Handling

### Graceful Degradation

The duplicate detector implements a "fail-safe" strategy:

- **Redis Connection Fails**: Continue processing, allow event through (false positive)
- **Cache Operation Fails**: Log error, allow event through (prioritizes data loss prevention)
- **Redis Unavailable**: Service continues, no duplicate detection until Redis recovers

This ensures that losing duplicate detection is preferable to losing events.

### Error Logging

All errors are logged with:
- Error message
- Context (farmId, deviceId, sensorType, value, eventId)
- Recovery action taken

## Performance Characteristics

| Metric | Value | Notes |
|--------|-------|-------|
| Cache Lookup | ~1-2ms | Redis get operation |
| Cache Store | ~1-2ms | Redis setEx operation |
| Memory per Entry | ~50-100 bytes | Varies with key/value sizes |
| TTL Expiration | 300s | Automatic, no cleanup needed |

## Monitoring and Debugging

### Get Cache Statistics

```typescript
const stats = await detector.getStats();
console.log(`Total duplicate detection entries: ${stats.totalDuplicateEntries}`);
console.log(`Redis connected: ${stats.redisConnected}`);
```

### Clear Cache

```typescript
// Clear all duplicate detection cache
await detector.clearCache();

// Clear cache for specific farm
await detector.clearCache('farm-001');
```

### Debug Keys

Use debug keys when troubleshooting:

```typescript
import { getCacheKeyDebug } from '../utils/cache-key';

const debugKey = getCacheKeyDebug(
  'farm-001',
  'sensor-001',
  'AIR_TEMPERATURE',
  25.5
);

// Use in Redis CLI:
// redis-cli GET 'duplicate:farm-001:sensor-001:AIR_TEMPERATURE:25.5'
```

## Testing

### Unit Tests

Run cache key generation tests:

```bash
npm test -- duplicate-detector.test.ts
```

Tests cover:
- Consistent key generation (deterministic)
- Different keys for different components
- Edge cases (special characters, large numbers, decimals)
- Property-based testing with fast-check (50+ iterations per property)

### Integration Tests

Run Redis connection tests:

```bash
npm test -- redis-connection.test.ts
```

Tests cover:
- Connection initialization and pooling
- TTL strategy validation
- Error handling
- Concurrent operations
- Connection cleanup

## Troubleshooting

### "Redis connection refused"

- Verify Redis is running: `redis-cli ping`
- Check REDIS_HOST and REDIS_PORT environment variables
- Verify firewall allows connection to Redis port

### Duplicate Detection Not Working

- Check Redis health: `redis-cli INFO memory`
- Verify cache entries exist: `redis-cli KEYS duplicate:*`
- Review logs for error messages
- Restart Redis and clear cache if needed

### High Memory Usage

- Check number of cache entries: `redis-cli DBSIZE`
- Monitor TTL expiration: `redis-cli TTL <key>`
- If entries not expiring, restart Redis

### Performance Issues

- Monitor Redis latency: `redis-cli --latency`
- Check CPU usage and memory on Redis server
- Consider using Redis Cluster for distributed deployments

## Future Improvements

1. **Configurable TTL**: Make 5-minute window configurable per sensor type
2. **Redis Clustering**: Support for Redis Sentinel/Cluster for HA
3. **Cache Metrics**: Prometheus metrics for hit/miss rates
4. **Memory Optimization**: Compression for large cache entries
5. **Batch Operations**: Bulk cache operations for efficiency

## References

- [Redis Documentation](https://redis.io/docs/)
- [node-redis Client](https://github.com/luin/ioredis)
- [Property-Based Testing with fast-check](https://fast-check.dev/)
