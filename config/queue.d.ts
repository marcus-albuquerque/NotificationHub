/**
 * NotificationHub - Bull Task Queue Configuration
 *
 * Configures Bull queues for notification retry management.
 * Handles failed notifications with exponential backoff retry strategy.
 */
import { Queue as BullQueue, Job } from 'bull';
import { Notification } from '../types';
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
export declare function initializeQueue(): Promise<BullQueue<Notification>>;
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
export declare function addToRetryQueue(notification: Notification, priority?: number): Promise<Job<Notification>>;
/**
 * Get the notification retry queue instance
 *
 * @returns The Bull queue instance or null if not initialized
 */
export declare function getQueue(): BullQueue<Notification> | null;
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
export declare function shutdownQueue(timeout?: number): Promise<void>;
/**
 * Get queue statistics and status
 *
 * @returns Promise resolving to queue statistics
 */
export declare function getQueueStats(): Promise<{
    active: number;
    completed: number;
    failed: number;
    delayed: number;
    waiting: number;
    isPaused: boolean;
}>;
/**
 * Clear the queue (remove all jobs)
 * Use with caution - this removes all pending retries
 *
 * @returns Promise resolving when queue is cleared
 */
export declare function clearQueue(): Promise<void>;
export { BullQueue, Job };
//# sourceMappingURL=queue.d.ts.map