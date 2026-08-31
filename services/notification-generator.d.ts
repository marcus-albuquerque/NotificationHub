/**
 * NotificationHub - Notification Generator Service
 *
 * Generates notification objects from fired rules based on event data.
 * Interpolates message templates with event values and creates complete notification records.
 */
import { Event, Notification, NotificationRule } from '../types';
/**
 * Notification Generator
 *
 * Responsible for:
 * - Creating notification objects from fired rules
 * - Interpolating message templates with event data
 * - Setting proper initial state (pending dispatch status, generated timestamp, etc.)
 * - Including all required notification fields
 */
export declare class NotificationGenerator {
    /**
     * Generate notifications for fired rules
     *
     * For each fired rule, creates a complete notification object with:
     * - Unique notificationId (UUID)
     * - Event reference information (eventId, farmId, deviceId)
     * - Rule information (ruleId, ruleName)
     * - Interpolated message template
     * - Event value and timestamp
     * - Generated timestamp and initial pending dispatch status
     *
     * @param event - The event that triggered the rules
     * @param firedRules - Array of rules that fired for this event
     * @returns Array of generated notification objects
     *
     * @example
     * const event = {
     *   eventId: "evt-001",
     *   farmId: "farm-001",
     *   deviceId: "temp-001",
     *   sensorType: "AIR_TEMPERATURE",
     *   value: 36.5,
     *   unit: "°C",
     *   timestamp: "2024-01-15T14:30:00Z"
     * };
     * const firedRules = [
     *   {
     *     ruleId: "HIGH_AIR_TEMPERATURE",
     *     name: "High Air Temperature",
     *     notificationTemplate: "Temperatura do ar acima do normal: {value}°C"
     *   }
     * ];
     * const notifications = generator.generate(event, firedRules);
     * // Returns: [{
     * //   notificationId: "uuid-xxx",
     * //   eventId: "evt-001",
     * //   farmId: "farm-001",
     * //   deviceId: "temp-001",
     * //   ruleId: "HIGH_AIR_TEMPERATURE",
     * //   ruleName: "High Air Temperature",
     * //   message: "Temperatura do ar acima do normal: 36.5°C",
     * //   eventValue: 36.5,
     * //   eventTimestamp: "2024-01-15T14:30:00Z",
     * //   generatedAt: "2024-01-15T14:30:01Z",
     * //   dispatchStatus: "pending"
     * // }]
     */
    generate(event: Event, firedRules: NotificationRule[]): Notification[];
    /**
     * Interpolate a message template with event values
     *
     * Replaces template variables (e.g., {value}, {deviceId}) with actual event data.
     * Supported variables:
     * - {value}: The event value
     * - {unit}: The measurement unit
     * - {deviceId}: The device identifier
     * - {farmId}: The farm identifier
     * - {sensorType}: The sensor type
     * - {timestamp}: The event timestamp
     *
     * @param template - Message template with variable placeholders
     * @param event - Event containing values for interpolation
     * @returns Interpolated message string
     *
     * @private
     */
    private interpolateMessage;
}
/**
 * Create a singleton instance of NotificationGenerator
 */
export declare const notificationGenerator: NotificationGenerator;
//# sourceMappingURL=notification-generator.d.ts.map