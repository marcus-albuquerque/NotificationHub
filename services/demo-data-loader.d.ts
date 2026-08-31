/**
 * NotificationHub - Demo Data Loader Service
 *
 * Loads demonstration data on application startup (if enabled)
 * Creates a sample farm, producer, devices, and events to test the system
 */
/**
 * Demo Data Loader Service
 *
 * Responsible for:
 * - Creating demo producer (João Silva)
 * - Creating demo farm (Boa Esperança)
 * - Creating 6 demo devices (one for each sensor type)
 * - Generating events that trigger each rule
 * - Generating normal events (no rule triggers)
 * - Can be disabled via LOAD_DEMO_DATA environment variable
 */
export declare class DemoDataLoader {
    private pool;
    /**
     * Load demo data into the database
     * Checks LOAD_DEMO_DATA environment variable to determine if loading should happen
     *
     * @returns void
     */
    loadDemoData(): Promise<void>;
    /**
     * Create demo producer: "João Silva" (producer-001)
     */
    private createDemoProducer;
    /**
     * Create demo farm: "Boa Esperança" (farm-001)
     */
    private createDemoFarm;
    /**
     * Create 6 demo devices (one for each sensor type)
     */
    private createDemoDevices;
    /**
     * Generate events that trigger each rule
     *
     * These events are designed to fire the notification rules:
     * - AIR_TEMPERATURE = 36°C (triggers HIGH_AIR_TEMPERATURE, threshold > 35)
     * - AIR_HUMIDITY = 25% (triggers LOW_AIR_HUMIDITY, threshold < 30)
     * - SOIL_MOISTURE = 15% (triggers LOW_SOIL_MOISTURE, threshold < 20)
     * - WATER_RESERVOIR_LEVEL = 10% (triggers LOW_WATER_RESERVOIR, threshold < 15)
     * - SILO_LEVEL = 12% (triggers LOW_SILO_LEVEL, threshold < 15)
     * - EQUIPMENT_STATUS = "FAILURE" (triggers EQUIPMENT_FAILURE)
     */
    private generateTriggeringEvents;
    /**
     * Generate normal events (that do not trigger any rules)
     *
     * These events are designed NOT to fire notification rules:
     * - AIR_TEMPERATURE = 25°C (no rule, threshold > 35)
     * - AIR_HUMIDITY = 60% (no rule, threshold < 30)
     * - SOIL_MOISTURE = 45% (no rule, threshold < 20)
     * - WATER_RESERVOIR_LEVEL = 80% (no rule, threshold < 15)
     * - SILO_LEVEL = 70% (no rule, threshold < 15)
     * - EQUIPMENT_STATUS = "OK" (no rule)
     */
    private generateNormalEvents;
}
export declare function getDemoDataLoader(): DemoDataLoader;
export declare const demoDataLoader: {
    loadDemoData: () => Promise<void>;
};
//# sourceMappingURL=demo-data-loader.d.ts.map