/**
 * NotificationHub - Notification Dispatcher Service
 *
 * Responsible for dispatching notifications through providers with retry logic.
 * Failed notifications are added to Bull queue for automatic retry.
 */
import { Notification, NotificationDispatchResult } from '../types';
import { NotificationProvider } from './notification-provider';
/**
 * NotificationDispatcher
 *
 * Orchestrates notification dispatch through configured providers.
 * Handles success/failure cases and manages retry queuing.
 */
export declare class NotificationDispatcher {
    private provider;
    constructor(provider: NotificationProvider);
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
    dispatch(notification: Notification, producerPhone?: string): Promise<NotificationDispatchResult>;
    /**
     * Handle dispatch failure by adding to retry queue
     *
     * @param notification - The failed notification
     * @param error - Error message
     */
    private handleDispatchFailure;
    /**
     * Dispatch multiple notifications
     *
     * @param notifications - Array of notifications to dispatch
     * @param producerPhone - The recipient's phone number/contact info
     * @returns Promise resolving to array of dispatch results
     */
    dispatchBatch(notifications: Notification[], producerPhone?: string): Promise<NotificationDispatchResult[]>;
    /**
     * Mask phone number for logging (security)
     *
     * @param phone - Phone number to mask
     * @returns Masked phone number
     */
    private maskPhone;
    /**
     * Get the current provider
     *
     * @returns The configured notification provider
     */
    getProvider(): NotificationProvider;
    /**
     * Change the notification provider
     *
     * @param provider - New notification provider to use
     */
    setProvider(provider: NotificationProvider): void;
}
//# sourceMappingURL=notification-dispatcher.d.ts.map