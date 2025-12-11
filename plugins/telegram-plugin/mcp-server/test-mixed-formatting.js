#!/usr/bin/env node

/**
 * Test mixed formatting edge cases
 * Identify which patterns fail
 */

// Current implementation from telegram-bot.js
function markdownToHTML_current(text, options = { preserveFormatting: false }) {
  if (typeof text !== "string") return "";

  let result = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  if (options.preserveFormatting) {
    result = result.replace(/\*([^*]+)\*/g, "<b>$1</b>");  // *bold*
    result = result.replace(/_([^_]+)_/g, "<i>$1</i>");     // _italic_
    result = result.replace(/`([^`]+)`/g, "<code>$1</code>"); // `code`
  }

  return result;
}

// Improved implementation that handles nested patterns
function markdownToHTML_improved(text, options = { preserveFormatting: false }) {
  if (typeof text !== "string") return "";

  let result = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  if (options.preserveFormatting) {
    // Process in order: code first (to protect from other replacements), then bold, then italic
    result = result.replace(/`([^`]+)`/g, "<code>$1</code>");  // `code`
    result = result.replace(/\*\*(.+?)\*\*/g, "<b>$1</b>");     // **bold** (double asterisk)
    result = result.replace(/\*(.+?)\*/g, "<b>$1</b>");          // *bold* (single asterisk)
    result = result.replace(/_(.+?)_/g, "<i>$1</i>");            // _italic_
  }

  return result;
}

console.log('\n🧪 Testing Mixed Formatting Edge Cases\n');
console.log('='.repeat(70));

const testCases = [
  {
    input: '*bold* text',
    expected: '<b>bold</b> text',
    description: 'Simple bold'
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
    input: '*bold* and _italic_',
    expected: '<b>bold</b> and <i>italic</i>',
    description: 'Bold and italic together'
  },
  {
    input: '*bold* and `code`',
    expected: '<b>bold</b> and <code>code</code>',
    description: 'Bold and code together'
  },
  {
    input: '_italic_ and `code`',
    expected: '<i>italic</i> and <code>code</code>',
    description: 'Italic and code together'
  },
  {
    input: '*bold*, _italic_, and `code`',
    expected: '<b>bold</b>, <i>italic</i>, and <code>code</code>',
    description: 'All three formats together'
  },
  {
    input: '**double asterisk bold**',
    expected: '<b>double asterisk bold</b>',
    description: 'Double asterisk bold'
  },
  {
    input: '*multiple* *bold* *words*',
    expected: '<b>multiple</b> <b>bold</b> <b>words</b>',
    description: 'Multiple bold segments'
  },
  {
    input: 'Text with *bold* in the middle',
    expected: 'Text with <b>bold</b> in the middle',
    description: 'Bold in middle of text'
  },
  {
    input: '*start bold*, middle, _end italic_',
    expected: '<b>start bold</b>, middle, <i>end italic</i>',
    description: 'Format at start and end'
  },
  {
    input: 'Special chars: <tag> & *bold*',
    expected: 'Special chars: &lt;tag&gt; &amp; <b>bold</b>',
    description: 'HTML escaping with formatting'
  }
];

console.log('\n📋 Testing CURRENT Implementation');
console.log('-'.repeat(70));

let currentPassed = 0;
let currentFailed = [];

testCases.forEach(({ input, expected, description }) => {
  const result = markdownToHTML_current(input, { preserveFormatting: true });
  const pass = result === expected;

  if (pass) {
    currentPassed++;
    console.log(`✅ ${description}`);
  } else {
    currentFailed.push({ input, expected, result, description });
    console.log(`❌ ${description}`);
    console.log(`   Input:    "${input}"`);
    console.log(`   Expected: "${expected}"`);
    console.log(`   Got:      "${result}"`);
  }
});

console.log(`\nCurrent: ${currentPassed}/${testCases.length} passed`);

console.log('\n📋 Testing IMPROVED Implementation');
console.log('-'.repeat(70));

let improvedPassed = 0;
let improvedFailed = [];

testCases.forEach(({ input, expected, description }) => {
  const result = markdownToHTML_improved(input, { preserveFormatting: true });
  const pass = result === expected;

  if (pass) {
    improvedPassed++;
    console.log(`✅ ${description}`);
  } else {
    improvedFailed.push({ input, expected, result, description });
    console.log(`❌ ${description}`);
    console.log(`   Input:    "${input}"`);
    console.log(`   Expected: "${expected}"`);
    console.log(`   Got:      "${result}"`);
  }
});

console.log(`\nImproved: ${improvedPassed}/${testCases.length} passed`);

// Summary
console.log('\n' + '='.repeat(70));
console.log('📊 Summary');
console.log('='.repeat(70));
console.log(`Current implementation:  ${currentPassed}/${testCases.length} tests passed`);
console.log(`Improved implementation: ${improvedPassed}/${testCases.length} tests passed`);

if (currentFailed.length > 0) {
  console.log(`\n❌ Current implementation failed on:`);
  currentFailed.forEach(({ description }) => console.log(`   - ${description}`));
}

if (improvedFailed.length > 0) {
  console.log(`\n❌ Improved implementation failed on:`);
  improvedFailed.forEach(({ description }) => console.log(`   - ${description}`));
}

console.log('');
