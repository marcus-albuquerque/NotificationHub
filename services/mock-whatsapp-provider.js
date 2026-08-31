"use strict";
/**
 * NotificationHub - Mock WhatsApp Provider
 *
 * Mock implementation of WhatsApp provider for testing and MVP.
 * Simulates WhatsApp sends with configurable success rate for testing retry logic.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MockWhatsAppProvider = void 0;
const uuid_1 = require("uuid");
const logger_1 = __importDefault(require("../utils/logger"));
/**
 * MockWhatsAppProvider
 *
 * Simulates WhatsApp message delivery for MVP and testing.
 * Can be configured to simulate failures for testing retry logic.
 */
class MockWhatsAppProvider {
    /**
     * Create a new MockWhatsAppProvider
     *
     * @param successRate - Percentage of sends that succeed (0-1, default 0.95 for 95% success)
     * @param sendDelay - Delay in ms to simulate network latency (default 100ms)
     */
    constructor(successRate = 0.95, sendDelay = 100) {
        this.messageLog = [];
        this.successRate = Math.max(0, Math.min(1, successRate)); // Clamp between 0 and 1
        this.sendDelay = sendDelay;
        logger_1.default.info(`MockWhatsAppProvider initialized`, {
            successRate: `${(this.successRate * 100).toFixed(1)}%`,
            sendDelayMs: sendDelay,
        });
    }
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
    async send(recipient, message) {
        // Simulate network latency
        await this.delay(this.sendDelay);
        // Generate message ID (provider-specific)
        const messageId = this.generateMessageId();
        // Simulate success/failure based on configured success rate
        const isSuccess = Math.random() < this.successRate;
        if (isSuccess) {
            // Success case
            logger_1.default.info(`[MockWhatsApp] Message sent successfully`, {
                messageId,
                recipient: this.maskPhone(recipient),
                messageLength: message.length,
            });
            this.messageLog.push({
                recipient,
                message: message.substring(0, 100), // Log first 100 chars
                timestamp: new Date().toISOString(),
                success: true,
            });
            return {
                success: true,
                messageId,
            };
        }
        else {
            // Simulated failure
            const error = this.simulateError();
            logger_1.default.warn(`[MockWhatsApp] Message send failed`, {
                messageId,
                recipient: this.maskPhone(recipient),
                error,
            });
            this.messageLog.push({
                recipient,
                message: message.substring(0, 100),
                timestamp: new Date().toISOString(),
                success: false,
            });
            return {
                success: false,
                error,
            };
        }
    }
    /**
     * Get the channel name
     *
     * @returns "WhatsApp (Mock)"
     */
    getChannel() {
        return 'WhatsApp (Mock)';
    }
    /**
     * Get the message log (for testing/debugging)
     *
     * @returns Array of logged messages
     */
    getMessageLog() {
        return [...this.messageLog];
    }
    /**
     * Clear the message log
     */
    clearMessageLog() {
        this.messageLog = [];
        logger_1.default.debug('MockWhatsApp message log cleared');
    }
    /**
     * Get statistics about send attempts
     *
     * @returns Statistics object
     */
    getStats() {
        const total = this.messageLog.length;
        const successful = this.messageLog.filter((m) => m.success).length;
        const failed = total - successful;
        const actualSuccessRate = total > 0 ? successful / total : 0;
        return {
            total,
            successful,
            failed,
            successRate: actualSuccessRate,
        };
    }
    /**
     * Set the success rate for simulated sends
     *
     * @param rate - Success rate (0-1)
     */
    setSuccessRate(rate) {
        this.successRate = Math.max(0, Math.min(1, rate));
        logger_1.default.info(`MockWhatsApp success rate updated`, {
            successRate: `${(this.successRate * 100).toFixed(1)}%`,
        });
    }
    /**
     * Generate a mock message ID
     *
     * @returns Message ID string
     */
    generateMessageId() {
        return `msg_${(0, uuid_1.v4)()}`;
    }
    /**
     * Simulate a network error
     *
     * @returns Error message
     */
    simulateError() {
        const errors = [
            'Network timeout',
            'Invalid phone number',
            'Rate limit exceeded',
            'Provider unavailable',
            'Invalid message format',
        ];
        return errors[Math.floor(Math.random() * errors.length)];
    }
    /**
     * Delay execution (for simulating network latency)
     *
     * @param ms - Milliseconds to delay
     * @returns Promise that resolves after delay
     */
    delay(ms) {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }
    /**
     * Mask phone number for logging (security)
     *
     * @param phone - Phone number to mask
     * @returns Masked phone number
     */
    maskPhone(phone) {
        if (phone.length <= 4)
            return '****';
        return phone.substring(0, 2) + '*'.repeat(phone.length - 4) + phone.substring(phone.length - 2);
    }
}
exports.MockWhatsAppProvider = MockWhatsAppProvider;
//# sourceMappingURL=mock-whatsapp-provider.js.map