/* LOREVI Web Report v1.1 bootstrap gate.
 * The production app starts loadReport() at the end of app.js. This small gate
 * pauses only the initial report GET until report-v1.1.js has replaced the
 * consumer functions, eliminating a network-speed race without touching app.js.
 */
(function installV11BootstrapGate(global) {
  'use strict';

  const originalFetch = global.fetch.bind(global);
  let ready = false;
  const waiters = [];

  function isInitialReportLoad(input, init) {
    const method = String(init?.method || 'GET').toUpperCase();
    const url = typeof input === 'string' ? input : String(input?.url || '');
    return method === 'GET' && url.includes('/functions/v1/report?token=');
  }

  global.fetch = function loreviV11Fetch(input, init) {
    if (ready || !isInitialReportLoad(input, init)) {
      return originalFetch(input, init);
    }

    return new Promise((resolve, reject) => {
      waiters.push(() => originalFetch(input, init).then(resolve, reject));
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
    }
  });
})(window);
