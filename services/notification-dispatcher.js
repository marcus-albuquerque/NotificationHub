"use strict";
/**
 * NotificationHub - Notification Dispatcher Service
 *
 * Responsible for dispatching notifications through providers with retry logic.
 * Failed notifications are added to Bull queue for automatic retry.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationDispatcher = void 0;
const logger_1 = __importDefault(require("../utils/logger"));
const queue_1 = require("../config/queue");
/**
 * NotificationDispatcher
 *
 * Orchestrates notification dispatch through configured providers.
 * Handles success/failure cases and manages retry queuing.
 */
class NotificationDispatcher {
    constructor(provider) {
        this.provider = provider;
        logger_1.default.info(`NotificationDispatcher initialized with provider: ${provider.getChannel()}`);
    }
    /**
     * Dispatch a notification through the configured provider
     *
     * Attempts to send the notification immediately. If dispatch fails,
     * the notification is added to the Bull retry queue for automatic retry
     * with the configured backoff strategy.
     *
     * @param notification - The notification to dispatch
     * @param producerPhone - The recipient's phone number/contact info
     * @returns Promise resolving to dispatch result
     */
    async dispatch(notification, producerPhone) {
        const dispatchStartTime = Date.now();
        try {
            logger_1.default.info(`Dispatching notification`, {
                notificationId: notification.notificationId,
                eventId: notification.eventId,
                provider: this.provider.getChannel(),
                producerPhone: this.maskPhone(producerPhone),
            });
            // Attempt to send through provider
            const result = await this.provider.send(producerPhone || '', notification.message);
            if (result.success) {
                // Success case
                logger_1.default.info(`Notification dispatched successfully`, {
                    notificationId: notification.notificationId,
                    messageId: result.messageId,
                    durationMs: Date.now() - dispatchStartTime,
                });
                return {
                    success: true,
                    notificationId: notification.notificationId,
                    messageId: result.messageId,
                };
            }
            else {
                // Provider returned error but no exception
                logger_1.default.warn(`Notification dispatch failed`, {
                    notificationId: notification.notificationId,
                    error: result.error,
                    durationMs: Date.now() - dispatchStartTime,
                });
                // Add to retry queue
                await this.handleDispatchFailure(notification, result.error || 'Unknown error');
                return {
                    success: false,
                    notificationId: notification.notificationId,
                    error: result.error,
                    willRetry: true,
                };
            }
        }
        catch (error) {
            // Exception during send attempt
            const errorMessage = error instanceof Error ? error.message : String(error);
            logger_1.default.error(`Notification dispatch exception`, {
                notificationId: notification.notificationId,
                error: errorMessage,
                durationMs: Date.now() - dispatchStartTime,
            });
            // Add to retry queue for retry
            await this.handleDispatchFailure(notification, errorMessage);
            return {
                success: false,
                notificationId: notification.notificationId,
                error: errorMessage,
                willRetry: true,
            };
        }
    }
    /**
     * Handle dispatch failure by adding to retry queue
     *
     * @param notification - The failed notification
     * @param error - Error message
     */
    async handleDispatchFailure(notification, error) {
        try {
            // Update notification with error status
            const failedNotification = {
                ...notification,
                dispatchStatus: 'failed',
                dispatchError: error,
            };
            logger_1.default.info(`Adding notification to retry queue`, {
                notificationId: notification.notificationId,
                error,
            });
            // Add to retry queue for automatic retry
            await (0, queue_1.addToRetryQueue)(failedNotification);
            logger_1.default.info(`Notification added to retry queue successfully`, {
                notificationId: notification.notificationId,
            });
        }
        catch (queueError) {
            const queueErrorMessage = queueError instanceof Error ? queueError.message : String(queueError);
            logger_1.default.error(`Failed to add notification to retry queue`, {
                notificationId: notification.notificationId,
                error: queueErrorMessage,
            });
            // This is a critical error - notification cannot be retried
            // In production, this should trigger an alert
            throw new Error(`Failed to queue retry for notification ${notification.notificationId}: ${queueErrorMessage}`);
        }
    }
    /**
     * Dispatch multiple notifications
     *
     * @param notifications - Array of notifications to dispatch
     * @param producerPhone - The recipient's phone number/contact info
     * @returns Promise resolving to array of dispatch results
     */
    async dispatchBatch(notifications, producerPhone) {
        logger_1.default.info(`Dispatching batch of notifications`, {
            count: notifications.length,
            producerPhone: this.maskPhone(producerPhone),
        });
        const results = await Promise.all(notifications.map((notification) => this.dispatch(notification, producerPhone)));
        const successCount = results.filter((r) => r.success).length;
        const failureCount = results.filter((r) => !r.success).length;
        logger_1.default.info(`Batch dispatch complete`, {
            total: results.length,
            success: successCount,
            failed: failureCount,
            willRetry: failureCount,
        });
        return results;
    }
    /**
     * Mask phone number for logging (security)
     *
     * @param phone - Phone number to mask
     * @returns Masked phone number
     */
    maskPhone(phone) {
        if (!phone)
            return undefined;
        if (phone.length <= 4)
            return '****';
        return phone.substring(0, 2) + '*'.repeat(phone.length - 4) + phone.substring(phone.length - 2);
    }
    /**
     * Get the current provider
     *
     * @returns The configured notification provider
     */
    getProvider() {
        return this.provider;
    }
    /**
     * Change the notification provider
     *
     * @param provider - New notification provider to use
     */
    setProvider(provider) {
        logger_1.default.info(`Changing notification provider to ${provider.getChannel()}`);
        this.provider = provider;
    }
}
exports.NotificationDispatcher = NotificationDispatcher;
//# sourceMappingURL=notification-dispatcher.js.map