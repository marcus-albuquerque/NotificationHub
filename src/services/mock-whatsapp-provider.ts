/**
 * NotificationHub - Mock WhatsApp Provider
 *
 * Mock implementation of WhatsApp provider for testing and MVP.
 * Simulates WhatsApp sends with configurable success rate for testing retry logic.
 */

import { v4 as uuidv4 } from 'uuid';
import logger from '../utils/logger';
import { NotificationProvider, ProviderSendResult } from './notification-provider';

/**
 * MockWhatsAppProvider
 *
 * Simulates WhatsApp message delivery for MVP and testing.
 * Can be configured to simulate failures for testing retry logic.
 */
export class MockWhatsAppProvider implements NotificationProvider {
  private successRate: number;
  private sendDelay: number; // ms to simulate network latency
  private messageLog: Array<{ recipient: string; message: string; timestamp: string; success: boolean }> = [];

  /**
   * Create a new MockWhatsAppProvider
   *
   * @param successRate - Percentage of sends that succeed (0-1, default 0.95 for 95% success)
   * @param sendDelay - Delay in ms to simulate network latency (default 100ms)
   */
  constructor(successRate: number = 0.95, sendDelay: number = 100) {
    this.successRate = Math.max(0, Math.min(1, successRate)); // Clamp between 0 and 1
    this.sendDelay = sendDelay;
    logger.info(`MockWhatsAppProvider initialized`, {
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
  async send(recipient: string, message: string): Promise<ProviderSendResult> {
    // Simulate network latency
    await this.delay(this.sendDelay);

    // Generate message ID (provider-specific)
    const messageId = this.generateMessageId();

    // Simulate success/failure based on configured success rate
    const isSuccess = Math.random() < this.successRate;

    if (isSuccess) {
      // Success case
      logger.info(`[MockWhatsApp] Message sent successfully`, {
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
    } else {
      // Simulated failure
      const error = this.simulateError();
      logger.warn(`[MockWhatsApp] Message send failed`, {
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
  getChannel(): string {
    return 'WhatsApp (Mock)';
  }

  /**
   * Get the message log (for testing/debugging)
   *
   * @returns Array of logged messages
   */
  getMessageLog(): Array<{ recipient: string; message: string; timestamp: string; success: boolean }> {
    return [...this.messageLog];
  }

  /**
   * Clear the message log
   */
  clearMessageLog(): void {
    this.messageLog = [];
    logger.debug('MockWhatsApp message log cleared');
  }

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
  } {
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
  setSuccessRate(rate: number): void {
    this.successRate = Math.max(0, Math.min(1, rate));
    logger.info(`MockWhatsApp success rate updated`, {
      successRate: `${(this.successRate * 100).toFixed(1)}%`,
    });
  }

  /**
   * Generate a mock message ID
   *
   * @returns Message ID string
   */
  private generateMessageId(): string {
    return `msg_${uuidv4()}`;
  }

  /**
   * Simulate a network error
   *
   * @returns Error message
   */
  private simulateError(): string {
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
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Mask phone number for logging (security)
   *
   * @param phone - Phone number to mask
   * @returns Masked phone number
   */
  private maskPhone(phone: string): string {
    if (phone.length <= 4) return '****';
    return phone.substring(0, 2) + '*'.repeat(phone.length - 4) + phone.substring(phone.length - 2);
  }
}
