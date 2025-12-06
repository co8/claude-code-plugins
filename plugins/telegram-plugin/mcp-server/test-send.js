import TelegramBot from 'node-telegram-bot-api';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import yaml from 'js-yaml';

// Load config
const configPath = join(homedir(), '.claude', 'telegram.local.md');
const content = readFileSync(configPath, 'utf-8');
const yamlMatch = content.match(/^---\n([\s\S]*?)\n---/);
const config = yaml.load(yamlMatch[1]);

const bot = new TelegramBot(config.bot_token, { polling: false });

// Test message with escaped characters - with unescaped colon
const messageText = `🤔 *Test Approval*\n\nChoose one option\n\n_Options\\:_\n1\\. *Option A*: First choice\n2\\. *Option B*: Second choice`;

// Test with properly escaped colon
const messageText2 = `🤔 *Test Approval*\n\nChoose one option\n\n_Options\\:_\n1\\. *Option A*\\: First choice\n2\\. *Option B*\\: Second choice`;

console.log('Sending message:');
console.log(messageText);
console.log('\nWith parse_mode: MarkdownV2');

bot.sendMessage(config.chat_id, messageText, {
  parse_mode: 'MarkdownV2'
}).then(result => {
  console.log('\n✅ Success! Message ID:', result.message_id);
  process.exit(0);
}).catch(err => {
  console.error('\n❌ Error:', err.message);
  process.exit(1);
});
