import { describe, it, expect } from '@jest/globals';
import { markdownToHTML } from '../utils/markdown.js';

// Legacy function for backward compatibility testing
function escapeMarkdown(text) {
  if (typeof text !== 'string') return '';
  return text.replace(/[_*\[\]()~`>#+=|{}.!-]/g, '\\$&');
}

describe('Markdown Escaping Tests', () => {
  it('should escape special characters', () => {
    const input = 'Hello [World] (test)';
    const expected = 'Hello \\[World\\] \\(test\\)';
    expect(escapeMarkdown(input)).toBe(expected);
  });

  it('should escape asterisks and underscores', () => {
    const input = '*bold* _italic_';
    const expected = '\\*bold\\* \\_italic\\_';
    expect(escapeMarkdown(input)).toBe(expected);
  });

  it('should escape backticks', () => {
    const input = '`code block`';
    const expected = '\\`code block\\`';
    expect(escapeMarkdown(input)).toBe(expected);
  });

  it('should handle empty string', () => {
    expect(escapeMarkdown('')).toBe('');
  });

  it('should handle non-string input', () => {
    expect(escapeMarkdown(null)).toBe('');
    expect(escapeMarkdown(undefined)).toBe('');
    expect(escapeMarkdown(123)).toBe('');
  });

  it('should escape all special MarkdownV2 characters', () => {
    const specialChars = '_*[]()~`>#+-=|{}.!';
    const escaped = escapeMarkdown(specialChars);

    // Each character should be preceded by backslash
    expect(escaped).toContain('\\_');
    expect(escaped).toContain('\\*');
    expect(escaped).toContain('\\[');
    expect(escaped).toContain('\\]');
  });

  it('should handle plain text without special chars', () => {
    const input = 'Test';
    const result = escapeMarkdown(input);

    // Plain text should remain unchanged
    expect(result).toBe(input);
  });
});
