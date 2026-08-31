"use strict";
/**
 * NotificationHub - Smart Farming Notification System
 * Entry point for the application
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
const app_1 = require("./app");
const database_1 = require("./config/database");
const demo_data_loader_1 = require("./services/demo-data-loader");
// Load environment variables
dotenv_1.default.config();
const PORT = parseInt(process.env.PORT || '3000', 10);
const NODE_ENV = process.env.NODE_ENV || 'development';
/**
 * Start the application
 */
async function start() {
    try {
        console.log(`Starting NotificationHub in ${NODE_ENV} mode on port ${PORT}`);
        // Initialize database
        console.log('Initializing database...');
        await (0, database_1.initializeDatabase)();
        // Load demo data if enabled
        console.log('Checking demo data configuration...');
        await demo_data_loader_1.demoDataLoader.loadDemoData();
        // Create Express app
        const app = (0, app_1.createApp)();
        // Start server
        const server = app.listen(PORT, () => {
            console.log(`✓ NotificationHub server running on http://localhost:${PORT}`);
        });
        // Handle graceful shutdown
        process.on('SIGINT', async () => {
            console.log('\nShutting down gracefully...');
            server.close();
            process.exit(0);
        });
        process.on('SIGTERM', async () => {
            console.log('\nShutting down gracefully...');
            server.close();
            process.exit(0);
        });
    }
    catch (error) {
        console.error('Failed to start application:', error);
        process.exit(1);
    }
}
start();
//# sourceMappingURL=index.js.map