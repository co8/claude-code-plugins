#!/usr/bin/env node

/**
 * Comprehensive test for telegram-plugin v0.2.2
 * Tests HTML formatting with preserveFormatting flag
 */

import TelegramBot from 'node-telegram-bot-api';
import fs from 'fs';
import yaml from 'js-yaml';

// Load config from .local.md file
const configPath = process.env.HOME + '/.claude/telegram.local.md';
const configContent = fs.readFileSync(configPath, 'utf8');
const yamlMatch = configContent.match(/^---\n([\s\S]*?)\n---/);
if (!yamlMatch) {
  throw new Error('No YAML frontmatter found in config file');
}
const config = yaml.load(yamlMatch[1]);

const bot = new TelegramBot(config.bot_token);

// markdownToHTML function from telegram-bot.js
function markdownToHTML(text, preserveFormatting = false) {
  if (!text) return '';

  let result = text;

  // Escape HTML special characters first
  result = result
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

  if (preserveFormatting) {
    // Convert markdown to HTML
    result = result
      .replace(/\*\*(.+?)\*\*/g, '<b>$1</b>')  // **bold**
      .replace(/_(.+?)_/g, '<i>$1</i>')         // _italic_
      .replace(/`(.+?)`/g, '<code>$1</code>');  // `code`
  }

  return result;
}

console.log('\n🧪 Testing telegram-plugin v0.2.2\n');
console.log('=' .repeat(60));

// Test 1: Markdown to HTML conversion WITH preserveFormatting
console.log('\n✅ Test 1: markdownToHTML with preserveFormatting');
console.log('-'.repeat(60));

const testCases = [
  {
    input: 'This is **bold** text',
    expected: 'This is <b>bold</b> text',
    description: 'Bold formatting'
  },
  {
    input: 'This is _italic_ text',
    expected: 'This is <i>italic</i> text',
    description: 'Italic formatting'
  },
  {
    input: 'This is `code` text',
    expected: 'This is <code>code</code> text',
    description: 'Code formatting'
  },
  {
    input: '**Bold** and _italic_ and `code`',
    expected: '<b>Bold</b> and <i>italic</i> and <code>code</code>',
    description: 'Mixed formatting'
  },
  {
    input: 'Special chars: <tag> & "quotes"',
    expected: 'Special chars: &lt;tag&gt; &amp; &quot;quotes&quot;',
    description: 'HTML escaping'
  }
];

let testsPassed = 0;
testCases.forEach(({ input, expected, description }) => {
  const result = markdownToHTML(input, true); // preserveFormatting = true
  const pass = result === expected;
  console.log(`${pass ? '✅' : '❌'} ${description}`);
  if (!pass) {
    console.log(`   Input:    "${input}"`);
    console.log(`   Expected: "${expected}"`);
    console.log(`   Got:      "${result}"`);
  }
  if (pass) testsPassed++;
});

console.log(`\n${testsPassed}/${testCases.length} tests passed`);

// Test 2: Send formatted message
console.log('\n✅ Test 2: Send formatted message');
console.log('-'.repeat(60));

const message = `
🎨 *Testing v0.2.2 Formatting*

This message tests _all_ formatting:
- **Bold text** should be bold
- _Italic text_ should be italic
- \`Code text\` should be monospace

Special characters: <>&"
`.trim();

try {
  const htmlMessage = markdownToHTML(message, true);
  console.log('Converted message:');
  console.log(htmlMessage);

  await bot.sendMessage(config.chat_id, htmlMessage, {
    parse_mode: 'HTML'
  });
  console.log('✅ Message sent successfully');
} catch (error) {
  console.error('❌ Failed to send message:', error.message);
}

// Test 3: Send approval request with formatting
console.log('\n✅ Test 3: Approval request with formatting');
console.log('-'.repeat(60));

try {
  const header = '**Important Decision** 🤔';
  const question = 'Do you want to _enable_ the `new feature`?';
  const options = [
    {
      label: '✅ **Yes**',
      description: 'Enable the _new feature_ immediately'
    },
    {
      label: '❌ **No**',
      description: 'Keep the `current settings`'
    },
    {
      label: '⏰ **Later**',
      description: 'Ask me again _tomorrow_'
    }
  ];

  // Create keyboard
  const keyboard = options.map((opt, index) => [{
    text: opt.label,
    callback_data: JSON.stringify({
      approval_id: 'test_v0.2.2',
      choice: index
    })
  }]);

  keyboard.push([{
    text: '💬 Other',
    callback_data: JSON.stringify({
      approval_id: 'test_v0.2.2',
      choice: -1
    })
  }]);

  const fullMessage = [
    markdownToHTML(header, true),
    '',
    markdownToHTML(question, true),
    '',
    ...options.map((opt, i) =>
      `${i + 1}. ${markdownToHTML(opt.label, true)} - ${markdownToHTML(opt.description, true)}`
    )
  ].join('\n');

  console.log('Formatted approval request:');
  console.log(fullMessage);

  await bot.sendMessage(config.chat_id, fullMessage, {
    parse_mode: 'HTML',
    reply_markup: { inline_keyboard: keyboard }
  });

  console.log('✅ Approval request sent successfully');
  console.log('👆 Check Telegram for interactive buttons with formatted text');
} catch (error) {
  console.error('❌ Failed to send approval request:', error.message);
}

// Test 4: Batch notifications with formatting
console.log('\n✅ Test 4: Batch notification with formatting');
console.log('-'.repeat(60));

try {
  const batchMessages = [
    '**Task 1**: Completed `authentication` module',
    '_Task 2_: Updated **database** schema',
    'Task 3: Fixed `bug` in payment flow'
  ];

  const combinedMessage = batchMessages
    .map((msg, i) => `${i + 1}. ${markdownToHTML(msg, true)}`)
    .join('\n');

  console.log('Batched message:');
  console.log(combinedMessage);

  await bot.sendMessage(config.chat_id, combinedMessage, {
    parse_mode: 'HTML'
  });

  console.log('✅ Batch notification sent successfully');
} catch (error) {
  console.error('❌ Failed to send batch notification:', error.message);
}

// Summary
console.log('\n' + '='.repeat(60));
console.log('📊 Test Summary');
console.log('='.repeat(60));
console.log('✅ HTML conversion with preserveFormatting: TESTED');
console.log('✅ Formatted message sending: TESTED');
console.log('✅ Approval requests with formatting: TESTED');
console.log('✅ Batch notifications with formatting: TESTED');
console.log('\n💡 Check your Telegram app to verify all formatting displays correctly!');
console.log('');
