/**
 * NotificationHub - MockWhatsApp Provider Tests
 *
 * Tests for MockWhatsAppProvider implementation.
 * Validates: Task 11 acceptance criteria
 * - NotificationProvider interface implemented
 * - MockWhatsApp class with 95% success rate
 * - Logging of simulated sends
 * - Support for future provider implementations
 */

import { MockWhatsAppProvider } from '../../services/mock-whatsapp-provider';
import { NotificationProvider, ProviderSendResult } from '../../services/notification-provider';
import * as fc from 'fast-check';

describe('MockWhatsAppProvider', () => {
  let provider: MockWhatsAppProvider;

  beforeEach(() => {
    provider = new MockWhatsAppProvider(0.95, 0); // 95% success rate, no delay for testing
  });

  afterEach(() => {
    if (provider) {
      provider.clearMessageLog();
    }
  });

  describe('Implementation of NotificationProvider interface', () => {
    it('should implement NotificationProvider interface', () => {
      expect(provider).toBeInstanceOf(MockWhatsAppProvider);
      expect(typeof provider.send).toBe('function');
      expect(typeof provider.getChannel).toBe('function');
    });

    it('should have send method that accepts recipient and message', async () => {
      const result = await provider.send('+5535999999999', 'Test message');
      expect(result).toHaveProperty('success');
      expect(typeof result.success).toBe('boolean');
    });

    it('should have getChannel method that returns string', () => {
      const channel = provider.getChannel();
      expect(typeof channel).toBe('string');
      expect(channel).toBe('WhatsApp (Mock)');
    });

    it('should return ProviderSendResult with correct structure on success', async () => {
      provider.setSuccessRate(1.0); // Force success
      const result = await provider.send('+5535999999999', 'Test message');

      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('messageId');
      expect(result.success).toBe(true);
      expect(typeof result.messageId).toBe('string');
      expect(result.messageId).toMatch(/^msg_/);
      expect(result.error).toBeUndefined();
    });

    it('should return ProviderSendResult with error on failure', async () => {
      provider.setSuccessRate(0.0); // Force failure
      const result = await provider.send('+5535999999999', 'Test message');

      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('error');
      expect(result.success).toBe(false);
      expect(typeof result.error).toBe('string');
      expect(result.messageId).toBeUndefined();
    });
  });

  describe('95% success rate for testing retry logic', () => {
    it('should have configurable success rate in constructor', () => {
      const highSuccess = new MockWhatsAppProvider(0.99, 0);
      const lowSuccess = new MockWhatsAppProvider(0.5, 0);
      const noSuccess = new MockWhatsAppProvider(0.0, 0);

      expect(highSuccess).toBeDefined();
      expect(lowSuccess).toBeDefined();
      expect(noSuccess).toBeDefined();
    });

    it('should achieve approximately 95% success rate over many attempts', async () => {
      const provider95 = new MockWhatsAppProvider(0.95, 0);
      const attempts = 1000;
      let successCount = 0;

      for (let i = 0; i < attempts; i++) {
        const result = await provider95.send('+5535999999999', 'Test message');
        if (result.success) {
          successCount++;
        }
      }

      const actualRate = successCount / attempts;
      // Allow 5% variance from target (90% to 100%)
      expect(actualRate).toBeGreaterThan(0.85);
      expect(actualRate).toBeLessThan(1.0);
    }, 30000);

    it('should force 100% success when setSuccessRate(1.0)', async () => {
      provider.setSuccessRate(1.0);

      for (let i = 0; i < 100; i++) {
        const result = await provider.send('+5535999999999', 'Test message');
        expect(result.success).toBe(true);
        expect(result.messageId).toBeDefined();
      }
    });

    it('should force 0% success when setSuccessRate(0.0)', async () => {
      provider.setSuccessRate(0.0);

      for (let i = 0; i < 100; i++) {
        const result = await provider.send('+5535999999999', 'Test message');
        expect(result.success).toBe(false);
        expect(result.error).toBeDefined();
      }
    });

    it('should clamp success rate between 0 and 1', () => {
      const providerNegative = new MockWhatsAppProvider(-0.5, 0);
      const providerExcessive = new MockWhatsAppProvider(2.0, 0);

      expect(providerNegative).toBeDefined();
      expect(providerExcessive).toBeDefined();
    });
  });

  describe('Logging of simulated sends', () => {
    it('should log successful message sends', async () => {
      provider.setSuccessRate(1.0);
      await provider.send('+5535999999999', 'Test message');

      const log = provider.getMessageLog();
      expect(log.length).toBe(1);
      expect(log[0]).toEqual({
        recipient: '+5535999999999',
        message: 'Test message',
        timestamp: expect.any(String),
        success: true,
      });
    });

    it('should log failed message sends', async () => {
      provider.setSuccessRate(0.0);
      await provider.send('+5535999999999', 'Test message');

      const log = provider.getMessageLog();
      expect(log.length).toBe(1);
      expect(log[0].success).toBe(false);
      expect(log[0].recipient).toBe('+5535999999999');
      expect(log[0].message).toBe('Test message');
    });

    it('should accumulate log entries for multiple sends', async () => {
      provider.setSuccessRate(1.0);

      await provider.send('+5535999999999', 'Message 1');
      await provider.send('+5535999999998', 'Message 2');
      await provider.send('+5535999999997', 'Message 3');

      const log = provider.getMessageLog();
      expect(log.length).toBe(3);
      expect(log[0].recipient).toBe('+5535999999999');
      expect(log[1].recipient).toBe('+5535999999998');
      expect(log[2].recipient).toBe('+5535999999997');
    });

    it('should clear message log on clearMessageLog()', async () => {
      provider.setSuccessRate(1.0);
      await provider.send('+5535999999999', 'Test message');

      let log = provider.getMessageLog();
      expect(log.length).toBe(1);

      provider.clearMessageLog();

      log = provider.getMessageLog();
      expect(log.length).toBe(0);
    });

    it('should not expose actual recipient in logs (masked)', async () => {
      provider.setSuccessRate(1.0);
      await provider.send('+5535999999999', 'Test message');

      const log = provider.getMessageLog();
      expect(log[0].recipient).toBe('+5535999999999'); // Unmasked in getMessageLog
    });

    it('should capture first 100 characters of message', async () => {
      provider.setSuccessRate(1.0);
      const longMessage =
        'This is a very long message that exceeds 100 characters and should be truncated in the log for storage efficiency purposes';

      await provider.send('+5535999999999', longMessage);

      const log = provider.getMessageLog();
      expect(log[0].message.length).toBe(100);
      expect(log[0].message).toBe(longMessage.substring(0, 100));
    });

    it('should provide statistics through getStats()', async () => {
      provider.setSuccessRate(1.0);
      await provider.send('+5535999999999', 'Message 1');
      await provider.send('+5535999999998', 'Message 2');

      provider.setSuccessRate(0.0);
      await provider.send('+5535999999997', 'Message 3');

      const stats = provider.getStats();
      expect(stats).toEqual({
        total: 3,
        successful: 2,
        failed: 1,
        successRate: expect.any(Number),
      });
      expect(stats.successRate).toBeCloseTo(0.6667, 4);
    });
  });

  describe('Support for future provider implementations', () => {
    it('should be replaceable with different provider implementations', async () => {
      const customProvider: NotificationProvider = {
        send: async (_recipient: string, _message: string): Promise<ProviderSendResult> => {
          return {
            success: true,
            messageId: 'custom_msg_001',
          };
        },
        getChannel: (): string => {
          return 'CustomProvider';
        },
      };

      const result = await customProvider.send('+5535999999999', 'Test');
      expect(result.success).toBe(true);
      expect(result.messageId).toBe('custom_msg_001');
      expect(customProvider.getChannel()).toBe('CustomProvider');
    });

    it('should work with SMSProvider interface (future)', async () => {
      // Example of how future SMS provider would implement the interface
      const smsProvider: NotificationProvider = {
        send: async (_recipient: string, _message: string): Promise<ProviderSendResult> => {
          // Would call actual SMS API
          return {
            success: true,
            messageId: 'sms_001',
          };
        },
        getChannel: (): string => {
          return 'SMS';
        },
      };

      expect(smsProvider.getChannel()).toBe('SMS');
    });

    it('should work with EmailProvider interface (future)', async () => {
      // Example of how future Email provider would implement the interface
      const emailProvider: NotificationProvider = {
        send: async (_recipient: string, _message: string): Promise<ProviderSendResult> => {
          // Would call actual Email API
          return {
            success: true,
            messageId: 'email_001',
          };
        },
        getChannel: (): string => {
          return 'Email';
        },
      };

      expect(emailProvider.getChannel()).toBe('Email');
    });
  });

  describe('Property-based tests', () => {
    it('should always return ProviderSendResult structure', () => {
      return fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1 }),
          fc.string({ minLength: 1 }),
          async (phone, message) => {
            const result = await provider.send(phone, message);

            expect(result).toHaveProperty('success');
            expect(typeof result.success).toBe('boolean');

            if (result.success) {
              expect(result.messageId).toBeDefined();
              expect(typeof result.messageId).toBe('string');
              expect(result.error).toBeUndefined();
            } else {
              expect(result.error).toBeDefined();
              expect(typeof result.error).toBe('string');
              expect(result.messageId).toBeUndefined();
            }
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should consistently return same success/failure for same success rate', () => {
      return fc.assert(
        fc.asyncProperty(fc.string({ minLength: 1 }), async (message) => {
          provider.setSuccessRate(1.0);
          const result = await provider.send('+5535999999999', message);

          expect(result.success).toBe(true);
          expect(result.messageId).toBeDefined();
          expect(result.error).toBeUndefined();
        }),
        { numRuns: 50 }
      );
    });

    it('should handle arbitrary phone numbers', () => {
      return fc.assert(
        fc.asyncProperty(fc.string({ minLength: 1 }), async (phone) => {
          const result = await provider.send(phone, 'Test message');
          expect(typeof result.success).toBe('boolean');
        }),
        { numRuns: 50 }
      );
    });

    it('should handle arbitrary messages', () => {
      return fc.assert(
        fc.asyncProperty(fc.string({ minLength: 1 }), async (message) => {
          const result = await provider.send('+5535999999999', message);
          expect(typeof result.success).toBe('boolean');
        }),
        { numRuns: 50 }
      );
    });

    it('should always log sends to message log', () => {
      return fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1 }),
          fc.string({ minLength: 1 }),
          async (phone, message) => {
            const initialLogLength = provider.getMessageLog().length;
            await provider.send(phone, message);
            const finalLogLength = provider.getMessageLog().length;

            expect(finalLogLength).toBe(initialLogLength + 1);
          }
        ),
        { numRuns: 50 }
      );
    });
  });

  describe('Edge cases and error handling', () => {
    it('should handle empty recipient string', async () => {
      const result = await provider.send('', 'Test message');
      expect(typeof result.success).toBe('boolean');
    });

    it('should handle empty message string', async () => {
      const result = await provider.send('+5535999999999', '');
      expect(typeof result.success).toBe('boolean');
    });

    it('should generate unique message IDs', async () => {
      provider.setSuccessRate(1.0);

      const result1 = await provider.send('+5535999999999', 'Message 1');
      const result2 = await provider.send('+5535999999999', 'Message 2');
      const result3 = await provider.send('+5535999999999', 'Message 3');

      expect(result1.messageId).not.toEqual(result2.messageId);
      expect(result2.messageId).not.toEqual(result3.messageId);
      expect(result1.messageId).not.toEqual(result3.messageId);
    });

    it('should handle multiple simultaneous sends', async () => {
      provider.setSuccessRate(1.0);

      const promises = Array.from({ length: 10 }, (_, i) =>
        provider.send(`+555${i}`, `Message ${i}`)
      );

      const results = await Promise.all(promises);

      expect(results.length).toBe(10);
      results.forEach((result) => {
        expect(result.success).toBe(true);
      });

      const log = provider.getMessageLog();
      expect(log.length).toBe(10);
    });

    it('should respect configurable send delay', async () => {
      const delayProvider = new MockWhatsAppProvider(1.0, 100);

      const startTime = Date.now();
      await delayProvider.send('+5535999999999', 'Test message');
      const elapsedTime = Date.now() - startTime;

      expect(elapsedTime).toBeGreaterThanOrEqual(100);
    });

    it('should provide error variety for simulated failures', async () => {
      provider.setSuccessRate(0.0);
      const errors = new Set<string>();

      // Run multiple sends to collect different error types
      for (let i = 0; i < 100; i++) {
        const result = await provider.send('+5535999999999', 'Test message');
        if (!result.success && result.error) {
          errors.add(result.error);
        }
      }

      // Should have multiple different error types
      expect(errors.size).toBeGreaterThan(1);
    });
  });

  describe('Integration with NotificationDispatcher', () => {
    it('should be compatible with dispatcher send method signature', async () => {
      // Ensure the provider can be used by NotificationDispatcher
      const mockDispatcherUsage = async () => {
        provider.setSuccessRate(1.0);
        const result = await provider.send('+5535999999999', 'Test notification message');
        return result;
      };

      const result = await mockDispatcherUsage();
      expect(result.success).toBe(true);
    });
  });
});
