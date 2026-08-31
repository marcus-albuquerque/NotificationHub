/**
 * Rule Engine Service
 *
 * Applies business rules to events to determine which notifications should be generated.
 * The RuleEngine maintains a registry of rules and evaluates each applicable rule
 * against incoming events, returning the set of rules that fired.
 *
 * Design Pattern: Registry-based rule evaluation with pure condition functions
 * This allows for extensibility - new rules can be added without modifying the engine.
 */
import { Event, NotificationRule } from "../types/index";
/**
 * RuleEngine class
 *
 * Manages the notification rules registry and applies rules to events.
 * Rules are evaluated independently, so multiple rules can fire for a single event.
 */
export declare class RuleEngine {
    private rules;
    constructor();
    /**
     * Initialize built-in rules registry
     *
     * These are the core rules for the MVP smart farming system.
     * Each rule specifies:
     * - ruleId: unique identifier for the rule
     * - name: human-readable name
     * - sensorType: which sensor type triggers this rule
     * - condition: pure function that evaluates if the rule should fire
     * - notificationTemplate: message template with {value}, {deviceId} placeholders
     */
    private initializeBuiltInRules;
    /**
     * Get all registered rules
     *
     * @returns Map of all registered rules indexed by ruleId
     */
    getAllRules(): NotificationRule[];
    /**
     * Get rules applicable to a specific sensor type
     *
     * @param sensorType The type of sensor to find rules for
     * @returns Array of rules that apply to this sensor type
     */
    private getRulesBySensorType;
    /**
     * Apply rules to an event
     *
     * Evaluates all applicable rules for the event's sensor type and returns
     * the subset of rules that fired (condition evaluated to true).
     *
     * This is the main entry point for the Rule Engine.
     * Algorithm:
     * 1. Find all rules applicable to this event's sensor type
     * 2. For each applicable rule, evaluate its condition function with the event's value
     * 3. Collect all rules where condition(value) returned true
     * 4. Return the array of fired rules
     *
     * @param event The event to evaluate against rules
     * @returns Array of rules that fired for this event (empty if no rules fired)
     *
     * @example
     * const event = {
     *   eventId: "evt-001",
     *   farmId: "farm-001",
     *   deviceId: "temp-001",
     *   sensorType: SensorType.AIR_TEMPERATURE,
     *   value: 36,
     *   unit: "°C",
     *   timestamp: "2024-01-15T14:30:00Z"
     * };
     * const firedRules = ruleEngine.applyRules(event);
     * // firedRules will contain HIGH_AIR_TEMPERATURE rule
     */
    applyRules(event: Event): NotificationRule[];
    /**
     * Add a custom rule to the registry
     *
     * Allows for dynamic rule registration at runtime.
     * This enables extensibility without modifying the engine code.
     *
     * @param rule The rule to add
     * @throws Error if a rule with the same ruleId already exists
     */
    registerRule(rule: NotificationRule): void;
    /**
     * Update an existing rule in the registry
     *
     * @param rule The updated rule
     * @throws Error if no rule with the given ruleId exists
     */
    updateRule(rule: NotificationRule): void;
    /**
     * Remove a rule from the registry
     *
     * @param ruleId The ID of the rule to remove
     * @returns true if the rule was removed, false if it didn't exist
     */
    removeRule(ruleId: string): boolean;
    /**
     * Get a specific rule by its ID
     *
     * @param ruleId The ID of the rule to retrieve
     * @returns The rule if found, undefined otherwise
     */
    getRule(ruleId: string): NotificationRule | undefined;
    /**
     * Get count of registered rules
     *
     * @returns Total number of rules in the registry
     */
    getRuleCount(): number;
}
export declare const ruleEngine: RuleEngine;
//# sourceMappingURL=rule-engine.d.ts.map