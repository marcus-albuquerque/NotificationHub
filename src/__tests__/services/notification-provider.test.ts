/**
 * NotificationHub - NotificationProvider Interface Tests
 *
 * Tests for the NotificationProvider interface and ProviderSendResult.
 * Validates that the interface is properly defined and extensible for future implementations.
 * Task 11 Acceptance Criteria:
 * - NotificationProvider interface defined with send() and getChannel() methods
 * - Support for future provider implementations
 */

import { NotificationProvider, ProviderSendResult } from '../../services/notification-provider';
import { MockWhatsAppProvider } from '../../services/mock-whatsapp-provider';

describe('NotificationProvider Interface', () => {
  describe('Interface Contract', () => {
    it('should have send method signature', () => {
      const provider: NotificationProvider = {
        send: async (_recipient: string, _message: string): Promise<ProviderSendResult> => ({
          success: true,
          messageId: 'test-001',
        }),
        getChannel: (): string => 'Test',
      };

      expect(typeof provider.send).toBe('function');
    });

    it('should have getChannel method signature', () => {
      const provider: NotificationProvider = {
        send: async (_recipient: string, _message: string): Promise<ProviderSendResult> => ({
          success: true,
          messageId: 'test-001',
        }),
        getChannel: (): string => 'Test',
      };

      expect(typeof provider.getChannel).toBe('function');
    });

    it('should accept recipient and message parameters', async () => {
      let recipientReceived = '';
      let messageReceived = '';
      const provider: NotificationProvider = {
        send: async (recipient: string, message: string): Promise<ProviderSendResult> => {
          recipientReceived = recipient;
          messageReceived = message;
          return { success: true, messageId: 'test-001' };
        },
        getChannel: (): string => 'Test',
      };

      await provider.send('+5535999999999', 'Test message');
      expect(recipientReceived).toBe('+5535999999999');
      expect(messageReceived).toBe('Test message');
    });

    it('should return Promise<ProviderSendResult> from send', async () => {
      const provider: NotificationProvider = {
        send: async (_recipient: string, _message: string): Promise<ProviderSendResult> => ({
          success: true,
          messageId: 'test-001',
        }),
        getChannel: (): string => 'Test',
      };

      const result = await provider.send('+5535999999999', 'Test message');
      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('messageId');
    });

    it('should return string from getChannel', () => {
      const provider: NotificationProvider = {
        send: async (_recipient: string, _message: string): Promise<ProviderSendResult> => ({
          success: true,
          messageId: 'test-001',
        }),
        getChannel: (): string => 'Test Channel',
      };

      const channel = provider.getChannel();
      expect(typeof channel).toBe('string');
      expect(channel).toBe('Test Channel');
    });
  });

  describe('ProviderSendResult Structure', () => {
    it('should have success property (boolean)', async () => {
      const successResult: ProviderSendResult = {
        success: true,
        messageId: 'msg-001',
      };

      expect(typeof successResult.success).toBe('boolean');
      expect(successResult.success).toBe(true);
    });

    it('should have messageId property on success (optional)', async () => {
      const successResult: ProviderSendResult = {
        success: true,
        messageId: 'msg-001',
      };

      expect(successResult).toHaveProperty('messageId');
      expect(typeof successResult.messageId).toBe('string');
    });

    it('should have error property on failure (optional)', async () => {
      const failureResult: ProviderSendResult = {
        success: false,
        error: 'Network timeout',
      };

      expect(failureResult).toHaveProperty('error');
      expect(typeof failureResult.error).toBe('string');
    });

    it('should not have both messageId and error on success', async () => {
      const provider: NotificationProvider = {
        send: async (): Promise<ProviderSendResult> => ({
          success: true,
          messageId: 'msg-001',
        }),
        getChannel: (): string => 'Test',
      };

      const result = await provider.send('+5535999999999', 'Test');
      expect(result.success).toBe(true);
      expect(result.messageId).toBeDefined();
      expect(result.error).toBeUndefined();
    });

    it('should not have both messageId and error on failure', async () => {
      const provider: NotificationProvider = {
        send: async (): Promise<ProviderSendResult> => ({
          success: false,
          error: 'Network error',
        }),
        getChannel: (): string => 'Test',
      };

      const result = await provider.send('+5535999999999', 'Test');
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.messageId).toBeUndefined();
    });
  });

  describe('Success Case', () => {
    it('should return success: true with messageId', async () => {
      const provider: NotificationProvider = {
        send: async (_recipient: string, _message: string): Promise<ProviderSendResult> => ({
          success: true,
          messageId: 'provider-msg-' + Date.now(),
        }),
        getChannel: (): string => 'SuccessProvider',
      };

      const result = await provider.send('+5535999999999', 'Test message');

      expect(result.success).toBe(true);
      expect(result.messageId).toMatch(/^provider-msg-\d+$/);
    });

    it('should include specific messageId from provider', async () => {
      const provider: NotificationProvider = {
        send: async (): Promise<ProviderSendResult> => ({
          success: true,
          messageId: 'whatsapp-msg-abc123',
        }),
        getChannel: (): string => 'WhatsApp',
      };

      const result = await provider.send('+5535999999999', 'Test');
      expect(result.messageId).toBe('whatsapp-msg-abc123');
    });

    it('should allow any string as messageId', async () => {
      const testIds = ['msg-001', 'sms_uuid_12345', 'email@id.abc', 'custom-format'];

      for (const testId of testIds) {
        const provider: NotificationProvider = {
          send: async (): Promise<ProviderSendResult> => ({
            success: true,
            messageId: testId,
          }),
          getChannel: (): string => 'Test',
        };

        const result = await provider.send('+5535999999999', 'Test');
        expect(result.messageId).toBe(testId);
      }
    });
  });

  describe('Failure Case', () => {
    it('should return success: false with error message', async () => {
      const provider: NotificationProvider = {
        send: async (): Promise<ProviderSendResult> => ({
          success: false,
          error: 'Invalid phone number',
        }),
        getChannel: (): string => 'FailureProvider',
      };

      const result = await provider.send('+invalid', 'Test message');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid phone number');
    });

    it('should include specific error from provider', async () => {
      const provider: NotificationProvider = {
        send: async (): Promise<ProviderSendResult> => ({
          success: false,
          error: 'Rate limit exceeded',
        }),
        getChannel: (): string => 'WhatsApp',
      };

      const result = await provider.send('+5535999999999', 'Test');
      expect(result.error).toBe('Rate limit exceeded');
    });

    it('should allow any string as error message', async () => {
      const testErrors = ['Network timeout', 'Provider unavailable', 'Authentication failed'];

      for (const testError of testErrors) {
        const provider: NotificationProvider = {
          send: async (): Promise<ProviderSendResult> => ({
            success: false,
            error: testError,
          }),
          getChannel: (): string => 'Test',
        };

        const result = await provider.send('+5535999999999', 'Test');
        expect(result.error).toBe(testError);
      }
    });
  });

  describe('Channel Identification', () => {
    it('should identify WhatsApp channel', () => {
      const provider: NotificationProvider = {
        send: async (): Promise<ProviderSendResult> => ({ success: true, messageId: 'msg-001' }),
        getChannel: (): string => 'WhatsApp',
      };

      expect(provider.getChannel()).toBe('WhatsApp');
    });

    it('should identify SMS channel', () => {
      const provider: NotificationProvider = {
        send: async (): Promise<ProviderSendResult> => ({ success: true, messageId: 'msg-001' }),
        getChannel: (): string => 'SMS',
      };

      expect(provider.getChannel()).toBe('SMS');
    });

    it('should identify Email channel', () => {
      const provider: NotificationProvider = {
        send: async (): Promise<ProviderSendResult> => ({ success: true, messageId: 'msg-001' }),
        getChannel: (): string => 'Email',
      };

      expect(provider.getChannel()).toBe('Email');
    });

    it('should allow custom channel names', () => {
      const customChannels = ['Custom SMS', 'Enterprise Email', 'Telegram', 'Slack'];

      for (const channelName of customChannels) {
        const provider: NotificationProvider = {
          send: async (): Promise<ProviderSendResult> => ({ success: true, messageId: 'msg-001' }),
          getChannel: (): string => channelName,
        };

        expect(provider.getChannel()).toBe(channelName);
      }
    });
  });

  describe('Multiple Provider Implementations', () => {
    it('should support MockWhatsApp implementation', async () => {
      const mockWhatsApp = new MockWhatsAppProvider(1.0, 0);

      expect(mockWhatsApp).toBeInstanceOf(MockWhatsAppProvider);
      expect(typeof mockWhatsApp.send).toBe('function');
      expect(typeof mockWhatsApp.getChannel).toBe('function');

      const result = await mockWhatsApp.send('+5535999999999', 'Test');
      expect(result.success).toBe(true);
      expect(result.messageId).toBeDefined();
    });

    it('should be able to switch providers', async () => {
      const provider1: NotificationProvider = {
        send: async (): Promise<ProviderSendResult> => ({ success: true, messageId: 'p1-msg' }),
        getChannel: (): string => 'Provider1',
      };

      const provider2: NotificationProvider = {
        send: async (): Promise<ProviderSendResult> => ({ success: true, messageId: 'p2-msg' }),
        getChannel: (): string => 'Provider2',
      };

      const result1 = await provider1.send('+5535999999999', 'Test');
      const result2 = await provider2.send('+5535999999999', 'Test');

      expect(result1.messageId).toBe('p1-msg');
      expect(result2.messageId).toBe('p2-msg');
    });

    it('should support SMS provider implementation', async () => {
      const smsProvider: NotificationProvider = {
        send: async (_recipient: string, _message: string): Promise<ProviderSendResult> => {
          // Simulate SMS send
          return {
            success: true,
            messageId: `sms_${Date.now()}`,
          };
        },
        getChannel: (): string => 'SMS',
      };

      const result = await smsProvider.send('+5535999999999', 'Test SMS');
      expect(result.success).toBe(true);
      expect(smsProvider.getChannel()).toBe('SMS');
    });

    it('should support Email provider implementation', async () => {
      const emailProvider: NotificationProvider = {
        send: async (_recipient: string, _message: string): Promise<ProviderSendResult> => {
          // Simulate Email send
          return {
            success: true,
            messageId: `email_${Date.now()}`,
          };
        },
        getChannel: (): string => 'Email',
      };

      const result = await emailProvider.send('user@example.com', 'Test Email');
      expect(result.success).toBe(true);
      expect(emailProvider.getChannel()).toBe('Email');
    });

    it('should support Slack provider implementation', async () => {
      const slackProvider: NotificationProvider = {
        send: async (_recipient: string, _message: string): Promise<ProviderSendResult> => {
          // Simulate Slack send
          return {
            success: true,
            messageId: `slack_${Date.now()}`,
          };
        },
        getChannel: (): string => 'Slack',
      };

      const result = await slackProvider.send('@user', 'Test Slack');
      expect(result.success).toBe(true);
      expect(slackProvider.getChannel()).toBe('Slack');
    });
  });

  describe('Extensibility for Future Providers', () => {
    it('should allow creating new provider types', () => {
      // Example of custom provider implementation
      class CustomProvider implements NotificationProvider {
        async send(_recipient: string, _message: string): Promise<ProviderSendResult> {
          // Custom implementation
          return { success: true, messageId: 'custom-msg-001' };
        }

        getChannel(): string {
          return 'Custom';
        }
      }

      const customProvider = new CustomProvider();
      expect(customProvider.getChannel()).toBe('Custom');
    });

    it('should support composition patterns', () => {
      const providers: NotificationProvider[] = [
        {
          send: async (): Promise<ProviderSendResult> => ({ success: true, messageId: 'msg-1' }),
          getChannel: (): string => 'WhatsApp',
        },
        {
          send: async (): Promise<ProviderSendResult> => ({ success: true, messageId: 'msg-2' }),
          getChannel: (): string => 'SMS',
        },
        {
          send: async (): Promise<ProviderSendResult> => ({ success: true, messageId: 'msg-3' }),
          getChannel: (): string => 'Email',
        },
      ];

      expect(providers.length).toBe(3);
      expect(providers.map((p) => p.getChannel())).toEqual(['WhatsApp', 'SMS', 'Email']);
    });

    it('should support provider selection strategies', async () => {
      const selectProviderByChannel = (
        providers: NotificationProvider[],
        channelName: string
      ): NotificationProvider | undefined => {
        return providers.find((p) => p.getChannel() === channelName);
      };

      const providers: NotificationProvider[] = [
        {
          send: async (): Promise<ProviderSendResult> => ({ success: true, messageId: 'msg-1' }),
          getChannel: (): string => 'WhatsApp',
        },
        {
          send: async (): Promise<ProviderSendResult> => ({ success: true, messageId: 'msg-2' }),
          getChannel: (): string => 'SMS',
        },
      ];

      const whatsappProvider = selectProviderByChannel(providers, 'WhatsApp');
      const smsProvider = selectProviderByChannel(providers, 'SMS');

      expect(whatsappProvider?.getChannel()).toBe('WhatsApp');
      expect(smsProvider?.getChannel()).toBe('SMS');
    });

    it('should support async initialization of providers', async () => {
      const createProviderAsync = async (): Promise<NotificationProvider> => {
        // Simulate async initialization
        await new Promise((resolve) => setTimeout(resolve, 10));

        return {
          send: async (): Promise<ProviderSendResult> => ({ success: true, messageId: 'msg-001' }),
          getChannel: (): string => 'AsyncProvider',
        };
      };

      const provider = await createProviderAsync();
      expect(provider.getChannel()).toBe('AsyncProvider');
    });
  });

  describe('Error Handling', () => {
    it('should handle provider errors gracefully', async () => {
      const errorProvider: NotificationProvider = {
        send: async (): Promise<ProviderSendResult> => ({
          success: false,
          error: 'Network connection failed',
        }),
        getChannel: (): string => 'ErrorProvider',
      };

      const result = await errorProvider.send('+5535999999999', 'Test');
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should support retry logic with provider interface', async () => {
      let attemptCount = 0;
      const retryableProvider: NotificationProvider = {
        send: async (): Promise<ProviderSendResult> => {
          attemptCount++;
          if (attemptCount < 3) {
            return { success: false, error: 'Temporary failure' };
          }
          return { success: true, messageId: 'msg-success' };
        },
        getChannel: (): string => 'RetryableProvider',
      };

      let result: ProviderSendResult | undefined;
      for (let i = 0; i < 3; i++) {
        result = await retryableProvider.send('+5535999999999', 'Test');
        if (result.success) {
          break;
        }
      }

      expect(result!.success).toBe(true);
      expect(attemptCount).toBe(3);
    });
  });
});
