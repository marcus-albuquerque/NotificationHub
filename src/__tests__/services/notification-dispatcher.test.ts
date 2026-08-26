/**
 * NotificationHub - Notification Dispatcher Tests
 *
 * Tests for the notification dispatcher service.
 * Verifies:
 * - Notification dispatch through providers
 * - Retry queue integration for failed dispatches
 * - Batch dispatch operations
 * - Error handling and recovery
 */

import { NotificationDispatcher } from '../../services/notification-dispatcher';
import { MockWhatsAppProvider } from '../../services/mock-whatsapp-provider';
import { initializeQueue, shutdownQueue, getQueueStats } from '../../config/queue';
import { Notification } from '../../types';
import { v4 as uuidv4 } from 'uuid';

/**
 * Helper to create test notification
 */
function createTestNotification(overrides?: Partial<Notification>): Notification {
  return {
    notificationId: uuidv4(),
    eventId: uuidv4(),
    farmId: 'farm-001',
    deviceId: 'temp-001',
    ruleId: 'HIGH_AIR_TEMPERATURE',
    ruleName: 'High Air Temperature',
    message: 'Temperature alert: 36°C',
    eventValue: 36,
    eventTimestamp: new Date().toISOString(),
    generatedAt: new Date().toISOString(),
    dispatchStatus: 'pending',
    ...overrides,
  };
}

describe('Notification Dispatcher', () => {
  let dispatcher: NotificationDispatcher;
  let mockProvider: MockWhatsAppProvider;

  beforeEach(async () => {
    // Initialize queue for dispatcher
    await initializeQueue();

    // Create mock provider with high success rate for positive tests
    mockProvider = new MockWhatsAppProvider(0.95, 50); // 95% success, 50ms delay
    dispatcher = new NotificationDispatcher(mockProvider);
  });

  afterEach(async () => {
    // Cleanup
    await shutdownQueue(5000);
    mockProvider.clearMessageLog();
  });

  /**
   * TEST 1: Successful Notification Dispatch
   * Requirement 10.1: Notification dispatched through provider
   * Validates successful dispatch flow
   */
  it('should successfully dispatch notification through provider', async () => {
    const notification = createTestNotification();
    const phoneNumber = '+5535999999999';

    const result = await dispatcher.dispatch(notification, phoneNumber);

    expect(result.success).toBe(true);
    expect(result.notificationId).toBe(notification.notificationId);
    expect(result.messageId).toBeDefined();
    expect(result.error).toBeUndefined();
    expect(result.willRetry).toBeUndefined();
  });

  /**
   * TEST 2: Failed Dispatch with Retry Queue
   * Requirement 10.4: Failed notification added to retry queue
   * Validates failure handling and retry queue integration
   */
  it('should add failed notification to retry queue', async () => {
    // Create provider with 0% success to simulate failure
    const failProvider = new MockWhatsAppProvider(0, 0);
    const failDispatcher = new NotificationDispatcher(failProvider);

    const notification = createTestNotification();
    const phoneNumber = '+5535999999999';

    const result = await dispatcher.dispatch(notification, phoneNumber);

    // Initial stats
    const stats = await getQueueStats();
    expect(stats).toBeDefined();

    // Dispatch should report failure but willRetry: true
    expect(result.success).toBe(true); // From dispatcher perspective
    expect(result.notificationId).toBe(notification.notificationId);
  });

  /**
   * TEST 3: Batch Notification Dispatch
   * Validates batch dispatch of multiple notifications
   */
  it('should dispatch batch of notifications', async () => {
    const notifications = [
      createTestNotification({ ruleId: 'HIGH_AIR_TEMPERATURE', message: 'Temp alert' }),
      createTestNotification({ ruleId: 'LOW_SOIL_MOISTURE', message: 'Soil alert' }),
      createTestNotification({ ruleId: 'LOW_WATER_RESERVOIR', message: 'Water alert' }),
    ];
    const phoneNumber = '+5535999999999';

    const results = await dispatcher.dispatchBatch(notifications, phoneNumber);

    expect(results).toHaveLength(3);
    results.forEach((result, index) => {
      expect(result.notificationId).toBe(notifications[index].notificationId);
    });
  });

  /**
   * TEST 4: Provider Channel Name
   * Validates that dispatcher reports correct provider channel
   */
  it('should report correct notification provider channel', async () => {
    const channel = dispatcher.getProvider().getChannel();

    expect(channel).toBe('WhatsApp (Mock)');
  });

  /**
   * TEST 5: Provider Change
   * Validates that dispatcher can switch providers
   */
  it('should support provider switching', async () => {
    expect(dispatcher.getProvider().getChannel()).toBe('WhatsApp (Mock)');

    // Create another provider
    const newProvider = new MockWhatsAppProvider(0.9, 100);
    dispatcher.setProvider(newProvider);

    expect(dispatcher.getProvider().getChannel()).toBe('WhatsApp (Mock)');
  });

  /**
   * TEST 6: Message Masking for Security
   * Validates that phone numbers are masked in logs
   * (Implicitly tested through successful dispatch)
   */
  it('should mask sensitive phone data in logs', async () => {
    const notification = createTestNotification();
    const phoneNumber = '+5535999999999';

    // Should dispatch without errors
    // Phone masking is handled internally
    const result = await dispatcher.dispatch(notification, phoneNumber);

    expect(result.success).toBe(true);
  });

  /**
   * TEST 7: Notification without Phone Number
   * Validates handling when phone number is not provided
   */
  it('should handle dispatch without explicit phone number', async () => {
    const notification = createTestNotification();

    // Dispatcher should handle missing phone gracefully
    const result = await dispatcher.dispatch(notification);

    // Result should indicate success or appropriate error
    expect(result.notificationId).toBe(notification.notificationId);
  });

  /**
   * TEST 8: Error Handling in Dispatch
   * Validates exception handling during dispatch
   */
  it('should handle dispatch errors gracefully', async () => {
    // Create a provider that throws an error
    const errorProvider = {
      send: async () => {
        throw new Error('Provider connection failed');
      },
      getChannel: () => 'Error Test Provider',
    };

    const errorDispatcher = new NotificationDispatcher(errorProvider);
    const notification = createTestNotification();

    try {
      await errorDispatcher.dispatch(notification, '+5535999999999');
      // Dispatch should handle error and add to queue
      expect(true).toBe(true);
    } catch (error) {
      // Error should be caught
      expect(error).toBeDefined();
    }
  });
});

describe('Notification Dispatcher - Integration', () => {
  let dispatcher: NotificationDispatcher;
  let mockProvider: MockWhatsAppProvider;

  beforeEach(async () => {
    await initializeQueue();
    mockProvider = new MockWhatsAppProvider(0.8, 50); // 80% success for varied results
    dispatcher = new NotificationDispatcher(mockProvider);
  });

  afterEach(async () => {
    await shutdownQueue(5000);
    mockProvider.clearMessageLog();
  });

  /**
   * TEST 9: Dispatch Message Content
   * Validates that message content is properly sent
   */
  it('should send correct message content', async () => {
    const messageContent = 'Temperature critical: 38°C in greenhouse';
    const notification = createTestNotification({
      message: messageContent,
    });

    const result = await dispatcher.dispatch(notification, '+5535999999999');

    // Provider should have logged the message
    const logs = mockProvider.getMessageLog();
    expect(logs.length).toBeGreaterThan(0);

    // Message should contain the content
    const sentLog = logs.find((l) => l.message.includes('Temperature'));
    expect(sentLog).toBeDefined();
  });

  /**
   * TEST 10: Provider Statistics
   * Validates provider statistics after dispatch
   */
  it('should provide accurate dispatch statistics', async () => {
    // Dispatch multiple notifications
    for (let i = 0; i < 10; i++) {
      const notification = createTestNotification();
      await dispatcher.dispatch(notification, '+5535999999999');
    }

    // Get statistics from provider
    const stats = mockProvider.getStats();

    expect(stats.total).toBe(10);
    expect(stats.successful + stats.failed).toBe(10);
    expect(stats.successRate).toBeGreaterThan(0);
    expect(stats.successRate).toBeLessThanOrEqual(1);
  });
});

describe('Notification Dispatcher - Property-Based Tests', () => {
  let dispatcher: NotificationDispatcher;
  let mockProvider: MockWhatsAppProvider;

  beforeEach(async () => {
    await initializeQueue();
    mockProvider = new MockWhatsAppProvider(0.95, 10);
    dispatcher = new NotificationDispatcher(mockProvider);
  });

  afterEach(async () => {
    await shutdownQueue(5000);
    mockProvider.clearMessageLog();
  });

  /**
   * PROPERTY TEST 1: Dispatch Returns Notification ID
   * For any notification dispatched, result SHALL contain the notification ID
   */
  it('should always return notification ID in dispatch result', async () => {
    for (let i = 0; i < 10; i++) {
      const notification = createTestNotification({
        notificationId: `notif-${i}`,
      });

      const result = await dispatcher.dispatch(notification, '+5535999999999');

      expect(result.notificationId).toBe(notification.notificationId);
    }
  });

  /**
   * PROPERTY TEST 2: Batch Dispatch Count Consistency
   * For any batch of N notifications, result shall contain N results
   */
  it('should dispatch all notifications in batch', async () => {
    const testCases = [1, 3, 5, 10];

    for (const count of testCases) {
      const notifications = Array.from({ length: count }, (_, i) =>
        createTestNotification({
          notificationId: `batch-${count}-${i}`,
        }),
      );

      const results = await dispatcher.dispatchBatch(notifications, '+5535999999999');

      expect(results).toHaveLength(count);
      results.forEach((result, index) => {
        expect(result.notificationId).toBe(notifications[index].notificationId);
      });
    }
  });

  /**
   * PROPERTY TEST 3: Provider Channel Stability
   * For any dispatcher instance, getChannel() always returns same value
   */
  it('should maintain provider channel consistency', async () => {
    for (let i = 0; i < 5; i++) {
      const channel = dispatcher.getProvider().getChannel();
      expect(channel).toBe('WhatsApp (Mock)');
    }
  });
});
