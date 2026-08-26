/**
 * NotificationHub - Notification Provider Interface
 *
 * Abstract interface for notification providers.
 * Allows for multiple provider implementations (WhatsApp, SMS, Email, etc.)
 */

/**
 * NotificationProvider interface
 *
 * Defines the contract for notification delivery implementations.
 * Each provider handles sending notifications through a specific channel.
 */
export interface NotificationProvider {
  /**
   * Send a notification message to a recipient
   *
   * @param recipient - The recipient identifier (phone number, email, etc.)
   * @param message - The message content to send
   * @returns Promise resolving to send result
   */
  send(recipient: string, message: string): Promise<ProviderSendResult>;

  /**
   * Get the channel name of this provider
   *
   * @returns The name of the notification channel (e.g., "WhatsApp", "SMS", "Email")
   */
  getChannel(): string;
}

/**
 * Result of a send attempt through a provider
 *
 * @property success - Whether the send was successful
 * @property messageId - Provider-specific message ID (if successful)
 * @property error - Error message (if unsuccessful)
 */
export interface ProviderSendResult {
  success: boolean;
  messageId?: string;
  error?: string;
}
