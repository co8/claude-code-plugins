import { describe, it, expect } from '@jest/globals';
import { markdownToHTML, escapeMarkdown } from '../utils/markdown.js';

describe('Markdown to HTML Conversion', () => {
  describe('Basic HTML escaping', () => {
    it('should escape HTML special characters', () => {
      const input = '<script>alert("xss")</script>';
      const result = markdownToHTML(input);
      expect(result).toBe('&lt;script&gt;alert("xss")&lt;/script&gt;');
    });

    it('should escape ampersands', () => {
      const input = 'Tom & Jerry';
      const result = markdownToHTML(input);
      expect(result).toBe('Tom &amp; Jerry');
    });

    it('should handle empty string', () => {
      expect(markdownToHTML('')).toBe('');
    });

    it('should handle non-string input', () => {
      expect(markdownToHTML(null)).toBe('');
      expect(markdownToHTML(undefined)).toBe('');
      expect(markdownToHTML(123)).toBe('');
    });
  });

  describe('Markdown formatting with preserveFormatting', () => {
    it('should convert bold markdown to HTML', () => {
      const input = 'This is **bold** text';
      const result = markdownToHTML(input, { preserveFormatting: true });
      expect(result).toContain('<b>bold</b>');
    });

    it('should convert italic markdown to HTML', () => {
      const input = 'This is *italic* text';
      const result = markdownToHTML(input, { preserveFormatting: true });
      expect(result).toContain('<i>italic</i>');
    });

    it('should convert underline markdown to HTML', () => {
      const input = 'This is __underlined__ text';
      const result = markdownToHTML(input, { preserveFormatting: true });
      expect(result).toContain('<u>underlined</u>');
    });

    it('should convert strikethrough markdown to HTML', () => {
      const input = 'This is ~~strikethrough~~ text';
      const result = markdownToHTML(input, { preserveFormatting: true });
      expect(result).toContain('<s>strikethrough</s>');
    });

    it('should convert inline code to HTML', () => {
      const input = 'Use `console.log()` for debugging';
      const result = markdownToHTML(input, { preserveFormatting: true });
      expect(result).toContain('<code>console.log()</code>');
    });

    it('should convert code blocks to HTML', () => {
      const input = '```js\nconst x = 1;\n```';
      const result = markdownToHTML(input, { preserveFormatting: true });
      expect(result).toContain('<pre><code class="language-js">');
      expect(result).toContain('const x = 1;');
    });

    it('should convert links to HTML', () => {
      const input = '[Click here](https://example.com)';
      const result = markdownToHTML(input, { preserveFormatting: true });
      expect(result).toContain('<a href="https://example.com">Click here</a>');
    });

    it('should convert blockquotes to HTML', () => {
      const input = '> This is a quote';
      const result = markdownToHTML(input, { preserveFormatting: true });
      expect(result).toContain('<blockquote>This is a quote</blockquote>');
    });

    it('should handle mixed formatting', () => {
      const input = 'This is **bold** and *italic* text';
      const result = markdownToHTML(input, { preserveFormatting: true });
      expect(result).toContain('<b>bold</b>');
      expect(result).toContain('<i>italic</i>');
    });

    it('should protect code blocks from further processing', () => {
      const input = '```\n**not bold**\n```';
      const result = markdownToHTML(input, { preserveFormatting: true });
      expect(result).toContain('**not bold**');
      expect(result).not.toContain('<b>not bold</b>');
    });

    it('should handle HTML special chars in code blocks', () => {
      const input = '```\n<div>test</div>\n```';
      const result = markdownToHTML(input, { preserveFormatting: true });
      expect(result).toContain('&lt;div&gt;test&lt;/div&gt;');
    });
  });

  describe('Edge cases', () => {
    it('should handle nested formatting', () => {
      const input = '**bold with *italic* inside**';
      const result = markdownToHTML(input, { preserveFormatting: true });
      // Note: Current implementation doesn't support true nested formatting
      // This just checks it doesn't break
      expect(result).toBeDefined();
      expect(result.length).toBeGreaterThan(0);
    });

    it('should not break on empty code blocks', () => {
      const input = '``````';
      const result = markdownToHTML(input, { preserveFormatting: true });
      expect(result).toBeDefined();
    });

    it('should handle multiple links', () => {
      const input = '[Link 1](url1) and [Link 2](url2)';
      const result = markdownToHTML(input, { preserveFormatting: true });
      expect(result).toContain('<a href="url1">Link 1</a>');
      expect(result).toContain('<a href="url2">Link 2</a>');
    });
  });

  describe('escapeMarkdown legacy function', () => {
    it('should be available for backward compatibility', () => {
      expect(typeof escapeMarkdown).toBe('function');
    });

    it('should work same as markdownToHTML', () => {
      const input = 'Test **bold**';
      expect(escapeMarkdown(input, { preserveFormatting: true }))
        .toBe(markdownToHTML(input, { preserveFormatting: true }));
    });
  });
});
