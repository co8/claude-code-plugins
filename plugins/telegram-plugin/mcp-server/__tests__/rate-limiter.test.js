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

    // Should have 4 calls total
    expect(rateLimiter.calls.length).toBe(4);
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
});
