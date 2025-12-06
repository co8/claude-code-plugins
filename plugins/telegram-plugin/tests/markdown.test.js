/**
 * Tests for Markdown escaping functionality
 * Tests escaping of special characters for Telegram's Markdown parser
 */

import { jest } from '@jest/globals';

// Telegram Markdown escape function
function escapeMarkdown(text) {
  if (typeof text !== 'string') {
    return text;
  }

  // Telegram MarkdownV2 special characters that need escaping
  const specialChars = ['_', '*', '[', ']', '(', ')', '~', '`', '>', '#', '+', '-', '=', '|', '{', '}', '.', '!'];

  let escaped = text;
  for (const char of specialChars) {
    const regex = new RegExp('\\' + char, 'g');
    escaped = escaped.replace(regex, '\\' + char);
  }

  return escaped;
}

describe('escapeMarkdown', () => {
  test('should escape underscores', () => {
    const input = 'This_has_underscores';
    const output = escapeMarkdown(input);
    expect(output).toBe('This\\_has\\_underscores');
  });

  test('should escape asterisks', () => {
    const input = 'This*has*asterisks';
    const output = escapeMarkdown(input);
    expect(output).toBe('This\\*has\\*asterisks');
  });

  test('should escape square brackets', () => {
    const input = '[Link text]';
    const output = escapeMarkdown(input);
    expect(output).toBe('\\[Link text\\]');
  });

  test('should escape parentheses', () => {
    const input = '(some text)';
    const output = escapeMarkdown(input);
    expect(output).toBe('\\(some text\\)');
  });

  test('should escape backticks', () => {
    const input = '`code block`';
    const output = escapeMarkdown(input);
    expect(output).toBe('\\`code block\\`');
  });

  test('should escape tildes', () => {
    const input = '~strikethrough~';
    const output = escapeMarkdown(input);
    expect(output).toBe('\\~strikethrough\\~');
  });

  test('should escape multiple special characters', () => {
    const input = 'Text with *bold*, _italic_, and [links](url)';
    const output = escapeMarkdown(input);
    expect(output).toContain('\\*');
    expect(output).toContain('\\_');
    expect(output).toContain('\\[');
    expect(output).toContain('\\]');
    expect(output).toContain('\\(');
    expect(output).toContain('\\)');
  });

  test('should leave plain text unchanged', () => {
    const input = 'This is plain text without special characters';
    const output = escapeMarkdown(input);
    expect(output).toBe('This is plain text without special characters');
  });

  test('should handle empty string', () => {
    const input = '';
    const output = escapeMarkdown(input);
    expect(output).toBe('');
  });

  test('should escape all MarkdownV2 special characters', () => {
    const input = '_*[]()~`>#+-=|{}.!';
    const output = escapeMarkdown(input);
    expect(output).toBe('\\_\\*\\[\\]\\(\\)\\~\\`\\>\\#\\+\\-\\=\\|\\{\\}\\.\\!');
  });

  test('should handle repeated special characters', () => {
    const input = '***Bold***';
    const output = escapeMarkdown(input);
    expect(output).toBe('\\*\\*\\*Bold\\*\\*\\*');
  });

  test('should escape dots', () => {
    const input = 'Version 1.0.0';
    const output = escapeMarkdown(input);
    expect(output).toBe('Version 1\\.0\\.0');
  });

  test('should escape exclamation marks', () => {
    const input = 'Important!';
    const output = escapeMarkdown(input);
    expect(output).toBe('Important\\!');
  });

  test('should escape hashes', () => {
    const input = '#hashtag';
    const output = escapeMarkdown(input);
    expect(output).toBe('\\#hashtag');
  });

  test('should escape plus and minus signs', () => {
    const input = '+1 and -1';
    const output = escapeMarkdown(input);
    expect(output).toBe('\\+1 and \\-1');
  });

  test('should escape equals signs', () => {
    const input = 'x = 5';
    const output = escapeMarkdown(input);
    expect(output).toBe('x \\= 5');
  });

  test('should escape pipes', () => {
    const input = 'Option A | Option B';
    const output = escapeMarkdown(input);
    expect(output).toBe('Option A \\| Option B');
  });

  test('should escape curly braces', () => {
    const input = '{key: value}';
    const output = escapeMarkdown(input);
    expect(output).toBe('\\{key: value\\}');
  });

  test('should handle non-string input', () => {
    expect(escapeMarkdown(null)).toBeNull();
    expect(escapeMarkdown(undefined)).toBeUndefined();
    expect(escapeMarkdown(123)).toBe(123);
  });

  test('should escape complex code snippets', () => {
    const input = 'function() { return x > 5; }';
    const output = escapeMarkdown(input);
    expect(output).toContain('\\{');
    expect(output).toContain('\\}');
    expect(output).toContain('\\(');
    expect(output).toContain('\\)');
    expect(output).toContain('\\>');
  });

  test('should escape URLs with special characters', () => {
    const input = 'https://example.com/path?query=value&foo=bar';
    const output = escapeMarkdown(input);
    expect(output).toContain('\\.');
    expect(output).toContain('\\=');
  });

  test('should preserve whitespace', () => {
    const input = 'Text   with   spaces';
    const output = escapeMarkdown(input);
    expect(output).toBe('Text   with   spaces');
  });

  test('should handle newlines', () => {
    const input = 'Line 1\nLine 2';
    const output = escapeMarkdown(input);
    expect(output).toBe('Line 1\nLine 2');
  });

  test('should escape greater than symbols', () => {
    const input = '> Quote';
    const output = escapeMarkdown(input);
    expect(output).toBe('\\> Quote');
  });

  test('should escape file paths', () => {
    const input = '/path/to/file.txt';
    const output = escapeMarkdown(input);
    expect(output).toBe('/path/to/file\\.txt');
  });
});
