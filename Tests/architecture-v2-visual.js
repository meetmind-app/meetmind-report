'use strict';

const fs = require('fs');
const path = require('path');
const assert = require('assert');
const { chromium } = require('playwright');

const cases = [
  {
    id: 'architecture-v2-en',
    language: 'en-US',
    viewport: { width: 1440, height: 1000 },
    rtl: false,
    copy: {
      title: 'Architecture v2 launch review',
      brief: 'The team separated evidenced delivery flow from the surrounding system components.',
      process: 'Confirmed delivery process',
      components: 'System components',
      long: 'Long validation workflow',
      steps: ['Capture', 'Normalize', 'Generate', 'Publish'],
      blocks: ['Web Report', 'Executive PDF', 'Telegram'],
      longSteps: ['Collect evidence', 'Classify intent', 'Normalize contract', 'Render outputs', 'Validate content', 'Release']
    }
  },
  {
    id: 'architecture-v2-fa',
    language: 'fa-IR',
    viewport: { width: 1440, height: 1000 },
    rtl: true,
    copy: {
      title: 'بررسی انتشار معماری نسخه دوم',
      brief: 'تیم جریان واقعی تحویل را از اجزای مستقل سامانه جدا کرد.',
      process: 'فرایند تأییدشده تحویل',
      components: 'اجزای سامانه',
      long: 'گردش‌کار کامل اعتبارسنجی',
      steps: ['دریافت', 'نرمال‌سازی', 'تولید گزارش', 'انتشار'],
      blocks: ['گزارش وب', 'فایل اجرایی PDF', 'تلگرام'],
      longSteps: ['گردآوری شواهد', 'طبقه‌بندی هدف', 'نرمال‌سازی قرارداد', 'تولید خروجی‌ها', 'اعتبارسنجی محتوا', 'انتشار نهایی']
    }
  },
  {
    id: 'architecture-v2-mobile',
    language: 'en-US',
    viewport: { width: 390, height: 844 },
    rtl: false,
    copy: {
      title: 'Mobile architecture review',
      brief: 'Mobile validation keeps every step readable without horizontal scrolling.',
      process: 'Mobile delivery process',
      components: 'Mobile components',
      long: 'Long mobile workflow',
      steps: ['Capture', 'Normalize', 'Generate', 'Publish'],
      blocks: ['Web Report', 'Executive PDF', 'Telegram'],
      longSteps: ['Collect evidence', 'Classify intent', 'Normalize contract', 'Render outputs', 'Validate content', 'Release']
    }
  }
];

function payloadFor(spec) {
  const step = (title, index) => ({
    id: `step-${index + 1}`,
    title,
    description: `${title} — source-backed detail ${index + 1}.`,
    type: 'process'
  });
  return {
    success: true,
    language: spec.language,
    meeting: {
      id: spec.id,
      status: 'processed',
      created_at: '2026-09-14T12:00:00Z',
      duration_seconds: 1800,
      report_language: spec.language,
      branding_visible: true,
      transcript: 'Architecture v2 visual regression transcript.',
      report: {
        schema_version: '1.1',
        language: spec.language,
        title: spec.copy.title,
        executive_brief: spec.copy.brief,
        tasks: [{ task: 'Complete release QA', owner: 'Owner', due_date: 'Today' }],
        architecture: {
          evidence_id: 'architecture-evidence-42',
          mode: 'components',
          sections: [
            {
              title: spec.copy.process,
              mode: 'process',
              evidence: 'Explicit ordered hand-off in transcript.',
              items: spec.copy.steps.map(step)
            },
            {
              title: spec.copy.components,
              mode: 'components',
              evidence: 'Independent channels without ordering.',
              items: spec.copy.blocks.map((title, index) => ({
                id: `component-${index + 1}`,
                title,
                description: `${title} — independent delivery surface.`,
                type: 'system'
              }))
            },
            {
              title: spec.copy.long,
              mode: 'process',
              items: spec.copy.longSteps.map(step)
            },
            {
              title: 'Empty architecture section',
              mode: 'process',
              items: []
            }
          ]
        },
        participants: [],
        stats: { duration_seconds: 1800 }
      }
    }
  };
}

async function renderCase(browser, spec) {
  const page = await browser.newPage({ viewport: spec.viewport, deviceScaleFactor: 1 });
  const payload = payloadFor(spec);

  await page.addInitScript(fixture => {
    const nativeFetch = window.fetch.bind(window);
    window.fetch = async function fixtureFetch(input, init = {}) {
      const url = typeof input === 'string' ? input : String(input?.url || '');
      if (url.includes('/functions/v1/report?token=')) {
        return new Response(JSON.stringify(fixture), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      if (url.includes('/functions/v1/analytics')) {
        return new Response(JSON.stringify({ success: true }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      return nativeFetch(input, init);
    };
  }, payload);

  const errors = [];
  page.on('pageerror', error => errors.push(String(error?.message || error)));
  await page.goto(`http://127.0.0.1:4173/index.html?token=${spec.id}`, { waitUntil: 'networkidle' });
  await page.waitForFunction(() => !document.getElementById('reportPage').classList.contains('hidden'));
  await page.locator('#detailsToggle').click();
  await page.waitForFunction(() => !document.getElementById('detailsContent').classList.contains('hidden'));

  const architecture = page.locator('#architectureContent');
  const architectureText = await architecture.innerText();
  for (const expected of [...spec.copy.steps, ...spec.copy.blocks, ...spec.copy.longSteps]) {
    assert.ok(architectureText.includes(expected), `${spec.id}: architecture content lost: ${expected}`);
  }
  assert.ok(!architectureText.includes('Empty architecture section'), `${spec.id}: empty section should not render.`);
  assert.ok(!/[→←]/.test(architectureText), `${spec.id}: connector leaked as a text glyph.`);
  assert.ok(!architectureText.includes('system'), `${spec.id}: machine item type leaked into visible copy.`);

  const renderedSections = page.locator('#architectureContent > .architecture-section');
  assert.strictEqual(await renderedSections.count(), 3, `${spec.id}: mixed architecture section count mismatch.`);
  assert.strictEqual(await page.locator('[data-layout="process"] .architecture-connector').count(), 8, `${spec.id}: process connector count mismatch.`);
  assert.strictEqual(await page.locator('[data-layout="components"] .architecture-connector').count(), 0, `${spec.id}: components received invented connectors.`);

  const processLayouts = page.locator('[data-layout="process"] .architecture-process');
  assert.strictEqual(await processLayouts.nth(0).getAttribute('data-flow-axis'), 'horizontal', `${spec.id}: four-step flow should use the compact desktop axis.`);
  assert.strictEqual(await processLayouts.nth(1).getAttribute('data-flow-axis'), 'vertical', `${spec.id}: long flow should reflow vertically.`);
  assert.strictEqual(await processLayouts.nth(0).getAttribute('data-direction'), spec.rtl ? 'rtl' : 'ltr');

  const firstProcessBoxes = await processLayouts.nth(0).locator('.architecture-item').evaluateAll(elements =>
    elements.map(element => {
      const rect = element.getBoundingClientRect();
      return { x: rect.x, y: rect.y, right: rect.right, bottom: rect.bottom };
    })
  );
  if (spec.viewport.width > 900) {
    if (spec.rtl) {
      assert.ok(firstProcessBoxes[0].x > firstProcessBoxes[1].x, `${spec.id}: RTL process order is not right-to-left.`);
    } else {
      assert.ok(firstProcessBoxes[0].x < firstProcessBoxes[1].x, `${spec.id}: LTR process order is not left-to-right.`);
    }
  } else {
    const flexDirection = await processLayouts.nth(0).evaluate(element => getComputedStyle(element).flexDirection);
    assert.strictEqual(flexDirection, 'column', `${spec.id}: compact process must reflow to a vertical stack.`);
    assert.ok(firstProcessBoxes[1].y > firstProcessBoxes[0].y, `${spec.id}: compact process visual order is invalid.`);
  }

  const geometry = await renderedSections.evaluateAll(elements => elements.map(element => ({
    clientWidth: element.clientWidth,
    scrollWidth: element.scrollWidth,
    left: element.getBoundingClientRect().left,
    right: element.getBoundingClientRect().right
  })));
  geometry.forEach((item, index) => {
    assert.ok(item.scrollWidth <= item.clientWidth + 1, `${spec.id}: section ${index + 1} overflows horizontally.`);
    assert.ok(item.left >= -0.5 && item.right <= spec.viewport.width + 0.5, `${spec.id}: section ${index + 1} escaped the viewport.`);
  });

  const connectorStyle = await processLayouts.nth(0).locator('.architecture-connector').first().evaluate(element => ({
    before: getComputedStyle(element, '::before').content,
    after: getComputedStyle(element, '::after').content,
    beforeBorderTop: getComputedStyle(element, '::before').borderTopWidth,
    beforeBorderLeft: getComputedStyle(element, '::before').borderLeftWidth
  }));
  assert.notStrictEqual(connectorStyle.before, 'none', `${spec.id}: connector line is not painted.`);
  assert.notStrictEqual(connectorStyle.after, 'none', `${spec.id}: connector head is not painted.`);

  const saved = await page.evaluate(() => buildReportJson().architecture);
  assert.strictEqual(saved.evidence_id, 'architecture-evidence-42', `${spec.id}: root metadata was lost on save.`);
  assert.deepStrictEqual(saved.sections.map(section => section.mode), ['process', 'components', 'process'], `${spec.id}: canonical section modes were not saved.`);
  assert.strictEqual(saved.sections[0].evidence, 'Explicit ordered hand-off in transcript.', `${spec.id}: section evidence was lost on save.`);
  assert.strictEqual(saved.sections[0].items[0].id, 'step-1', `${spec.id}: item identity was lost on save.`);
  assert.strictEqual(saved.sections[1].items[0].type, 'system', `${spec.id}: item semantic type was lost on save.`);

  const actionable = errors.filter(message => !/404|Failed to load resource/i.test(message));
  assert.deepStrictEqual(actionable, [], `${spec.id}: page errors: ${actionable.join(' | ')}`);

  const outputDir = path.resolve(__dirname, 'artifacts');
  fs.mkdirSync(outputDir, { recursive: true });
  await page.screenshot({ path: path.join(outputDir, `${spec.id}.png`), fullPage: true });
  await page.close();
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  for (const spec of cases) await renderCase(browser, spec);
  await browser.close();
  console.log('Architecture & Process v2 browser/visual corpus passed.');
})().catch(error => {
  console.error(error);
  process.exit(1);
});
