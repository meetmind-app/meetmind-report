/* LOREVI Web Report v1.1 consumer layer
 * Additive and backward-compatible with stored v1 report_json.
 * Loaded immediately after app.js and before the gated initial report GET resumes.
 */
(function installReportV11(global) {
  'use strict';

  const LABELS = Object.freeze({
    en: { impact: 'Impact', mitigation: 'Mitigation' },
    ru: { impact: 'Влияние', mitigation: 'Меры' },
    es: { impact: 'Impacto', mitigation: 'Mitigación' },
    pt: { impact: 'Impacto', mitigation: 'Mitigação' },
    tr: { impact: 'Etki', mitigation: 'Önlem' },
    id: { impact: 'Dampak', mitigation: 'Mitigasi' },
    hi: { impact: 'प्रभाव', mitigation: 'निवारण' },
    ar: { impact: 'الأثر', mitigation: 'التخفيف' },
    uz: { impact: 'Ta’sir', mitigation: 'Chora' },
    fa: { impact: 'اثر', mitigation: 'کاهش ریسک' }
  });

  function v11Language() {
    const raw = String(typeof currentLang !== 'undefined' ? currentLang : 'en')
      .toLowerCase().replace(/_/g, '-');
    const base = raw.split('-')[0] === 'in' ? 'id' : raw.split('-')[0];
    return LABELS[base] ? base : 'en';
  }

  function v11Text(value) {
    return String(value ?? '').trim();
  }

  function v11List(value) {
    if (Array.isArray(value)) return value.filter(v => !isEmptyValue(v));
    if (isEmptyValue(value)) return [];
    return String(value)
      .split(/\n+/)
      .map(line => line.trim().replace(/^[-•]\s*/, ''))
      .filter(Boolean);
  }

  function v11Architecture(value) {
    if (Array.isArray(value)) return { sections: value };
    if (value && typeof value === 'object') {
      return {
        ...value,
        sections: Array.isArray(value.sections) ? value.sections : []
      };
    }
    return { sections: [] };
  }

  normalizeReport = function normalizeReportV11(report = {}) {
    return {
      schema_version: report.schema_version || report.schemaVersion || '',
      headline: report.headline || '',
      title: report.title || report.meeting_title || '',
      meeting_title: report.meeting_title || report.title || '',
      subtitle: report.subtitle || report.meeting_subtitle || '',
      objective: report.objective || report.meeting_objective || '',
      meeting_type: report.meeting_type || '',
      meeting_type_label: report.meeting_type_label || '',
      series_title: report.series_title || '',
      importance: report.importance || report.meeting_importance || '',
      importance_reason: report.importance_reason || '',
      language: report.language || report.report_language || '',
      summary: report.executive_brief || report.summary || '',
      executive_brief: report.executive_brief || report.summary || '',
      architecture: v11Architecture(report.architecture),
      insights: v11List(report.key_takeaways || report.insights),
      key_takeaways: v11List(report.key_takeaways || report.insights),
      decisions: v11List(report.decisions),
      key_metrics: v11List(report.key_metrics || report.metrics),
      metrics: v11List(report.metrics || report.key_metrics),
      risks: v11List(report.risks),
      dependencies: v11List(report.dependencies),
      tasks: v11List(report.tasks),
      owners: v11List(report.owners || report.responsibles),
      participants: Array.isArray(report.participants) ? report.participants : [],
      stats: report.stats && typeof report.stats === 'object' ? report.stats : {}
    };
  };

  parseOwner = function parseOwnerV11(owner) {
    if (owner && typeof owner === 'object') {
      return {
        name: owner.name || owner.owner || owner.person || '',
        role: owner.responsibility || owner.role || owner.title || '',
        responsibility: owner.responsibility || owner.role || owner.title || ''
      };
    }
    const parts = String(owner)
      .split(/\s+–\s+|\s+-\s+/)
      .map(part => part.trim())
      .filter(Boolean);
    const responsibility = parts.slice(1).join(' – ');
    return {
      name: parts[0] || owner,
      role: responsibility,
      responsibility
    };
  };

  function metricDisplayValue(metric) {
    const value = v11Text(metric?.value);
    if (value) return value;
    const relation = v11Text(metric?.relation).toLowerCase();
    const current = v11Text(metric?.current_value ?? metric?.currentValue);
    const previous = v11Text(metric?.previous_value ?? metric?.previousValue);
    const target = v11Text(metric?.target_value ?? metric?.targetValue);
    if (relation === 'current_to_target' && current && target) return `${current} → ${target}`;
    if (relation === 'previous_to_current' && previous && current) return `${previous} → ${current}`;
    if (relation === 'target' && target) return target;
    if (relation === 'current' && current) return current;
    return current || target || previous || '';
  }

  function metricContext(metric) {
    const context = v11Text(metric?.context);
    const period = v11Text(metric?.target_period ?? metric?.targetPeriod);
    if (!period) return context;
    if (!context) return period;
    return context.toLowerCase().includes(period.toLowerCase()) ? context : `${context} · ${period}`;
  }

  renderMeta = function renderMetaV11(meeting, report) {
    const items = [];
    const date = formatDate(meeting.created_at);
    const duration = durationLabel(report.stats?.duration_seconds || meeting.duration_seconds);
    const typeLabel = v11Text(report.meeting_type_label);

    if (date) items.push(`<span class="meta-item">📅 ${escapeHtml(date)}</span>`);
    if (duration) items.push(`<span class="meta-item">🕘 ${escapeHtml(duration)}</span>`);
    if (typeLabel) items.push(`<span class="meeting-type-badge">${escapeHtml(typeLabel)}</span>`);
    items.push(`<span class="meta-item">— ${escapeHtml(t('generatedBy'))}</span>`);

    $('meetingMeta').innerHTML = items.join('');
  };

  renderMetrics = function renderMetricsV11(report) {
    const metrics = report.key_metrics || report.metrics || [];
    if (!Array.isArray(metrics) || !metrics.length) return;

    const grid = $('metricsContent');
    let cols = metrics.length;
    if (metrics.length >= 7) cols = 4;
    grid.style.setProperty('--metric-cols', cols);

    grid.innerHTML = metrics.map((metric, index) => {
      const context = metricContext(metric);
      const relation = v11Text(metric?.relation);
      return `
        <div class="metric-card metric-card-v11" data-metric-index="${index}">
          <div class="metric-label" data-editable="true">${escapeHtml(metric?.label || '')}</div>
          <div class="metric-value" data-editable="true">${escapeHtml(metricDisplayValue(metric))}</div>
          ${context ? `<div class="metric-context" data-editable="true">${escapeHtml(context)}</div>` : ''}
          ${relation && relation !== 'other' ? `<div class="metric-relation">${escapeHtml(relation.replace(/_/g, ' '))}</div>` : ''}
        </div>`;
    }).join('');

    $('metricsSection').classList.remove('hidden');
  };

  renderDynamicCards = function renderDynamicCardsV11(report) {
    const blocks = [];
    if (report.insights?.length) blocks.push({ key: 'insights', title: t('insights'), items: report.insights });
    if (report.decisions?.length) blocks.push({ key: 'decisions', title: t('decisions'), items: report.decisions });
    if (report.risks?.length) blocks.push({ key: 'risks', title: t('risks'), items: report.risks });
    if (!blocks.length) return;

    const labels = LABELS[v11Language()] || LABELS.en;
    const grid = $('insightsDecisionsRisksGrid');
    grid.style.setProperty('--grid-cols', 1);

    const sectionsHtml = blocks.map(block => {
      const html = block.items.map((item, index) => {
        if (typeof item === 'string') {
          return `<div class="report-item" data-item-index="${index}"><span class="report-dot"></span><div>${escapeHtml(item)}</div></div>`;
        }

        const title = v11Text(item?.title);
        const details = v11Text(block.key === 'risks' ? (item?.description || item?.details) : item?.details);
        const impact = block.key === 'risks' ? v11Text(item?.impact) : '';
        const mitigation = block.key === 'risks' ? v11Text(item?.mitigation) : '';

        return `
          <div class="report-item" data-section="${block.key}" data-item-index="${index}">
            <span class="report-dot"></span>
            <div class="editable dynamic-item-editor" data-editable="true" data-field="${block.key}">
              <strong>${escapeHtml(title)}</strong>
              ${details ? `<div class="item-description">${escapeHtml(details)}</div>` : ''}
              ${impact ? `<div class="risk-supplement risk-impact"><strong>${escapeHtml(labels.impact)}:</strong> <span data-editable="true">${escapeHtml(impact)}</span></div>` : ''}
              ${mitigation ? `<div class="risk-supplement risk-mitigation"><strong>${escapeHtml(labels.mitigation)}:</strong> <span data-editable="true">${escapeHtml(mitigation)}</span></div>` : ''}
            </div>
          </div>`;
      }).join('');

      return `
        <div class="highlight-section ${block.key}">
          <h3>${escapeHtml(block.title)}</h3>
          <div class="item-list">${html}</div>
        </div>`;
    }).join('');

    grid.innerHTML = `<section class="dynamic-card highlights">${sectionsHtml}</section>`;
    grid.classList.remove('hidden');
  };

  renderArchitecture = function renderArchitectureV11(architecture) {
    const root = v11Architecture(architecture);
    const sections = root.sections;
    if (!sections.length) return '';
    const rtl = ['ar', 'fa'].includes(v11Language());
    const arrow = rtl ? '←' : '→';

    return sections.map((section, sectionIndex) => {
      const items = Array.isArray(section?.items) ? section.items : [];
      if (!items.length) return '';
      const rawLayout = v11Text(section?.layout || section?.mode || root?.layout || root?.mode).toLowerCase();
      const layout = ['process', 'flow', 'pipeline', 'sequence', 'workflow'].includes(rawLayout)
        ? 'process'
        : 'components';

      const itemHtml = items.map((item, itemIndex) => {
        const body = `
          <div class="architecture-item" data-item-index="${itemIndex}">
            <h4 data-editable="true">${escapeHtml(item?.title || item?.name || '')}</h4>
            ${v11Text(item?.description || item?.text) ? `<p data-editable="true">${escapeHtml(item?.description || item?.text || '')}</p>` : ''}
            ${v11Text(item?.type) ? `<span class="architecture-item-type">${escapeHtml(item.type)}</span>` : ''}
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

  buildReportJson = function buildReportJsonV11() {
    const baseReport = normalizeReport(currentMeeting?.report || {});

    function collectDynamicSection(sectionKey) {
      const section = document.querySelector(`.highlight-section.${sectionKey}`);
      if (!section) return [];
      const baseItems = Array.isArray(baseReport[sectionKey]) ? baseReport[sectionKey] : [];

      return [...section.querySelectorAll('.report-item')]
        .map((item, position) => {
          const editor = item.querySelector('.dynamic-item-editor');
          if (!editor) {
            const text = cleanText(item.innerText);
            return text ? { title: text, details: '' } : null;
          }

          const sourceIndex = Number(item.dataset.itemIndex);
          const base = baseItems[Number.isInteger(sourceIndex) ? sourceIndex : position];
          const source = base && typeof base === 'object' && !Array.isArray(base) ? base : {};
          const title = cleanText(editor.querySelector('strong')?.innerText);
          const details = cleanText(editor.querySelector('.item-description')?.innerText);
          if (!title && !details) return null;

          if (sectionKey === 'risks') {
            return {
              ...source,
              title,
              description: details,
              details,
              impact: cleanText(editor.querySelector('.risk-impact span')?.innerText) || v11Text(source.impact),
              mitigation: cleanText(editor.querySelector('.risk-mitigation span')?.innerText) || v11Text(source.mitigation)
            };
          }

          return { ...source, title, details };
        })
        .filter(Boolean);
    }

    function collectMetrics() {
      const baseMetrics = Array.isArray(baseReport.key_metrics) ? baseReport.key_metrics : [];
      return [...document.querySelectorAll('.metric-card')]
        .map((card, position) => {
          const sourceIndex = Number(card.dataset.metricIndex);
          const base = baseMetrics[Number.isInteger(sourceIndex) ? sourceIndex : position];
          const source = base && typeof base === 'object' && !Array.isArray(base) ? base : {};
          const label = cleanText(card.querySelector('.metric-label')?.innerText);
          const value = cleanText(card.querySelector('.metric-value')?.innerText);
          const context = cleanText(card.querySelector('.metric-context')?.innerText);
          if (!label && !value) return null;

          const originalValue = metricDisplayValue(source);
          const changed = originalValue && value && value !== originalValue;
          const semanticPatch = changed ? {
            relation: 'other',
            current_value: '',
            previous_value: '',
            target_value: '',
            target_period: ''
          } : {};

          return { ...source, ...semanticPatch, label, value, context };
        })
        .filter(Boolean);
    }

    function collectTasks() {
      if (window.matchMedia('(max-width: 767px)').matches) {
        return [...document.querySelectorAll('.task-cards .task-card')]
          .map(card => ({
            task: cleanText(card.querySelector('.task-title')?.innerText),
            owner: cleanText(card.querySelector('.task-owner span')?.innerText),
            due_date: cleanText(card.querySelector('.due-badge')?.innerText),
            status: 'open'
          }))
          .filter(task => task.task);
      }
      return [...document.querySelectorAll('.task-table tbody tr')]
        .map(row => {
          const cells = row.querySelectorAll('td');
          return {
            task: cleanText(cells[0]?.innerText),
            owner: cleanText(cells[1]?.innerText),
            due_date: cleanText(cells[2]?.innerText),
            status: 'open'
          };
        })
        .filter(task => task.task);
    }

    function collectOwners() {
      return [...document.querySelectorAll('.owner-card')]
        .map(card => ({
          name: cleanText(card.querySelector('.owner-name')?.innerText),
          responsibility: cleanText(card.querySelector('.owner-role')?.innerText)
        }))
        .filter(owner => owner.name || owner.responsibility);
    }

    function collectArchitecture() {
      const baseSections = Array.isArray(baseReport.architecture?.sections)
        ? baseReport.architecture.sections
        : [];
      const sections = [...document.querySelectorAll('#architectureContent .architecture-section')]
        .map((section, sectionPosition) => {
          const sourceIndex = Number(section.dataset.sectionIndex);
          const baseSection = baseSections[Number.isInteger(sourceIndex) ? sourceIndex : sectionPosition] || {};
          const title = cleanText(section.querySelector('.architecture-section-title')?.innerText);
          const layout = section.dataset.layout === 'process' ? 'process' : 'components';
          const baseItems = Array.isArray(baseSection.items) ? baseSection.items : [];
          const items = [...section.querySelectorAll('.architecture-item')]
            .map((item, itemPosition) => {
              const itemIndex = Number(item.dataset.itemIndex);
              const baseItem = baseItems[Number.isInteger(itemIndex) ? itemIndex : itemPosition] || {};
              const titleText = cleanText(item.querySelector('h4')?.innerText);
              const description = cleanText(item.querySelector('p')?.innerText);
              if (!titleText && !description) return null;
              return { ...baseItem, title: titleText, description };
            })
            .filter(Boolean);
          if (!title && !items.length) return null;
          return { ...baseSection, title, layout, items };
        })
        .filter(Boolean);
      return { ...(baseReport.architecture || {}), sections };
    }

    const title = cleanText(document.querySelector('.editable-title')?.innerText);
    const summary = cleanText($('summaryContent')?.innerText);
    const metrics = collectMetrics();
    const risks = collectDynamicSection('risks');

    return {
      ...baseReport,
      schema_version: baseReport.schema_version || '1.1',
      title,
      meeting_title: title,
      summary,
      executive_brief: summary,
      architecture: collectArchitecture(),
      key_metrics: metrics,
      metrics,
      insights: collectDynamicSection('insights'),
      key_takeaways: collectDynamicSection('insights'),
      decisions: collectDynamicSection('decisions'),
      risks,
      tasks: collectTasks(),
      owners: collectOwners()
    };
  };

  global.LOREVIReportV11 = Object.freeze({
    version: '1.1.0',
    metricDisplayValue,
    metricContext
  });

  global.__LOREVI_REPORT_V11_BOOTSTRAP__?.markReady?.();
})(window);
