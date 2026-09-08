/* LOREVI Web Report v1.1 presentation refinements.
 * Machine enums (metric relation, architecture item type) stay in report_json
 * and are not exposed as untranslated user-facing labels.
 */
(function installV11Presentation(global) {
  'use strict';

  function text(value) {
    return String(value ?? '').trim();
  }

  function language() {
    const raw = String(typeof currentLang !== 'undefined' ? currentLang : 'en')
      .toLowerCase().replace(/_/g, '-');
    const base = raw.split('-')[0];
    return base === 'in' ? 'id' : base;
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

  renderArchitecture = function renderArchitectureV11Localized(architecture) {
    const root = Array.isArray(architecture)
      ? { sections: architecture }
      : architecture && typeof architecture === 'object'
        ? { ...architecture, sections: Array.isArray(architecture.sections) ? architecture.sections : [] }
        : { sections: [] };

    if (!root.sections.length) return '';
    const rtl = ['ar', 'fa'].includes(language());
    const arrow = rtl ? '←' : '→';

    return root.sections.map((section, sectionIndex) => {
      const items = Array.isArray(section?.items) ? section.items : [];
      if (!items.length) return '';

      const rawLayout = text(section?.layout || section?.mode || root?.layout || root?.mode).toLowerCase();
      const layout = ['process', 'flow', 'pipeline', 'sequence', 'workflow'].includes(rawLayout)
        ? 'process'
        : 'components';

      const itemHtml = items.map((item, itemIndex) => {
        const body = `
          <div class="architecture-item" data-item-index="${itemIndex}">
            <h4 data-editable="true">${escapeHtml(item?.title || item?.name || '')}</h4>
            ${text(item?.description || item?.text) ? `<p data-editable="true">${escapeHtml(item?.description || item?.text || '')}</p>` : ''}
          </div>`;
        if (layout !== 'process' || itemIndex === items.length - 1) return body;
        return `${body}<span class="architecture-flow-arrow" aria-hidden="true">${arrow}</span>`;
      }).join('');

      return `
        <div class="architecture-section architecture-v11-section" data-section-index="${sectionIndex}" data-layout="${layout}">
          <h3 class="architecture-section-title" data-editable="true">${escapeHtml(section?.title || '')}</h3>
          <div class="architecture-${layout}">${itemHtml}</div>
        </div>`;
    }).join('');
  };
})(window);
