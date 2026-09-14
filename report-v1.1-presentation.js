/* LOREVI Web Report v1.1 presentation refinements.
 * Machine enums (metric relation, architecture item type) stay in report_json
 * and are not exposed as untranslated user-facing labels.
 */
(function installV11Presentation(global) {
  'use strict';

  function text(value) {
    return String(value ?? '').trim();
  }

  renderMetrics = function renderMetricsV11Localized(report) {
    const metrics = report.key_metrics || report.metrics || [];
    if (!Array.isArray(metrics) || !metrics.length) return;

    const grid = $('metricsContent');
    let cols = metrics.length;
    if (metrics.length === 5) cols = 3;
    else if (metrics.length >= 7) cols = 4;
    grid.style.setProperty('--metric-cols', cols);

    grid.innerHTML = metrics.map((metric, index) => {
      const context = global.LOREVIReportV11?.metricContext?.(metric) || '';
      const value = global.LOREVIReportV11?.metricDisplayValue?.(metric) || text(metric?.value);
      return `
        <div class="metric-card metric-card-v11" data-metric-index="${index}">
          <div class="metric-label" data-editable="true">${escapeHtml(metric?.label || '')}</div>
          <div class="metric-value" data-editable="true">${escapeHtml(value)}</div>
          ${context ? `<div class="metric-context" data-editable="true">${escapeHtml(context)}</div>` : ''}
        </div>`;
    }).join('');

    $('metricsSection').classList.remove('hidden');
  };

})(window);
