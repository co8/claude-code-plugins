/**
 * Rate limiter with dual-window protection (per-minute and burst)
 * Prevents hitting Telegram API rate limits by enforcing both sustained and burst limits
 */
export class RateLimiter {
  /**
   * Creates a new rate limiter instance
   * @param {number} maxPerMinute - Maximum calls allowed per minute (default: 30)
   * @param {number} burstSize - Maximum calls allowed per second (default: 5)
   */
  constructor(maxPerMinute = 30, burstSize = 5) {
    this.maxPerMinute = maxPerMinute;
    this.burstSize = burstSize;
    this.calls = [];
    this.burstCalls = [];
  }

  /**
   * Throttles API calls by enforcing rate limits
   * Waits if necessary to comply with both per-minute and per-second limits
   * @returns {Promise<void>} Resolves when the call is allowed to proceed
   */
  async throttle() {
    const now = Date.now();

    // Remove calls older than 1 minute
    this.calls = this.calls.filter((t) => now - t < 60000);

    // Remove burst calls older than 1 second
    this.burstCalls = this.burstCalls.filter((t) => now - t < 1000);

    // Check burst protection (prevent too many calls in 1 second)
    if (this.burstCalls.length >= this.burstSize) {
      const waitTime = 1000 - (now - this.burstCalls[0]);
      await new Promise((resolve) => setTimeout(resolve, waitTime + 10)); // Add 10ms buffer

      // Re-clean after waiting
      const afterWait = Date.now();
      this.burstCalls = this.burstCalls.filter((t) => afterWait - t < 1000);
    }

    // Check rate limit (prevent too many calls per minute)
    if (this.calls.length >= this.maxPerMinute) {
      // Wait until the oldest call is more than 1 minute old
      const waitTime = 60000 - (now - this.calls[0]);
      await new Promise((resolve) => setTimeout(resolve, waitTime + 100)); // Add 100ms buffer

      // Re-clean after waiting
      const afterWait = Date.now();
      this.calls = this.calls.filter((t) => afterWait - t < 60000);
    }

    // Record the call
    this.calls.push(Date.now());
    this.burstCalls.push(Date.now());
  }
}
