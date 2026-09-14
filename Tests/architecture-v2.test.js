'use strict';

const fs = require('fs');
const path = require('path');
const assert = require('assert');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'architecture-v2.js'), 'utf8');
const sandbox = { window: {} };
sandbox.window.window = sandbox.window;
vm.createContext(sandbox);
vm.runInContext(source, sandbox, { filename: 'architecture-v2.js' });

const architecture = sandbox.window.LOREVIArchitectureV2;
assert.ok(architecture, 'Architecture v2 did not initialize.');
assert.strictEqual(architecture.version, '2.0.0');

const normalized = architecture.normalize({
  evidence_id: 'meeting-42',
  mode: 'components',
  sections: [
    {
      title: 'Pipeline',
      mode: 'process',
      source: 'explicit transcript evidence',
      items: [{ id: 'a', title: 'Capture' }, { id: 'b', title: 'Publish' }]
    },
    {
      title: 'Channels',
      layout: 'components',
      items: [{ title: 'Web', type: 'system' }]
    }
  ]
});
assert.strictEqual(normalized.evidence_id, 'meeting-42', 'Unknown root contract fields must be preserved.');
assert.strictEqual(normalized.mode, 'components');
assert.strictEqual(normalized.sections[0].mode, 'process');
assert.strictEqual(normalized.sections[0].layout, 'process');
assert.strictEqual(normalized.sections[0].source, 'explicit transcript evidence');
assert.strictEqual(normalized.sections[1].mode, 'components');

const legacy = architecture.normalize([
  { title: 'Legacy flow', layout: 'workflow', items: [{ title: 'A' }, { title: 'B' }] },
  { title: 'Legacy blocks', items: [{ title: 'X' }] }
]);
assert.strictEqual(legacy.sections[0].mode, 'process', 'Legacy process aliases must normalize to process.');
assert.strictEqual(legacy.sections[1].mode, 'components', 'Unclassified legacy data must not invent a process.');

const processHtml = architecture.render({
  mode: 'process',
  sections: [{ title: 'Flow', items: [{ title: 'A' }, { title: 'B' }, { title: 'C' }] }]
}, { language: 'en' });
assert.strictEqual((processHtml.match(/class="architecture-connector"/g) || []).length, 2);
assert.ok(processHtml.includes('data-flow-axis="horizontal"'));
assert.ok(processHtml.includes('data-direction="ltr"'));
assert.ok(!/[→←]/.test(processHtml), 'Connectors must be drawn by CSS, not language-dependent text glyphs.');

const componentsHtml = architecture.render({
  mode: 'components',
  sections: [{ title: 'System', items: [{ title: 'API', type: 'service' }, { title: 'DB' }] }]
});
assert.ok(!componentsHtml.includes('architecture-connector'), 'Components must never receive directional connectors.');
assert.ok(!componentsHtml.includes('>service<'), 'Machine item types must not leak into visible copy.');
assert.ok(componentsHtml.includes('data-item-type="service"'), 'Machine item types must remain available to the contract.');

const longRtlHtml = architecture.render({
  mode: 'process',
  sections: [{ title: 'فرآیند', items: Array.from({ length: 6 }, (_, index) => ({ title: `مرحله ${index + 1}` })) }]
}, { language: 'fa-IR' });
assert.ok(longRtlHtml.includes('data-flow-axis="vertical"'), 'Long processes must reflow instead of overflowing horizontally.');
assert.ok(longRtlHtml.includes('data-direction="rtl"'));
assert.strictEqual((longRtlHtml.match(/class="architecture-connector"/g) || []).length, 5);

assert.strictEqual(architecture.render({ sections: [] }), '', 'Empty architecture must render nothing.');
assert.ok(
  architecture.render({ sections: [{ title: '<unsafe>', items: [{ title: 'A & B' }] }] }).includes('&lt;unsafe&gt;'),
  'Architecture copy must be HTML escaped.'
);

console.log('Architecture & Process v2 contract passed.');
