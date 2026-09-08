'use strict';

const fs = require('fs');
const path = require('path');
const assert = require('assert');
const { chromium } = require('playwright');

const payload = {
  success: true,
  language: 'ru',
  meeting: {
    id: 'fixture-ru-v11',
    status: 'processed',
    created_at: '2026-09-07T10:00:00Z',
    duration_seconds: 2700,
    report_language: 'ru',
    branding_visible: true,
    transcript: 'Тестовая расшифровка для визуальной регрессии.',
    report: {
      schema_version: '1.1',
      title: 'LOREVI: запуск SaaS-пилота',
      meeting_type: 'strategy',
      meeting_type_label: 'Стратегическая встреча',
      executive_brief: 'Команда согласовала запуск пилота и проверку готовности клиентов платить. Международные рекуррентные платежи остаются ключевым ограничением до масштабирования.',
      key_metrics: [
        { label: 'ARR', value: '8,4M → 10M', relation: 'current_to_target', current_value: '8,4M', target_value: '10M', target_period: 'Q4', context: 'Цель' },
        { label: 'COGS', value: '< 20% выручки', relation: 'target', target_value: '< 20% выручки', context: 'Целевой уровень' },
        { label: 'Конверсия', value: '18% → 24%', relation: 'current_to_target', current_value: '18%', target_value: '24%' },
        { label: 'MAU', value: '120 000', relation: 'current', current_value: '120 000' },
        { label: 'T2V', value: '2 дня → 5 мин', relation: 'previous_to_current', previous_value: '2 дня', current_value: '5 мин' }
      ],
      key_takeaways: [
        { title: 'Проверять willingness-to-pay рано', details: 'Пилот должен проверять готовность платить до масштабирования маркетинга.' }
      ],
      decisions: [
        { title: 'Запустить пилот', details: 'Первый релиз сохраняет обратную совместимость отчётов.' }
      ],
      risks: [
        { title: 'Платёжный контур', description: 'Международные рекуррентные платежи могут потребовать посредника.', business_priority: 'high', impact: 'Рост комиссии и снижение маржи', mitigation: 'Проверить альтернативных провайдеров до масштабирования' }
      ],
      tasks: [
        { task: 'Проверить платёжных провайдеров', owner: 'Николай', due_date: 'На этой неделе', status: 'open' }
      ],
      owners: [
        { name: 'Николай', responsibility: 'Принять решение по запуску' }
      ],
      architecture: {
        sections: [
          {
            title: 'Обработка',
            layout: 'process',
            items: [
              { title: 'Загрузка', description: 'Получить запись встречи.', type: 'process' },
              { title: 'Анализ', description: 'Извлечь решения и метрики.', type: 'process' },
              { title: 'Отчёт', description: 'Сформировать Web и PDF.', type: 'process' }
            ]
          },
          {
            title: 'Каналы',
            layout: 'components',
            items: [
              { title: 'Telegram', description: 'Executive delivery.', type: 'system' },
              { title: 'Web Report', description: 'Полная интерактивная версия.', type: 'system' },
              { title: 'Executive PDF', description: 'Компактный артефакт.', type: 'system' }
            ]
          }
        ]
      },
      participants: [],
      stats: { duration_seconds: 2700 }
    }
  }
};

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1 });

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

  await page.goto('http://127.0.0.1:4173/index.html?token=fixture-v11', { waitUntil: 'networkidle' });
  await page.waitForFunction(() => !document.getElementById('reportPage').classList.contains('hidden'));

  const bodyText = await page.locator('body').innerText();
  assert.ok(bodyText.includes('Стратегическая встреча'), 'Meeting type label is not visible.');
  assert.ok(bodyText.includes('8,4M → 10M'), 'Rich metric value is not visible.');
  assert.ok(bodyText.includes('Влияние: Рост комиссии и снижение маржи'), 'Risk impact is not visible.');
  assert.ok(bodyText.includes('Меры: Проверить альтернативных провайдеров до масштабирования'), 'Risk mitigation is not visible.');
  assert.ok(!bodyText.includes('current_to_target'), 'Machine metric relation leaked into localized UI.');

  await page.locator('#detailsToggle').click();
  await page.waitForFunction(() => !document.getElementById('detailsContent').classList.contains('hidden'));

  const detailsText = await page.locator('#detailsContent').innerText();
  assert.ok(detailsText.includes('Принять решение по запуску'), 'Owner responsibility is not visible after Details is expanded.');

  const architectureText = await page.locator('#architectureContent').innerText();
  assert.ok(architectureText.includes('→'), 'Explicit process connector is missing.');
  const channels = page.locator('.architecture-section[data-layout="components"]');
  assert.strictEqual(await channels.locator('.architecture-flow-arrow').count(), 0, 'Components must not receive directional arrows.');
  assert.ok(!architectureText.includes('system'), 'Machine architecture type leaked into localized UI.');

  if (errors.length) {
    const actionable = errors.filter(message => !/404|Failed to load resource/i.test(message));
    assert.deepStrictEqual(actionable, [], `Page errors: ${actionable.join(' | ')}`);
  }

  const outputDir = path.resolve(__dirname, 'artifacts');
  fs.mkdirSync(outputDir, { recursive: true });
  await page.screenshot({ path: path.join(outputDir, 'web-report-v1.1-ru.png'), fullPage: true });

  await browser.close();
  console.log('Web Report v1.1 browser regression passed.');
})().catch(error => {
  console.error(error);
  process.exit(1);
});
