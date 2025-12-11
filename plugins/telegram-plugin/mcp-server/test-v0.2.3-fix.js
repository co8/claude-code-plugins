#!/usr/bin/env node

/**
 * Test v0.2.3 fix for double asterisk bold formatting
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

// Read actual markdownToHTML from telegram-bot.js
const botCode = fs.readFileSync('./telegram-bot.js', 'utf8');
const functionMatch = botCode.match(/function markdownToHTML[\s\S]*?\n}\n/);
const markdownToHTML = eval(`(${functionMatch[0]})`);

console.log('\n🚀 Testing v0.2.3 Double Asterisk Fix\n');
console.log('='.repeat(60));

// Test message with all formatting variations
const testMessage = `
📝 *v0.2.3 Formatting Test*

Single asterisk formatting:
• *This should be bold*
• _This should be italic_
• \`This should be code\`

Double asterisk formatting:
• **This should ALSO be bold**
• __This should be italic__ (not supported yet)

Mixed formatting:
• *Bold* and _italic_ and \`code\`
• **Bold** and _italic_ and \`code\`
• Text with **bold** in the **middle**
• *Multiple* *bold* *segments*

Special characters:
• <tag> should be escaped
• & should be escaped
• "quotes" should be escaped
`.trim();

console.log('Original message:');
console.log(testMessage);
console.log('\n' + '-'.repeat(60));

const htmlMessage = markdownToHTML(testMessage, { preserveFormatting: true });
console.log('\nConverted to HTML:');
console.log(htmlMessage);
console.log('\n' + '-'.repeat(60));

try {
  const result = await bot.sendMessage(config.chat_id, htmlMessage, {
    parse_mode: 'HTML'
  });

  console.log(`\n✅ Test message sent successfully!`);
  console.log(`   Message ID: ${result.message_id}`);
  console.log('\n📱 Check your Telegram app to verify:');
  console.log('   1. Single asterisk *bold* works');
  console.log('   2. Double asterisk **bold** works');
  console.log('   3. Mixed formatting displays correctly');
  console.log('   4. Special characters are escaped');
  console.log('');
} catch (error) {
  console.error(`\n❌ Failed to send message:`, error.message);
}
