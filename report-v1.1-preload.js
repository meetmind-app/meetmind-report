/* LOREVI Web Report v1.1 bootstrap gate.
 * The production app starts loadReport() at the end of app.js. This small gate
 * pauses only the initial report GET until report-v1.1.js has replaced the
 * consumer functions, eliminating a network-speed race without touching app.js.
 *
 * It also normalizes report locale aliases at the API boundary so the legacy
 * app can keep using its stable internal language keys (en, ru, es, pt, ...).
 */
(function installV11BootstrapGate(global) {
  'use strict';

  const originalFetch = global.fetch.bind(global);
  let ready = false;
  const waiters = [];

  function isReportLoad(input, init) {
    const method = String(init?.method || 'GET').toUpperCase();
    const url = typeof input === 'string' ? input : String(input?.url || '');
    return method === 'GET' && url.includes('/functions/v1/report?token=');
  }

  function normalizeLanguage(value) {
    const raw = String(value || 'en').trim().replace(/_/g, '-').toLowerCase();
    if (raw === 'pt' || raw === 'pt-br' || raw.startsWith('pt-')) return 'pt';
    if (raw === 'in' || raw.startsWith('in-')) return 'id';
    const base = raw.split('-')[0];
    return ['en','ru','es','tr','id','hi','ar','uz','fa'].includes(base) ? base : 'en';
  }

  async function normalizeReportResponse(response) {
    if (!response || !response.ok) return response;

    try {
      const payload = await response.clone().json();
      if (!payload || typeof payload !== 'object' || !payload.meeting) return response;

      const meeting = payload.meeting;
      const sourceLanguage =
        meeting.report_language ||
        meeting.language ||
        payload.language ||
        meeting.report?.language ||
        'en';
      const language = normalizeLanguage(sourceLanguage);

      const normalizedPayload = {
        ...payload,
        language,
        meeting: {
          ...meeting,
          language,
          report_language: language,
          report: meeting.report && typeof meeting.report === 'object'
            ? { ...meeting.report, language: normalizeLanguage(meeting.report.language || language) }
            : meeting.report
        }
      };

      return new Response(JSON.stringify(normalizedPayload), {
        status: response.status,
        statusText: response.statusText,
        headers: response.headers
      });
    } catch (error) {
      console.warn('LOREVI v1.1 language normalization skipped', error);
      return response;
    }
  }

  function fetchWithNormalization(input, init) {
    return originalFetch(input, init).then(response =>
      isReportLoad(input, init) ? normalizeReportResponse(response) : response
    );
  }

  global.fetch = function loreviV11Fetch(input, init) {
    if (ready || !isReportLoad(input, init)) {
      return fetchWithNormalization(input, init);
    }

    return new Promise((resolve, reject) => {
      waiters.push(() => fetchWithNormalization(input, init).then(resolve, reject));
    });
  };

  global.__LOREVI_REPORT_V11_BOOTSTRAP__ = Object.freeze({
    markReady() {
      if (ready) return;
      ready = true;
      while (waiters.length) waiters.shift()();
    },
    isReady() {
      return ready;
    },
    normalizeLanguage
  });
})(window);
