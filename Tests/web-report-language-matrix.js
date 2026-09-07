'use strict';

const assert = require('assert');
const { chromium } = require('playwright');

const languages = [
  { input: 'en-US', impact: 'Impact', mitigation: 'Mitigation', rtl: false },
  { input: 'ru-RU', impact: 'Влияние', mitigation: 'Меры', rtl: false },
  { input: 'es-ES', impact: 'Impacto', mitigation: 'Mitigación', rtl: false },
  { input: 'pt-BR', impact: 'Impacto', mitigation: 'Mitigação', rtl: false },
  { input: 'tr-TR', impact: 'Etki', mitigation: 'Önlem', rtl: false },
  { input: 'id-ID', impact: 'Dampak', mitigation: 'Mitigasi', rtl: false },
  { input: 'hi-IN', impact: 'प्रभाव', mitigation: 'निवारण', rtl: false },
  { input: 'ar-SA', impact: 'الأثر', mitigation: 'التخفيف', rtl: true },
  { input: 'uz-UZ', impact: 'Ta’sir', mitigation: 'Chora', rtl: false },
  { input: 'fa-IR', impact: 'اثر', mitigation: 'کاهش ریسک', rtl: true }
];

function payloadFor(language, index) {
  return {
    success: true,
    language,
    meeting: {
      id: `lang-${index}`,
      status: 'processed',
      created_at: '2026-09-07T10:00:00Z',
      duration_seconds: 600,
      report_language: language,
      branding_visible: true,
      transcript: 'Language matrix transcript.',
      report: {
        schema_version: '1.1',
        language,
        title: `Language matrix ${index}`,
        meeting_type: 'strategy',
        meeting_type_label: `Type ${index}`,
        executive_brief: `Brief ${index}`,
        key_metrics: [{ label: 'ARR', value: '1 → 2' }],
        key_takeaways: [{ title: `Insight ${index}`, details: `Insight details ${index}` }],
        decisions: [{ title: `Decision ${index}`, details: `Decision details ${index}` }],
        risks: [{
          title: `Risk ${index}`,
          description: `Risk details ${index}`,
          impact: `ImpactValue${index}`,
          mitigation: `MitigationValue${index}`
        }],
        tasks: [{ task: `Task ${index}`, owner: 'Owner', due_date: 'Tomorrow', status: 'open' }],
        owners: [{ name: 'Owner', responsibility: `Responsibility ${index}` }],
        architecture: {
          sections: [
            { title: 'Process', layout: 'process', items: [{ title: 'A' }, { title: 'B' }] },
            { title: 'Components', layout: 'components', items: [{ title: 'X' }, { title: 'Y' }] }
          ]
        },
        participants: [],
        stats: { duration_seconds: 600 }
      }
    }
  };
}

async function renderLanguage(browser, spec, index) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const payload = payloadFor(spec.input, index);

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

  await page.goto(`http://127.0.0.1:4173/index.html?token=lang-${index}`, { waitUntil: 'networkidle' });
  await page.waitForFunction(() => !document.getElementById('reportPage').classList.contains('hidden'));

  let body = await page.locator('body').innerText();
  assert.ok(body.includes(`${spec.impact}: ImpactValue${index}`), `${spec.input}: localized impact label missing.`);
  assert.ok(body.includes(`${spec.mitigation}: MitigationValue${index}`), `${spec.input}: localized mitigation label missing.`);
  assert.ok(!body.includes('current_to_target'), `${spec.input}: machine metric relation leaked.`);

  await page.locator('#detailsToggle').click();
  await page.waitForFunction(() => !document.getElementById('detailsContent').classList.contains('hidden'));
  const details = await page.locator('#detailsContent').innerText();
  const arrows = await page.locator('.architecture-section[data-layout="process"] .architecture-flow-arrow').allInnerTexts();
  assert.deepStrictEqual(arrows, [spec.rtl ? '←' : '→'], `${spec.input}: process arrow direction mismatch.`);
  assert.strictEqual(await page.locator('.architecture-section[data-layout="components"] .architecture-flow-arrow').count(), 0, `${spec.input}: components received invented arrows.`);
  assert.ok(details.includes(`Responsibility ${index}`), `${spec.input}: owner responsibility missing.`);

  const actionable = errors.filter(message => !/404|Failed to load resource/i.test(message));
  assert.deepStrictEqual(actionable, [], `${spec.input}: page errors: ${actionable.join(' | ')}`);
  await page.close();
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  for (let i = 0; i < languages.length; i += 1) {
    await renderLanguage(browser, languages[i], i + 1);
  }
  await browser.close();
  console.log('Web Report ten-language v1.1 browser matrix passed.');
})().catch(error => {
  console.error(error);
  process.exit(1);
});
