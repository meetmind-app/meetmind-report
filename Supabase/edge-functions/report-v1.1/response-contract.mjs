export function isRecord(value) {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

export function normalizeLanguage(value) {
  const raw = String(value || 'en').trim().replace(/_/g, '-').toLowerCase();
  if (raw === 'pt' || raw === 'pt-br' || raw.startsWith('pt-')) return 'pt';
  if (raw === 'in' || raw.startsWith('in-')) return 'id';
  const base = raw.split('-')[0];
  return ['en', 'ru', 'es', 'tr', 'id', 'hi', 'ar', 'uz', 'fa'].includes(base)
    ? base
    : 'en';
}

export function buildReportPayload(row) {
  const stored = isRecord(row?.report_json) ? row.report_json : {};
  const language = normalizeLanguage(row?.report_language ?? stored.language ?? 'en');
  const storedStats = isRecord(stored.stats) ? stored.stats : {};
  const storedDuration = Number(storedStats.duration_seconds || 0);
  const rootDuration = Number(row?.duration_seconds || 0);
  const durationSeconds = storedDuration > 0
    ? Math.ceil(storedDuration)
    : rootDuration > 0
      ? Math.ceil(rootDuration)
      : null;

  const participants = Array.isArray(stored.participants)
    ? stored.participants
    : Array.isArray(row?.participants)
      ? row.participants
      : [];

  return {
    ...stored,
    language: normalizeLanguage(stored.language ?? language),
    participants,
    stats: {
      ...storedStats,
      duration_seconds: durationSeconds,
    },
  };
}
