#!/usr/bin/env node

/**
 * Test the actual fixed markdownToHTML function from telegram-bot.js
 */

import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Read and execute telegram-bot.js to get the markdownToHTML function
const botCode = fs.readFileSync(__dirname + '/telegram-bot.js', 'utf8');

// Extract just the markdownToHTML function
const functionMatch = botCode.match(/function markdownToHTML[\s\S]*?\n}\n/);
if (!functionMatch) {
  console.error('Could not extract markdownToHTML function');
  process.exit(1);
}

// Evaluate the function
const markdownToHTML = eval(`(${functionMatch[0]})`);

console.log('\n🧪 Testing ACTUAL Fixed markdownToHTML\n');
console.log('='.repeat(70));

const testCases = [
  {
    input: '*bold* text',
    expected: '<b>bold</b> text',
    description: 'Simple bold (single asterisk)'
  },
  {
    input: '**bold** text',
    expected: '<b>bold</b> text',
    description: 'Simple bold (double asterisk)'
  },
  {
    input: '_italic_ text',
    expected: '<i>italic</i> text',
    description: 'Simple italic'
  },
  {
    input: '`code` text',
    expected: '<code>code</code> text',
    description: 'Simple code'
  },
  {
    input: '**bold** and _italic_',
    expected: '<b>bold</b> and <i>italic</i>',
    description: 'Double asterisk bold and italic'
  },
  {
    input: '*bold* and _italic_',
    expected: '<b>bold</b> and <i>italic</i>',
    description: 'Single asterisk bold and italic'
  },
  {
    input: '**bold**, _italic_, and `code`',
    expected: '<b>bold</b>, <i>italic</i>, and <code>code</code>',
    description: 'All three formats (double asterisk)'
  },
  {
    input: '*bold*, _italic_, and `code`',
    expected: '<b>bold</b>, <i>italic</i>, and <code>code</code>',
    description: 'All three formats (single asterisk)'
  },
  {
    input: 'Special chars: <tag> & **bold**',
    expected: 'Special chars: &lt;tag&gt; &amp; <b>bold</b>',
    description: 'HTML escaping with double asterisk formatting'
  }
];

let passed = 0;
let failed = [];

testCases.forEach(({ input, expected, description }) => {
  const result = markdownToHTML(input, { preserveFormatting: true });
  const pass = result === expected;

  if (pass) {
    passed++;
    console.log(`✅ ${description}`);
  } else {
    failed.push({ input, expected, result, description });
    console.log(`❌ ${description}`);
    console.log(`   Input:    "${input}"`);
    console.log(`   Expected: "${expected}"`);
    console.log(`   Got:      "${result}"`);
  }
});

console.log(`\n${passed}/${testCases.length} tests passed`);

if (failed.length > 0) {
  console.log(`\n❌ Failed tests:`);
  failed.forEach(({ description }) => console.log(`   - ${description}`));
} else {
  console.log('\n✅ ALL TESTS PASSED!');
}

console.log('');
