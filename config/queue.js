"use strict";
/**
 * NotificationHub - Bull Task Queue Configuration
 *
 * Configures Bull queues for notification retry management.
 * Handles failed notifications with exponential backoff retry strategy.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.initializeQueue = initializeQueue;
exports.addToRetryQueue = addToRetryQueue;
exports.getQueue = getQueue;
exports.shutdownQueue = shutdownQueue;
exports.getQueueStats = getQueueStats;
exports.clearQueue = clearQueue;
const bull_1 = __importDefault(require("bull"));
const logger_1 = __importDefault(require("../utils/logger"));
// Environment variables for queue configuration
const REDIS_HOST = process.env.REDIS_HOST || 'localhost';
const REDIS_PORT = parseInt(process.env.REDIS_PORT || '6379', 10);
const REDIS_PASSWORD = process.env.REDIS_PASSWORD || undefined;
const REDIS_DB = parseInt(process.env.REDIS_DB || '0', 10);
// Queue retry configuration
const MAX_ATTEMPTS = parseInt(process.env.BULL_QUEUE_ATTEMPTS || '3', 10);
const RETRY_DELAY_MS = parseInt(process.env.BULL_QUEUE_BACKOFF || '300000', 10); // 5 minutes default
const QUEUE_CONCURRENCY = parseInt(process.env.BULL_QUEUE_CONCURRENCY || '5', 10);
// Queue instance
let notificationRetryQueue = null;
/**
 * Initialize and configure the notification retry queue
 *
 * Performs the following setup:
 * 1. Creates a Bull queue connected to Redis
 * 2. Configures retry strategy with exponential backoff
 * 3. Sets up event listeners for job lifecycle events
 * 4. Handles graceful shutdown
 *
 * @returns Promise that resolves when queue is initialized
 */
async function initializeQueue() {
    logger_1.default.info('Initializing notification retry queue...', {
        redis: { host: REDIS_HOST, port: REDIS_PORT, db: REDIS_DB },
        retry: {
            maxAttempts: MAX_ATTEMPTS,
            retryDelayMs: RETRY_DELAY_MS,
        },
        concurrency: QUEUE_CONCURRENCY,
    });
    // Create queue with Redis configuration
    notificationRetryQueue = new bull_1.default('notification-retry', {
        redis: {
            host: REDIS_HOST,
            port: REDIS_PORT,
            password: REDIS_PASSWORD,
            db: REDIS_DB,
        },
        settings: {
            // Retry configuration
            maxStalledCount: 2, // Max times a job can be stalled before failure
            lockDuration: 30000, // Lock duration in ms (30 seconds)
            lockRenewTime: 15000, // Lock renewal interval in ms
            retryProcessDelay: 5000, // Delay before retrying failed jobs
        },
    });
    // Set process concurrency for job processing
    await notificationRetryQueue.process(QUEUE_CONCURRENCY, async (job) => {
        logger_1.default.info(`Processing notification retry job ${job.id}`, {
            notification: job.data.notificationId,
            attempt: job.attemptsMade + 1,
            maxAttempts: MAX_ATTEMPTS,
        });
        // Job processing logic will be implemented by the dispatcher
        // This is the job handler that will be invoked for each retry
        return { processed: true, notificationId: job.data.notificationId };
    });
    // Event listeners for queue lifecycle
    /**
     * Job completed successfully
     */
    notificationRetryQueue.on('completed', (job) => {
        logger_1.default.info(`Notification retry job completed`, {
            jobId: job.id,
            notificationId: job.data.notificationId,
            attempts: job.attemptsMade + 1,
            durationMs: job.finishedOn ? job.finishedOn - job.timestamp : 0,
        });
    });
    /**
     * Job failed after max attempts
     */
    notificationRetryQueue.on('failed', (job, error) => {
        logger_1.default.error(`Notification retry job failed`, {
            jobId: job.id,
            notificationId: job.data.notificationId,
            attempts: job.attemptsMade + 1,
            maxAttempts: MAX_ATTEMPTS,
            error: error.message,
            stack: error.stack,
        });
        // Additional handling for permanently failed notifications can be done here
        // E.g., alert admin, update database, etc.
    });
    /**
     * Job is being retried after failure
     */
    notificationRetryQueue.on('stalled', (job) => {
        logger_1.default.warn(`Notification retry job stalled`, {
            jobId: job.id,
            notificationId: job.data.notificationId,
            attempts: job.attemptsMade + 1,
        });
    });
    /**
     * Error in queue (connection issues, etc.)
     */
    notificationRetryQueue.on('error', (error) => {
        logger_1.default.error(`Queue error`, {
            error: error.message,
            stack: error.stack,
        });
    });
    /**
     * Queue is ready for processing
     */
    notificationRetryQueue.on('ready', () => {
        logger_1.default.info('Notification retry queue is ready for processing');
    });
    /**
     * Queue encountered a critical error and is paused
     */
    notificationRetryQueue.on('paused', () => {
        logger_1.default.warn('Notification retry queue has been paused');
    });
    /**
     * Queue resumed after pause
     */
    notificationRetryQueue.on('resumed', () => {
        logger_1.default.info('Notification retry queue has been resumed');
    });
    logger_1.default.info('Notification retry queue initialized successfully');
    return notificationRetryQueue;
}
/**
 * Add a notification to the retry queue
 *
 * When a notification fails to dispatch, it is added to this queue
 * for automatic retry. The queue will attempt to process the job up to
 * MAX_ATTEMPTS times with RETRY_DELAY_MS between attempts.
 *
 * @param notification - The notification to retry
 * @param priority - Job priority (optional, higher = sooner processing)
 * @returns Promise resolving to the created Job
 */
async function addToRetryQueue(notification, priority) {
    if (!notificationRetryQueue) {
        throw new Error('Queue not initialized. Call initializeQueue() first.');
    }
    logger_1.default.info(`Adding notification to retry queue`, {
        notificationId: notification.notificationId,
        eventId: notification.eventId,
        farmId: notification.farmId,
        priority,
    });
    // Add job with retry configuration
    const job = await notificationRetryQueue.add(notification, {
        attempts: MAX_ATTEMPTS,
        backoff: {
            type: 'fixed',
            delay: RETRY_DELAY_MS,
        },
        removeOnComplete: true, // Remove job after successful completion
        removeOnFail: false, // Keep failed jobs for audit trail
        priority: priority,
        timeout: 30000, // 30 second timeout per attempt
    });
    logger_1.default.info(`Notification added to retry queue`, {
        jobId: job.id,
        notificationId: notification.notificationId,
    });
    return job;
}
/**
 * Get the notification retry queue instance
 *
 * @returns The Bull queue instance or null if not initialized
 */
function getQueue() {
    return notificationRetryQueue;
}
/**
 * Gracefully shutdown the queue
 *
 * This function should be called during application shutdown to:
 * 1. Stop accepting new jobs
 * 2. Wait for in-progress jobs to complete (with timeout)
 * 3. Close Redis connections
 *
 * @param timeout - Maximum time to wait for jobs to complete (in milliseconds)
 */
async function shutdownQueue(timeout = 10000) {
    if (!notificationRetryQueue) {
        logger_1.default.info('Queue not initialized, skipping shutdown');
        return;
    }
    logger_1.default.info('Shutting down notification retry queue...', { timeout });
    try {
        // Pause the queue to stop processing new jobs
        await notificationRetryQueue.pause();
        logger_1.default.info('Queue paused, waiting for in-progress jobs to complete...');
        // Close queue
        await notificationRetryQueue.close();
        logger_1.default.info('Notification retry queue shut down successfully');
        notificationRetryQueue = null;
    }
    catch (error) {
        logger_1.default.error('Error during queue shutdown', {
            error: error instanceof Error ? error.message : String(error),
        });
        throw error;
    }
}
/**
 * Get queue statistics and status
 *
 * @returns Promise resolving to queue statistics
 */
async function getQueueStats() {
    if (!notificationRetryQueue) {
        throw new Error('Queue not initialized');
    }
    const [active, completed, failed, delayed, waiting] = await Promise.all([
        notificationRetryQueue.getActiveCount(),
        notificationRetryQueue.getCompletedCount(),
        notificationRetryQueue.getFailedCount(),
        notificationRetryQueue.getDelayedCount(),
        notificationRetryQueue.getWaitingCount(),
    ]);
    const isPaused = await notificationRetryQueue.isPaused();
    return {
        active,
        completed,
        failed,
        delayed,
        waiting,
        isPaused,
    };
}
/**
 * Clear the queue (remove all jobs)
 * Use with caution - this removes all pending retries
 *
 * @returns Promise resolving when queue is cleared
 */
async function clearQueue() {
    if (!notificationRetryQueue) {
        throw new Error('Queue not initialized');
    }
    logger_1.default.warn('Clearing all jobs from notification retry queue');
    await notificationRetryQueue.clean(0); // Remove all jobs
    logger_1.default.info('Queue cleared');
}
//# sourceMappingURL=queue.js.map