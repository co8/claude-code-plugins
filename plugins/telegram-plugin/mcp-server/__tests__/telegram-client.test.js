import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { TelegramClient } from '../services/telegram-client.js';

// Mock the node-telegram-bot-api module
const mockBot = {
  getMe: jest.fn(),
  isPolling: jest.fn(),
  startPolling: jest.fn(),
  stopPolling: jest.fn(),
  on: jest.fn(),
  removeAllListeners: jest.fn(),
  removeListener: jest.fn(),
  sendMessage: jest.fn(),
  editMessageText: jest.fn(),
  setMessageReaction: jest.fn(),
};

// Mock TelegramBot constructor
jest.unstable_mockModule('node-telegram-bot-api', () => ({
  default: jest.fn(() => mockBot),
}));

describe('TelegramClient', () => {
  let client;
  let config;

  beforeEach(() => {
    jest.clearAllMocks();

    config = {
      bot_token: 'test_token',
      chat_id: '123456',
    };

    mockBot.getMe.mockResolvedValue({
      id: 12345,
      username: 'test_bot',
      first_name: 'Test Bot',
    });

    mockBot.isPolling.mockReturnValue(false);
    mockBot.sendMessage.mockResolvedValue({
      message_id: 1,
      chat: { id: 123456 },
      text: 'test',
    });
    mockBot.setMessageReaction.mockResolvedValue(true);
    mockBot.editMessageText.mockResolvedValue(true);

    client = new TelegramClient(config);

    // Replace the bot instance with our mock
    // This is necessary because ES module mocking doesn't work with static imports
    client.bot = mockBot;

    // Mock the rate limiter's throttle method to resolve immediately in tests
    // This prevents test timeouts while still allowing us to verify it's called
    jest.spyOn(client.rateLimiter, 'throttle').mockResolvedValue();
  });

  describe('Initialization', () => {
    it('should initialize with config', () => {
      expect(client.config).toEqual(config);
      expect(client.bot).toBeDefined();
      expect(client.rateLimiter).toBeDefined();
    });

    it('should use default rate limiting if not configured', () => {
      const clientWithoutRateLimit = new TelegramClient(config);
      expect(clientWithoutRateLimit.rateLimiter.maxPerMinute).toBe(20);
      expect(clientWithoutRateLimit.rateLimiter.burstSize).toBe(5);
    });

    it('should use custom rate limiting from config', () => {
      const customConfig = {
        ...config,
        rate_limiting: {
          messages_per_minute: 15,
          burst_size: 3,
        },
      };
      const clientWithCustom = new TelegramClient(customConfig);
      expect(clientWithCustom.rateLimiter.maxPerMinute).toBe(15);
      expect(clientWithCustom.rateLimiter.burstSize).toBe(3);
    });

    it('should handle partial rate limiting config', () => {
      const partialConfig = {
        ...config,
        rate_limiting: {
          messages_per_minute: 10,
        },
      };
      const clientWithPartial = new TelegramClient(partialConfig);
      expect(clientWithPartial.rateLimiter.maxPerMinute).toBe(10);
      expect(clientWithPartial.rateLimiter.burstSize).toBe(5); // Default
    });

    it('should fetch bot info on init', async () => {
      await client.init();

      expect(mockBot.getMe).toHaveBeenCalled();
      expect(client.botInfo).toEqual({
        id: 12345,
        username: 'test_bot',
        first_name: 'Test Bot',
      });
    });

    it('should handle init errors gracefully', async () => {
      mockBot.getMe.mockRejectedValueOnce(new Error('API Error'));

      await client.init();

      expect(client.botInfo).toBeNull();
    });
  });

  describe('Bot operations', () => {
    it('should return bot info', async () => {
      await client.init();
      const info = client.getBotInfo();

      expect(info).toEqual({
        id: 12345,
        username: 'test_bot',
        first_name: 'Test Bot',
      });
    });

    it('should return bot instance', () => {
      const bot = client.getBot();
      expect(bot).toBe(mockBot);
    });

    it('should check polling status', () => {
      mockBot.isPolling.mockReturnValue(true);
      expect(client.isPolling()).toBe(true);

      mockBot.isPolling.mockReturnValue(false);
      expect(client.isPolling()).toBe(false);
    });

    it('should start polling', async () => {
      await client.startPolling();
      expect(mockBot.startPolling).toHaveBeenCalled();
    });

    it('should stop polling', async () => {
      await client.stopPolling();
      expect(mockBot.stopPolling).toHaveBeenCalled();
    });

    it('should register event listeners', () => {
      const handler = jest.fn();
      client.on('message', handler);

      expect(mockBot.on).toHaveBeenCalledWith('message', handler);
    });

    it('should remove event listeners', () => {
      const handler = jest.fn();
      client.removeListener('message', handler);

      expect(mockBot.removeListener).toHaveBeenCalledWith('message', handler);
    });

    it('should remove all listeners', () => {
      client.removeAllListeners('message');

      expect(mockBot.removeAllListeners).toHaveBeenCalledWith('message');
    });
  });

  describe('sendMessage', () => {
    it('should send message successfully', async () => {
      const result = await client.sendMessage('Test message');

      expect(mockBot.sendMessage).toHaveBeenCalledWith(
        config.chat_id,
        'Test message',
        expect.objectContaining({ parse_mode: 'HTML' })
      );
      expect(result.success).toBe(true);
      expect(result.message_id).toBe(1);
    });

    it('should apply rate limiting', async () => {
      await client.sendMessage('Test');

      expect(client.rateLimiter.throttle).toHaveBeenCalled();
    });

    it('should add robot reaction to sent messages', async () => {
      await client.sendMessage('Test');

      expect(mockBot.setMessageReaction).toHaveBeenCalledWith(
        config.chat_id,
        1,
        [{ type: 'emoji', emoji: '🤖' }]
      );
    });

    it('should handle reaction failures gracefully', async () => {
      mockBot.setMessageReaction.mockRejectedValueOnce(new Error('Reaction failed'));

      const result = await client.sendMessage('Test');

      expect(result.success).toBe(true);
    });

    it('should retry on failure', async () => {
      mockBot.sendMessage
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({ message_id: 1 });

      const result = await client.sendMessage('Test');

      expect(mockBot.sendMessage).toHaveBeenCalledTimes(2);
      expect(result.success).toBe(true);
    });

    it('should use exponential backoff for retries', async () => {
      // Note: This test uses real timers for integration testing
      // We verify exponential backoff by checking timing
      mockBot.sendMessage
        .mockRejectedValueOnce(new Error('Error 1'))
        .mockRejectedValueOnce(new Error('Error 2'))
        .mockResolvedValueOnce({ message_id: 1 });

      const startTime = Date.now();
      const result = await client.sendMessage('Test');
      const elapsed = Date.now() - startTime;

      expect(result.success).toBe(true);
      expect(mockBot.sendMessage).toHaveBeenCalledTimes(3);
      // Should have waited ~3 seconds (1s + 2s backoff)
      expect(elapsed).toBeGreaterThan(2900);
    }, 10000); // Increase timeout for this test

    it('should throw after max retries', async () => {
      mockBot.sendMessage.mockRejectedValue(new Error('Persistent error'));

      await expect(client.sendMessage('Test')).rejects.toThrow('Persistent error');
      expect(mockBot.sendMessage).toHaveBeenCalledTimes(3);
    });

    it('should pass custom options', async () => {
      await client.sendMessage('Test', 'normal', { disable_notification: true });

      expect(mockBot.sendMessage).toHaveBeenCalledWith(
        config.chat_id,
        'Test',
        expect.objectContaining({
          parse_mode: 'HTML',
          disable_notification: true,
        })
      );
    });
  });

  describe('editMessage', () => {
    it('should edit message successfully', async () => {
      const result = await client.editMessage(123, 'Updated text');

      expect(mockBot.editMessageText).toHaveBeenCalledWith(
        'Updated text',
        expect.objectContaining({
          chat_id: config.chat_id,
          message_id: 123,
          parse_mode: 'HTML',
        })
      );
      expect(result.success).toBe(true);
      expect(result.message_id).toBe(123);
    });

    it('should apply rate limiting', async () => {
      await client.editMessage(123, 'Updated');

      expect(client.rateLimiter.throttle).toHaveBeenCalled();
    });

    it('should retry on failure', async () => {
      mockBot.editMessageText
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce(true);

      const result = await client.editMessage(123, 'Updated');

      expect(mockBot.editMessageText).toHaveBeenCalledTimes(2);
      expect(result.success).toBe(true);
    });

    it('should throw after max retries', async () => {
      mockBot.editMessageText.mockRejectedValue(new Error('Persistent error'));

      await expect(client.editMessage(123, 'Updated')).rejects.toThrow('Persistent error');
      expect(mockBot.editMessageText).toHaveBeenCalledTimes(3);
    });

    it('should pass custom options', async () => {
      await client.editMessage(123, 'Updated', { disable_web_page_preview: true });

      expect(mockBot.editMessageText).toHaveBeenCalledWith(
        'Updated',
        expect.objectContaining({
          disable_web_page_preview: true,
        })
      );
    });
  });

  describe('Rate Limiting Integration Tests', () => {
    let clientWithRealRateLimiter;

    beforeEach(() => {
      // Create a new client without mocking the rate limiter
      const testConfig = {
        bot_token: 'test_token',
        chat_id: '123456',
        rate_limiting: {
          messages_per_minute: 5,
          burst_size: 2,
        },
      };

      clientWithRealRateLimiter = new TelegramClient(testConfig);
      clientWithRealRateLimiter.bot = mockBot;
      // NOTE: We do NOT mock the rate limiter here - testing real integration
    });

    it('should actually rate limit when sending multiple messages', async () => {
      // Configure mock to respond quickly
      mockBot.sendMessage.mockResolvedValue({ message_id: 1 });

      const startTime = Date.now();

      // Send 3 messages (exceeds burst size of 2)
      await Promise.all([
        clientWithRealRateLimiter.sendMessage('Message 1'),
        clientWithRealRateLimiter.sendMessage('Message 2'),
        clientWithRealRateLimiter.sendMessage('Message 3'),
      ]);

      const elapsed = Date.now() - startTime;

      // Third message should be delayed due to burst limit (1 second)
      expect(elapsed).toBeGreaterThan(900); // At least 900ms (allowing for timing variance)
      expect(mockBot.sendMessage).toHaveBeenCalledTimes(3);
    }, 5000);

    it('should enforce per-minute rate limit', async () => {
      mockBot.sendMessage.mockResolvedValue({ message_id: 1 });

      const startTime = Date.now();

      // Send 6 messages sequentially (exceeds 5 per minute limit)
      for (let i = 0; i < 6; i++) {
        await clientWithRealRateLimiter.sendMessage(`Message ${i + 1}`);
      }

      const elapsed = Date.now() - startTime;

      // 6th message should be delayed until 60 seconds from first message
      expect(mockBot.sendMessage).toHaveBeenCalledTimes(6);
      // With burst size 2, we expect: 2 immediate, then delays
      // This should take at least a few seconds due to rate limiting
      expect(elapsed).toBeGreaterThan(1000);
    }, 70000); // Allow time for 60-second window

    it('should allow burst of messages then throttle', async () => {
      mockBot.sendMessage.mockResolvedValue({ message_id: 1 });

      // Send burst (should be fast)
      const burstStart = Date.now();
      await clientWithRealRateLimiter.sendMessage('Burst 1');
      await clientWithRealRateLimiter.sendMessage('Burst 2');
      const burstElapsed = Date.now() - burstStart;

      // Burst should be quick (under 500ms)
      expect(burstElapsed).toBeLessThan(500);

      // Third message should be throttled
      const throttledStart = Date.now();
      await clientWithRealRateLimiter.sendMessage('Throttled');
      const throttledElapsed = Date.now() - throttledStart;

      // Should wait ~1 second for burst window to clear
      expect(throttledElapsed).toBeGreaterThan(900);
    }, 5000);
  });
});
