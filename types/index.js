"use strict";
/**
 * NotificationHub - Domain Types and Interfaces
 *
 * This file defines all TypeScript types, interfaces, and enums used throughout the system.
 * It represents the domain model for the smart farming notification system.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.SensorType = void 0;
/**
 * SensorType Enum
 *
 * Defines all supported sensor types that can be monitored in the system.
 * Each type corresponds to a specific measurement from a farm device/sensor.
 */
var SensorType;
(function (SensorType) {
    SensorType["AIR_TEMPERATURE"] = "AIR_TEMPERATURE";
    SensorType["AIR_HUMIDITY"] = "AIR_HUMIDITY";
    SensorType["SOIL_MOISTURE"] = "SOIL_MOISTURE";
    SensorType["WATER_RESERVOIR_LEVEL"] = "WATER_RESERVOIR_LEVEL";
    SensorType["SILO_LEVEL"] = "SILO_LEVEL";
    SensorType["EQUIPMENT_STATUS"] = "EQUIPMENT_STATUS";
})(SensorType || (exports.SensorType = SensorType = {}));
//# sourceMappingURL=index.js.map