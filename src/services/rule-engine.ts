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

import { Event, NotificationRule, SensorType } from "../types/index";
import { logger } from "../utils/logger";

/**
 * RuleEngine class
 *
 * Manages the notification rules registry and applies rules to events.
 * Rules are evaluated independently, so multiple rules can fire for a single event.
 */
export class RuleEngine {
  private rules: Map<string, NotificationRule>;

  constructor() {
    this.rules = new Map();
    this.initializeBuiltInRules();
  }

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
  private initializeBuiltInRules(): void {
    const builtInRules: NotificationRule[] = [
      {
        ruleId: "HIGH_AIR_TEMPERATURE",
        name: "High Air Temperature",
        sensorType: SensorType.AIR_TEMPERATURE,
        condition: (value: number | string): boolean => {
          const numValue = typeof value === "number" ? value : parseFloat(value as string);
          return !isNaN(numValue) && numValue > 35;
        },
        notificationTemplate: "Temperatura do ar acima do normal: {value}°C",
      },
      {
        ruleId: "LOW_AIR_HUMIDITY",
        name: "Low Air Humidity",
        sensorType: SensorType.AIR_HUMIDITY,
        condition: (value: number | string): boolean => {
          const numValue = typeof value === "number" ? value : parseFloat(value as string);
          return !isNaN(numValue) && numValue < 30;
        },
        notificationTemplate: "Umidade do ar abaixo do normal: {value}%",
      },
      {
        ruleId: "LOW_SOIL_MOISTURE",
        name: "Low Soil Moisture",
        sensorType: SensorType.SOIL_MOISTURE,
        condition: (value: number | string): boolean => {
          const numValue = typeof value === "number" ? value : parseFloat(value as string);
          return !isNaN(numValue) && numValue < 20;
        },
        notificationTemplate: "Umidade do solo crítica: {value}%",
      },
      {
        ruleId: "LOW_WATER_RESERVOIR",
        name: "Low Water Reservoir",
        sensorType: SensorType.WATER_RESERVOIR_LEVEL,
        condition: (value: number | string): boolean => {
          const numValue = typeof value === "number" ? value : parseFloat(value as string);
          return !isNaN(numValue) && numValue < 15;
        },
        notificationTemplate: "Nível de água do reservatório crítico: {value}%",
      },
      {
        ruleId: "LOW_SILO_LEVEL",
        name: "Low Silo Level",
        sensorType: SensorType.SILO_LEVEL,
        condition: (value: number | string): boolean => {
          const numValue = typeof value === "number" ? value : parseFloat(value as string);
          return !isNaN(numValue) && numValue < 15;
        },
        notificationTemplate: "Nível do silo crítico: {value}%",
      },
      {
        ruleId: "EQUIPMENT_FAILURE",
        name: "Equipment Failure",
        sensorType: SensorType.EQUIPMENT_STATUS,
        condition: (value: number | string): boolean => {
          return value === "FAILURE";
        },
        notificationTemplate: "Falha em equipamento detectada no dispositivo: {deviceId}",
      },
    ];

    // Register all built-in rules
    for (const rule of builtInRules) {
      this.rules.set(rule.ruleId, rule);
    }

    logger.info(`RuleEngine initialized with ${builtInRules.length} built-in rules`);
  }

  /**
   * Get all registered rules
   *
   * @returns Map of all registered rules indexed by ruleId
   */
  getAllRules(): NotificationRule[] {
    return Array.from(this.rules.values());
  }

  /**
   * Get rules applicable to a specific sensor type
   *
   * @param sensorType The type of sensor to find rules for
   * @returns Array of rules that apply to this sensor type
   */
  private getRulesBySensorType(sensorType: SensorType): NotificationRule[] {
    return Array.from(this.rules.values()).filter((rule) => rule.sensorType === sensorType);
  }

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
  applyRules(event: Event): NotificationRule[] {
    const applicableRules = this.getRulesBySensorType(event.sensorType);
    const firedRules: NotificationRule[] = [];

    for (const rule of applicableRules) {
      try {
        const conditionMet = rule.condition(event.value);
        if (conditionMet) {
          firedRules.push(rule);
          logger.debug(
            `Rule fired: ${rule.ruleId} for event ${event.eventId} with value ${event.value}`,
          );
        }
      } catch (error) {
        logger.error(
          `Error evaluating rule ${rule.ruleId} for event ${event.eventId}: ${error instanceof Error ? error.message : String(error)}`,
        );
        // Don't add this rule to firedRules if condition evaluation fails
        // This prevents a buggy condition from causing issues
      }
    }

    if (firedRules.length === 0) {
      logger.debug(`No rules fired for event ${event.eventId} (sensorType: ${event.sensorType})`);
    }

    return firedRules;
  }

  /**
   * Add a custom rule to the registry
   *
   * Allows for dynamic rule registration at runtime.
   * This enables extensibility without modifying the engine code.
   *
   * @param rule The rule to add
   * @throws Error if a rule with the same ruleId already exists
   */
  registerRule(rule: NotificationRule): void {
    if (this.rules.has(rule.ruleId)) {
      throw new Error(`Rule with ruleId "${rule.ruleId}" already exists`);
    }
    this.rules.set(rule.ruleId, rule);
    logger.info(`Custom rule registered: ${rule.ruleId}`);
  }

  /**
   * Update an existing rule in the registry
   *
   * @param rule The updated rule
   * @throws Error if no rule with the given ruleId exists
   */
  updateRule(rule: NotificationRule): void {
    if (!this.rules.has(rule.ruleId)) {
      throw new Error(`Rule with ruleId "${rule.ruleId}" does not exist`);
    }
    this.rules.set(rule.ruleId, rule);
    logger.info(`Rule updated: ${rule.ruleId}`);
  }

  /**
   * Remove a rule from the registry
   *
   * @param ruleId The ID of the rule to remove
   * @returns true if the rule was removed, false if it didn't exist
   */
  removeRule(ruleId: string): boolean {
    const result = this.rules.delete(ruleId);
    if (result) {
      logger.info(`Rule removed: ${ruleId}`);
    }
    return result;
  }

  /**
   * Get a specific rule by its ID
   *
   * @param ruleId The ID of the rule to retrieve
   * @returns The rule if found, undefined otherwise
   */
  getRule(ruleId: string): NotificationRule | undefined {
    return this.rules.get(ruleId);
  }

  /**
   * Get count of registered rules
   *
   * @returns Total number of rules in the registry
   */
  getRuleCount(): number {
    return this.rules.size;
  }
}

// Export singleton instance
export const ruleEngine = new RuleEngine();
