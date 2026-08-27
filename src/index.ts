/**
 * NotificationHub - Smart Farming Notification System
 * Entry point for the application
 */

import dotenv from 'dotenv';
import { createApp } from './app';
import { initializeDatabase } from './config/database';
import { demoDataLoader } from './services/demo-data-loader';

// Load environment variables
dotenv.config();

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
    await initializeDatabase();

    // Load demo data if enabled
    console.log('Checking demo data configuration...');
    await demoDataLoader.loadDemoData();

    // Create Express app
    const app = createApp();

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
  } catch (error) {
    console.error('Failed to start application:', error);
    process.exit(1);
  }
}

start();
