import { describe, it, expect } from '@jest/globals';
import { formatDuration } from '../utils/formatting.js';

describe('formatDuration', () => {
  it('should format seconds only', () => {
    expect(formatDuration(1000)).toBe('1s');
    expect(formatDuration(30000)).toBe('30s');
    expect(formatDuration(59000)).toBe('59s');
  });

  it('should format minutes and seconds', () => {
    expect(formatDuration(60000)).toBe('1m 0s');
    expect(formatDuration(90000)).toBe('1m 30s');
    expect(formatDuration(3540000)).toBe('59m 0s');
  });

  it('should format hours, minutes, and seconds', () => {
    expect(formatDuration(3600000)).toBe('1h 0m');
    expect(formatDuration(3660000)).toBe('1h 1m');
    expect(formatDuration(5400000)).toBe('1h 30m');
    expect(formatDuration(86340000)).toBe('23h 59m');
  });

  it('should format days, hours, and minutes', () => {
    expect(formatDuration(86400000)).toBe('1d 0h 0m');
    expect(formatDuration(90000000)).toBe('1d 1h 0m');
    expect(formatDuration(93600000)).toBe('1d 2h 0m');
    expect(formatDuration(172800000)).toBe('2d 0h 0m');
  });

  it('should handle zero duration', () => {
    expect(formatDuration(0)).toBe('0s');
  });

  it('should handle milliseconds below 1 second', () => {
    expect(formatDuration(500)).toBe('0s');
    expect(formatDuration(999)).toBe('0s');
  });

  it('should format complex durations', () => {
    // 2 days, 5 hours, 30 minutes, 45 seconds
    const duration = (2 * 24 * 60 * 60 * 1000) +
                     (5 * 60 * 60 * 1000) +
                     (30 * 60 * 1000) +
                     (45 * 1000);
    expect(formatDuration(duration)).toBe('2d 5h 30m');
  });

  it('should handle very large durations', () => {
    const days30 = 30 * 24 * 60 * 60 * 1000;
    const result = formatDuration(days30);
    expect(result).toContain('30d');
  });

  it('should only show relevant units', () => {
    // 1 hour exactly (no minutes should be shown)
    expect(formatDuration(3600000)).toBe('1h 0m');

    // 1 day exactly
    expect(formatDuration(86400000)).toBe('1d 0h 0m');
  });

  it('should handle edge cases', () => {
    // Just under 1 minute
    expect(formatDuration(59999)).toBe('59s');

    // Just under 1 hour
    expect(formatDuration(3599000)).toBe('59m 59s');

    // Just under 1 day
    expect(formatDuration(86399000)).toBe('23h 59m');
  });

  it('should format typical AFK session durations', () => {
    // 30 minutes
    expect(formatDuration(30 * 60 * 1000)).toBe('30m 0s');

    // 2 hours
    expect(formatDuration(2 * 60 * 60 * 1000)).toBe('2h 0m');

    // 8 hours (work day)
    expect(formatDuration(8 * 60 * 60 * 1000)).toBe('8h 0m');
  });
});
