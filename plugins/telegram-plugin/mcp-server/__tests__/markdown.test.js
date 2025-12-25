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

  describe('XSS Prevention - Security Tests', () => {
    it('should escape img tags with onerror', () => {
      const malicious = '<img src=x onerror="alert(1)">';
      const result = markdownToHTML(malicious);
      expect(result).toBe('&lt;img src=x onerror="alert(1)"&gt;');
      expect(result).not.toContain('<img');
    });

    it('should escape iframe tags', () => {
      const malicious = '<iframe src="javascript:alert(1)"></iframe>';
      const result = markdownToHTML(malicious);
      expect(result).toContain('&lt;iframe');
      expect(result).toContain('&lt;/iframe&gt;');
      expect(result).not.toContain('<iframe');
    });

    it('should escape HTML in markdown links', () => {
      const malicious = '[<script>alert(1)</script>](http://example.com)';
      const result = markdownToHTML(malicious, { preserveFormatting: true });
      expect(result).not.toContain('<script>');
      expect(result).toContain('&lt;script&gt;');
    });

    it('should escape HTML in bold text', () => {
      const malicious = '**<script>alert(1)</script>**';
      const result = markdownToHTML(malicious, { preserveFormatting: true });
      expect(result).toBe('<b>&lt;script&gt;alert(1)&lt;/script&gt;</b>');
      expect(result).not.toContain('<script>');
    });

    it('should handle nested HTML tags', () => {
      const malicious = '<div><script>alert(1)</script></div>';
      const result = markdownToHTML(malicious);
      expect(result).not.toContain('<div>');
      expect(result).not.toContain('<script>');
      expect(result).toContain('&lt;div&gt;');
      expect(result).toContain('&lt;script&gt;');
    });

    it('should escape HTML in inline code', () => {
      const code = 'Use `<script>` tag for JavaScript';
      const result = markdownToHTML(code, { preserveFormatting: true });
      expect(result).toContain('&lt;script&gt;');
      expect(result).not.toContain('<script>');
    });

    it('should handle data URIs in links', () => {
      const text = '[click](data:text/html,<script>alert(1)</script>)';
      const result = markdownToHTML(text, { preserveFormatting: true });
      expect(result).toContain('&lt;script&gt;');
      expect(result).not.toContain('<script>alert');
    });

    it('should handle malformed HTML tags', () => {
      const text = '<script src=//evil.com>';
      const result = markdownToHTML(text);
      expect(result).toBe('&lt;script src=//evil.com&gt;');
      expect(result).not.toContain('<script');
    });

    it('should handle double-encoded HTML', () => {
      const text = '&lt;script&gt;alert(1)&lt;/script&gt;';
      const result = markdownToHTML(text);
      expect(result).toContain('&amp;lt;');
    });

    it('should handle extremely nested HTML', () => {
      const text = '<div><div><div><script>alert(1)</script></div></div></div>';
      const result = markdownToHTML(text);
      expect(result).not.toContain('<script>');
      expect(result).toContain('&lt;');
      expect(result).toContain('&gt;');
    });

    it('should escape all angle brackets in comparisons', () => {
      const text = 'if (x < 5 && y > 10)';
      const result = markdownToHTML(text);
      expect(result).toBe('if (x &lt; 5 &amp;&amp; y &gt; 10)');
    });

    it('should handle Unicode and emoji', () => {
      const text = '**emoji** 😀 🎉';
      const result = markdownToHTML(text, { preserveFormatting: true });
      expect(result).toContain('😀');
      expect(result).toContain('🎉');
      expect(result).toContain('<b>emoji</b>');
    });

    it('should handle very long text without breaking', () => {
      const longText = 'a'.repeat(10000);
      const result = markdownToHTML(longText);
      expect(result).toBe(longText);
      expect(result.length).toBe(10000);
    });
  });
});
