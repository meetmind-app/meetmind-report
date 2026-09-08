const fs = require('fs');
const vm = require('vm');
const assert = require('assert');

const source = fs.readFileSync('duration-v1.1.js', 'utf8');
const sandbox = { window: {}, MINUTE_SHORT: { en: 'min', ru: 'мин' }, currentLang: 'ru' };
vm.createContext(sandbox);
vm.runInContext(source, sandbox);

const label = sandbox.window.durationLabel;
assert.strictEqual(label(0), '');
assert.strictEqual(label(null), '');
assert.strictEqual(label(11), '1 мин');
assert.strictEqual(label(60), '1 мин');
assert.strictEqual(label(61), '2 мин');
assert.strictEqual(label(119), '2 мин');
assert.strictEqual(label(120), '2 мин');
assert.strictEqual(label(121), '3 мин');
console.log('duration-v1.1 contract: OK');
