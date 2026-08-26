# Design Document - NotificationHub

## Overview

NotificationHub is an MVP notification system for smart farming that processes IoT sensor events, applies business rules, and dispatches notifications to producers. The system is designed with clean separation of concerns, extensibility for new sensor types and notification providers, and complete auditability through an event history pipeline.

### Key Design Principles

1. **Single Responsibility**: Each component handles one concern (event receiving, validation, rule application, etc.)
2. **Abstraction**: Notification providers are abstracted to support multiple implementations
3. **Extensibility**: New sensor types and rules can be added without modifying core logic
4. **Auditability**: Complete tracking of the event-to-notification pipeline
5. **Reliability**: Events are persisted before processing; failed notifications are queued for retry

---

## Architecture

### High-Level Component Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                        IoT Devices                           │
│                    (Sensors, Equipment)                      │
└──────────────────────────┬──────────────────────────────────┘
                           │
                    HTTP API (REST)
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                  Event Receiver                              │
│              (Input validation, persistence)                 │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                 Data Validator                               │
│     (Fields, types, ranges, timestamps, allowed values)      │
└──────────────────────────┬──────────────────────────────────┘
                           │
                    Valid/Invalid
                           │
              ┌────────────┴────────────┐
              ▼                         ▼
         ┌─────────┐             ┌──────────────┐
         │ Discard │             │ Rule Engine  │
         │ (Log)   │             │              │
         └─────────┘             └──────┬───────┘
                                        │
                            ┌───────────┴───────────┐
                            ▼                       ▼
                    ┌───────────────┐     ┌──────────────────┐
                    │  Duplicate    │     │ Rule Application │
                    │  Detector     │     │ (Thresholds)     │
                    └────┬──────────┘     └────────┬─────────┘
                         │                         │
                 ┌────────┴─────────┐      ┌──────────────────┐
                 ▼                  ▼      ▼                   │
            ┌────────┐     ┌─────────────────────┐             │
            │Discard │     │ Notification        │             │
            │(Log)   │     │ Generator           │             │
            └────────┘     └────────┬────────────┘             │
                                    │                          │
                           ┌────────┴──────────┐               │
                           ▼                   ▼               │
                    ┌────────────────────────────────┐         │
                    │ Notification Dispatcher        │◄────────┘
                    │ (Queue + Retry mechanism)      │
                    └────────────┬───────────────────┘
                                 │
                    ┌────────────┴────────────┐
                    ▼                         ▼
             ┌────────────────┐      ┌──────────────────┐
             │ Notification   │      │ Event History    │
             │ Provider       │      │ (Complete audit  │
             │ (MockWhatsApp, │      │  trail)          │
             │  SMS, Email)   │      └──────────────────┘
             └────────────────┘
                    │
                    ▼
              Producer (SMS, WhatsApp,
                 Email, etc.)
```

### Data Flow

```
Event Reception → Persistence → Validation → Duplicate Check → Rule Application → Notification Generation → Dispatch → History Logging
```

Each stage produces both success and failure paths that are logged to EventHistory.

---

## Components and Interfaces

### 1. Event Receiver

**Purpose**: Accept incoming sensor events via HTTP API and persist them immediately for durability.

**Interface**:

```
POST /api/events
  Body: {
    eventId: string (UUID)
    farmId: string
    deviceId: string
    sensorType: string (enum: AIR_TEMPERATURE, AIR_HUMIDITY, SOIL_MOISTURE, WATER_RESERVOIR_LEVEL, SILO_LEVEL, EQUIPMENT_STATUS)
    value: number | string
    unit: string
    timestamp: ISO8601 datetime
  }
  Response: {
    success: boolean
    eventId: string
    message: string
  }
```

**Responsibilities**:

- Accept HTTP POST requests
- Perform basic payload validation (not empty, required fields present)
- Persist event to database immediately
- Return 400 if payload is empty/invalid
- Return 200 with eventId if accepted for processing

**Implementation Notes**:

- All events are persisted before processing (durability pattern)
- EventReceiver is stateless and horizontally scalable
- No authentication in MVP (trusted network assumption)

---

### 2. Data Validator

**Purpose**: Validate event data against business rules.

**Validation Rules**:

- `eventId`, `farmId`, `deviceId` must be non-empty strings
- `sensorType` must be one of: AIR_TEMPERATURE, AIR_HUMIDITY, SOIL_MOISTURE, WATER_RESERVOIR_LEVEL, SILO_LEVEL, EQUIPMENT_STATUS
- `value` must be:
  - A valid number (integer or decimal) for sensor types: AIR_TEMPERATURE, AIR_HUMIDITY, SOIL_MOISTURE, WATER_RESERVOIR_LEVEL, SILO_LEVEL
  - A valid string for EQUIPMENT_STATUS (typically "OK" or "FAILURE")
- `unit` must be a valid string (e.g., "°C", "%", "mm", "L")
- `timestamp` must be a valid ISO8601 datetime and must not be in the future
- `farmId` must exist in the Farm registry

**Output**:

- Valid event → passes to next stage (Duplicate Detector or Rule Engine)
- Invalid event → marked as rejected, logged to EventHistory with specific error reason

---

### 3. Duplicate Detector

**Purpose**: Identify and discard duplicate events within a 5-minute window.

**Algorithm**:

```
FUNCTION detectDuplicate(event):
  dupeKey = hash(event.farmId, event.deviceId, event.sensorType, event.value)
  recentEvent = cache.get(dupeKey, within 5 minutes)

  IF recentEvent exists:
    RETURN {isDuplicate: true, previousEvent: recentEvent}
  ELSE:
    cache.set(dupeKey, event, ttl: 5 minutes)
    RETURN {isDuplicate: false}
END
```

**Data Structure**:

- In-memory cache (or Redis for distributed deployments) with TTL of 5 minutes
- Key: hash of (farmId, deviceId, sensorType, value)
- Value: event details and timestamp

**Output**:

- Duplicate detected → event is discarded, logged to EventHistory as "duplicated"
- Not a duplicate → event passed to Rule Engine

---

### 4. Rule Engine

**Purpose**: Apply business rules to validate events and determine which notifications to generate.

**Rules Registry** (extensible pattern):

```
Rule {
  ruleId: string
  name: string
  sensorType: string
  condition: (value, unit) => boolean
  notificationTemplate: string
}
```

**Built-in Rules**:

```
[
  {
    ruleId: "HIGH_AIR_TEMPERATURE"
    name: "High Air Temperature"
    sensorType: "AIR_TEMPERATURE"
    condition: (value) => value > 35
    notificationTemplate: "Temperatura do ar acima do normal: {value}°C"
  },
  {
    ruleId: "LOW_AIR_HUMIDITY"
    name: "Low Air Humidity"
    sensorType: "AIR_HUMIDITY"
    condition: (value) => value < 30
    notificationTemplate: "Umidade do ar abaixo do normal: {value}%"
  },
  {
    ruleId: "LOW_SOIL_MOISTURE"
    name: "Low Soil Moisture"
    sensorType: "SOIL_MOISTURE"
    condition: (value) => value < 20
    notificationTemplate: "Umidade do solo crítica: {value}%"
  },
  {
    ruleId: "LOW_WATER_RESERVOIR"
    name: "Low Water Reservoir"
    sensorType: "WATER_RESERVOIR_LEVEL"
    condition: (value) => value < 15
    notificationTemplate: "Nível de água do reservatório crítico: {value}%"
  },
  {
    ruleId: "LOW_SILO_LEVEL"
    name: "Low Silo Level"
    sensorType: "SILO_LEVEL"
    condition: (value) => value < 15
    notificationTemplate: "Nível do silo crítico: {value}%"
  },
  {
    ruleId: "EQUIPMENT_FAILURE"
    name: "Equipment Failure"
    sensorType: "EQUIPMENT_STATUS"
    condition: (value) => value === "FAILURE"
    notificationTemplate: "Falha em equipamento detectada no dispositivo: {deviceId}"
  }
]
```

**Algorithm**:

```
FUNCTION applyRules(event):
  applicableRules = findRulesBySensorType(event.sensorType)
  firedRules = []

  FOR EACH rule IN applicableRules:
    IF rule.condition(event.value):
      firedRules.push(rule)
  END

  RETURN {event, firedRules}
END
```

**Output**:

- Array of fired rules (could be empty if no rules triggered)
- Passed to Notification Generator

**Extensibility**:

- New rules can be added by inserting new entries into the Rules Registry
- Conditions are pure functions, allowing for complex logic
- Rules are evaluated independently, allowing multiple rules to fire for a single event

---

### 5. Notification Generator

**Purpose**: Create notification messages based on fired rules.

**Output Structure**:

```
Notification {
  notificationId: string (UUID)
  eventId: string
  farmId: string
  deviceId: string
  ruleId: string
  ruleName: string
  message: string
  eventValue: number | string
  eventTimestamp: ISO8601 datetime
  generatedAt: ISO8601 datetime
  dispatchStatus: string ("pending", "sent", "failed", "retrying")
  dispatchError?: string
}
```

**Algorithm**:

```
FUNCTION generateNotifications(event, firedRules):
  notifications = []

  FOR EACH rule IN firedRules:
    notification = {
      notificationId: generateUUID(),
      eventId: event.eventId,
      farmId: event.farmId,
      deviceId: event.deviceId,
      ruleId: rule.ruleId,
      ruleName: rule.name,
      message: interpolateTemplate(rule.notificationTemplate, event),
      eventValue: event.value,
      eventTimestamp: event.timestamp,
      generatedAt: now(),
      dispatchStatus: "pending"
    }
    notifications.push(notification)
  END

  RETURN notifications
END
```

---

### 6. Notification Dispatcher

**Purpose**: Queue notifications and dispatch them through providers with retry logic.

**Algorithm**:

```
FUNCTION dispatchNotification(notification):
  producer = getProducerByFarmId(notification.farmId)

  TRY:
    result = notificationProvider.send(producer, notification.message)
    notification.dispatchStatus = "sent"
    notification.dispatchResult = result
    return {success: true, notification}
  CATCH error:
    notification.dispatchStatus = "failed"
    notification.dispatchError = error.message
    addToRetryQueue(notification, retryAfter: 5 minutes, maxRetries: 3)
    return {success: false, notification, error}
  END
END
```

**Retry Queue**:

- Notifications that fail to dispatch are added to a queue
- Retry attempts are scheduled after 5 minutes
- Maximum 3 retry attempts per notification
- After max retries, notification is marked as permanently failed and logged

---

### 7. Notification Provider (Abstract)

**Purpose**: Abstract interface for sending notifications via different channels.

**Interface**:

```
interface NotificationProvider {
  send(producer, message) -> {success: boolean, messageId?: string, error?: string}
  getChannel() -> string (e.g., "WhatsApp", "SMS", "Email")
}
```

**Implementations**:

**MockWhatsApp** (MVP):

```
class MockWhatsApp implements NotificationProvider {
  send(producer, message):
    // Simulate WhatsApp send (no actual HTTP call)
    log(`[MockWhatsApp] Sending to ${producer.phone}: ${message}`)
    // Simulate 95% success rate for testing retry logic
    IF random() < 0.95:
      return {success: true, messageId: generateUUID()}
    ELSE:
      return {success: false, error: "Simulated network error"}

  getChannel():
    return "WhatsApp (Mock)"
}
```

**Future Implementations** (structure ready):

- RealWhatsApp: Integration with official WhatsApp Business API
- SMSProvider: Integration with SMS gateway (Twilio, AWS SNS, etc.)
- EmailProvider: Integration with email service (SendGrid, AWS SES, etc.)

---

### 8. Event History

**Purpose**: Complete audit trail of event-to-notification pipeline.

**Data Structure**:

```
EventHistoryEntry {
  id: string (UUID)
  eventId: string
  farmId: string
  deviceId: string

  // Reception
  receivedAt: ISO8601 datetime

  // Validation
  validationStatus: string ("valid", "rejected")
  validationError?: string

  // Duplicate Detection
  isDuplicate: boolean
  previousEventId?: string

  // Rule Application
  firedRules: array of {
    ruleId: string
    ruleName: string
    firedAt: ISO8601 datetime
  }

  // Notifications
  notifications: array of {
    notificationId: string
    message: string
    generatedAt: ISO8601 datetime
    dispatchStatus: string
    dispatchError?: string
  }

  // Complete timeline
  processedAt: ISO8601 datetime
  processingDurationMs: number
}
```

**Queries**:

- By `eventId`: Get complete history of a single event
- By `farmId`: Get all events/notifications for a farm
- By `deviceId`: Get all events from a specific device
- By date range: Get events within a time window
- By status: Get rejected events, duplicate events, etc.

---

## Data Models

### Event

```json
{
  "eventId": "evt-001-uuid",
  "farmId": "farm-001",
  "deviceId": "temp-001",
  "sensorType": "AIR_TEMPERATURE",
  "value": 36.5,
  "unit": "°C",
  "timestamp": "2024-01-15T14:30:00Z",
  "receivedAt": "2024-01-15T14:30:01Z"
}
```

### Farm

```json
{
  "farmId": "farm-001",
  "name": "Boa Esperança",
  "producerId": "producer-001",
  "createdAt": "2024-01-01T00:00:00Z"
}
```

### Producer

```json
{
  "producerId": "producer-001",
  "name": "João Silva",
  "phone": "+5535999999999",
  "email": "joao@example.com",
  "notificationPreferences": {
    "channels": ["WhatsApp"],
    "quietHours": "22:00-06:00"
  }
}
```

### Device

```json
{
  "deviceId": "temp-001",
  "farmId": "farm-001",
  "name": "Sensor de Temperatura - Estufa 1",
  "sensorType": "AIR_TEMPERATURE",
  "status": "active",
  "lastReadingAt": "2024-01-15T14:30:00Z",
  "lastValue": 36.5
}
```

---

## Error Handling

### Event Reception Errors

| Error                   | Status | Action            |
| ----------------------- | ------ | ----------------- |
| Empty payload           | 400    | Reject, log error |
| Missing required fields | 400    | Reject, log error |
| Invalid JSON            | 400    | Reject, log error |
| Unknown farmId          | 400    | Reject, log error |

### Validation Errors

| Error               | Action                       |
| ------------------- | ---------------------------- |
| Invalid sensorType  | Mark as rejected, log reason |
| Value out of range  | Mark as rejected, log reason |
| Timestamp in future | Mark as rejected, log reason |
| Invalid farmId      | Mark as rejected, log reason |

### Dispatch Errors

| Error                  | Action                                 |
| ---------------------- | -------------------------------------- |
| Provider timeout       | Add to retry queue, retry after 5 min  |
| Provider network error | Add to retry queue, retry after 5 min  |
| Unknown producerId     | Log error, skip dispatch (alert admin) |
| Max retries exceeded   | Mark as failed, log permanently        |

### Graceful Degradation

- If EventHistory database is down: continue processing, queue writes
- If NotificationProvider is slow: process events independently, don't block
- If duplicate detector cache fails: allow event through (false positive, not false negative)

---

## Technology Stack

### Backend

- **Language**: Node.js / TypeScript (for rapid MVP development)
- **Web Framework**: Express.js (simple REST API)
- **Database**: PostgreSQL (relational data, strong consistency, auditability)
- **Cache**: Redis (for duplicate detection, configurable TTL)
- **Task Queue**: Bull/RabbitMQ (for notification retry queue)
- **Testing**: Jest (unit tests) + Supertest (API tests)
- **Property-Based Testing**: fast-check (comprehensive input coverage)

### Frontend

- **Framework**: React (modern UI, component-based)
- **State Management**: TanStack Query (data fetching, caching)
- **Styling**: Tailwind CSS (rapid UI development)
- **Charts**: Chart.js or Recharts (visualization of sensor data)

### Deployment (Future)

- **Container**: Docker
- **Orchestration**: Kubernetes (for scaling)
- **Monitoring**: Prometheus + Grafana
- **Logging**: ELK Stack or DataDog

---

## Correctness Properties

_A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees._

### Property 1: Event Persistence

_For any_ valid event received via the API, the system SHALL persist it to the database and make it retrievable with a recorded receipt timestamp before any further processing occurs.

**Validates: Requirements 1.1**

### Property 2: Required Fields Validation

_For any_ event missing at least one required field (eventId, farmId, deviceId, sensorType, value, unit, timestamp), the DataValidator SHALL reject the event with a specific error reason recorded in EventHistory.

**Validates: Requirements 2.1, 2.8**

### Property 3: Non-Empty String Fields

_For any_ event where eventId, farmId, or deviceId is an empty string, the DataValidator SHALL reject the event.

**Validates: Requirements 2.2**

### Property 4: Sensor Type Validation

_For any_ event with a sensorType not in the supported list [AIR_TEMPERATURE, AIR_HUMIDITY, SOIL_MOISTURE, WATER_RESERVOIR_LEVEL, SILO_LEVEL, EQUIPMENT_STATUS], the DataValidator SHALL reject the event.

**Validates: Requirements 2.3**

### Property 5: Numeric Value Validation

_For any_ event with a numeric sensor type (AIR_TEMPERATURE, AIR_HUMIDITY, SOIL_MOISTURE, WATER_RESERVOIR_LEVEL, SILO_LEVEL) and a non-numeric value, the DataValidator SHALL reject the event; for numeric values, the event SHALL pass this validation check.

**Validates: Requirements 2.4**

### Property 6: Unit String Validation

_For any_ event with an empty string as unit, the DataValidator SHALL reject the event; for any non-empty unit string, the validation SHALL pass (assuming other fields are valid).

**Validates: Requirements 2.5**

### Property 7: Timestamp Validation

_For any_ event with a timestamp in the future or not in valid ISO8601 format, the DataValidator SHALL reject the event; for timestamps in the past or present in valid format, the validation SHALL pass.

**Validates: Requirements 2.6**

### Property 8: Duplicate Detection Within Window

_For any_ two events with identical (farmId, deviceId, sensorType, value) received within 5 minutes of each other, the DuplicateDetector SHALL classify the second event as a duplicate and discard it without generating notifications.

**Validates: Requirements 3.1, 3.2, 3.3**

### Property 9: High Air Temperature Rule

_For any_ AIR_TEMPERATURE event with value > 35, the RuleEngine SHALL fire the HIGH_AIR_TEMPERATURE rule; for any AIR_TEMPERATURE event with value ≤ 35, the rule SHALL not fire.

**Validates: Requirements 4.1, 4.2**

### Property 10: Low Air Humidity Rule

_For any_ AIR_HUMIDITY event with value < 30, the RuleEngine SHALL fire the LOW_AIR_HUMIDITY rule; for any AIR_HUMIDITY event with value ≥ 30, the rule SHALL not fire.

**Validates: Requirements 5.1, 5.2**

### Property 11: Low Soil Moisture Rule

_For any_ SOIL_MOISTURE event with value < 20, the RuleEngine SHALL fire the LOW_SOIL_MOISTURE rule; for any SOIL_MOISTURE event with value ≥ 20, the rule SHALL not fire.

**Validates: Requirements 6.1, 6.2**

### Property 12: Low Water Reservoir Rule

_For any_ WATER_RESERVOIR_LEVEL event with value < 15, the RuleEngine SHALL fire the LOW_WATER_RESERVOIR rule; for any WATER_RESERVOIR_LEVEL event with value ≥ 15, the rule SHALL not fire.

**Validates: Requirements 7.1, 7.2**

### Property 13: Low Silo Level Rule

_For any_ SILO_LEVEL event with value < 15, the RuleEngine SHALL fire the LOW_SILO_LEVEL rule; for any SILO_LEVEL event with value ≥ 15, the rule SHALL not fire.

**Validates: Requirements 8.1, 8.2**

### Property 14: Equipment Failure Rule

_For any_ EQUIPMENT_STATUS event with value equal to "FAILURE", the RuleEngine SHALL fire the EQUIPMENT_FAILURE rule; for any other value, the rule SHALL not fire.

**Validates: Requirements 9.1, 9.2**

### Property 15: Notification Message Generation

_For any_ fired rule, the NotificationGenerator SHALL generate a notification with the correct message template interpolated with event values and containing all required fields: notificationId, eventId, farmId, deviceId, ruleId, message, eventValue, eventTimestamp, and generatedAt.

**Validates: Requirements 4.3, 4.4, 5.3, 9.3**

### Property 16: Dispatch Attempt Logging

_For any_ notification generated, the NotificationDispatcher SHALL attempt to send it through the configured NotificationProvider and record the result (success or failure with error reason) in EventHistory.

**Validates: Requirements 10.1, 10.3, 10.4**

### Property 17: Event History Consolidation

_For any_ event that completes processing, the EventHistory SHALL contain a consolidated entry that links the event to all downstream pipeline stages: validation status, duplicate detection result, fired rules, generated notifications, and dispatch results, with timestamps for each stage.

**Validates: Requirements 11.1, 11.2, 11.3, 11.4, 11.5, 17.1, 17.3**

### Property 18: No-Action Pipeline Logging

_For any_ valid event that does not trigger any rules, the EventHistory SHALL record the event as processed with status "no rules fired" and no notifications generated.

**Validates: Requirements 17.5**

### Property 19: EventHistory Query Consistency

_For any_ EventHistory query by eventId, farmId, deviceId, or date range via API, the response SHALL have a consistent schema containing all event, rule, notification, and dispatch information relevant to that query.

**Validates: Requirements 11.6, 17.2, 17.4**

### Property 20: Payload Rejection

_For any_ empty, null, or completely invalid JSON payload received via the /api/events endpoint, the EventReceiver SHALL reject it and return HTTP status 400 without attempting to process or persist it.

**Validates: Requirements 1.4**

---

## Testing Strategy

### Property-Based Testing Overview

Property-based testing (PBT) is essential for NotificationHub because the system's core logic consists of rule-based data transformations where behavior varies meaningfully with input (event values, sensor types, timestamps). PBT will run 100+ iterations per test to discover edge cases in threshold logic, boundary conditions, and pipeline coordination that would be missed by a handful of manual examples.

**Why PBT is appropriate for NotificationHub:**

- Core logic is pure (event in → notification out) with no side effects
- Behavior varies meaningfully with input: different values trigger different rules
- Input space is large: floating-point values, various timestamps, many sensor types
- 100+ iterations will find edge cases: boundary values (exact 35.0, 34.999...), null/undefined handling, timezone issues
- All processing happens in-memory or mocked (fast, cost-effective to run repeatedly)

**What PBT covers:**

- Properties 1-20: All testable acceptance criteria (validation, rule firing, duplicate detection, pipeline traceability)
- Unit tests for individual components with randomized inputs
- Integration tests for multi-component workflows

**What PBT does NOT cover:**

- UI rendering (Requirements 12-14): Use snapshot/visual regression tests instead
- Demo data loading (Requirement 16): Single smoke test
- Configuration CRUD (Requirement 18): Example-based unit tests
- External service integration: Mock the NotificationProvider interface

### Unit Tests (Property-Based)

**Scope**: Individual components in isolation with mocked dependencies. Each test is property-based with 100+ iterations.

**Focus Areas & Properties Tested**:

1. **Data Validator** (Properties 2-7)
   - For any event with missing required fields → rejected (Property 2)
   - For any event with empty string fields (eventId, farmId, deviceId) → rejected (Property 3)
   - For any unsupported sensorType → rejected (Property 4)
   - For any numeric sensor with non-numeric value → rejected (Property 5)
   - For any event with empty unit → rejected (Property 6)
   - For any event with future timestamp or invalid ISO format → rejected (Property 7)

2. **Rule Engine** (Properties 9-14)
   - For any AIR_TEMPERATURE value > 35 → HIGH_AIR_TEMPERATURE fires (Property 9)
   - For any AIR_HUMIDITY value < 30 → LOW_AIR_HUMIDITY fires (Property 10)
   - For any SOIL_MOISTURE value < 20 → LOW_SOIL_MOISTURE fires (Property 11)
   - For any WATER_RESERVOIR_LEVEL value < 15 → LOW_WATER_RESERVOIR fires (Property 12)
   - For any SILO_LEVEL value < 15 → LOW_SILO_LEVEL fires (Property 13)
   - For any EQUIPMENT_STATUS value === "FAILURE" → EQUIPMENT_FAILURE fires (Property 14)

3. **Duplicate Detector** (Property 8)
   - For any two events with identical (farmId, deviceId, sensorType, value) within 5 minutes → duplicate detected
   - For any two events with different values → not detected as duplicate
   - After TTL expiration → re-detection allowed

4. **Notification Generator** (Property 15)
   - For any fired rule → correct notification generated with all required fields
   - Message templates correctly interpolated with event values

5. **Event History** (Properties 17-19)
   - For any processed event → EventHistory contains complete pipeline (Property 17)
   - For any event without fired rules → "no rules fired" status recorded (Property 18)
   - For any EventHistory query → consistent schema returned (Property 19)

**PBT Configuration**:

- Generator strategies: arbitrary floats, integers, strings, timestamps, valid sensor types
- Minimum iterations: 100 per property test
- Failure reporting: Show counterexample that violated the property
- Test tags: Each test includes comment: **Feature: notification-hub, Property X: [property name]**

**Example Property-Based Unit Test** (fast-check library):

```typescript
import * as fc from "fast-check";

describe("RuleEngine - Property-Based Tests", () => {
  // Feature: notification-hub, Property 9: High Air Temperature Rule
  it("fires HIGH_AIR_TEMPERATURE rule for all temperatures > 35", () => {
    fc.assert(
      fc.property(
        fc.float({ min: 35.00001, max: 100 }),
        fc.float({ min: -100, max: 34.99999 }),
        (aboveThreshold, belowThreshold) => {
          const aboveEvent = {
            sensorType: "AIR_TEMPERATURE",
            value: aboveThreshold,
          };
          const belowEvent = {
            sensorType: "AIR_TEMPERATURE",
            value: belowThreshold,
          };

          const aboveFired = ruleEngine
            .applyRules(aboveEvent)
            .some((r) => r.ruleId === "HIGH_AIR_TEMPERATURE");
          const belowFired = ruleEngine
            .applyRules(belowEvent)
            .some((r) => r.ruleId === "HIGH_AIR_TEMPERATURE");

          expect(aboveFired).toBe(true);
          expect(belowFired).toBe(false);
        },
      ),
      { numRuns: 100 },
    );
  });

  // Feature: notification-hub, Property 2: Required Fields Validation
  it("rejects events missing any required field", () => {
    fc.assert(
      fc.property(
        fc.record({
          eventId: fc.oneof(fc.constant(undefined), fc.constant("")),
          farmId: fc.oneof(fc.constant(undefined), fc.constant("")),
          deviceId: fc.oneof(fc.constant(undefined), fc.constant("")),
          sensorType: fc.oneof(fc.constant(undefined), fc.constant("")),
          value: fc.oneof(fc.constant(undefined), fc.constant(null)),
          unit: fc.oneof(fc.constant(undefined), fc.constant("")),
          timestamp: fc.oneof(fc.constant(undefined), fc.constant("")),
        }),
        (incompleteEvent) => {
          const result = dataValidator.validate(incompleteEvent);
          expect(result.isValid).toBe(false);
        },
      ),
      { numRuns: 50 },
    );
  });
});
```

### Integration Tests

**Scope**: Multiple components working together, with mocked external services.

**Scenarios**:

1. **Happy path**: Valid event → passes validation → not duplicate → rule fires → notification generated and dispatched (Property 17)
2. **Invalid event**: Event fails validation → logged as rejected → no further processing (Property 2)
3. **Duplicate event**: Valid event → detected as duplicate → discarded, no notification (Property 8)
4. **Failed dispatch**: Notification generation succeeds → dispatch fails → added to retry queue (Property 16)
5. **No rules fired**: Valid event → passes validation → no rules fire → no notification generated (Property 18)

**Example Integration Tests**:

```typescript
describe("Event Processing Pipeline - Integration", () => {
  it("processes valid event through complete pipeline with history consolidation", async () => {
    const event = {
      eventId: "evt-001",
      farmId: "farm-001",
      deviceId: "temp-001",
      sensorType: "AIR_TEMPERATURE",
      value: 36,
      unit: "°C",
      timestamp: new Date().toISOString(),
    };

    const result = await eventProcessor.processEvent(event);

    expect(result.isValid).toBe(true);
    expect(result.isDuplicate).toBe(false);
    expect(result.firedRules).toContainEqual(
      expect.objectContaining({
        ruleId: "HIGH_AIR_TEMPERATURE",
      }),
    );
    expect(result.notifications).toHaveLength(1);

    const historyEntry = await eventHistory.getByEventId(event.eventId);
    expect(historyEntry).toMatchObject({
      validationStatus: "valid",
      isDuplicate: false,
      firedRules: expect.arrayContaining([{ ruleId: "HIGH_AIR_TEMPERATURE" }]),
      notifications: expect.arrayContaining([
        expect.objectContaining({ dispatchStatus: "sent" }),
      ]),
    });
  });

  it("rejects invalid events and logs reason", async () => {
    const invalidEvent = {
      eventId: "",
      farmId: "farm-001",
      deviceId: "temp-001",
      sensorType: "AIR_TEMPERATURE",
      value: 36,
      unit: "°C",
      timestamp: new Date().toISOString(),
    };

    const result = await eventProcessor.processEvent(invalidEvent);

    expect(result.isValid).toBe(false);
    expect(result.validationError).toBeDefined();

    const historyEntry = await eventHistory.getByEventId(invalidEvent.eventId);
    expect(historyEntry.validationStatus).toBe("rejected");
    expect(historyEntry.validationError).toBeDefined();
  });

  it("detects duplicates and discards without notification", async () => {
    const event1 = {
      eventId: "evt-001",
      farmId: "farm-001",
      deviceId: "temp-001",
      sensorType: "AIR_TEMPERATURE",
      value: 36,
      unit: "°C",
      timestamp: new Date().toISOString(),
    };

    const event2 = {
      eventId: "evt-002",
      farmId: "farm-001",
      deviceId: "temp-001",
      sensorType: "AIR_TEMPERATURE",
      value: 36,
      unit: "°C",
      timestamp: new Date(Date.now() + 1000).toISOString(),
    };

    const result1 = await eventProcessor.processEvent(event1);
    const result2 = await eventProcessor.processEvent(event2);

    expect(result1.isDuplicate).toBe(false);
    expect(result1.notifications).toHaveLength(1);

    expect(result2.isDuplicate).toBe(true);
    expect(result2.notifications).toHaveLength(0);

    const historyEntry = await eventHistory.getByEventId(event2.eventId);
    expect(historyEntry.isDuplicate).toBe(true);
  });
});
```

### End-to-End Tests

**Scope**: Full system from API to UI with mocked external dependencies.

**Scenarios**:

1. POST event via API → see it in event history UI
2. Event triggers rule → notification displayed in notification UI
3. Simulator generates event → see result in UI within 1 second
4. Filter events by sensor type → correct events returned
5. Retry failed notification manually → status updated

**Example E2E Test**:

```typescript
describe("Event Processing E2E", () => {
  it("receives event via API and displays in UI history", async () => {
    const event = {
      eventId: "evt-e2e-001",
      farmId: "farm-001",
      deviceId: "temp-001",
      sensorType: "AIR_TEMPERATURE",
      value: 36,
      unit: "°C",
      timestamp: new Date().toISOString(),
    };

    const response = await request(app).post("/api/events").send(event);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);

    // Wait for processing
    await wait(500);

    // Verify in UI
    const uiResponse = await request(app)
      .get(`/api/history/${event.farmId}`)
      .query({ eventId: event.eventId });

    expect(uiResponse.body).toContainEqual(
      expect.objectContaining({
        eventId: event.eventId,
        validationStatus: "valid",
      }),
    );
  });
});
```

### Load Testing

**Goals**:

- 100 events/second throughput
- < 1 second latency from event receipt to notification dispatch
- Support for concurrent connections

**Tools**: Apache JMeter or Locust

**Test Scenarios**:

- Constant load: 100 events/second for 5 minutes
- Ramp up: 0 → 100 events/second over 2 minutes
- Spike: 50 → 200 events/second suddenly
- Mixed workload: Different sensor types simultaneously
- Concurrent users: 50 simultaneous WebUI sessions

### Test Coverage Targets

- **Unit Tests**: 90% code coverage for core logic (validator, rule engine, duplicate detector)
- **Integration Tests**: All major workflows (happy path, duplicate, invalid, failed dispatch)
- **E2E Tests**: Critical user scenarios (view farm, check history, simulate events)
- **Property-Based Tests**: All testable acceptance criteria (Properties 1-20)

---

## Extensibility Points

### 1. Adding New Sensor Types

**Steps**:

1. Define new `SensorType` enum value (e.g., `PEST_DETECTION`)
2. Add validation rules in DataValidator
3. Create rule(s) in RuleEngine registry
4. Add UI support in Simulator form
5. Add demo data generator entry

**Example**:

```typescript
const NEW_RULE = {
  ruleId: "PEST_DETECTED",
  sensorType: "PEST_DETECTION",
  condition: (value) => value === "DETECTED",
  notificationTemplate: "Praga detectada no dispositivo: {deviceId}",
};
```

### 2. Adding New Notification Providers

**Steps**:

1. Create new class implementing `NotificationProvider` interface
2. Register provider in dispatcher configuration
3. Add UI for selection in producer preferences
4. Test with integration tests

**Example**:

```typescript
class RealWhatsAppProvider implements NotificationProvider {
  constructor(apiToken: string) {
    /* ... */
  }

  async send(producer, message) {
    const result = await fetch("https://api.whatsapp.com/send", {
      body: { to: producer.phone, message },
    });
    return { success: true, messageId: result.messageId };
  }
}
```

### 3. Adding New Rules

**Steps**:

1. Add rule to RuleEngine registry
2. Add unit tests for the rule
3. Update demo data if needed
4. Document the threshold and condition

---

## Non-Functional Considerations

### Performance

- **Event Processing**: < 1 second latency (MVP)
- **Throughput**: 100 events/second (MVP)
- **Database**: Indexed queries on eventId, farmId, deviceId, timestamp for O(1) lookups
- **Caching**: Redis for duplicate detection to avoid DB hits on every event

### Reliability

- **Durability**: Events persisted before processing
- **Retry Logic**: Up to 3 retry attempts for failed notifications with exponential backoff
- **Graceful Degradation**: If any component fails, pipeline continues with logged errors
- **Idempotency**: Notifications include eventId/notificationId to prevent duplicates on retry

### Auditability

- **Complete Logging**: Every stage of pipeline logged with timestamps
- **Traceability**: EventId links event to all downstream notifications
- **Query Access**: EventHistory queryable by multiple dimensions (eventId, farmId, deviceId, time)

---

## Assumptions & Constraints

### MVP Assumptions

- Events come from trusted devices (no authentication)
- Farm and producer data is pre-configured
- All processing happens in a single server (no distributed deployment)
- Notification failures are acceptable (not all notifications must succeed)

### Constraints

- 5-minute duplicate window is fixed
- Rule thresholds are fixed (no dynamic configuration in MVP)
- Single producer per farm (MVP simplification)
- One notification provider at a time (can select between MockWhatsApp, SMS, Email)

---

## Next Steps

### Before implementation:

1. Review and approve this design document
2. Confirm technology stack choices
3. Clarify any ambiguous requirements
4. Establish testing standards and coverage targets

### Implementation phases:

1. **Phase 1**: Core event processing (receiver, validator, rule engine)
2. **Phase 2**: Notification dispatch and retry logic
3. **Phase 3**: Web UI (farm view, event history, notifications)
4. **Phase 4**: Demo data and simulator
5. **Phase 5**: Comprehensive testing and optimization
