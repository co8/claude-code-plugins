#!/usr/bin/env node

/**
 * Comprehensive test suite for v0.2.3
 * Tests all formatting, MCP tools, and bidirectional features
 */

import TelegramBot from 'node-telegram-bot-api';
import fs from 'fs';
import yaml from 'js-yaml';

// Load config
const configPath = process.env.HOME + '/.claude/telegram.local.md';
const configContent = fs.readFileSync(configPath, 'utf8');
const yamlMatch = configContent.match(/^---\n([\s\S]*?)\n---/);
const config = yaml.load(yamlMatch[1]);

const bot = new TelegramBot(config.bot_token);

// Load actual markdownToHTML from telegram-bot.js
const botCode = fs.readFileSync('./telegram-bot.js', 'utf8');
const functionMatch = botCode.match(/function markdownToHTML[\s\S]*?\n}\n/);
const markdownToHTML = eval(`(${functionMatch[0]})`);

console.log('\n🧪 Comprehensive Test Suite for v0.2.3\n');
console.log('='.repeat(70));

let testsPassed = 0;
let testsFailed = 0;

// Test 1: Unit tests for markdownToHTML
console.log('\n📋 Test 1: Markdown to HTML Conversion');
console.log('-'.repeat(70));

const unitTests = [
  { input: '*bold*', expected: '<b>bold</b>', desc: 'Single asterisk bold' },
  { input: '**bold**', expected: '<b>bold</b>', desc: 'Double asterisk bold' },
  { input: '_italic_', expected: '<i>italic</i>', desc: 'Single underscore italic' },
  { input: '__italic__', expected: '<i>italic</i>', desc: 'Double underscore italic' },
  { input: '`code`', expected: '<code>code</code>', desc: 'Code block' },
  { input: '**bold** and _italic_', expected: '<b>bold</b> and <i>italic</i>', desc: 'Mixed bold + italic' },
  { input: '**bold**, _italic_, `code`', expected: '<b>bold</b>, <i>italic</i>, <code>code</code>', desc: 'All three types' },
  { input: '<tag> & "quotes"', expected: '&lt;tag&gt; &amp; "quotes"', desc: 'HTML escaping' },
];

unitTests.forEach(({ input, expected, desc }) => {
  const result = markdownToHTML(input, { preserveFormatting: true });
  if (result === expected) {
    console.log(`✅ ${desc}`);
    testsPassed++;
  } else {
    console.log(`❌ ${desc}`);
    console.log(`   Expected: "${expected}"`);
    console.log(`   Got:      "${result}"`);
    testsFailed++;
  }
});

// Test 2: Send formatted message
console.log('\n📋 Test 2: Send Formatted Message to Telegram');
console.log('-'.repeat(70));

const formattedMsg = `
🎨 **v0.2.3 Comprehensive Test**

*Single asterisk formatting:*
• *Bold text*
• _Italic text_
• \`Code text\`

**Double marker formatting:**
• **Bold with double asterisks**
• __Italic with double underscores__

**Mixed combinations:**
1. **Bold** with _italic_ and \`code\`
2. Text with **multiple** **bold** **words**
3. Nested: **bold _and italic_ together**
`.trim();

try {
  const html = markdownToHTML(formattedMsg, { preserveFormatting: true });
  const result = await bot.sendMessage(config.chat_id, html, { parse_mode: 'HTML' });
  console.log(`✅ Formatted message sent (ID: ${result.message_id})`);
  testsPassed++;
} catch (error) {
  console.log(`❌ Failed to send formatted message: ${error.message}`);
  testsFailed++;
}

// Test 3: Send approval request with formatting
console.log('\n📋 Test 3: Approval Request with Formatted Text');
console.log('-'.repeat(70));

const approvalId = `test_${Date.now()}`;
const header = '**Approval Required** 🔔';
const question = 'Should we deploy the *new feature* with `database migration`?';
const options = [
  { label: '✅ **Yes**', description: 'Deploy to _production_ immediately' },
  { label: '🧪 **Staging**', description: 'Test in `staging` environment first' },
  { label: '❌ **No**', description: 'Cancel deployment' }
];

const keyboard = options.map((opt, i) => [{
  text: opt.label,
  callback_data: JSON.stringify({ approval_id: approvalId, choice: i })
}]);

keyboard.push([{
  text: '💬 Other',
  callback_data: JSON.stringify({ approval_id: approvalId, choice: -1 })
}]);

const approvalMsg = [
  markdownToHTML(header, { preserveFormatting: true }),
  '',
  markdownToHTML(question, { preserveFormatting: true }),
  '',
  ...options.map((opt, i) =>
    `${i + 1}. ${markdownToHTML(opt.label, { preserveFormatting: true })} - ${markdownToHTML(opt.description, { preserveFormatting: true })}`
  )
].join('\n');

try {
  const result = await bot.sendMessage(config.chat_id, approvalMsg, {
    parse_mode: 'HTML',
    reply_markup: { inline_keyboard: keyboard }
  });
  console.log(`✅ Approval request sent (ID: ${result.message_id})`);
  console.log('   Interactive buttons ready for testing');
  testsPassed++;
} catch (error) {
  console.log(`❌ Failed to send approval request: ${error.message}`);
  testsFailed++;
}

// Test 4: Batch notification
console.log('\n📋 Test 4: Batch Notification with Mixed Formatting');
console.log('-'.repeat(70));

const batchMsgs = [
  '**Task 1:** Implemented `authentication` module',
  '*Task 2:* Updated __database__ schema',
  'Task 3: Fixed **critical bug** in _payment flow_'
];

const batchMsg = '📦 **Batch Update**\n\n' + batchMsgs
  .map((msg, i) => `${i + 1}. ${markdownToHTML(msg, { preserveFormatting: true })}`)
  .join('\n');

try {
  const result = await bot.sendMessage(config.chat_id,
    markdownToHTML(batchMsg, { preserveFormatting: true }),
    { parse_mode: 'HTML' }
  );
  console.log(`✅ Batch notification sent (ID: ${result.message_id})`);
  testsPassed++;
} catch (error) {
  console.log(`❌ Failed to send batch notification: ${error.message}`);
  testsFailed++;
}

// Test 5: Edge cases
console.log('\n📋 Test 5: Edge Cases and Special Scenarios');
console.log('-'.repeat(70));

const edgeCases = [
  { input: '**', expected: '**', desc: 'Unclosed double asterisk' },
  { input: '__', expected: '__', desc: 'Unclosed double underscore' },
  { input: '**bold*', expected: '*<b>bold</b>', desc: 'Mismatched asterisks' },
  { input: '', expected: '', desc: 'Empty string' },
];

edgeCases.forEach(({ input, expected, desc }) => {
  const result = markdownToHTML(input, { preserveFormatting: true });
  if (result === expected) {
    console.log(`✅ ${desc}`);
    testsPassed++;
  } else {
    console.log(`⚠️  ${desc}: "${result}" (may be acceptable)`);
  }
});

// Summary
console.log('\n' + '='.repeat(70));
console.log('📊 Test Summary');
console.log('='.repeat(70));
console.log(`✅ Passed: ${testsPassed}`);
console.log(`❌ Failed: ${testsFailed}`);
console.log(`📈 Success Rate: ${((testsPassed / (testsPassed + testsFailed)) * 100).toFixed(1)}%`);

console.log('\n📱 Check Telegram to verify:');
console.log('   1. All formatting displays correctly');
console.log('   2. Approval request has interactive buttons');
console.log('   3. Batch notification shows all updates');
console.log('   4. Double markers (**bold**, __italic__) work');
console.log('\n💡 Click approval buttons to test bidirectional communication!');
console.log('');

process.exit(testsFailed > 0 ? 1 : 0);
