# Implementation Plan: NotificationHub

## Overview

Implementation of a notification system for smart farming that processes IoT sensor events, applies business rules, and dispatches notifications to producers. The system features complete event traceability, rule-based notification generation, and comprehensive testing with property-based tests (fast-check) to validate all 20 correctness properties.

---

## Tasks

### Phase 1: Project Setup and Infrastructure

- [x] 1. Initialize Node.js project with TypeScript and dependencies
  - Set up package.json with required dependencies: express, pg, redis, bull, jest, supertest, fast-check, uuid, dotenv
  - Configure TypeScript: tsconfig.json for strict mode and ES2020 target
  - Set up ESLint and Prettier for code quality
  - Create .env.example with configuration template
  - _Requirements: General setup_

- [x] 2. Configure database schema and migrations
  - Create PostgreSQL schema for: events, farms, producers, devices, event_history, notifications
  - Define indexes on eventId, farmId, deviceId, timestamp for query performance
  - Set up migration system (optional: db-migrate or simple SQL scripts)
  - Create seed scripts for farm and producer data
  - _Requirements: 1.2, 11.1, 11.6_

- [x] 3. Set up Redis cache for duplicate detection
  - Configure Redis connection and TTL strategy (5-minute window for duplicates)
  - Create cache key generation utility (farmId + deviceId + sensorType + value)
  - Set up connection pooling and error handling
  - _Requirements: 3.1, 3.2_

- [x] 4. Set up Bull task queue for notification retries
  - Configure Bull queue for failed notifications
  - Implement retry strategy: max 3 attempts with 5-minute delays
  - Set up queue event listeners for success/failure handling
  - _Requirements: 10.1, 10.4_

### Phase 2: Data Models and Validation Core

- [x] 5. Create TypeScript types and interfaces for domain models
  - Define Event, Farm, Producer, Device, Notification, EventHistory types
  - Define SensorType enum: AIR_TEMPERATURE, AIR_HUMIDITY, SOIL_MOISTURE, WATER_RESERVOIR_LEVEL, SILO_LEVEL, EQUIPMENT_STATUS
  - Define NotificationRule interface with ruleId, name, condition, notificationTemplate
  - Create validation error types
  - _Requirements: 1.2, 2.1_

- [x] 6. Implement Event Receiver HTTP endpoint
  - Create Express POST /api/events endpoint
  - Validate basic payload structure (not empty, valid JSON)
  - Persist event to PostgreSQL with receivedAt timestamp
  - Return 200 with eventId on success, 400 on validation failure
  - _Requirements: 1.1, 1.2, 1.4_

- [x] 7. Implement Data Validator component
  - Create DataValidator class with validate(event) method
  - Check required fields: eventId, farmId, deviceId, sensorType, value, unit, timestamp
  - Check non-empty strings: eventId, farmId, deviceId
  - Check sensorType is valid enum value
  - Check value is numeric for numeric sensor types, string for EQUIPMENT_STATUS
  - Check unit is non-empty string
  
  - Check timestamp is valid ISO8601 and not in future
  - Return {isValid: boolean, error?: string}
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.8_

- [ ]\* 7.1 Write property tests for Data Validator
  - **Property 2: Required Fields Validation** - Any event missing required fields SHALL be rejected
  - **Property 3: Non-Empty String Fields** - Empty eventId/farmId/deviceId SHALL be rejected
  - **Property 4: Sensor Type Validation** - Unsupported sensorType SHALL be rejected
  - **Property 5: Numeric Value Validation** - Non-numeric values for numeric sensors SHALL be rejected
  - **Property 6: Unit String Validation** - Empty unit SHALL be rejected
  - **Property 7: Timestamp Validation** - Future or invalid timestamps SHALL be rejected
  - _Validates: Requirements 2.1-2.8_

### Phase 3: Rule Engine and Duplicate Detection

- [ ] 8. Implement Duplicate Detector component
  - Create DuplicateDetector class with detect(event) method
  - Generate cache key: hash(farmId + deviceId + sensorType + value)
  - Check Redis for recent event (within 5 minutes)
  - Store event in cache with 5-minute TTL if not duplicate
  - Return {isDuplicate: boolean, previousEventId?: string}
  - _Requirements: 3.1, 3.2, 3.3_

- [ ]\* 8.1 Write property tests for Duplicate Detector
  - **Property 8: Duplicate Detection Within Window** - Identical events within 5 minutes SHALL be detected as duplicates
  - Test TTL expiration: after 5+ minutes, re-detection should be allowed
  - _Validates: Requirements 3.1, 3.2, 3.3_

- [ ] 9. Implement Rule Engine with built-in rules registry
  - Create RuleEngine class with applyRules(event) method
  - Define 6 built-in rules as objects: HIGH_AIR_TEMPERATURE, LOW_AIR_HUMIDITY, LOW_SOIL_MOISTURE, LOW_WATER_RESERVOIR, LOW_SILO_LEVEL, EQUIPMENT_FAILURE
  - Each rule has: ruleId, name, sensorType, condition function, notificationTemplate
  - Rule conditions: temp > 35, humidity < 30, soil < 20, water < 15, silo < 15, equipment === "FAILURE"
  - Return array of fired rules for the event
  - _Requirements: 4.1, 4.2, 5.1, 5.2, 6.1, 6.2, 7.1, 7.2, 8.1, 8.2, 9.1, 9.2_

- [ ]\* 9.1 Write property tests for Rule Engine - Temperature Rules
  - **Property 9: High Air Temperature Rule** - AIR_TEMPERATURE > 35 SHALL fire HIGH_AIR_TEMPERATURE
  - **Property 10: Low Air Humidity Rule** - AIR_HUMIDITY < 30 SHALL fire LOW_AIR_HUMIDITY
  - _Validates: Requirements 4.1, 4.2, 5.1, 5.2_

- [ ]\* 9.2 Write property tests for Rule Engine - Moisture and Level Rules
  - **Property 11: Low Soil Moisture Rule** - SOIL_MOISTURE < 20 SHALL fire LOW_SOIL_MOISTURE
  - **Property 12: Low Water Reservoir Rule** - WATER_RESERVOIR_LEVEL < 15 SHALL fire LOW_WATER_RESERVOIR
  - **Property 13: Low Silo Level Rule** - SILO_LEVEL < 15 SHALL fire LOW_SILO_LEVEL
  - _Validates: Requirements 6.1, 6.2, 7.1, 7.2, 8.1, 8.2_

- [ ]\* 9.3 Write property tests for Rule Engine - Equipment Failure Rule
  - **Property 14: Equipment Failure Rule** - EQUIPMENT_STATUS === "FAILURE" SHALL fire EQUIPMENT_FAILURE
  - _Validates: Requirements 9.1, 9.2_

### Phase 4: Notification Generation and Dispatch

- [ ] 10. Implement Notification Generator component
  - Create NotificationGenerator class with generate(event, firedRules) method
  - For each fired rule, create notification object with all required fields
  - Generate notificationId (UUID), include eventId, farmId, deviceId, ruleId, ruleName
  - Interpolate message template with event values
  - Set dispatchStatus = "pending", generatedAt = now()
  - Return array of notifications
  - _Requirements: 4.3, 4.4, 5.3, 9.3_

- [ ]\* 10.1 Write property tests for Notification Generator
  - **Property 15: Notification Message Generation** - Fired rule SHALL generate notification with correct template and all required fields
  - _Validates: Requirements 4.3, 4.4, 5.3, 9.3_

- [x] 11. Implement Notification Provider interface and MockWhatsApp implementation
  - Create NotificationProvider interface: send(producer, message) -> {success: boolean, messageId?: string, error?: string}
  - Create MockWhatsApp class implementing NotificationProvider
  - Mock implementation: 95% success rate for testing retry logic
  - Log simulated sends to console
  - Support future providers (RealWhatsApp, SMS, Email)
  - _Requirements: 10.2, 10.5_

- [ ] 12. Implement Notification Dispatcher component
  - Create NotificationDispatcher class with dispatch(notification) method
  - Get producer from farm association
  - Call NotificationProvider.send(producer, message)
  - Set dispatchStatus: "sent" on success, "failed" on error
  - On failure: add to Bull retry queue with 5-minute delay, max 3 retries
  - Record result in notification object
  - Return {success: boolean, notification, error?: string}
  - _Requirements: 10.1, 10.3, 10.4_

- [ ]\* 12.1 Write property tests for Notification Dispatcher
  - **Property 16: Dispatch Attempt Logging** - Notification SHALL be sent through provider and result recorded
  - Test retry mechanism: failed notifications added to queue
  - _Validates: Requirements 10.1, 10.3, 10.4_

### Phase 5: Event History and Pipeline Orchestration

- [ ] 13. Implement Event History data access layer
  - Create EventHistory class with methods:
    - save(eventHistoryEntry): persist to PostgreSQL
    - getByEventId(eventId): retrieve complete entry
    - getByFarmId(farmId, limit, offset): retrieve paginated farm events
    - getByDeviceId(deviceId, limit, offset): retrieve paginated device events
    - getByDateRange(farmId, startDate, endDate): retrieve events in time window
  - Include query indexes for performance
  - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5, 11.6, 17.1, 17.2, 17.3, 17.4_

- [ ] 14. Implement Event Processing Pipeline orchestrator
  - Create EventProcessor class that coordinates all components
  - Sequence: EventReceiver â†’ DataValidator â†’ DuplicateDetector â†’ RuleEngine â†’ NotificationGenerator â†’ NotificationDispatcher â†’ EventHistory
  - Create consolidated EventHistoryEntry linking all stages with timestamps
  - Handle both success and error paths, logging all results
  - _Requirements: 1.1, 2.1, 3.1, 4.1, 10.1, 11.1, 17.1_

- [ ]\* 14.1 Write property tests for Event History and Pipeline
  - **Property 1: Event Persistence** - Valid event SHALL be persisted before processing
  - **Property 17: Event History Consolidation** - Complete event SHALL link to all pipeline stages with timestamps
  - **Property 18: No-Action Pipeline Logging** - Valid event without fired rules SHALL be logged with "no rules fired" status
  - **Property 19: EventHistory Query Consistency** - Queries SHALL return consistent schema
  - _Validates: Requirements 1.1, 11.1-11.6, 17.1-17.5_

- [ ] 15. Checkpoint - Core pipeline functional
  - Test Event Receiver accepts valid events and returns 200
  - Test DataValidator rejects invalid events with specific errors
  - Test RuleEngine fires correct rules for threshold violations
  - Test NotificationGenerator creates notifications with correct messages
  - Test EventHistory stores complete pipeline records
  - Ensure all tests pass, ask the user if questions arise.

### Phase 6: Web UI - Frontend Setup and Core Views

- [x] 16. Set up React frontend with Tailwind CSS and TanStack Query
  - Initialize Create React App with TypeScript or Vite
  - Configure Tailwind CSS for styling
  - Set up TanStack Query (React Query) for data fetching and caching
  - Create API client wrapper for backend communication
  - Set up routing with React Router
  - Create main layout with navigation
  - _Requirements: 12.1, 13.1, 14.1_

- [-] 17. Implement Farm View page
  - Display list of farms: farmId, name, sensor count, producer name
  - Add farm selection to show detailed view
  - Show list of devices for selected farm with last reading
  - Display color-coded status indicators: green (normal), yellow (warning), red (critical)
  - Add refresh button for real-time updates
  - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5_

- [~] 18. Implement Events View page
  - Display paginated list of events (20 per page) for selected farm
  - Show: eventId, deviceId, sensorType, value, unit, timestamp, status
  - Implement filters: by sensorType, date range, status (valid/rejected/duplicate)
  - Display validation error reason for rejected events
  - Sort by timestamp descending (most recent first)
  - _Requirements: 13.1, 13.2, 13.3, 13.4, 13.5_

- [~] 19. Implement Notifications View page
  - Display paginated list of notifications (20 per page) for selected farm
  - Show: notificationId, fired rule, message, generation timestamp, send status
  - Implement filters: by fired rule, date range, send status
  - Display error reason for failed sends
  - Add manual retry button for failed notifications
  - Sort by timestamp descending
  - _Requirements: 14.1, 14.2, 14.3, 14.4, 14.5_

- [~] 20. Implement Event Simulator form
  - Create form with fields: farmId (dropdown), deviceId (dropdown), sensorType (dropdown), value (number), unit (text)
  - Auto-populate deviceId list based on selected farm
  - Suggest typical values and valid ranges for selected sensorType
  - On submit: send event to EventReceiver via POST /api/events
  - Display confirmation and link to view result in event history
  - _Requirements: 15.1, 15.2, 15.3, 15.4, 15.5_

### Phase 7: Backend API Endpoints and Demo Data

- [ ] 21. Implement Farm and Producer management endpoints
  - POST /api/farms: create new farm
  - GET /api/farms: list all farms with pagination
  - GET /api/farms/:farmId: get farm details with devices
  - POST /api/producers: create new producer
  - GET /api/producers: list all producers
  - _Requirements: 18.1, 18.2, 18.3, 18.4, 18.5_

- [ ] 22. Implement Event History query endpoints
  - GET /api/history/:eventId: retrieve complete event history entry
  - GET /api/history/farm/:farmId: retrieve paginated farm events
  - GET /api/history/device/:deviceId: retrieve paginated device events
  - GET /api/history/search: search events by date range, status, sensorType
  - _Requirements: 11.6, 17.2, 17.4_

- [ ] 23. Implement Demo Data Loader
  - Create DemoDataLoader class that runs on application startup (can be disabled via env var)
  - Create farm: "Boa EsperanÃ§a" (farm-001)
  - Create producer: "JoÃ£o Silva" (producer-001) with phone +5535999999999
  - Create 6 devices: one for each sensor type
  - Generate events that trigger each rule: temp=36, humidity=25, soil=15, water=10, silo=12, equipment=FAILURE
  - Generate normal events (no rule triggers): temp=25, humidity=60, soil=45, water=80, silo=70, equipment=OK
  - _Requirements: 16.1, 16.2, 16.3, 16.4, 16.5, 16.6_

### Phase 8: Comprehensive Testing

- [ ] 24. Write unit tests for Event Receiver
  - Test valid event acceptance and 200 response
  - Test empty payload rejection with 400 response
  - Test missing required fields rejection
  - Test invalid JSON rejection
  - Test event persisted to database
  - _Requirements: 1.1, 1.2, 1.4_

- [ ] 25. Write unit tests for DataValidator
  - See sub-task 7.1 for property tests
  - Additional example tests: specific boundary values (35.0, 34.999), edge cases
  - _Validates: Properties 2-7_

- [ ] 26. Write unit tests for DuplicateDetector
  - See sub-task 8.1 for property tests
  - Test Redis cache operations and TTL expiration
  - _Validates: Property 8_

- [ ] 27. Write unit tests for RuleEngine
  - See sub-tasks 9.1-9.3 for property tests
  - Test all 6 rules independently
  - Test multiple rules firing for single event
  - Test no rules firing for normal values
  - _Validates: Properties 9-14_

- [ ] 28. Write unit tests for NotificationGenerator
  - See sub-task 10.1 for property tests
  - Test message template interpolation
  - Test all required fields populated
  - _Validates: Property 15_

- [ ] 29. Write unit tests for NotificationDispatcher
  - See sub-task 12.1 for property tests
  - Test successful dispatch
  - Test failed dispatch and retry queue addition
  - Test max retries exceeded
  - Mock NotificationProvider
  - _Validates: Property 16_

- [ ] 30. Write integration tests for Event Processing Pipeline
  - See sub-task 14.1 for property tests
  - Test happy path: valid event â†’ rule fires â†’ notification sent
  - Test invalid event path: rejected with reason logged
  - Test duplicate event path: discarded, no notification
  - Test failed dispatch path: added to retry queue
  - Test no rules fired path: logged with "no rules fired" status
  - _Validates: Properties 1, 17-19_

- [ ] 31. Write API endpoint tests
  - Test POST /api/events with valid and invalid payloads
  - Test GET /api/farms and GET /api/farms/:farmId
  - Test GET /api/history/\* endpoints with various filters
  - Test GET /api/producers
  - Use Supertest for HTTP testing
  - _Requirements: 1.1, 11.6, 17.2, 17.4, 18.1-18.5_

- [ ] 32. Write E2E tests for critical user flows
  - Flow 1: Simulate sensor event â†’ verify in event history â†’ see notification
  - Flow 2: Invalid event â†’ see rejection reason in history
  - Flow 3: Duplicate event â†’ verify discarded, no notification
  - Flow 4: Failed notification â†’ verify in retry queue
  - Use test database and real HTTP server
  - _Requirements: All_

- [ ] 33. Checkpoint - All tests passing
  - Run full test suite: unit, integration, E2E
  - Verify coverage targets: 90% for core logic
  - Verify all property tests pass (100+ iterations each)
  - Ensure database migrations applied and seeds loaded
  - Ask the user if questions arise.

### Phase 9: Final Integration and Polish

- [ ] 34. Implement graceful error handling and logging
  - Set up Winston or Pino for structured logging
  - Implement error boundary in React frontend
  - Add error recovery: retry failed requests, fallback UI
  - Log all validation errors with specific reasons
  - _Requirements: 2.8, 10.4_

- [ ] 35. Optimize database queries and add caching
  - Add database indexes for: eventId, farmId, deviceId, timestamp
  - Verify slow query logs are empty
  - Add TanStack Query caching for UI data fetches
  - Implement Redis caching for frequently queried farm/producer data
  - _Requirements: Performance_

- [ ] 36. Create README and development documentation
  - Document project structure: backend, frontend, database, test organization
  - Document setup instructions: npm install, database migrations, environment variables
  - Document how to run dev server, run tests, build for production
  - Document API endpoints with examples
  - Document how to add new sensor types and rules
  - _Requirements: General documentation_

- [ ] 37. Prepare deployment artifacts
  - Create Dockerfile for backend
  - Create docker-compose.yml with PostgreSQL, Redis, backend services
  - Create .env.example with all required variables
  - Document how to configure for production (not MVP, can be optional)
  - _Requirements: General deployment readiness_

- [ ] 38. Final checkpoint - System end-to-end working
  - Verify all 18 requirements implemented and traceable
  - Verify all 20 correctness properties testable and passing
  - Verify UI flows work: farm view â†’ events â†’ notifications â†’ simulator
  - Verify demo data loads and triggers rules correctly
  - Verify database has complete event history
  - Ask the user if questions arise.

---

## Notes

- **Property-Based Tests**: Tasks marked with "\*" are optional but highly recommended for validation of correctness properties. These use fast-check library with 100+ iterations per property test.
- **Test Tasks**: All test-related sub-tasks (7.1, 8.1, 9.1-9.3, 10.1, 12.1, 14.1, 25-32) are marked optional and can be skipped for faster MVP, but this is not recommended as properties are critical for system correctness.
- **Checkpoint Tasks**: Perform validation at reasonable breaks (tasks 15, 33, 38) to catch issues early.
- **Requirements Traceability**: Each task references specific requirements for complete traceability from requirements â†’ design â†’ implementation â†’ tests.
- **Tech Stack**: All tasks assume Node.js / TypeScript, Express.js, PostgreSQL, Redis, React, fast-check for testing.
- **Duplicate Detection**: 5-minute TTL for Redis cache is a fixed MVP constraint; rule thresholds are fixed (not dynamically configurable in MVP).

---

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1", "2", "3", "4", "5"] },
    { "id": 1, "tasks": ["6", "8", "9", "11"] },
    { "id": 2, "tasks": ["7", "7.1", "10", "10.1", "12"] },
    { "id": 3, "tasks": ["8.1", "9.1", "9.2", "9.3", "12.1"] },
    { "id": 4, "tasks": ["13", "14"] },
    { "id": 5, "tasks": ["14.1", "16", "21", "23"] },
    { "id": 6, "tasks": ["17", "18", "19", "20", "22"] },
    { "id": 7, "tasks": ["24", "25", "26", "27", "28", "29"] },
    { "id": 8, "tasks": ["30", "31", "32"] },
    { "id": 9, "tasks": ["34", "35", "36", "37"] }
  ]
}
```

