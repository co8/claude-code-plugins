import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { RateLimiter } from '../utils/rate-limiter.js';

describe('RateLimiter', () => {
  let rateLimiter;

  beforeEach(() => {
    jest.useFakeTimers();
    rateLimiter = new RateLimiter(3); // 3 calls per minute for testing
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should initialize with default maxPerMinute', () => {
    const limiter = new RateLimiter();
    expect(limiter.maxPerMinute).toBe(30);
  });

  it('should initialize with custom maxPerMinute', () => {
    const limiter = new RateLimiter(10);
    expect(limiter.maxPerMinute).toBe(10);
  });

  it('should initialize with default burstSize', () => {
    const limiter = new RateLimiter();
    expect(limiter.burstSize).toBe(5);
  });

  it('should initialize with custom burstSize', () => {
    const limiter = new RateLimiter(30, 10);
    expect(limiter.maxPerMinute).toBe(30);
    expect(limiter.burstSize).toBe(10);
  });

  it('should allow calls under the limit', async () => {
    const start = Date.now();

    await rateLimiter.throttle();
    await rateLimiter.throttle();

    const elapsed = Date.now() - start;
    expect(elapsed).toBeLessThan(1000); // Should be fast
  });

  it('should track calls in the calls array', async () => {
    await rateLimiter.throttle();
    await rateLimiter.throttle();

    expect(rateLimiter.calls.length).toBe(2);
  });

  it('should remove calls older than 1 minute', async () => {
    await rateLimiter.throttle();

    // Advance time by 61 seconds
    jest.advanceTimersByTime(61000);

    await rateLimiter.throttle();

    // Old call should be removed
    expect(rateLimiter.calls.length).toBe(1);
  });

  it('should delay when limit is reached', async () => {
    // Fill up the rate limiter
    await rateLimiter.throttle();
    await rateLimiter.throttle();
    await rateLimiter.throttle();

    // This should trigger throttling
    const throttlePromise = rateLimiter.throttle();

    // Should not resolve immediately
    let resolved = false;
    throttlePromise.then(() => { resolved = true; });

    await Promise.resolve(); // Let promises settle
    expect(resolved).toBe(false);

    // Advance time to allow throttle to complete
    jest.advanceTimersByTime(60100);
    await throttlePromise;
    expect(resolved).toBe(true);
  });

  it('should calculate correct wait time', async () => {
    const now = Date.now();

    // Fill the limiter
    await rateLimiter.throttle();
    await rateLimiter.throttle();
    await rateLimiter.throttle();

    // Next call should wait for ~60 seconds (plus 100ms buffer)
    const throttlePromise = rateLimiter.throttle();

    jest.advanceTimersByTime(60100);
    await throttlePromise;

    // Should have at least 1 call remaining after cleanup
    // (old calls filtered out after 1 minute)
    expect(rateLimiter.calls.length).toBeGreaterThan(0);
  });

  it('should handle concurrent throttle calls', async () => {
    const promises = [
      rateLimiter.throttle(),
      rateLimiter.throttle(),
      rateLimiter.throttle(),
    ];

    await Promise.all(promises);
    expect(rateLimiter.calls.length).toBe(3);
  });

  it('should maintain proper call order', async () => {
    const calls = [];

    rateLimiter.throttle().then(() => calls.push(1));
    rateLimiter.throttle().then(() => calls.push(2));
    rateLimiter.throttle().then(() => calls.push(3));

    await jest.runAllTimersAsync();

    expect(calls).toEqual([1, 2, 3]);
  });

  describe('Burst protection', () => {
    let burstLimiter;

    beforeEach(() => {
      jest.useFakeTimers();
      burstLimiter = new RateLimiter(30, 3); // 30 per minute, burst of 3
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should track burst calls separately', async () => {
      await burstLimiter.throttle();
      await burstLimiter.throttle();

      expect(burstLimiter.burstCalls.length).toBe(2);
      expect(burstLimiter.calls.length).toBe(2);
    });

    it('should allow burst calls under burst limit', async () => {
      await burstLimiter.throttle();
      await burstLimiter.throttle();
      await burstLimiter.throttle();

      expect(burstLimiter.burstCalls.length).toBe(3);
    });

    it('should throttle when burst limit is reached', async () => {
      // Fill up the burst limit
      await burstLimiter.throttle();
      await burstLimiter.throttle();
      await burstLimiter.throttle();

      // This should trigger burst throttling
      const throttlePromise = burstLimiter.throttle();

      let resolved = false;
      throttlePromise.then(() => { resolved = true; });

      await Promise.resolve();
      expect(resolved).toBe(false);

      // Advance time to allow burst to reset
      jest.advanceTimersByTime(1010); // 1 second + buffer
      await throttlePromise;
      expect(resolved).toBe(true);
    });

    it('should clean burst calls older than 1 second', async () => {
      await burstLimiter.throttle();
      await burstLimiter.throttle();

      expect(burstLimiter.burstCalls.length).toBe(2);

      // Advance time by 1.1 seconds
      jest.advanceTimersByTime(1100);

      await burstLimiter.throttle();

      // Old burst calls should be cleaned, only new one remains
      expect(burstLimiter.burstCalls.length).toBe(1);
    });

    it('should allow bursts after burst window expires', async () => {
      // First burst
      await burstLimiter.throttle();
      await burstLimiter.throttle();
      await burstLimiter.throttle();

      expect(burstLimiter.burstCalls.length).toBe(3);

      // Wait for burst window to expire
      jest.advanceTimersByTime(1100);

      // Second burst should be allowed
      await burstLimiter.throttle();
      await burstLimiter.throttle();
      await burstLimiter.throttle();

      expect(burstLimiter.burstCalls.length).toBe(3);
    });

    it('should respect both burst and per-minute limits', async () => {
      const strictLimiter = new RateLimiter(5, 2); // 5 per minute, burst of 2

      // First burst
      await strictLimiter.throttle();
      await strictLimiter.throttle();

      // Wait for burst window
      jest.advanceTimersByTime(1100);

      // Second burst
      await strictLimiter.throttle();
      await strictLimiter.throttle();

      // Wait for burst window
      jest.advanceTimersByTime(1100);

      // Fifth call (last one allowed in the minute)
      await strictLimiter.throttle();

      expect(strictLimiter.calls.length).toBe(5);

      // Sixth call should trigger per-minute throttle
      const throttlePromise = strictLimiter.throttle();

      let resolved = false;
      throttlePromise.then(() => { resolved = true; });

      await Promise.resolve();
      expect(resolved).toBe(false);

      // Advance to minute boundary
      jest.advanceTimersByTime(60100);
      await throttlePromise;
      expect(resolved).toBe(true);
    });
  });

  describe('Security: Rate limiting configuration', () => {
    it('should enforce Telegram API safe default (20 msgs/min)', () => {
      const safeLimiter = new RateLimiter(20, 5);
      expect(safeLimiter.maxPerMinute).toBe(20);
      expect(safeLimiter.burstSize).toBe(5);
    });

    it('should prevent excessive burst with small burst size', () => {
      const limiter = new RateLimiter(30, 1); // Only 1 call per second
      expect(limiter.burstSize).toBe(1);
    });

    it('should handle large burst size for high-throughput scenarios', () => {
      const limiter = new RateLimiter(30, 10);
      expect(limiter.burstSize).toBe(10);
    });
  });
});
