import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import {
  buildReportPayload,
  normalizeLanguage
} from '../Supabase/edge-functions/report-v1.1/response-contract.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const edgeSource = fs.readFileSync(
  path.resolve(__dirname, '..', 'Supabase', 'edge-functions', 'report-v1.1', 'index.ts'),
  'utf8'
);

assert.equal(normalizeLanguage('pt-BR'), 'pt');
assert.equal(normalizeLanguage('ru-RU'), 'ru');
assert.equal(normalizeLanguage('in-ID'), 'id');
assert.equal(normalizeLanguage('fa-IR'), 'fa');
assert.equal(normalizeLanguage('xx-ZZ'), 'en');

const legacy = buildReportPayload({
  report_language: 'ru',
  duration_seconds: 3600,
  participants: [{ name: 'A' }, { name: 'B' }],
  report_json: {
    title: 'Legacy report',
    executive_brief: 'Full legacy summary.',
    stats: { duration_seconds: null }
  }
});
assert.equal(legacy.language, 'ru');
assert.equal(legacy.stats.duration_seconds, 3600, 'Legacy report must inherit root duration without DB migration.');
assert.equal(legacy.participants.length, 2, 'Legacy report must inherit array-shaped root participants when report JSON lacks them.');
assert.equal(legacy.executive_brief, 'Full legacy summary.');

const v11 = buildReportPayload({
  report_language: 'pt',
  duration_seconds: 2700,
  participants: [{ name: 'Root' }],
  report_json: {
    schema_version: '1.1',
    language: 'pt-BR',
    participants: [{ name: 'Canonical' }],
    stats: { duration_seconds: 2699 },
    key_metrics: [{ label: 'ARR', value: '8.4M → 10M' }]
  }
});
assert.equal(v11.language, 'pt');
assert.equal(v11.stats.duration_seconds, 2699, 'Canonical v1.1 duration takes precedence when already present.');
assert.deepEqual(v11.participants, [{ name: 'Canonical' }], 'Canonical report participants take precedence over legacy root participants.');
assert.equal(v11.key_metrics[0].value, '8.4M → 10M');

const malformedLegacy = buildReportPayload({
  report_language: 'ar-SA',
  duration_seconds: 90,
  participants: { speakers: 2 },
  report_json: { participants: { speakers: 2 } }
});
assert.equal(malformedLegacy.language, 'ar');
assert.deepEqual(malformedLegacy.participants, [], 'Non-array legacy participant shapes must not leak into canonical consumers.');
assert.equal(malformedLegacy.stats.duration_seconds, 90);

for (const field of ['duration_seconds', 'participants', 'branding_visible']) {
  assert.ok(edgeSource.includes(`"${field}"`), `Edge Function query must select ${field}.`);
}
assert.ok(edgeSource.includes('buildReportPayload(row)'), 'Edge Function must enrich legacy report JSON at the API boundary.');
assert.ok(edgeSource.includes('branding_visible: row.branding_visible !== false'), 'Branding visibility must be exposed to Web Report.');

console.log('Report Edge Function v1.1 compatibility contract passed.');
