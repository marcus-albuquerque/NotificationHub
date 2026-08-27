/**
 * Unit Tests for Rule Engine
 *
 * Tests cover:
 * - Basic rule firing for all 6 built-in rules
 * - Rule conditions at boundaries and edge cases
 * - Multiple rules firing for single events
 * - No rules firing for normal values
 * - Custom rule registration and removal
 * - Error handling in condition evaluation
 */

import { RuleEngine } from '../../services/rule-engine';
import { Event, SensorType } from '../../types/index';

describe('RuleEngine', () => {
  let ruleEngine: RuleEngine;

  beforeEach(() => {
    ruleEngine = new RuleEngine();
  });

  describe('Initialization', () => {
    it('should initialize with 6 built-in rules', () => {
      const rules = ruleEngine.getAllRules();
      expect(rules).toHaveLength(6);
    });

    it('should have all expected built-in rule IDs', () => {
      const ruleIds = ruleEngine
        .getAllRules()
        .map((r) => r.ruleId)
        .sort();
      expect(ruleIds).toEqual([
        'EQUIPMENT_FAILURE',
        'HIGH_AIR_TEMPERATURE',
        'LOW_AIR_HUMIDITY',
        'LOW_SILO_LEVEL',
        'LOW_SOIL_MOISTURE',
        'LOW_WATER_RESERVOIR',
      ]);
    });

    it('should have correct sensor types for each rule', () => {
      const highTempRule = ruleEngine.getRule('HIGH_AIR_TEMPERATURE');
      expect(highTempRule?.sensorType).toBe(SensorType.AIR_TEMPERATURE);

      const lowHumidityRule = ruleEngine.getRule('LOW_AIR_HUMIDITY');
      expect(lowHumidityRule?.sensorType).toBe(SensorType.AIR_HUMIDITY);

      const soilMoistureRule = ruleEngine.getRule('LOW_SOIL_MOISTURE');
      expect(soilMoistureRule?.sensorType).toBe(SensorType.SOIL_MOISTURE);

      const waterReservoirRule = ruleEngine.getRule('LOW_WATER_RESERVOIR');
      expect(waterReservoirRule?.sensorType).toBe(SensorType.WATER_RESERVOIR_LEVEL);

      const siloRule = ruleEngine.getRule('LOW_SILO_LEVEL');
      expect(siloRule?.sensorType).toBe(SensorType.SILO_LEVEL);

      const equipmentRule = ruleEngine.getRule('EQUIPMENT_FAILURE');
      expect(equipmentRule?.sensorType).toBe(SensorType.EQUIPMENT_STATUS);
    });
  });

  describe('Property 9: High Air Temperature Rule', () => {
    it('should fire HIGH_AIR_TEMPERATURE when temperature > 35', () => {
      const event: Event = {
        eventId: 'evt-001',
        farmId: 'farm-001',
        deviceId: 'temp-001',
        sensorType: SensorType.AIR_TEMPERATURE,
        value: 36,
        unit: '°C',
        timestamp: new Date().toISOString(),
      };

      const firedRules = ruleEngine.applyRules(event);

      expect(firedRules).toHaveLength(1);
      expect(firedRules[0].ruleId).toBe('HIGH_AIR_TEMPERATURE');
    });

    it('should not fire HIGH_AIR_TEMPERATURE when temperature <= 35', () => {
      const testValues = [35, 34, 0, -10, 35.0, 34.999];

      testValues.forEach((value) => {
        const event: Event = {
          eventId: `evt-${value}`,
          farmId: 'farm-001',
          deviceId: 'temp-001',
          sensorType: SensorType.AIR_TEMPERATURE,
          value,
          unit: '°C',
          timestamp: new Date().toISOString(),
        };

        const firedRules = ruleEngine.applyRules(event);
        const highTempFired = firedRules.some((r) => r.ruleId === 'HIGH_AIR_TEMPERATURE');

        expect(highTempFired).toBe(false);
      });
    });

    it('should fire at boundary: temperature = 35.00001', () => {
      const event: Event = {
        eventId: 'evt-boundary',
        farmId: 'farm-001',
        deviceId: 'temp-001',
        sensorType: SensorType.AIR_TEMPERATURE,
        value: 35.00001,
        unit: '°C',
        timestamp: new Date().toISOString(),
      };

      const firedRules = ruleEngine.applyRules(event);
      const highTempFired = firedRules.some((r) => r.ruleId === 'HIGH_AIR_TEMPERATURE');

      expect(highTempFired).toBe(true);
    });

    it('should handle string values for numeric sensors', () => {
      const event: Event = {
        eventId: 'evt-string',
        farmId: 'farm-001',
        deviceId: 'temp-001',
        sensorType: SensorType.AIR_TEMPERATURE,
        value: '36.5',
        unit: '°C',
        timestamp: new Date().toISOString(),
      };

      const firedRules = ruleEngine.applyRules(event);
      const highTempFired = firedRules.some((r) => r.ruleId === 'HIGH_AIR_TEMPERATURE');

      expect(highTempFired).toBe(true);
    });
  });

  describe('Property 10: Low Air Humidity Rule', () => {
    it('should fire LOW_AIR_HUMIDITY when humidity < 30', () => {
      const event: Event = {
        eventId: 'evt-001',
        farmId: 'farm-001',
        deviceId: 'humid-001',
        sensorType: SensorType.AIR_HUMIDITY,
        value: 25,
        unit: '%',
        timestamp: new Date().toISOString(),
      };

      const firedRules = ruleEngine.applyRules(event);

      expect(firedRules).toHaveLength(1);
      expect(firedRules[0].ruleId).toBe('LOW_AIR_HUMIDITY');
    });

    it('should not fire LOW_AIR_HUMIDITY when humidity >= 30', () => {
      const testValues = [30, 31, 50, 100];

      testValues.forEach((value) => {
        const event: Event = {
          eventId: `evt-${value}`,
          farmId: 'farm-001',
          deviceId: 'humid-001',
          sensorType: SensorType.AIR_HUMIDITY,
          value,
          unit: '%',
          timestamp: new Date().toISOString(),
        };

        const firedRules = ruleEngine.applyRules(event);
        const lowHumidityFired = firedRules.some((r) => r.ruleId === 'LOW_AIR_HUMIDITY');

        expect(lowHumidityFired).toBe(false);
      });
    });
  });

  describe('Property 11: Low Soil Moisture Rule', () => {
    it('should fire LOW_SOIL_MOISTURE when soil moisture < 20', () => {
      const event: Event = {
        eventId: 'evt-001',
        farmId: 'farm-001',
        deviceId: 'soil-001',
        sensorType: SensorType.SOIL_MOISTURE,
        value: 15,
        unit: '%',
        timestamp: new Date().toISOString(),
      };

      const firedRules = ruleEngine.applyRules(event);

      expect(firedRules).toHaveLength(1);
      expect(firedRules[0].ruleId).toBe('LOW_SOIL_MOISTURE');
    });

    it('should not fire LOW_SOIL_MOISTURE when soil moisture >= 20', () => {
      const testValues = [20, 21, 50, 100];

      testValues.forEach((value) => {
        const event: Event = {
          eventId: `evt-${value}`,
          farmId: 'farm-001',
          deviceId: 'soil-001',
          sensorType: SensorType.SOIL_MOISTURE,
          value,
          unit: '%',
          timestamp: new Date().toISOString(),
        };

        const firedRules = ruleEngine.applyRules(event);
        const soilMoistureFired = firedRules.some((r) => r.ruleId === 'LOW_SOIL_MOISTURE');

        expect(soilMoistureFired).toBe(false);
      });
    });
  });

  describe('Property 12: Low Water Reservoir Rule', () => {
    it('should fire LOW_WATER_RESERVOIR when water level < 15', () => {
      const event: Event = {
        eventId: 'evt-001',
        farmId: 'farm-001',
        deviceId: 'water-001',
        sensorType: SensorType.WATER_RESERVOIR_LEVEL,
        value: 10,
        unit: '%',
        timestamp: new Date().toISOString(),
      };

      const firedRules = ruleEngine.applyRules(event);

      expect(firedRules).toHaveLength(1);
      expect(firedRules[0].ruleId).toBe('LOW_WATER_RESERVOIR');
    });

    it('should not fire LOW_WATER_RESERVOIR when water level >= 15', () => {
      const testValues = [15, 16, 50, 100];

      testValues.forEach((value) => {
        const event: Event = {
          eventId: `evt-${value}`,
          farmId: 'farm-001',
          deviceId: 'water-001',
          sensorType: SensorType.WATER_RESERVOIR_LEVEL,
          value,
          unit: '%',
          timestamp: new Date().toISOString(),
        };

        const firedRules = ruleEngine.applyRules(event);
        const waterFired = firedRules.some((r) => r.ruleId === 'LOW_WATER_RESERVOIR');

        expect(waterFired).toBe(false);
      });
    });
  });

  describe('Property 13: Low Silo Level Rule', () => {
    it('should fire LOW_SILO_LEVEL when silo level < 15', () => {
      const event: Event = {
        eventId: 'evt-001',
        farmId: 'farm-001',
        deviceId: 'silo-001',
        sensorType: SensorType.SILO_LEVEL,
        value: 12,
        unit: '%',
        timestamp: new Date().toISOString(),
      };

      const firedRules = ruleEngine.applyRules(event);

      expect(firedRules).toHaveLength(1);
      expect(firedRules[0].ruleId).toBe('LOW_SILO_LEVEL');
    });

    it('should not fire LOW_SILO_LEVEL when silo level >= 15', () => {
      const testValues = [15, 16, 50, 100];

      testValues.forEach((value) => {
        const event: Event = {
          eventId: `evt-${value}`,
          farmId: 'farm-001',
          deviceId: 'silo-001',
          sensorType: SensorType.SILO_LEVEL,
          value,
          unit: '%',
          timestamp: new Date().toISOString(),
        };

        const firedRules = ruleEngine.applyRules(event);
        const siloFired = firedRules.some((r) => r.ruleId === 'LOW_SILO_LEVEL');

        expect(siloFired).toBe(false);
      });
    });
  });

  describe('Property 14: Equipment Failure Rule', () => {
    it("should fire EQUIPMENT_FAILURE when status === 'FAILURE'", () => {
      const event: Event = {
        eventId: 'evt-001',
        farmId: 'farm-001',
        deviceId: 'equip-001',
        sensorType: SensorType.EQUIPMENT_STATUS,
        value: 'FAILURE',
        unit: 'status',
        timestamp: new Date().toISOString(),
      };

      const firedRules = ruleEngine.applyRules(event);

      expect(firedRules).toHaveLength(1);
      expect(firedRules[0].ruleId).toBe('EQUIPMENT_FAILURE');
    });

    it('should not fire EQUIPMENT_FAILURE for other status values', () => {
      const testValues = ['OK', 'RUNNING', 'IDLE', 'PENDING', 'failure', 'Failure'];

      testValues.forEach((value) => {
        const event: Event = {
          eventId: `evt-${value}`,
          farmId: 'farm-001',
          deviceId: 'equip-001',
          sensorType: SensorType.EQUIPMENT_STATUS,
          value,
          unit: 'status',
          timestamp: new Date().toISOString(),
        };

        const firedRules = ruleEngine.applyRules(event);
        const equipmentFired = firedRules.some((r) => r.ruleId === 'EQUIPMENT_FAILURE');

        expect(equipmentFired).toBe(false);
      });
    });
  });

  describe('Multiple Rules Firing', () => {
    it('should fire no rules for normal values', () => {
      const testCases = [
        {
          sensorType: SensorType.AIR_TEMPERATURE,
          value: 25,
          unit: '°C',
        },
        {
          sensorType: SensorType.AIR_HUMIDITY,
          value: 60,
          unit: '%',
        },
        {
          sensorType: SensorType.SOIL_MOISTURE,
          value: 45,
          unit: '%',
        },
        {
          sensorType: SensorType.WATER_RESERVOIR_LEVEL,
          value: 80,
          unit: '%',
        },
        {
          sensorType: SensorType.SILO_LEVEL,
          value: 70,
          unit: '%',
        },
        {
          sensorType: SensorType.EQUIPMENT_STATUS,
          value: 'OK',
          unit: 'status',
        },
      ];

      testCases.forEach((testCase, index) => {
        const event: Event = {
          eventId: `evt-${index}`,
          farmId: 'farm-001',
          deviceId: `device-${index}`,
          sensorType: testCase.sensorType as SensorType,
          value: testCase.value,
          unit: testCase.unit,
          timestamp: new Date().toISOString(),
        };

        const firedRules = ruleEngine.applyRules(event);
        expect(firedRules).toHaveLength(0);
      });
    });

    it('should only fire applicable rules for specific sensor types', () => {
      // AIR_TEMPERATURE events should only trigger temperature rule
      const tempEvent: Event = {
        eventId: 'evt-temp',
        farmId: 'farm-001',
        deviceId: 'temp-001',
        sensorType: SensorType.AIR_TEMPERATURE,
        value: 40,
        unit: '°C',
        timestamp: new Date().toISOString(),
      };

      const tempFiredRules = ruleEngine.applyRules(tempEvent);
      expect(tempFiredRules).toHaveLength(1);
      expect(tempFiredRules[0].ruleId).toBe('HIGH_AIR_TEMPERATURE');

      // AIR_HUMIDITY events should only trigger humidity rule
      const humidityEvent: Event = {
        eventId: 'evt-humidity',
        farmId: 'farm-001',
        deviceId: 'humid-001',
        sensorType: SensorType.AIR_HUMIDITY,
        value: 20,
        unit: '%',
        timestamp: new Date().toISOString(),
      };

      const humidityFiredRules = ruleEngine.applyRules(humidityEvent);
      expect(humidityFiredRules).toHaveLength(1);
      expect(humidityFiredRules[0].ruleId).toBe('LOW_AIR_HUMIDITY');
    });
  });

  describe('Rule Management', () => {
    it('should register custom rules', () => {
      const initialCount = ruleEngine.getRuleCount();

      ruleEngine.registerRule({
        ruleId: 'CUSTOM_RULE',
        name: 'Custom Rule',
        sensorType: SensorType.AIR_TEMPERATURE,
        condition: (value) => {
          const numValue = typeof value === 'number' ? value : parseFloat(value as string);
          return !isNaN(numValue) && numValue > 50;
        },
        notificationTemplate: 'Custom alert: {value}',
      });

      expect(ruleEngine.getRuleCount()).toBe(initialCount + 1);
      expect(ruleEngine.getRule('CUSTOM_RULE')).toBeDefined();
    });

    it('should prevent duplicate rule IDs', () => {
      expect(() => {
        ruleEngine.registerRule({
          ruleId: 'HIGH_AIR_TEMPERATURE',
          name: 'Duplicate Rule',
          sensorType: SensorType.AIR_TEMPERATURE,
          condition: () => false,
          notificationTemplate: 'Duplicate',
        });
      }).toThrow('Rule with ruleId "HIGH_AIR_TEMPERATURE" already exists');
    });

    it('should update existing rules', () => {
      const originalRule = ruleEngine.getRule('HIGH_AIR_TEMPERATURE');
      expect(originalRule?.name).toBe('High Air Temperature');

      ruleEngine.updateRule({
        ruleId: 'HIGH_AIR_TEMPERATURE',
        name: 'Very High Air Temperature',
        sensorType: SensorType.AIR_TEMPERATURE,
        condition: (value) => {
          const numValue = typeof value === 'number' ? value : parseFloat(value as string);
          return !isNaN(numValue) && numValue > 40;
        },
        notificationTemplate: 'Updated template: {value}',
      });

      const updatedRule = ruleEngine.getRule('HIGH_AIR_TEMPERATURE');
      expect(updatedRule?.name).toBe('Very High Air Temperature');
    });

    it('should remove rules', () => {
      const initialCount = ruleEngine.getRuleCount();

      const removed = ruleEngine.removeRule('HIGH_AIR_TEMPERATURE');
      expect(removed).toBe(true);
      expect(ruleEngine.getRuleCount()).toBe(initialCount - 1);
      expect(ruleEngine.getRule('HIGH_AIR_TEMPERATURE')).toBeUndefined();
    });

    it('should return false when removing non-existent rule', () => {
      const removed = ruleEngine.removeRule('NON_EXISTENT_RULE');
      expect(removed).toBe(false);
    });

    it('should throw error when updating non-existent rule', () => {
      expect(() => {
        ruleEngine.updateRule({
          ruleId: 'NON_EXISTENT_RULE',
          name: 'Non Existent Rule',
          sensorType: SensorType.AIR_TEMPERATURE,
          condition: () => false,
          notificationTemplate: 'Non existent',
        });
      }).toThrow('Rule with ruleId "NON_EXISTENT_RULE" does not exist');
    });
  });

  describe('Notification Templates', () => {
    it('should have correct notification templates for each rule', () => {
      const expectedTemplates: Record<string, string> = {
        HIGH_AIR_TEMPERATURE: 'Temperatura do ar acima do normal: {value}°C',
        LOW_AIR_HUMIDITY: 'Umidade do ar abaixo do normal: {value}%',
        LOW_SOIL_MOISTURE: 'Umidade do solo crítica: {value}%',
        LOW_WATER_RESERVOIR: 'Nível de água do reservatório crítico: {value}%',
        LOW_SILO_LEVEL: 'Nível do silo crítico: {value}%',
        EQUIPMENT_FAILURE: 'Falha em equipamento detectada no dispositivo: {deviceId}',
      };

      Object.entries(expectedTemplates).forEach(([ruleId, expectedTemplate]) => {
        const rule = ruleEngine.getRule(ruleId);
        expect(rule?.notificationTemplate).toBe(expectedTemplate);
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid string values gracefully for numeric sensors', () => {
      const event: Event = {
        eventId: 'evt-invalid',
        farmId: 'farm-001',
        deviceId: 'temp-001',
        sensorType: SensorType.AIR_TEMPERATURE,
        value: 'not-a-number',
        unit: '°C',
        timestamp: new Date().toISOString(),
      };

      const firedRules = ruleEngine.applyRules(event);
      // parseFloat("not-a-number") returns NaN, and condition checks for !isNaN
      expect(firedRules).toHaveLength(0);
    });

    it('should return empty array if condition evaluation throws error', () => {
      // Create a fresh RuleEngine instance for this test to avoid interference
      const isolatedEngine = new RuleEngine();
      // Remove the built-in rule that would otherwise fire
      isolatedEngine.removeRule('HIGH_AIR_TEMPERATURE');
      // Register only the buggy rule
      isolatedEngine.registerRule({
        ruleId: 'BUGGY_RULE',
        name: 'Buggy Rule',
        sensorType: SensorType.AIR_TEMPERATURE,
        condition: () => {
          throw new Error('Intentional error');
        },
        notificationTemplate: 'Buggy',
      });

      const event: Event = {
        eventId: 'evt-error',
        farmId: 'farm-001',
        deviceId: 'temp-001',
        sensorType: SensorType.AIR_TEMPERATURE,
        value: 40,
        unit: '°C',
        timestamp: new Date().toISOString(),
      };

      const firedRules = isolatedEngine.applyRules(event);
      // Should not include the buggy rule that threw an error
      // Only BUGGY_RULE is registered for this sensorType, and it throws
      expect(firedRules).toHaveLength(0);
    });
  });
});
