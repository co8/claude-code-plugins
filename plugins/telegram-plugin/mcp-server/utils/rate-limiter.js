// Rate limiting for Telegram API

export class RateLimiter {
  constructor(maxPerMinute = 30) {
    this.maxPerMinute = maxPerMinute;
    this.calls = [];
  }

  async throttle() {
    const now = Date.now();
    // Remove calls older than 1 minute
    this.calls = this.calls.filter((t) => now - t < 60000);

    if (this.calls.length >= this.maxPerMinute) {
      // Wait until the oldest call is more than 1 minute old
      const waitTime = 60000 - (now - this.calls[0]);
      await new Promise((resolve) => setTimeout(resolve, waitTime + 100)); // Add 100ms buffer
    }

    this.calls.push(now);
  }
}
