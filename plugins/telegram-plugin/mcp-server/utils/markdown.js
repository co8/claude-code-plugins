// Convert Markdown to HTML and escape for Telegram

export function markdownToHTML(text, options = { preserveFormatting: false }) {
  if (typeof text !== "string") return "";

  // First, escape HTML special characters
  let result = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  if (options.preserveFormatting) {
    // Use placeholder approach to handle nested formatting correctly
    const placeholders = [];
    let placeholderIndex = 0;

    // Helper to create placeholder
    // Use a format that won't be matched by any markdown patterns
    // Avoiding *, _, `, ~, [, ], <, >, and other markdown special chars
    const createPlaceholder = (html) => {
      const id = `XXXPH${placeholderIndex++}XXX`;
      placeholders.push({ id, html });
      return id;
    };

    // Helper to restore placeholders
    const restorePlaceholders = (text) => {
      let restored = text;
      // Restore in reverse order to handle nested placeholders
      for (let i = placeholders.length - 1; i >= 0; i--) {
        restored = restored.replace(placeholders[i].id, placeholders[i].html);
      }
      return restored;
    };

    // 1. Protect code blocks first (they should not be processed further)
    result = result.replace(/```(\w+)?[\r\n]+([\s\S]*?)```/g, (match, lang, code) => {
      const html = lang
        ? `<pre><code class="language-${lang}">${code}</code></pre>`
        : `<pre><code>${code}</code></pre>`;
      return createPlaceholder(html);
    });

    // 2. Protect inline code
    result = result.replace(/`([^`]+?)`/g, (match, code) => {
      return createPlaceholder(`<code>${code}</code>`);
    });

    // 3. Protect links (process content inside links later)
    result = result.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (match, text, url) => {
      return createPlaceholder(`<a href="${url}">${text}</a>`);
    });

    // 4. Process formatting markers - simple approach, no nesting support
    // Process longer patterns first to avoid conflicts

    // Bold: **text** -> <b>text</b> (exclude *** patterns)
    result = result.replace(/\*\*([^*]+?)\*\*/g, "<b>$1</b>");

    // Underline: __text__ -> <u>text</u>
    result = result.replace(/__([^_]+?)__/g, "<u>$1</u>");

    // Strikethrough: ~~text~~ -> <s>text</s>
    result = result.replace(/~~([^~]+?)~~/g, "<s>$1</s>");

    // Italic: *text* or _text_ -> <i>text</i>
    result = result.replace(/\*([^*]+?)\*/g, "<i>$1</i>");
    result = result.replace(/_([^_]+?)_/g, "<i>$1</i>");

    // Blockquote: > text -> <blockquote>text</blockquote>
    result = result.replace(/^&gt;\s*(.+)$/gm, "<blockquote>$1</blockquote>");

    // Restore all placeholders
    result = restorePlaceholders(result);
  }

  return result;
}

// Legacy function name for compatibility
export function escapeMarkdown(text, options) {
  return markdownToHTML(text, options);
}
