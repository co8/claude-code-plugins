/**
 * Tests for MessageBatcher class
 * Tests message batching, prioritization, and auto-flush behavior
 */

import { jest } from '@jest/globals';

// MessageBatcher implementation for testing
class MessageBatcher {
  constructor(windowSeconds) {
    this.window = windowSeconds * 1000;
    this.pending = [];
    this.timer = null;
  }

  add(message, priority = 'normal') {
    this.pending.push({ message, priority, timestamp: Date.now() });

    // High priority messages send immediately
    if (priority === 'high') {
      this.flush();
      return;
    }

    // Otherwise, batch within window
    if (!this.timer) {
      this.timer = setTimeout(() => this.flush(), this.window);
    }
  }

  flush() {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }

    if (this.pending.length === 0) return null;

    // Combine similar messages
    const messages = this.pending.map(p => p.message);
    const combined = messages.join('\n\n---\n\n');

    this.pending = [];
    return combined;
  }
}

describe('MessageBatcher', () => {
  beforeEach(() => {
    jest.clearAllTimers();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test('should batch messages within the window', () => {
    const batcher = new MessageBatcher(30); // 30 second window

    batcher.add('Message 1');
    batcher.add('Message 2');
    batcher.add('Message 3');

    expect(batcher.pending).toHaveLength(3);

    // Flush manually
    const combined = batcher.flush();
    expect(combined).toBe('Message 1\n\n---\n\nMessage 2\n\n---\n\nMessage 3');
    expect(batcher.pending).toHaveLength(0);
  });

  test('should send high priority messages immediately', () => {
    const batcher = new MessageBatcher(30);

    batcher.add('Normal message 1');
    batcher.add('High priority message', 'high');

    // High priority should have triggered flush
    expect(batcher.pending).toHaveLength(0);
  });

  test('should auto-flush after window expires', () => {
    const batcher = new MessageBatcher(5); // 5 second window

    batcher.add('Message 1');
    batcher.add('Message 2');

    expect(batcher.pending).toHaveLength(2);

    // Fast-forward time by 5 seconds
    jest.advanceTimersByTime(5000);

    // Timer should have triggered flush
    expect(batcher.timer).toBeNull();
  });

  test('should combine multiple messages with separator', () => {
    const batcher = new MessageBatcher(30);

    batcher.add('First message');
    batcher.add('Second message');
    batcher.add('Third message');

    const combined = batcher.flush();
    expect(combined).toContain('---');
    expect(combined).toContain('First message');
    expect(combined).toContain('Second message');
    expect(combined).toContain('Third message');
  });

  test('should return null when flushing empty queue', () => {
    const batcher = new MessageBatcher(30);
    const result = batcher.flush();
    expect(result).toBeNull();
  });

  test('should clear pending messages after flush', () => {
    const batcher = new MessageBatcher(30);

    batcher.add('Message 1');
    batcher.add('Message 2');

    expect(batcher.pending).toHaveLength(2);

    batcher.flush();
    expect(batcher.pending).toHaveLength(0);
  });

  test('should set timer on first normal message', () => {
    const batcher = new MessageBatcher(30);

    expect(batcher.timer).toBeNull();

    batcher.add('Normal message');
    expect(batcher.timer).not.toBeNull();
  });

  test('should not set multiple timers for multiple messages', () => {
    const batcher = new MessageBatcher(30);

    batcher.add('Message 1');
    const firstTimer = batcher.timer;

    batcher.add('Message 2');
    const secondTimer = batcher.timer;

    expect(firstTimer).toBe(secondTimer);
  });

  test('should clear timer when flushing', () => {
    const batcher = new MessageBatcher(30);

    batcher.add('Message');
    expect(batcher.timer).not.toBeNull();

    batcher.flush();
    expect(batcher.timer).toBeNull();
  });

  test('should handle mixed priority messages', () => {
    const batcher = new MessageBatcher(30);

    batcher.add('Normal 1', 'normal');
    batcher.add('Normal 2', 'normal');

    expect(batcher.pending).toHaveLength(2);

    // Add high priority - should flush all pending
    batcher.add('High priority', 'high');

    expect(batcher.pending).toHaveLength(0);
  });

  test('should store message metadata correctly', () => {
    const batcher = new MessageBatcher(30);
    const beforeTime = Date.now();

    batcher.add('Test message', 'normal'); // Use normal priority so it doesn't auto-flush

    expect(batcher.pending[0]).toEqual(
      expect.objectContaining({
        message: 'Test message',
        priority: 'normal',
        timestamp: expect.any(Number)
      })
    );

    expect(batcher.pending[0].timestamp).toBeGreaterThanOrEqual(beforeTime);
  });

  test('should default to normal priority', () => {
    const batcher = new MessageBatcher(30);

    batcher.add('Message without priority');

    expect(batcher.pending[0].priority).toBe('normal');
  });

  test('should handle long batch window', () => {
    const batcher = new MessageBatcher(300); // 5 minutes

    batcher.add('Message');
    expect(batcher.window).toBe(300000); // milliseconds
  });

  test('should handle short batch window', () => {
    const batcher = new MessageBatcher(1); // 1 second

    batcher.add('Message');
    expect(batcher.window).toBe(1000);
  });

  test('should preserve message order', () => {
    const batcher = new MessageBatcher(30);

    batcher.add('First');
    batcher.add('Second');
    batcher.add('Third');

    const combined = batcher.flush();
    const index1 = combined.indexOf('First');
    const index2 = combined.indexOf('Second');
    const index3 = combined.indexOf('Third');

    expect(index1).toBeLessThan(index2);
    expect(index2).toBeLessThan(index3);
  });
});
