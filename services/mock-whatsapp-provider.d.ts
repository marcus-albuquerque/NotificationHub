/**
 * NotificationHub - Mock WhatsApp Provider
 *
 * Mock implementation of WhatsApp provider for testing and MVP.
 * Simulates WhatsApp sends with configurable success rate for testing retry logic.
 */
import { NotificationProvider, ProviderSendResult } from './notification-provider';
/**
 * MockWhatsAppProvider
 *
 * Simulates WhatsApp message delivery for MVP and testing.
 * Can be configured to simulate failures for testing retry logic.
 */
export declare class MockWhatsAppProvider implements NotificationProvider {
    private successRate;
    private sendDelay;
    private messageLog;
    /**
     * Create a new MockWhatsAppProvider
     *
     * @param successRate - Percentage of sends that succeed (0-1, default 0.95 for 95% success)
     * @param sendDelay - Delay in ms to simulate network latency (default 100ms)
     */
    constructor(successRate?: number, sendDelay?: number);
    /**
     * Send a message via WhatsApp (mocked)
     *
     * Simulates sending a message through WhatsApp Business API.
     * - Delays send by configured duration to simulate network latency
     * - Randomly succeeds/fails based on configured success rate
     * - Logs all send attempts
     *
     * @param recipient - WhatsApp phone number in format +XXXXXXXXXXX
     * @param message - The message to send
     * @returns Promise resolving to send result
     */
    send(recipient: string, message: string): Promise<ProviderSendResult>;
    /**
     * Get the channel name
     *
     * @returns "WhatsApp (Mock)"
     */
    getChannel(): string;
    /**
     * Get the message log (for testing/debugging)
     *
     * @returns Array of logged messages
     */
    getMessageLog(): Array<{
        recipient: string;
        message: string;
        timestamp: string;
        success: boolean;
    }>;
    /**
     * Clear the message log
     */
    clearMessageLog(): void;
    /**
     * Get statistics about send attempts
     *
     * @returns Statistics object
     */
    getStats(): {
        total: number;
        successful: number;
        failed: number;
        successRate: number;
    };
    /**
     * Set the success rate for simulated sends
     *
     * @param rate - Success rate (0-1)
     */
    setSuccessRate(rate: number): void;
    /**
     * Generate a mock message ID
     *
     * @returns Message ID string
     */
    private generateMessageId;
    /**
     * Simulate a network error
     *
     * @returns Error message
     */
    private simulateError;
    /**
     * Delay execution (for simulating network latency)
     *
     * @param ms - Milliseconds to delay
     * @returns Promise that resolves after delay
     */
    private delay;
    /**
     * Mask phone number for logging (security)
     *
     * @param phone - Phone number to mask
     * @returns Masked phone number
     */
    private maskPhone;
}
//# sourceMappingURL=mock-whatsapp-provider.d.ts.map