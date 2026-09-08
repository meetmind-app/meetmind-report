'use strict';

const fs = require('fs');
const path = require('path');
const assert = require('assert');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const preloadSource = fs.readFileSync(path.join(root, 'report-v1.1-preload.js'), 'utf8');
const v11Source = fs.readFileSync(path.join(root, 'report-v1.1.js'), 'utf8');
const presentationSource = fs.readFileSync(path.join(root, 'report-v1.1-presentation.js'), 'utf8');
const indexSource = fs.readFileSync(path.join(root, 'index.html'), 'utf8');

assert.ok(indexSource.includes('report-v1.1-preload.js'), 'v1.1 preload gate is not wired.');
assert.ok(indexSource.includes('report-v1.1.js'), 'v1.1 consumer is not wired.');
assert.ok(indexSource.includes('report-v1.1-presentation.js'), 'v1.1 presentation layer is not wired.');
assert.ok(preloadSource.includes('/functions/v1/report?token='), 'Bootstrap gate must target only the initial report load.');

const sandbox = {
  console,
  currentLang: 'ru',
  currentMeeting: null,
  normalizeReport() {},
  parseOwner() {},
  renderMeta() {},
  renderMetrics() {},
  renderDynamicCards() {},
  renderArchitecture() {},
  buildReportJson() {},
  isEmptyValue(value) {
    return value == null || value === '' || (Array.isArray(value) && value.length === 0);
  },
  cleanText(value) { return String(value ?? '').trim(); },
  escapeHtml(value) { return String(value ?? ''); },
  t(key) { return key; },
  formatDate() { return ''; },
  durationLabel() { return ''; },
  $() {
    return {
      style: { setProperty() {} },
      classList: { add() {}, remove() {} },
      innerHTML: ''
    };
  },
  document: {
    querySelector() { return null; },
    querySelectorAll() { return []; }
  },
  matchMedia() { return { matches: false }; },
  __LOREVI_REPORT_V11_BOOTSTRAP__: { markReady() {} }
};
sandbox.window = sandbox;
sandbox.globalThis = sandbox;

vm.createContext(sandbox);
vm.runInContext(v11Source, sandbox, { filename: 'report-v1.1.js' });
vm.runInContext(presentationSource, sandbox, { filename: 'report-v1.1-presentation.js' });

const report = sandbox.normalizeReport({
  schema_version: '1.1',
  meeting_type: 'strategy',
  meeting_type_label: 'Стратегическая встреча',
  executive_brief: 'Краткое резюме',
  key_metrics: [{
    label: 'ARR',
    value: '8,4M → 10M',
    relation: 'current_to_target',
    current_value: '8,4M',
    target_value: '10M',
    target_period: 'Q4'
  }],
  risks: [{
    title: 'Платёжный контур',
    description: 'Нужен посредник.',
    impact: 'Рост комиссии',
    mitigation: 'Проверить альтернативы'
  }],
  architecture: {
    sections: [{
      title: 'Обработка',
      layout: 'process',
      items: [{ title: 'Normalize' }, { title: 'Generate' }]
    }]
  },
  owners: [{ name: 'Николай', responsibility: 'Принять решение' }],
  stats: { duration_seconds: 2700 }
});

assert.strictEqual(report.schema_version, '1.1');
assert.strictEqual(report.meeting_type_label, 'Стратегическая встреча');
assert.strictEqual(report.stats.duration_seconds, 2700);
assert.strictEqual(report.key_metrics[0].relation, 'current_to_target');
assert.strictEqual(report.risks[0].impact, 'Рост комиссии');
assert.strictEqual(sandbox.parseOwner(report.owners[0]).role, 'Принять решение');
assert.strictEqual(
  sandbox.LOREVIReportV11.metricDisplayValue(report.key_metrics[0]),
  '8,4M → 10M'
);

const componentsHtml = sandbox.renderArchitecture({
  sections: [{
    title: 'Каналы',
    layout: 'components',
    items: [{ title: 'Telegram', type: 'system' }, { title: 'Web', type: 'system' }]
  }]
});
assert.ok(!componentsHtml.includes('architecture-flow-arrow'), 'Components must not invent process arrows.');
assert.ok(!componentsHtml.includes('>system<'), 'Machine architecture item type must not leak into user-facing UI.');

const processHtml = sandbox.renderArchitecture({
  sections: [{
    title: 'Обработка',
    layout: 'process',
    items: [{ title: 'Normalize' }, { title: 'Generate' }]
  }]
});
assert.ok(processHtml.includes('architecture-flow-arrow'), 'Explicit process must render a connector.');
assert.ok(processHtml.includes('→'), 'LTR process must render a forward connector.');

sandbox.currentLang = 'ar';
const rtlHtml = sandbox.renderArchitecture({
  sections: [{
    title: 'المعالجة',
    layout: 'process',
    items: [{ title: 'A' }, { title: 'B' }]
  }]
});
assert.ok(rtlHtml.includes('←'), 'RTL process must reverse connector direction.');

assert.ok(
  !presentationSource.includes('relation.replace(/_/g'),
  'Machine metric relation must not be rendered as an untranslated label.'
);

console.log('Web Report v1.1 regression passed.');
