/**
 * NotificationHub - Notification Generator Tests
 *
 * Tests for NotificationGenerator component.
 * Validates: Requirements 4.3, 4.4, 5.3, 9.3
 * Property 15: Notification Message Generation
 *
 * The NotificationGenerator takes validated events and fired rules,
 * then generates notification objects with complete information for downstream dispatch.
 */

import * as fc from 'fast-check';
import { v4 as uuidv4 } from 'uuid';
import { Event, NotificationRule, SensorType } from '../../types';
import { NotificationGenerator } from '../../services/notification-generator';

describe('NotificationGenerator', () => {
  let generator: NotificationGenerator;

  beforeEach(() => {
    generator = new NotificationGenerator();
  });

  describe('Basic Functionality', () => {
    it('should create a NotificationGenerator instance', () => {
      expect(generator).toBeInstanceOf(NotificationGenerator);
      expect(typeof generator.generate).toBe('function');
    });

    it('should generate empty array for empty fired rules', () => {
      const event: Event = {
        eventId: uuidv4(),
        farmId: 'farm-001',
        deviceId: 'device-001',
        sensorType: SensorType.AIR_TEMPERATURE,
        value: 25,
        unit: '°C',
        timestamp: new Date().toISOString(),
      };

      const notifications = generator.generate(event, []);

      expect(Array.isArray(notifications)).toBe(true);
      expect(notifications.length).toBe(0);
    });

    it('should return array of notifications', () => {
      const event: Event = {
        eventId: uuidv4(),
        farmId: 'farm-001',
        deviceId: 'device-001',
        sensorType: SensorType.AIR_TEMPERATURE,
        value: 36,
        unit: '°C',
        timestamp: new Date().toISOString(),
      };

      const rule: NotificationRule = {
        ruleId: 'HIGH_AIR_TEMPERATURE',
        name: 'High Air Temperature',
        sensorType: SensorType.AIR_TEMPERATURE,
        condition: (value: number | string) => Number(value) > 35,
        notificationTemplate: 'Temperatura do ar acima do normal: {value}°C',
      };

      const notifications = generator.generate(event, [rule]);

      expect(Array.isArray(notifications)).toBe(true);
      expect(notifications.length).toBe(1);
    });
  });

  describe('Notification Object Structure - Required Fields', () => {
    it('should include notificationId (UUID)', () => {
      const event: Event = {
        eventId: uuidv4(),
        farmId: 'farm-001',
        deviceId: 'device-001',
        sensorType: SensorType.AIR_TEMPERATURE,
        value: 36,
        unit: '°C',
        timestamp: new Date().toISOString(),
      };

      const rule: NotificationRule = {
        ruleId: 'HIGH_AIR_TEMPERATURE',
        name: 'High Air Temperature',
        sensorType: SensorType.AIR_TEMPERATURE,
        condition: () => true,
        notificationTemplate: 'Alert: {value}',
      };

      const notifications = generator.generate(event, [rule]);

      expect(notifications[0]).toHaveProperty('notificationId');
      expect(typeof notifications[0].notificationId).toBe('string');
      expect(notifications[0].notificationId).toMatch(/^[0-9a-f\-]{36}$/); // UUID format
    });

    it('should include eventId from event', () => {
      const eventId = uuidv4();
      const event: Event = {
        eventId,
        farmId: 'farm-001',
        deviceId: 'device-001',
        sensorType: SensorType.AIR_TEMPERATURE,
        value: 36,
        unit: '°C',
        timestamp: new Date().toISOString(),
      };

      const rule: NotificationRule = {
        ruleId: 'HIGH_AIR_TEMPERATURE',
        name: 'High Air Temperature',
        sensorType: SensorType.AIR_TEMPERATURE,
        condition: () => true,
        notificationTemplate: 'Alert: {value}',
      };

      const notifications = generator.generate(event, [rule]);

      expect(notifications[0].eventId).toBe(eventId);
    });

    it('should include farmId from event', () => {
      const farmId = 'farm-001';
      const event: Event = {
        eventId: uuidv4(),
        farmId,
        deviceId: 'device-001',
        sensorType: SensorType.AIR_TEMPERATURE,
        value: 36,
        unit: '°C',
        timestamp: new Date().toISOString(),
      };

      const rule: NotificationRule = {
        ruleId: 'HIGH_AIR_TEMPERATURE',
        name: 'High Air Temperature',
        sensorType: SensorType.AIR_TEMPERATURE,
        condition: () => true,
        notificationTemplate: 'Alert: {value}',
      };

      const notifications = generator.generate(event, [rule]);

      expect(notifications[0].farmId).toBe(farmId);
    });

    it('should include deviceId from event', () => {
      const deviceId = 'device-001';
      const event: Event = {
        eventId: uuidv4(),
        farmId: 'farm-001',
        deviceId,
        sensorType: SensorType.AIR_TEMPERATURE,
        value: 36,
        unit: '°C',
        timestamp: new Date().toISOString(),
      };

      const rule: NotificationRule = {
        ruleId: 'HIGH_AIR_TEMPERATURE',
        name: 'High Air Temperature',
        sensorType: SensorType.AIR_TEMPERATURE,
        condition: () => true,
        notificationTemplate: 'Alert: {value}',
      };

      const notifications = generator.generate(event, [rule]);

      expect(notifications[0].deviceId).toBe(deviceId);
    });

    it('should include ruleId from rule', () => {
      const event: Event = {
        eventId: uuidv4(),
        farmId: 'farm-001',
        deviceId: 'device-001',
        sensorType: SensorType.AIR_TEMPERATURE,
        value: 36,
        unit: '°C',
        timestamp: new Date().toISOString(),
      };

      const ruleId = 'HIGH_AIR_TEMPERATURE';
      const rule: NotificationRule = {
        ruleId,
        name: 'High Air Temperature',
        sensorType: SensorType.AIR_TEMPERATURE,
        condition: () => true,
        notificationTemplate: 'Alert: {value}',
      };

      const notifications = generator.generate(event, [rule]);

      expect(notifications[0].ruleId).toBe(ruleId);
    });

    it('should include ruleName from rule', () => {
      const event: Event = {
        eventId: uuidv4(),
        farmId: 'farm-001',
        deviceId: 'device-001',
        sensorType: SensorType.AIR_TEMPERATURE,
        value: 36,
        unit: '°C',
        timestamp: new Date().toISOString(),
      };

      const ruleName = 'High Air Temperature';
      const rule: NotificationRule = {
        ruleId: 'HIGH_AIR_TEMPERATURE',
        name: ruleName,
        sensorType: SensorType.AIR_TEMPERATURE,
        condition: () => true,
        notificationTemplate: 'Alert: {value}',
      };

      const notifications = generator.generate(event, [rule]);

      expect(notifications[0].ruleName).toBe(ruleName);
    });

    it('should include eventValue from event', () => {
      const value = 36.5;
      const event: Event = {
        eventId: uuidv4(),
        farmId: 'farm-001',
        deviceId: 'device-001',
        sensorType: SensorType.AIR_TEMPERATURE,
        value,
        unit: '°C',
        timestamp: new Date().toISOString(),
      };

      const rule: NotificationRule = {
        ruleId: 'HIGH_AIR_TEMPERATURE',
        name: 'High Air Temperature',
        sensorType: SensorType.AIR_TEMPERATURE,
        condition: () => true,
        notificationTemplate: 'Alert: {value}',
      };

      const notifications = generator.generate(event, [rule]);

      expect(notifications[0].eventValue).toBe(value);
    });

    it('should include eventTimestamp from event', () => {
      const timestamp = '2024-01-15T14:30:00Z';
      const event: Event = {
        eventId: uuidv4(),
        farmId: 'farm-001',
        deviceId: 'device-001',
        sensorType: SensorType.AIR_TEMPERATURE,
        value: 36,
        unit: '°C',
        timestamp,
      };

      const rule: NotificationRule = {
        ruleId: 'HIGH_AIR_TEMPERATURE',
        name: 'High Air Temperature',
        sensorType: SensorType.AIR_TEMPERATURE,
        condition: () => true,
        notificationTemplate: 'Alert: {value}',
      };

      const notifications = generator.generate(event, [rule]);

      expect(notifications[0].eventTimestamp).toBe(timestamp);
    });

    it('should set generatedAt to current timestamp', () => {
      const event: Event = {
        eventId: uuidv4(),
        farmId: 'farm-001',
        deviceId: 'device-001',
        sensorType: SensorType.AIR_TEMPERATURE,
        value: 36,
        unit: '°C',
        timestamp: new Date().toISOString(),
      };

      const rule: NotificationRule = {
        ruleId: 'HIGH_AIR_TEMPERATURE',
        name: 'High Air Temperature',
        sensorType: SensorType.AIR_TEMPERATURE,
        condition: () => true,
        notificationTemplate: 'Alert: {value}',
      };

      const beforeGeneration = new Date();
      const notifications = generator.generate(event, [rule]);
      const afterGeneration = new Date();

      expect(notifications[0].generatedAt).toBeDefined();
      const generatedAtTime = new Date(notifications[0].generatedAt);
      expect(generatedAtTime.getTime()).toBeGreaterThanOrEqual(beforeGeneration.getTime());
      expect(generatedAtTime.getTime()).toBeLessThanOrEqual(afterGeneration.getTime());
    });

    it('should set dispatchStatus to "pending"', () => {
      const event: Event = {
        eventId: uuidv4(),
        farmId: 'farm-001',
        deviceId: 'device-001',
        sensorType: SensorType.AIR_TEMPERATURE,
        value: 36,
        unit: '°C',
        timestamp: new Date().toISOString(),
      };

      const rule: NotificationRule = {
        ruleId: 'HIGH_AIR_TEMPERATURE',
        name: 'High Air Temperature',
        sensorType: SensorType.AIR_TEMPERATURE,
        condition: () => true,
        notificationTemplate: 'Alert: {value}',
      };

      const notifications = generator.generate(event, [rule]);

      expect(notifications[0].dispatchStatus).toBe('pending');
    });
  });

  describe('Message Template Interpolation', () => {
    it('should interpolate {value} placeholder', () => {
      const value = 36.5;
      const event: Event = {
        eventId: uuidv4(),
        farmId: 'farm-001',
        deviceId: 'device-001',
        sensorType: SensorType.AIR_TEMPERATURE,
        value,
        unit: '°C',
        timestamp: new Date().toISOString(),
      };

      const rule: NotificationRule = {
        ruleId: 'HIGH_AIR_TEMPERATURE',
        name: 'High Air Temperature',
        sensorType: SensorType.AIR_TEMPERATURE,
        condition: () => true,
        notificationTemplate: 'Temperature is {value} degrees',
      };

      const notifications = generator.generate(event, [rule]);

      expect(notifications[0].message).toBe('Temperature is 36.5 degrees');
    });

    it('should interpolate {unit} placeholder', () => {
      const unit = '°C';
      const event: Event = {
        eventId: uuidv4(),
        farmId: 'farm-001',
        deviceId: 'device-001',
        sensorType: SensorType.AIR_TEMPERATURE,
        value: 36,
        unit,
        timestamp: new Date().toISOString(),
      };

      const rule: NotificationRule = {
        ruleId: 'HIGH_AIR_TEMPERATURE',
        name: 'High Air Temperature',
        sensorType: SensorType.AIR_TEMPERATURE,
        condition: () => true,
        notificationTemplate: 'Temperature in {unit}',
      };

      const notifications = generator.generate(event, [rule]);

      expect(notifications[0].message).toBe('Temperature in °C');
    });

    it('should interpolate {deviceId} placeholder', () => {
      const deviceId = 'temp-sensor-001';
      const event: Event = {
        eventId: uuidv4(),
        farmId: 'farm-001',
        deviceId,
        sensorType: SensorType.AIR_TEMPERATURE,
        value: 36,
        unit: '°C',
        timestamp: new Date().toISOString(),
      };

      const rule: NotificationRule = {
        ruleId: 'HIGH_AIR_TEMPERATURE',
        name: 'High Air Temperature',
        sensorType: SensorType.AIR_TEMPERATURE,
        condition: () => true,
        notificationTemplate: 'Alert from device: {deviceId}',
      };

      const notifications = generator.generate(event, [rule]);

      expect(notifications[0].message).toBe('Alert from device: temp-sensor-001');
    });

    it('should interpolate {farmId} placeholder', () => {
      const farmId = 'farm-001';
      const event: Event = {
        eventId: uuidv4(),
        farmId,
        deviceId: 'device-001',
        sensorType: SensorType.AIR_TEMPERATURE,
        value: 36,
        unit: '°C',
        timestamp: new Date().toISOString(),
      };

      const rule: NotificationRule = {
        ruleId: 'HIGH_AIR_TEMPERATURE',
        name: 'High Air Temperature',
        sensorType: SensorType.AIR_TEMPERATURE,
        condition: () => true,
        notificationTemplate: 'Alert on farm: {farmId}',
      };

      const notifications = generator.generate(event, [rule]);

      expect(notifications[0].message).toBe('Alert on farm: farm-001');
    });

    it('should interpolate {sensorType} placeholder', () => {
      const event: Event = {
        eventId: uuidv4(),
        farmId: 'farm-001',
        deviceId: 'device-001',
        sensorType: SensorType.AIR_TEMPERATURE,
        value: 36,
        unit: '°C',
        timestamp: new Date().toISOString(),
      };

      const rule: NotificationRule = {
        ruleId: 'HIGH_AIR_TEMPERATURE',
        name: 'High Air Temperature',
        sensorType: SensorType.AIR_TEMPERATURE,
        condition: () => true,
        notificationTemplate: 'Sensor type: {sensorType}',
      };

      const notifications = generator.generate(event, [rule]);

      expect(notifications[0].message).toBe('Sensor type: AIR_TEMPERATURE');
    });

    it('should interpolate {timestamp} placeholder', () => {
      const timestamp = '2024-01-15T14:30:00Z';
      const event: Event = {
        eventId: uuidv4(),
        farmId: 'farm-001',
        deviceId: 'device-001',
        sensorType: SensorType.AIR_TEMPERATURE,
        value: 36,
        unit: '°C',
        timestamp,
      };

      const rule: NotificationRule = {
        ruleId: 'HIGH_AIR_TEMPERATURE',
        name: 'High Air Temperature',
        sensorType: SensorType.AIR_TEMPERATURE,
        condition: () => true,
        notificationTemplate: 'Event at: {timestamp}',
      };

      const notifications = generator.generate(event, [rule]);

      expect(notifications[0].message).toBe('Event at: 2024-01-15T14:30:00Z');
    });

    it('should interpolate multiple placeholders in one template', () => {
      const event: Event = {
        eventId: uuidv4(),
        farmId: 'farm-001',
        deviceId: 'temp-001',
        sensorType: SensorType.AIR_TEMPERATURE,
        value: 36.5,
        unit: '°C',
        timestamp: '2024-01-15T14:30:00Z',
      };

      const rule: NotificationRule = {
        ruleId: 'HIGH_AIR_TEMPERATURE',
        name: 'High Air Temperature',
        sensorType: SensorType.AIR_TEMPERATURE,
        condition: () => true,
        notificationTemplate:
          'Farm {farmId}, Device {deviceId}: Temperature {value}{unit} at {timestamp}',
      };

      const notifications = generator.generate(event, [rule]);

      expect(notifications[0].message).toBe(
        'Farm farm-001, Device temp-001: Temperature 36.5°C at 2024-01-15T14:30:00Z'
      );
    });

    it('should handle templates with no placeholders', () => {
      const event: Event = {
        eventId: uuidv4(),
        farmId: 'farm-001',
        deviceId: 'device-001',
        sensorType: SensorType.AIR_TEMPERATURE,
        value: 36,
        unit: '°C',
        timestamp: new Date().toISOString(),
      };

      const rule: NotificationRule = {
        ruleId: 'HIGH_AIR_TEMPERATURE',
        name: 'High Air Temperature',
        sensorType: SensorType.AIR_TEMPERATURE,
        condition: () => true,
        notificationTemplate: 'Static message with no variables',
      };

      const notifications = generator.generate(event, [rule]);

      expect(notifications[0].message).toBe('Static message with no variables');
    });

    it('should handle repeated placeholders', () => {
      const event: Event = {
        eventId: uuidv4(),
        farmId: 'farm-001',
        deviceId: 'device-001',
        sensorType: SensorType.AIR_TEMPERATURE,
        value: 36,
        unit: '°C',
        timestamp: new Date().toISOString(),
      };

      const rule: NotificationRule = {
        ruleId: 'HIGH_AIR_TEMPERATURE',
        name: 'High Air Temperature',
        sensorType: SensorType.AIR_TEMPERATURE,
        condition: () => true,
        notificationTemplate: 'Value is {value} and value is still {value}',
      };

      const notifications = generator.generate(event, [rule]);

      expect(notifications[0].message).toBe('Value is 36 and value is still 36');
    });

    it('should handle placeholders with special characters in values', () => {
      const event: Event = {
        eventId: uuidv4(),
        farmId: 'farm-001',
        deviceId: 'device-001',
        sensorType: SensorType.AIR_TEMPERATURE,
        value: 36,
        unit: '°C%$&',
        timestamp: new Date().toISOString(),
      };

      const rule: NotificationRule = {
        ruleId: 'HIGH_AIR_TEMPERATURE',
        name: 'High Air Temperature',
        sensorType: SensorType.AIR_TEMPERATURE,
        condition: () => true,
        notificationTemplate: 'Unit: {unit}',
      };

      const notifications = generator.generate(event, [rule]);

      expect(notifications[0].message).toBe('Unit: °C%$&');
    });

    it('should handle numeric value in template correctly', () => {
      const event: Event = {
        eventId: uuidv4(),
        farmId: 'farm-001',
        deviceId: 'device-001',
        sensorType: SensorType.AIR_TEMPERATURE,
        value: 36.123456789,
        unit: '°C',
        timestamp: new Date().toISOString(),
      };

      const rule: NotificationRule = {
        ruleId: 'HIGH_AIR_TEMPERATURE',
        name: 'High Air Temperature',
        sensorType: SensorType.AIR_TEMPERATURE,
        condition: () => true,
        notificationTemplate: 'Precise temperature: {value}',
      };

      const notifications = generator.generate(event, [rule]);

      expect(notifications[0].message).toBe('Precise temperature: 36.123456789');
    });

    it('should handle string value in template correctly', () => {
      const event: Event = {
        eventId: uuidv4(),
        farmId: 'farm-001',
        deviceId: 'device-001',
        sensorType: SensorType.EQUIPMENT_STATUS,
        value: 'FAILURE',
        unit: 'status',
        timestamp: new Date().toISOString(),
      };

      const rule: NotificationRule = {
        ruleId: 'EQUIPMENT_FAILURE',
        name: 'Equipment Failure',
        sensorType: SensorType.EQUIPMENT_STATUS,
        condition: () => true,
        notificationTemplate: 'Equipment status: {value}',
      };

      const notifications = generator.generate(event, [rule]);

      expect(notifications[0].message).toBe('Equipment status: FAILURE');
    });
  });

  describe('Multiple Fired Rules', () => {
    it('should generate one notification per fired rule', () => {
      const event: Event = {
        eventId: uuidv4(),
        farmId: 'farm-001',
        deviceId: 'device-001',
        sensorType: SensorType.AIR_TEMPERATURE,
        value: 36,
        unit: '°C',
        timestamp: new Date().toISOString(),
      };

      const rules: NotificationRule[] = [
        {
          ruleId: 'HIGH_TEMP_1',
          name: 'High Temp 1',
          sensorType: SensorType.AIR_TEMPERATURE,
          condition: () => true,
          notificationTemplate: 'Alert 1',
        },
        {
          ruleId: 'HIGH_TEMP_2',
          name: 'High Temp 2',
          sensorType: SensorType.AIR_TEMPERATURE,
          condition: () => true,
          notificationTemplate: 'Alert 2',
        },
        {
          ruleId: 'HIGH_TEMP_3',
          name: 'High Temp 3',
          sensorType: SensorType.AIR_TEMPERATURE,
          condition: () => true,
          notificationTemplate: 'Alert 3',
        },
      ];

      const notifications = generator.generate(event, rules);

      expect(notifications.length).toBe(3);
      expect(notifications[0].ruleId).toBe('HIGH_TEMP_1');
      expect(notifications[1].ruleId).toBe('HIGH_TEMP_2');
      expect(notifications[2].ruleId).toBe('HIGH_TEMP_3');
    });

    it('should generate unique notificationIds for each rule', () => {
      const event: Event = {
        eventId: uuidv4(),
        farmId: 'farm-001',
        deviceId: 'device-001',
        sensorType: SensorType.AIR_TEMPERATURE,
        value: 36,
        unit: '°C',
        timestamp: new Date().toISOString(),
      };

      const rules: NotificationRule[] = [
        {
          ruleId: 'RULE_1',
          name: 'Rule 1',
          sensorType: SensorType.AIR_TEMPERATURE,
          condition: () => true,
          notificationTemplate: 'Alert 1',
        },
        {
          ruleId: 'RULE_2',
          name: 'Rule 2',
          sensorType: SensorType.AIR_TEMPERATURE,
          condition: () => true,
          notificationTemplate: 'Alert 2',
        },
      ];

      const notifications = generator.generate(event, rules);

      expect(notifications[0].notificationId).not.toEqual(notifications[1].notificationId);
    });

    it('should preserve rule-specific information for each notification', () => {
      const event: Event = {
        eventId: uuidv4(),
        farmId: 'farm-001',
        deviceId: 'device-001',
        sensorType: SensorType.AIR_TEMPERATURE,
        value: 36,
        unit: '°C',
        timestamp: new Date().toISOString(),
      };

      const rules: NotificationRule[] = [
        {
          ruleId: 'RULE_A',
          name: 'Rule A',
          sensorType: SensorType.AIR_TEMPERATURE,
          condition: () => true,
          notificationTemplate: 'Message A: {value}',
        },
        {
          ruleId: 'RULE_B',
          name: 'Rule B',
          sensorType: SensorType.AIR_TEMPERATURE,
          condition: () => true,
          notificationTemplate: 'Message B: {value}',
        },
      ];

      const notifications = generator.generate(event, rules);

      expect(notifications[0].ruleId).toBe('RULE_A');
      expect(notifications[0].ruleName).toBe('Rule A');
      expect(notifications[0].message).toBe('Message A: 36');

      expect(notifications[1].ruleId).toBe('RULE_B');
      expect(notifications[1].ruleName).toBe('Rule B');
      expect(notifications[1].message).toBe('Message B: 36');
    });
  });

  describe('Real-world Scenarios', () => {
    it('should handle HIGH_AIR_TEMPERATURE rule from design doc', () => {
      const event: Event = {
        eventId: uuidv4(),
        farmId: 'farm-001',
        deviceId: 'temp-001',
        sensorType: SensorType.AIR_TEMPERATURE,
        value: 36.5,
        unit: '°C',
        timestamp: '2024-01-15T14:30:00Z',
      };

      const rule: NotificationRule = {
        ruleId: 'HIGH_AIR_TEMPERATURE',
        name: 'High Air Temperature',
        sensorType: SensorType.AIR_TEMPERATURE,
        condition: (value: number | string) => Number(value) > 35,
        notificationTemplate: 'Temperatura do ar acima do normal: {value}°C',
      };

      const notifications = generator.generate(event, [rule]);

      expect(notifications.length).toBe(1);
      expect(notifications[0]).toEqual({
        notificationId: expect.any(String),
        eventId: event.eventId,
        farmId: 'farm-001',
        deviceId: 'temp-001',
        ruleId: 'HIGH_AIR_TEMPERATURE',
        ruleName: 'High Air Temperature',
        message: 'Temperatura do ar acima do normal: 36.5°C',
        eventValue: 36.5,
        eventTimestamp: '2024-01-15T14:30:00Z',
        generatedAt: expect.any(String),
        dispatchStatus: 'pending',
      });
    });

    it('should handle LOW_AIR_HUMIDITY rule from design doc', () => {
      const event: Event = {
        eventId: uuidv4(),
        farmId: 'farm-001',
        deviceId: 'humidity-001',
        sensorType: SensorType.AIR_HUMIDITY,
        value: 25,
        unit: '%',
        timestamp: new Date().toISOString(),
      };

      const rule: NotificationRule = {
        ruleId: 'LOW_AIR_HUMIDITY',
        name: 'Low Air Humidity',
        sensorType: SensorType.AIR_HUMIDITY,
        condition: (value: number | string) => Number(value) < 30,
        notificationTemplate: 'Umidade do ar abaixo do normal: {value}%',
      };

      const notifications = generator.generate(event, [rule]);

      expect(notifications.length).toBe(1);
      expect(notifications[0].message).toBe('Umidade do ar abaixo do normal: 25%');
      expect(notifications[0].ruleId).toBe('LOW_AIR_HUMIDITY');
    });

    it('should handle EQUIPMENT_FAILURE rule with string value', () => {
      const event: Event = {
        eventId: uuidv4(),
        farmId: 'farm-001',
        deviceId: 'equipment-001',
        sensorType: SensorType.EQUIPMENT_STATUS,
        value: 'FAILURE',
        unit: 'status',
        timestamp: new Date().toISOString(),
      };

      const rule: NotificationRule = {
        ruleId: 'EQUIPMENT_FAILURE',
        name: 'Equipment Failure',
        sensorType: SensorType.EQUIPMENT_STATUS,
        condition: (value: number | string) => value === 'FAILURE',
        notificationTemplate: 'Falha em equipamento detectada no dispositivo: {deviceId}',
      };

      const notifications = generator.generate(event, [rule]);

      expect(notifications.length).toBe(1);
      expect(notifications[0].message).toBe(
        'Falha em equipamento detectada no dispositivo: equipment-001'
      );
      expect(notifications[0].eventValue).toBe('FAILURE');
    });
  });

  describe('Property-Based Tests', () => {
    /**
     * **Validates: Requirements 4.3, 4.4, 5.3, 9.3**
     * **Property 15: Notification Message Generation**
     *
     * For any fired rule, the NotificationGenerator SHALL generate a notification
     * with the correct message template interpolated with event values and containing
     * all required fields: notificationId, eventId, farmId, deviceId, ruleId, message,
     * eventValue, eventTimestamp, and generatedAt.
     */
    it('should generate notification for any fired rule with all required fields', () => {
      return fc.assert(
        fc.property(
          fc.tuple(fc.uuid(), fc.uuid(), fc.uuid()),
          fc.float({ min: -100, max: 100 }),
          fc.string({ minLength: 1, maxLength: 50 }),
          (uuids, value, unit) => {
            const [eventId, farmId, deviceId] = uuids;

            const event: Event = {
              eventId,
              farmId,
              deviceId,
              sensorType: SensorType.AIR_TEMPERATURE,
              value,
              unit,
              timestamp: new Date().toISOString(),
            };

            const rule: NotificationRule = {
              ruleId: 'TEST_RULE',
              name: 'Test Rule',
              sensorType: SensorType.AIR_TEMPERATURE,
              condition: () => true,
              notificationTemplate: 'Test message with {value}',
            };

            const notifications = generator.generate(event, [rule]);

            // Verify all required fields exist
            expect(notifications.length).toBe(1);
            const notification = notifications[0];

            expect(notification).toHaveProperty('notificationId');
            expect(notification).toHaveProperty('eventId');
            expect(notification).toHaveProperty('farmId');
            expect(notification).toHaveProperty('deviceId');
            expect(notification).toHaveProperty('ruleId');
            expect(notification).toHaveProperty('ruleName');
            expect(notification).toHaveProperty('message');
            expect(notification).toHaveProperty('eventValue');
            expect(notification).toHaveProperty('eventTimestamp');
            expect(notification).toHaveProperty('generatedAt');
            expect(notification).toHaveProperty('dispatchStatus');

            // Verify field values
            expect(notification.eventId).toBe(eventId);
            expect(notification.farmId).toBe(farmId);
            expect(notification.deviceId).toBe(deviceId);
            expect(notification.ruleId).toBe('TEST_RULE');
            expect(notification.eventValue).toBe(value);
            expect(notification.dispatchStatus).toBe('pending');
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should generate unique notificationIds for each rule', () => {
      return fc.assert(
        fc.property(fc.integer({ min: 1, max: 10 }), (numRules) => {
          const event: Event = {
            eventId: uuidv4(),
            farmId: 'farm-001',
            deviceId: 'device-001',
            sensorType: SensorType.AIR_TEMPERATURE,
            value: 25,
            unit: '°C',
            timestamp: new Date().toISOString(),
          };

          const rules: NotificationRule[] = Array.from({ length: numRules }, (_, i) => ({
            ruleId: `RULE_${i}`,
            name: `Rule ${i}`,
            sensorType: SensorType.AIR_TEMPERATURE,
            condition: () => true,
            notificationTemplate: `Alert ${i}`,
          }));

          const notifications = generator.generate(event, rules);

          // All IDs should be unique
          const ids = notifications.map((n) => n.notificationId);
          const uniqueIds = new Set(ids);
          expect(uniqueIds.size).toBe(ids.length);
        }),
        { numRuns: 20 }
      );
    });

    it('should interpolate template correctly for any event value', () => {
      return fc.assert(
        fc.property(
          fc.float({ min: -1000, max: 1000 }),
          fc.string({ minLength: 1, maxLength: 20 }),
          (value, unit) => {
            const event: Event = {
              eventId: uuidv4(),
              farmId: 'farm-001',
              deviceId: 'device-001',
              sensorType: SensorType.AIR_TEMPERATURE,
              value,
              unit,
              timestamp: new Date().toISOString(),
            };

            const rule: NotificationRule = {
              ruleId: 'TEST_RULE',
              name: 'Test Rule',
              sensorType: SensorType.AIR_TEMPERATURE,
              condition: () => true,
              notificationTemplate: 'Value: {value}, Unit: {unit}',
            };

            const notifications = generator.generate(event, [rule]);

            const expectedMessage = `Value: ${value}, Unit: ${unit}`;
            expect(notifications[0].message).toBe(expectedMessage);
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should never return undefined or null fields', () => {
      return fc.assert(
        fc.property(fc.uuid(), fc.uuid(), fc.uuid(), (eventId, farmId, deviceId) => {
          const event: Event = {
            eventId,
            farmId,
            deviceId,
            sensorType: SensorType.AIR_TEMPERATURE,
            value: 25,
            unit: '°C',
            timestamp: new Date().toISOString(),
          };

          const rule: NotificationRule = {
            ruleId: 'TEST_RULE',
            name: 'Test Rule',
            sensorType: SensorType.AIR_TEMPERATURE,
            condition: () => true,
            notificationTemplate: 'Alert',
          };

          const notifications = generator.generate(event, [rule]);
          const notification = notifications[0];

          // Verify no critical fields are undefined or null
          expect(notification.notificationId).toBeDefined();
          expect(notification.eventId).toBeDefined();
          expect(notification.farmId).toBeDefined();
          expect(notification.deviceId).toBeDefined();
          expect(notification.ruleId).toBeDefined();
          expect(notification.message).toBeDefined();
          expect(notification.eventValue).toBeDefined();
          expect(notification.eventTimestamp).toBeDefined();
          expect(notification.generatedAt).toBeDefined();
          expect(notification.dispatchStatus).toBeDefined();
        }),
        { numRuns: 50 }
      );
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle very long templates', () => {
      const longTemplate = 'A'.repeat(10000) + ': {value}';
      const event: Event = {
        eventId: uuidv4(),
        farmId: 'farm-001',
        deviceId: 'device-001',
        sensorType: SensorType.AIR_TEMPERATURE,
        value: 36,
        unit: '°C',
        timestamp: new Date().toISOString(),
      };

      const rule: NotificationRule = {
        ruleId: 'TEST_RULE',
        name: 'Test Rule',
        sensorType: SensorType.AIR_TEMPERATURE,
        condition: () => true,
        notificationTemplate: longTemplate,
      };

      const notifications = generator.generate(event, [rule]);

      expect(notifications[0].message).toContain('A'.repeat(10000));
      expect(notifications[0].message).toContain('36');
    });

    it('should handle undefined values in events gracefully', () => {
      const event: Event = {
        eventId: uuidv4(),
        farmId: 'farm-001',
        deviceId: 'device-001',
        sensorType: SensorType.AIR_TEMPERATURE,
        value: 0,
        unit: '°C',
        timestamp: new Date().toISOString(),
      };

      const rule: NotificationRule = {
        ruleId: 'TEST_RULE',
        name: 'Test Rule',
        sensorType: SensorType.AIR_TEMPERATURE,
        condition: () => true,
        notificationTemplate: 'Value is {value}',
      };

      const notifications = generator.generate(event, [rule]);

      expect(notifications[0].message).toBe('Value is 0');
    });

    it('should continue processing after error with one rule', () => {
      const event: Event = {
        eventId: uuidv4(),
        farmId: 'farm-001',
        deviceId: 'device-001',
        sensorType: SensorType.AIR_TEMPERATURE,
        value: 36,
        unit: '°C',
        timestamp: new Date().toISOString(),
      };

      // Create rules array with some rules
      const rules: NotificationRule[] = [
        {
          ruleId: 'RULE_1',
          name: 'Rule 1',
          sensorType: SensorType.AIR_TEMPERATURE,
          condition: () => true,
          notificationTemplate: 'Alert 1: {value}',
        },
        {
          ruleId: 'RULE_2',
          name: 'Rule 2',
          sensorType: SensorType.AIR_TEMPERATURE,
          condition: () => true,
          notificationTemplate: 'Alert 2: {value}',
        },
      ];

      const notifications = generator.generate(event, rules);

      // Both notifications should be generated
      expect(notifications.length).toBe(2);
      expect(notifications.some((n) => n.ruleId === 'RULE_1')).toBe(true);
      expect(notifications.some((n) => n.ruleId === 'RULE_2')).toBe(true);
    });

    it('should handle special characters in template', () => {
      const event: Event = {
        eventId: uuidv4(),
        farmId: 'farm-001',
        deviceId: 'device-001',
        sensorType: SensorType.AIR_TEMPERATURE,
        value: 36,
        unit: '°C',
        timestamp: new Date().toISOString(),
      };

      const rule: NotificationRule = {
        ruleId: 'TEST_RULE',
        name: 'Test Rule',
        sensorType: SensorType.AIR_TEMPERATURE,
        condition: () => true,
        notificationTemplate: '⚠️ Alert! Temperature {value} exceeded! 🌡️',
      };

      const notifications = generator.generate(event, [rule]);

      expect(notifications[0].message).toBe('⚠️ Alert! Temperature 36 exceeded! 🌡️');
    });
  });
});
