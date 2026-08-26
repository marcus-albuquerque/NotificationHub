/**
 * NotificationHub - Domain Types and Interfaces
 *
 * This file defines all TypeScript types, interfaces, and enums used throughout the system.
 * It represents the domain model for the smart farming notification system.
 */

/**
 * SensorType Enum
 *
 * Defines all supported sensor types that can be monitored in the system.
 * Each type corresponds to a specific measurement from a farm device/sensor.
 */
export enum SensorType {
  AIR_TEMPERATURE = "AIR_TEMPERATURE",
  AIR_HUMIDITY = "AIR_HUMIDITY",
  SOIL_MOISTURE = "SOIL_MOISTURE",
  WATER_RESERVOIR_LEVEL = "WATER_RESERVOIR_LEVEL",
  SILO_LEVEL = "SILO_LEVEL",
  EQUIPMENT_STATUS = "EQUIPMENT_STATUS",
}

/**
 * Event
 *
 * Represents a single sensor reading/measurement received from a device.
 * This is the core input to the notification system pipeline.
 *
 * @property eventId - Unique identifier for this event (UUID)
 * @property farmId - Identifier of the farm where the event occurred
 * @property deviceId - Identifier of the device/sensor that generated the event
 * @property sensorType - Type of sensor that produced this reading
 * @property value - The measured value (can be numeric or string depending on sensorType)
 * @property unit - Unit of measurement (e.g., "°C", "%", "mm", "L")
 * @property timestamp - ISO8601 datetime when the measurement was taken by the device
 * @property receivedAt - ISO8601 datetime when the event was received by the system
 */
export interface Event {
  eventId: string;
  farmId: string;
  deviceId: string;
  sensorType: SensorType;
  value: number | string;
  unit: string;
  timestamp: string;
  receivedAt?: string;
}

/**
 * Farm
 *
 * Represents a smart farm/agricultural property in the system.
 * Multiple devices/sensors are associated with a single farm.
 * A farm is associated with a producer who receives notifications.
 *
 * @property farmId - Unique identifier for the farm
 * @property name - Human-readable name of the farm
 * @property producerId - Identifier of the producer responsible for this farm
 * @property createdAt - ISO8601 datetime when the farm was registered
 */
export interface Farm {
  farmId: string;
  name: string;
  producerId: string;
  createdAt?: string;
}

/**
 * Producer
 *
 * Represents a farm owner/operator who receives notifications.
 * A producer can manage one or more farms and receives notifications
 * through configured communication channels.
 *
 * @property producerId - Unique identifier for the producer
 * @property name - Human-readable name of the producer
 * @property phone - Phone number for notification delivery (e.g., WhatsApp)
 * @property email - Email address for potential future notification channel
 * @property notificationPreferences - User preferences for notifications
 *   - channels: List of enabled notification channels (e.g., ["WhatsApp"])
 *   - quietHours: Time window during which notifications should be suppressed (e.g., "22:00-06:00")
 */
export interface NotificationPreferences {
  channels: string[];
  quietHours?: string; // Format: "HH:MM-HH:MM"
}

export interface Producer {
  producerId: string;
  name: string;
  phone: string;
  email?: string;
  notificationPreferences?: NotificationPreferences;
}

/**
 * Device
 *
 * Represents a physical sensor or equipment connected to a farm.
 * Each device reports measurements of a specific sensor type.
 *
 * @property deviceId - Unique identifier for the device
 * @property farmId - Identifier of the farm this device belongs to
 * @property name - Human-readable name of the device
 * @property sensorType - Type of sensor this device measures
 * @property status - Current operational status ("active", "inactive", "error")
 * @property lastReadingAt - ISO8601 datetime of the last measurement received
 * @property lastValue - The last measured value
 */
export interface Device {
  deviceId: string;
  farmId: string;
  name: string;
  sensorType: SensorType;
  status: "active" | "inactive" | "error";
  lastReadingAt?: string;
  lastValue?: number | string;
}

/**
 * NotificationRule
 *
 * Defines a business rule that determines when notifications should be generated.
 * Rules specify a condition to evaluate against event values and a template
 * for the notification message to send when the condition is met.
 *
 * @property ruleId - Unique identifier for this rule (e.g., "HIGH_AIR_TEMPERATURE")
 * @property name - Human-readable name for the rule
 * @property sensorType - Type of sensor this rule applies to
 * @property condition - Function that evaluates the event value against thresholds
 *                       Returns true if the rule should fire (notification should be generated)
 * @property notificationTemplate - Message template with {value}, {deviceId}, etc. for interpolation
 */
export interface NotificationRule {
  ruleId: string;
  name: string;
  sensorType: SensorType;
  condition: (value: number | string) => boolean;
  notificationTemplate: string;
}

/**
 * Notification
 *
 * Represents an alert generated when a notification rule fires.
 * Contains information about what triggered the notification and
 * tracks the status of delivery attempts through notification providers.
 *
 * @property notificationId - Unique identifier (UUID)
 * @property eventId - Identifier of the event that triggered this notification
 * @property farmId - Identifier of the farm
 * @property deviceId - Identifier of the device that generated the event
 * @property ruleId - Identifier of the rule that fired
 * @property ruleName - Human-readable name of the rule
 * @property message - The complete notification message to be sent
 * @property eventValue - The sensor value that triggered the rule
 * @property eventTimestamp - When the event was measured
 * @property generatedAt - When this notification was generated
 * @property dispatchStatus - Delivery status: "pending", "sent", "failed", "retrying"
 * @property dispatchError - Error message if dispatch failed
 * @property producerId - Identifier of the producer receiving this notification
 */
export interface Notification {
  notificationId: string;
  eventId: string;
  farmId: string;
  deviceId: string;
  ruleId: string;
  ruleName: string;
  message: string;
  eventValue: number | string;
  eventTimestamp: string;
  generatedAt: string;
  dispatchStatus: "pending" | "sent" | "failed" | "retrying";
  dispatchError?: string;
  producerId?: string;
}

/**
 * Fired Rule Record
 *
 * Records information about a rule that fired during event processing.
 * Used in EventHistory to track which rules triggered for an event.
 *
 * @property ruleId - Identifier of the rule
 * @property ruleName - Human-readable name of the rule
 * @property firedAt - ISO8601 datetime when the rule fired
 */
export interface FiredRule {
  ruleId: string;
  ruleName: string;
  firedAt: string;
}

/**
 * Notification Record
 *
 * Records a notification that was generated and dispatched.
 * Used in EventHistory to track all notifications for an event.
 *
 * @property notificationId - Unique identifier
 * @property message - The notification message
 * @property generatedAt - When the notification was generated
 * @property dispatchStatus - Delivery status
 * @property dispatchError - Error message if delivery failed
 */
export interface NotificationRecord {
  notificationId: string;
  message: string;
  generatedAt: string;
  dispatchStatus: "pending" | "sent" | "failed" | "retrying";
  dispatchError?: string;
}

/**
 * EventHistoryEntry
 *
 * Comprehensive record of an event's complete journey through the notification pipeline.
 * Provides complete auditability and traceability from event reception through
 * notification delivery.
 *
 * This is the central data structure for understanding what happened to any event
 * in the system, with timestamps and results at each stage.
 *
 * @property id - Unique identifier for this history entry (UUID)
 * @property eventId - Identifier of the event
 * @property farmId - Identifier of the farm
 * @property deviceId - Identifier of the device
 *
 * Reception stage:
 * @property receivedAt - When the event was received by the system
 *
 * Validation stage:
 * @property validationStatus - "valid" or "rejected"
 * @property validationError - Error message if validation failed
 *
 * Duplicate detection stage:
 * @property isDuplicate - Whether this event was a duplicate
 * @property previousEventId - If duplicate, the ID of the previous event
 *
 * Rule application stage:
 * @property firedRules - Array of rules that fired for this event
 *
 * Notification generation stage:
 * @property notifications - Array of notifications generated
 *
 * Complete pipeline tracking:
 * @property processedAt - When the event completed processing
 * @property processingDurationMs - Total time from reception to completion
 */
export interface EventHistoryEntry {
  id: string;
  eventId: string;
  farmId: string;
  deviceId: string;

  // Reception
  receivedAt: string;

  // Validation
  validationStatus: "valid" | "rejected";
  validationError?: string;

  // Duplicate Detection
  isDuplicate: boolean;
  previousEventId?: string;

  // Rule Application
  firedRules: FiredRule[];

  // Notifications
  notifications: NotificationRecord[];

  // Complete timeline
  processedAt: string;
  processingDurationMs: number;
}

/**
 * ValidationError
 *
 * Represents a validation error that occurred during event processing.
 * Used to provide detailed feedback about why an event was rejected.
 *
 * @property code - Error code for programmatic handling (e.g., "MISSING_FIELD", "INVALID_SENSOR_TYPE")
 * @property message - Human-readable error message
 * @property field - The field that caused the error (if applicable)
 * @property value - The problematic value that was received (if applicable)
 */
export interface ValidationError {
  code: string;
  message: string;
  field?: string;
  value?: unknown;
}

/**
 * Data Validator Result
 *
 * Represents the result of validating an event.
 * Indicates whether validation passed and provides detailed error information if it failed.
 *
 * @property isValid - Whether the event passed all validations
 * @property errors - Array of validation errors (empty if valid)
 */
export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
}

/**
 * Duplicate Detection Result
 *
 * Represents the result of duplicate detection for an event.
 *
 * @property isDuplicate - Whether this event is a duplicate
 * @property previousEventId - If duplicate, the ID of the event it duplicates
 * @property message - Additional information about the duplicate detection result
 */
export interface DuplicateDetectionResult {
  isDuplicate: boolean;
  previousEventId?: string;
  message?: string;
}

/**
 * Rule Application Result
 *
 * Represents the result of applying all rules to an event.
 *
 * @property firedRules - Array of rules that fired
 * @property count - Total number of rules that fired
 */
export interface RuleApplicationResult {
  firedRules: NotificationRule[];
  count: number;
}

/**
 * Notification Dispatch Result
 *
 * Represents the result of attempting to dispatch a notification.
 *
 * @property success - Whether the dispatch was successful
 * @property notificationId - Identifier of the notification
 * @property messageId - Provider-specific message ID (if successful)
 * @property error - Error message (if unsuccessful)
 * @property willRetry - Whether the notification will be retried
 */
export interface NotificationDispatchResult {
  success: boolean;
  notificationId: string;
  messageId?: string;
  error?: string;
  willRetry?: boolean;
}

/**
 * Event Processing Result
 *
 * Represents the complete result of processing an event through the pipeline.
 * This is what the EventProcessor returns after orchestrating all pipeline stages.
 *
 * @property eventId - Identifier of the processed event
 * @property validationResult - Result of validation stage
 * @property isDuplicate - Whether the event was duplicate
 * @property firedRules - Rules that fired (if valid and not duplicate)
 * @property notifications - Notifications generated (if rules fired)
 * @property dispatchResults - Results of dispatch attempts for each notification
 * @property historyEntry - Complete EventHistoryEntry created for this event
 * @property processingDurationMs - Total processing time
 */
export interface EventProcessingResult {
  eventId: string;
  validationResult: ValidationResult;
  isDuplicate: boolean;
  firedRules: NotificationRule[];
  notifications: Notification[];
  dispatchResults: NotificationDispatchResult[];
  historyEntry: EventHistoryEntry;
  processingDurationMs: number;
}

/**
 * API Response Wrapper
 *
 * Standard wrapper for API responses to ensure consistent response format.
 *
 * @property success - Whether the operation succeeded
 * @property data - The response data
 * @property error - Error message (if not successful)
 * @property timestamp - ISO8601 datetime of the response
 */
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: string;
}
