'use strict';

const fs = require('fs');
const path = require('path');
const assert = require('assert');
const { chromium } = require('playwright');

const fixturesDir = path.resolve(__dirname, 'fixtures');
const v11 = JSON.parse(fs.readFileSync(path.join(fixturesDir, 'RU_CONTRACT_V11_001.json'), 'utf8'));
const legacy = JSON.parse(fs.readFileSync(path.join(fixturesDir, 'RU_REAL_001.json'), 'utf8'));

function meetingFromReport(report, id, duration) {
  return {
    id,
    status: 'processed',
    created_at: '2026-09-07T10:00:00Z',
    duration_seconds: duration,
    report_language: 'ru',
    branding_visible: true,
    transcript: 'Тестовая расшифровка единого E2E corpus.',
    report
  };
}

async function renderCase(browser, report, id, duration) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1 });
  const payload = { success: true, language: 'ru', meeting: meetingFromReport(report, id, duration) };

  await page.addInitScript(fixture => {
    const nativeFetch = window.fetch.bind(window);
    window.fetch = async function fixtureFetch(input, init = {}) {
      const url = typeof input === 'string' ? input : String(input?.url || '');
      if (url.includes('/functions/v1/report?token=')) {
        return new Response(JSON.stringify(fixture), { status: 200, headers: { 'Content-Type': 'application/json' } });
      }
      if (url.includes('/functions/v1/analytics')) {
        return new Response(JSON.stringify({ success: true }), { status: 200, headers: { 'Content-Type': 'application/json' } });
      }
      return nativeFetch(input, init);
    };
  }, payload);

  const errors = [];
  page.on('pageerror', error => errors.push(String(error?.message || error)));
  await page.goto(`http://127.0.0.1:4173/index.html?token=${encodeURIComponent(id)}`, { waitUntil: 'networkidle' });
  await page.waitForFunction(() => !document.getElementById('reportPage').classList.contains('hidden'));

  const body = await page.locator('body').innerText();
  assert.ok(body.includes(report.title), `${id}: title was lost.`);
  assert.ok(body.includes(report.executive_brief), `${id}: executive brief was lost.`);
  assert.ok(body.includes(report.tasks[0].task), `${id}: task was lost.`);
  assert.ok(body.includes(report.tasks[0].due_date), `${id}: due date was lost.`);

  if (report.schema_version === '1.1') {
    assert.ok(body.includes(report.meeting_type_label), 'v1.1 meeting type label is not visible.');
    assert.ok(body.includes(report.key_metrics[0].value), 'v1.1 metric value is not visible.');
    assert.ok(body.includes(report.risks[0].impact), 'v1.1 risk impact is not visible.');
    assert.ok(body.includes(report.risks[0].mitigation), 'v1.1 risk mitigation is not visible.');
    await page.locator('#detailsToggle').click();
    await page.waitForFunction(() => !document.getElementById('detailsContent').classList.contains('hidden'));
    const details = await page.locator('#detailsContent').innerText();
    assert.ok(details.includes(report.owners[0].responsibility), 'v1.1 owner responsibility is not visible.');
    assert.ok(details.includes('Normalize'), 'v1.1 process start is not visible.');
    assert.ok(details.includes('Generate'), 'v1.1 process end is not visible.');
    assert.strictEqual(await page.locator('.architecture-section[data-layout="process"] .architecture-flow-arrow').count(), 1, 'v1.1 process connector is missing or duplicated.');
    assert.strictEqual(await page.locator('.architecture-section[data-layout="components"] .architecture-flow-arrow').count(), 0, 'v1.1 components must not receive directional arrows.');
  } else {
    assert.ok(body.includes('По кандидатуре обещан ответ в течение пары недель.'), 'Legacy summary tail was lost.');
    assert.ok(body.includes('в течение пары недель'), 'Legacy task due date was lost.');
    assert.ok(body.includes('150 млн ₽ GMV / 8 мес'), 'Legacy metric was lost.');
  }

  const actionable = errors.filter(message => !/404|Failed to load resource/i.test(message));
  assert.deepStrictEqual(actionable, [], `${id}: page errors: ${actionable.join(' | ')}`);
  await page.close();
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  await renderCase(browser, v11, 'e2e-v11', 2700);
  await renderCase(browser, legacy, 'e2e-v1', 3600);
  await browser.close();
  console.log('Web Report shared E2E contract corpus passed for v1.1 and legacy v1.');
})().catch(error => {
  console.error(error);
  process.exit(1);
});
