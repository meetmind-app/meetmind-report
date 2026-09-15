'use strict';

const fs = require('fs');
const path = require('path');
const assert = require('assert');
const { chromium } = require('playwright');

const fixture = JSON.parse(fs.readFileSync(
  path.resolve(__dirname, 'fixtures', 'RU_CONTRACT_V11_001.json'),
  'utf8'
));

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1100 } });
  await page.addInitScript(report => {
    window.__savedReport = null;
    const payload = {
      success: true,
      language: 'ru',
      meeting: {
        id: 'edit-v2',
        status: 'processed',
        created_at: '2026-09-15T10:00:00Z',
        duration_seconds: 2700,
        report_language: 'ru',
        branding_visible: true,
        transcript: '',
        report
      }
    };
    window.fetch = async function mockFetch(input, init = {}) {
      const url = typeof input === 'string' ? input : String(input?.url || '');
      if (url.includes('/functions/v1/report?token=')) {
        return new Response(JSON.stringify(payload), { status: 200, headers: { 'Content-Type': 'application/json' } });
      }
      if (url.includes('/functions/v1/report-save')) {
        window.__savedReport = JSON.parse(init.body).report;
        return new Response(JSON.stringify({ success: true }), { status: 200, headers: { 'Content-Type': 'application/json' } });
      }
      return new Response(JSON.stringify({ success: true }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    };
  }, fixture);

  const errors = [];
  page.on('pageerror', error => errors.push(String(error?.message || error)));
  await page.goto('http://127.0.0.1:4173/index.html?token=edit-v2', { waitUntil: 'networkidle' });
  await page.waitForFunction(() => !document.getElementById('reportPage').classList.contains('hidden'));
  await page.locator('#editReportBtn').click();

  assert.strictEqual(await page.locator('body.edit-mode').count(), 1, 'Edit mode did not start.');
  assert.ok(await page.locator('.edit-v2-remove').count() >= 8, 'Existing repeatable items lack remove controls.');
  assert.strictEqual(await page.locator('#editV2BlockPicker').count(), 1, 'Add-block picker is missing.');

  await page.locator('.metric-card').first().locator('.edit-v2-remove').click();
  await page.locator('#metricsSection > h2 .edit-v2-add').click();
  const lastMetric = page.locator('.metric-card').last();
  await lastMetric.locator('.metric-label').fill('Новая метрика');
  await lastMetric.locator('.metric-value').fill('42 единицы');
  await lastMetric.locator('.metric-context').fill('Проверка Edit v2');

  await page.locator('.highlight-section.decisions .report-item').first().locator('.edit-v2-remove').click();
  await page.locator('#editV2BlockPicker [data-edit-v2-kind="decision"]').click();
  const decision = page.locator('.highlight-section.decisions .report-item').last();
  await decision.locator('strong').fill('Новое решение');
  await decision.locator('.item-description').fill('Добавлено через плюс.');

  await page.locator('#editV2BlockPicker [data-edit-v2-kind="risk"]').click();
  const risk = page.locator('.highlight-section.risks .report-item').last();
  await risk.locator('.dynamic-item-editor > strong').fill('Новый риск');
  await risk.locator('.item-description').fill('Описание риска.');
  await risk.locator('.risk-impact span').fill('Высокое влияние');
  await risk.locator('.risk-mitigation span').fill('План снижения');

  await page.locator('#tasksSection > h2 .edit-v2-add').click();
  const taskRow = page.locator('.task-table tbody tr').last();
  await taskRow.locator('td').nth(0).fill('Новая задача');
  await taskRow.locator('td').nth(1).fill('Николай');
  await taskRow.locator('.due-badge').fill('Завтра');

  await page.locator('#editV2BlockPicker [data-edit-v2-kind="owner"]').click();
  const owner = page.locator('.owner-card').last();
  await owner.locator('.owner-name').fill('Новый владелец');
  await owner.locator('.owner-role').fill('Ответственность');

  await page.locator('#editV2BlockPicker [data-edit-v2-kind="architecture"]').click();
  const architecture = page.locator('#architectureContent > .architecture-section').last();
  await architecture.locator('.architecture-section-title').fill('Новый контур');
  await architecture.locator('.architecture-item h4').fill('Новый компонент');
  await architecture.locator('.architecture-item p').fill('Описание компонента');

  const outputDir = path.resolve(__dirname, 'artifacts');
  fs.mkdirSync(outputDir, { recursive: true });
  await page.screenshot({ path: path.join(outputDir, 'web-edit-v2-ru.png'), fullPage: true });

  await page.locator('#editReportBtn').click();
  await page.waitForFunction(() => window.__savedReport !== null);
  const saved = await page.evaluate(() => window.__savedReport);

  assert.strictEqual(saved.key_metrics.length, fixture.key_metrics.length, 'Metric remove/add was not serialized.');
  assert.ok(saved.key_metrics.some(metric => metric.label === 'Новая метрика' && metric.value === '42 единицы'));
  assert.ok(saved.decisions.some(item => item.title === 'Новое решение'));
  assert.ok(saved.risks.some(item => item.title === 'Новый риск' && item.impact === 'Высокое влияние' && item.mitigation === 'План снижения'));
  assert.ok(saved.tasks.some(task => task.task === 'Новая задача' && task.owner === 'Николай' && task.due_date === 'Завтра'));
  assert.ok(saved.owners.some(item => item.name === 'Новый владелец' && item.responsibility === 'Ответственность'));
  assert.ok(saved.architecture.sections.some(section => section.title === 'Новый контур' && section.items[0].title === 'Новый компонент'));
  assert.strictEqual(await page.locator('.edit-v2-control').count(), 0, 'Edit controls leaked into read mode.');
  assert.deepStrictEqual(errors, [], `Browser errors: ${errors.join(' | ')}`);

  await browser.close();
  console.log('Web Report Edit v2 add/remove/save contract passed.');
})().catch(error => {
  console.error(error);
  process.exit(1);
});
