function escapeMarkdown(text) {
  if (typeof text !== 'string') return '';

  // Escape special Markdown characters for Telegram MarkdownV2
  // Need to escape: _ * [ ] ( ) ~ ` > # + - = | { } . !
  return text.replace(/[_*\[\]()~`>#+=|{}.!-]/g, '\\$&');
}

const options = [
  {label: 'Option A', description: 'First choice'},
  {label: 'Option B', description: 'Second choice'}
];

const question = 'Choose one option';
const header = 'Test Approval';

const escapedQuestion = escapeMarkdown(question);
const escapedHeader = escapeMarkdown(header);
const escapedOptions = options.map((o, i) =>
  `${i + 1}. *${escapeMarkdown(o.label)}*: ${escapeMarkdown(o.description)}`
).join('\n');

const messageText = `🤔 *${escapedHeader}*\n\n${escapedQuestion}\n\n_Options:_\n${escapedOptions}`;

console.log('Message text:');
console.log(messageText);
console.log('\n\nEscaped values:');
console.log('Header:', escapedHeader);
console.log('Question:', escapedQuestion);
console.log('Options:', escapedOptions);

// Test the regex directly
console.log('\n\nRegex test:');
const testString = 'Test. with special! chars-';
console.log('Input:', testString);
console.log('Output:', testString.replace(/[_*\[\]()~`>#+=|{}.!-]/g, '\\$&'));

// Test individual characters
console.log('\n\nIndividual character tests:');
console.log('.', '->', '.'.replace(/[_*\[\]()~`>#+=|{}.!-]/g, '\\$&'));
console.log('!', '->', '!'.replace(/[_*\[\]()~`>#+=|{}.!-]/g, '\\$&'));
console.log('-', '->', '-'.replace(/[_*\[\]()~`>#+=|{}.!-]/g, '\\$&'));
console.log('(', '->', '('.replace(/[_*\[\]()~`>#+=|{}.!-]/g, '\\$&'));

// Test with numbers and periods (like "1. Option")
console.log('\n\nNumber with period test:');
const optionFormat = '1. *Option A*: First choice';
console.log('Input:', optionFormat);
console.log('Output:', optionFormat.replace(/[_*\[\]()~`>#+=|{}.!-]/g, '\\$&'));

// Test the actual message format for Telegram
console.log('\n\nFull message test (MarkdownV2):');
const msgTest = `🤔 *Test Approval*\n\nChoose one option\n\n_Options:_\n1\\. *Option A*: First choice\n2\\. *Option B*: Second choice`;
console.log(msgTest);
