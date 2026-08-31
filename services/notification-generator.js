"use strict";
/**
 * NotificationHub - Notification Generator Service
 *
 * Generates notification objects from fired rules based on event data.
 * Interpolates message templates with event values and creates complete notification records.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.notificationGenerator = exports.NotificationGenerator = void 0;
const uuid_1 = require("uuid");
const logger_1 = __importDefault(require("../utils/logger"));
/**
 * Notification Generator
 *
 * Responsible for:
 * - Creating notification objects from fired rules
 * - Interpolating message templates with event data
 * - Setting proper initial state (pending dispatch status, generated timestamp, etc.)
 * - Including all required notification fields
 */
class NotificationGenerator {
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
    generate(event, firedRules) {
        const notifications = [];
        const generatedAt = new Date().toISOString();
        for (const rule of firedRules) {
            try {
                // Interpolate the message template with event values
                const message = this.interpolateMessage(rule.notificationTemplate, event);
                // Create notification object with all required fields
                const notification = {
                    notificationId: (0, uuid_1.v4)(),
                    eventId: event.eventId,
                    farmId: event.farmId,
                    deviceId: event.deviceId,
                    ruleId: rule.ruleId,
                    ruleName: rule.name,
                    message,
                    eventValue: event.value,
                    eventTimestamp: event.timestamp,
                    generatedAt,
                    dispatchStatus: 'pending',
                };
                notifications.push(notification);
                logger_1.default.debug(`Notification generated`, {
                    notificationId: notification.notificationId,
                    eventId: event.eventId,
                    ruleId: rule.ruleId,
                    message: message.substring(0, 100), // Log first 100 chars
                });
            }
            catch (error) {
                logger_1.default.error(`Error generating notification for rule`, {
                    eventId: event.eventId,
                    ruleId: rule.ruleId,
                    error: error instanceof Error ? error.message : String(error),
                });
                // Continue processing other rules even if one fails
            }
        }
        logger_1.default.info(`Notifications generated`, {
            eventId: event.eventId,
            rulesCount: firedRules.length,
            notificationsCount: notifications.length,
        });
        return notifications;
    }
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
    interpolateMessage(template, event) {
        let message = template;
        // Replace all template variables with event values
        const replacements = {
            '{value}': String(event.value),
            '{unit}': event.unit,
            '{deviceId}': event.deviceId,
            '{farmId}': event.farmId,
            '{sensorType}': event.sensorType,
            '{timestamp}': event.timestamp,
        };
        for (const [placeholder, replacement] of Object.entries(replacements)) {
            // Escape special regex characters in the placeholder
            const escapedPlaceholder = placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            // Also escape special regex characters in the replacement value to prevent regex injection
            const escapedReplacement = replacement.replace(/\$/g, '$$$$');
            message = message.replace(new RegExp(escapedPlaceholder, 'g'), escapedReplacement);
        }
        return message;
    }
}
exports.NotificationGenerator = NotificationGenerator;
/**
 * Create a singleton instance of NotificationGenerator
 */
exports.notificationGenerator = new NotificationGenerator();
//# sourceMappingURL=notification-generator.js.map