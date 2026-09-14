/* LOREVI Architecture & Process v2
 * Canonical process/components contract shared by Web rendering and editing.
 * Directional connectors are emitted only for an explicit process mode.
 */
(function installArchitectureV2(global) {
  'use strict';

  const PROCESS_MODES = new Set(['process', 'flow', 'pipeline', 'sequence', 'workflow']);
  const RTL_LANGUAGES = new Set(['ar', 'fa']);

  function text(value) {
    return String(value ?? '').trim();
  }

  function firstText(...values) {
    for (const value of values) {
      const candidate = text(value);
      if (candidate) return candidate;
    }
    return '';
  }

  function language(value) {
    const raw = text(value || 'en').toLowerCase().replace(/_/g, '-');
    const base = raw.split('-')[0];
    return base === 'in' ? 'id' : base;
  }

  function canonicalMode(value) {
    return PROCESS_MODES.has(text(value).toLowerCase()) ? 'process' : 'components';
  }

  function explicitMode(section, root) {
    return canonicalMode(firstText(
      section?.mode,
      section?.layout,
      section?.kind,
      section?.type,
      root?.mode,
      root?.layout,
      root?.kind,
      root?.type
    ));
  }

  function normalize(value) {
    const source = Array.isArray(value)
      ? { sections: value }
      : value && typeof value === 'object'
        ? value
        : {};
    const sourceSections = Array.isArray(source.sections) ? source.sections : [];
    const rootMode = canonicalMode(firstText(source.mode, source.layout, source.kind, source.type));
    const sections = sourceSections.map(sectionValue => {
      const section = sectionValue && typeof sectionValue === 'object' && !Array.isArray(sectionValue)
        ? sectionValue
        : { title: text(sectionValue) };
      const mode = explicitMode(section, source);
      return {
        ...section,
        mode,
        layout: mode,
        items: Array.isArray(section.items) ? section.items : []
      };
    });

    return {
      ...source,
      mode: rootMode,
      sections
    };
  }

  function itemText(item) {
    if (item && typeof item === 'object' && !Array.isArray(item)) {
      return {
        title: firstText(item.title, item.name, item.label),
        description: firstText(item.description, item.text),
        type: text(item.type).toLowerCase()
      };
    }
    return { title: text(item), description: '', type: '' };
  }

  function fallbackEscape(value) {
    return text(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function connectorMarkup() {
    return '<span class="architecture-connector" aria-hidden="true"></span>';
  }

  function render(value, options = {}) {
    const root = normalize(value);
    const escape = typeof options.escapeHtml === 'function' ? options.escapeHtml : fallbackEscape;
    const locale = language(options.language);
    const direction = RTL_LANGUAGES.has(locale) ? 'rtl' : 'ltr';

    return root.sections.map((section, sectionIndex) => {
      const items = Array.isArray(section.items) ? section.items : [];
      if (!items.length) return '';
      const mode = explicitMode(section, root);
      const axis = mode === 'process' && items.length <= 4 ? 'horizontal' : 'vertical';
      const itemHtml = items.map((item, itemIndex) => {
        const data = itemText(item);
        const machineType = data.type ? ` data-item-type="${escape(data.type)}"` : '';
        const body = `
          <div class="architecture-item" role="listitem" data-item-index="${itemIndex}"${machineType}>
            <h4 data-editable="true">${escape(data.title)}</h4>
            ${data.description ? `<p data-editable="true">${escape(data.description)}</p>` : ''}
          </div>`;
        if (mode !== 'process' || itemIndex === items.length - 1) return body;
        return `${body}${connectorMarkup()}`;
      }).join('');

      return `
        <div class="architecture-section architecture-v11-section architecture-v2-section" data-section-index="${sectionIndex}" data-layout="${mode}" data-mode="${mode}">
          <h3 class="architecture-section-title" data-editable="true">${escape(firstText(section.title, section.name, section.label))}</h3>
          <div class="architecture-layout architecture-${mode}" role="list" data-flow-axis="${axis}" data-direction="${direction}">${itemHtml}</div>
        </div>`;
    }).join('');
  }

  function indexedSource(collection, rawIndex, fallbackIndex) {
    if (rawIndex === undefined || rawIndex === null || rawIndex === '') {
      return collection[fallbackIndex] || {};
    }
    const index = Number(rawIndex);
    return Number.isInteger(index) && index >= 0 ? (collection[index] || {}) : {};
  }

  function collect(container, baseValue, clean = text) {
    const baseRoot = normalize(baseValue);
    if (!container?.querySelectorAll) return baseRoot;
    const baseSections = baseRoot.sections;
    const sections = [...container.querySelectorAll(':scope > .architecture-section')]
      .map((sectionElement, sectionPosition) => {
        const baseSection = indexedSource(baseSections, sectionElement.dataset.sectionIndex, sectionPosition);
        const baseItems = Array.isArray(baseSection.items) ? baseSection.items : [];
        const mode = canonicalMode(firstText(sectionElement.dataset.mode, sectionElement.dataset.layout));
        const title = clean(sectionElement.querySelector('.architecture-section-title')?.innerText);
        const items = [...sectionElement.querySelectorAll('.architecture-item')]
          .map((itemElement, itemPosition) => {
            const baseItem = indexedSource(baseItems, itemElement.dataset.itemIndex, itemPosition);
            const titleValue = clean(itemElement.querySelector('h4')?.innerText);
            const description = clean(itemElement.querySelector('p')?.innerText);
            if (!titleValue && !description) return null;
            return { ...baseItem, title: titleValue, description };
          })
          .filter(Boolean);
        if (!title && !items.length) return null;
        return { ...baseSection, title, mode, layout: mode, items };
      })
      .filter(Boolean);

    return { ...baseRoot, sections };
  }

  global.LOREVIArchitectureV2 = Object.freeze({
    version: '2.0.0',
    canonicalMode,
    explicitMode,
    normalize,
    render,
    collect,
    connectorMarkup
  });
})(window);
