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
    jest.useFakeTimers();

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
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('Initialization', () => {
    it('should initialize with config', () => {
      expect(client.config).toEqual(config);
      expect(client.bot).toBeDefined();
      expect(client.rateLimiter).toBeDefined();
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
      const throttleSpy = jest.spyOn(client.rateLimiter, 'throttle');

      await client.sendMessage('Test');

      expect(throttleSpy).toHaveBeenCalled();
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
      mockBot.sendMessage
        .mockRejectedValueOnce(new Error('Error 1'))
        .mockRejectedValueOnce(new Error('Error 2'))
        .mockResolvedValueOnce({ message_id: 1 });

      const promise = client.sendMessage('Test');

      // First retry after 1s
      await jest.advanceTimersByTimeAsync(1000);
      // Second retry after 2s
      await jest.advanceTimersByTimeAsync(2000);

      const result = await promise;
      expect(result.success).toBe(true);
    });

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
      const throttleSpy = jest.spyOn(client.rateLimiter, 'throttle');

      await client.editMessage(123, 'Updated');

      expect(throttleSpy).toHaveBeenCalled();
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
});
