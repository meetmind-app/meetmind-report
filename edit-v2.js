/* LOREVI Web Report Edit v2
 * Reversible add/remove controls for every repeatable report collection.
 * Controls live outside editable text and are excluded from serialization.
 */
(function installEditV2(global) {
  'use strict';

  const COPY = Object.freeze({
    en:{addBlock:'Add block',add:'Add item',remove:'Remove',newTitle:'New item',description:'Description',impact:'Impact',mitigation:'Mitigation',metric:'Metric',insight:'Insight',decision:'Decision',risk:'Risk',task:'Task',owner:'Owner',architecture:'Architecture section'},
    ru:{addBlock:'Добавить блок',add:'Добавить пункт',remove:'Удалить',newTitle:'Новый пункт',description:'Описание',impact:'Влияние',mitigation:'Меры',metric:'Метрика',insight:'Инсайт',decision:'Решение',risk:'Риск',task:'Задача',owner:'Владелец',architecture:'Раздел архитектуры'},
    es:{addBlock:'Añadir bloque',add:'Añadir elemento',remove:'Eliminar',newTitle:'Nuevo elemento',description:'Descripción',impact:'Impacto',mitigation:'Mitigación',metric:'Métrica',insight:'Hallazgo',decision:'Decisión',risk:'Riesgo',task:'Tarea',owner:'Responsable',architecture:'Sección de arquitectura'},
    pt:{addBlock:'Adicionar bloco',add:'Adicionar item',remove:'Remover',newTitle:'Novo item',description:'Descrição',impact:'Impacto',mitigation:'Mitigação',metric:'Métrica',insight:'Insight',decision:'Decisão',risk:'Risco',task:'Tarefa',owner:'Responsável',architecture:'Seção de arquitetura'},
    tr:{addBlock:'Blok ekle',add:'Öğe ekle',remove:'Kaldır',newTitle:'Yeni öğe',description:'Açıklama',impact:'Etki',mitigation:'Önlem',metric:'Metrik',insight:'İçgörü',decision:'Karar',risk:'Risk',task:'Görev',owner:'Sorumlu',architecture:'Mimari bölümü'},
    id:{addBlock:'Tambah blok',add:'Tambah item',remove:'Hapus',newTitle:'Item baru',description:'Deskripsi',impact:'Dampak',mitigation:'Mitigasi',metric:'Metrik',insight:'Insight',decision:'Keputusan',risk:'Risiko',task:'Tugas',owner:'Penanggung jawab',architecture:'Bagian arsitektur'},
    hi:{addBlock:'ब्लॉक जोड़ें',add:'आइटम जोड़ें',remove:'हटाएँ',newTitle:'नया आइटम',description:'विवरण',impact:'प्रभाव',mitigation:'निवारण',metric:'मेट्रिक',insight:'इनसाइट',decision:'निर्णय',risk:'जोखिम',task:'कार्य',owner:'जिम्मेदार',architecture:'आर्किटेक्चर अनुभाग'},
    ar:{addBlock:'إضافة قسم',add:'إضافة عنصر',remove:'إزالة',newTitle:'عنصر جديد',description:'الوصف',impact:'الأثر',mitigation:'التخفيف',metric:'مؤشر',insight:'رؤية',decision:'قرار',risk:'مخاطرة',task:'مهمة',owner:'مسؤول',architecture:'قسم البنية'},
    uz:{addBlock:'Blok qo‘shish',add:'Band qo‘shish',remove:'O‘chirish',newTitle:'Yangi band',description:'Tavsif',impact:'Ta’sir',mitigation:'Chora',metric:'Ko‘rsatkich',insight:'Xulosa',decision:'Qaror',risk:'Xatar',task:'Vazifa',owner:'Mas’ul',architecture:'Arxitektura bo‘limi'},
    fa:{addBlock:'افزودن بخش',add:'افزودن مورد',remove:'حذف',newTitle:'مورد جدید',description:'توضیحات',impact:'اثر',mitigation:'کاهش ریسک',metric:'شاخص',insight:'بینش',decision:'تصمیم',risk:'ریسک',task:'وظیفه',owner:'مسئول',architecture:'بخش معماری'}
  });
  const KINDS = ['metric','insight','decision','risk','task','owner','architecture'];

  function language() {
    const raw = String(typeof currentLang === 'undefined' ? 'en' : currentLang).toLowerCase().replace(/_/g, '-');
    const base = raw.split('-')[0] === 'in' ? 'id' : raw.split('-')[0];
    return COPY[base] ? base : 'en';
  }
  function copy() { return COPY[language()]; }
  function element(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }
  function editable(tag, className, placeholder) {
    const node = element(tag, className);
    node.dataset.editable = 'true';
    node.dataset.placeholder = placeholder;
    node.contentEditable = 'true';
    node.spellcheck = true;
    node.classList.add('editable-field');
    node.addEventListener('keydown', event => {
      if (event.key === 'Enter') event.preventDefault();
    });
    return node;
  }
  function button(action, kind, symbol, label) {
    const node = element('button', `edit-v2-control edit-v2-${action}`, symbol);
    node.type = 'button';
    node.dataset.editV2Action = action;
    node.dataset.editV2Kind = kind;
    node.title = label;
    node.setAttribute('aria-label', label);
    node.contentEditable = 'false';
    return node;
  }
  function addButton(kind) { return button('add', kind, '+', copy().add); }
  function removeButton(kind) { return button('remove', kind, '×', copy().remove); }
  function appendOnce(container, selector, node) {
    if (container && !container.querySelector(selector)) container.appendChild(node);
  }
  function decorateHeading(selector, kind) {
    const heading = document.querySelector(selector);
    if (!heading) return;
    heading.classList.add('edit-v2-heading');
    appendOnce(heading, `.edit-v2-add[data-edit-v2-kind="${kind}"]`, addButton(kind));
  }
  function dynamicKind(section) {
    return ['insights','decisions','risks'].find(name => section.classList.contains(name)) || '';
  }
  function normalizeTaskKeys() {
    document.querySelectorAll('.task-table tbody tr').forEach((row,index)=>row.dataset.editV2Key=String(index));
    document.querySelectorAll('.task-cards .task-card').forEach((card,index)=>card.dataset.editV2Key=String(index));
  }
  function normalizeMetricGrid() {
    const grid=document.getElementById('metricsContent');
    if(!grid)return;
    const count=grid.querySelectorAll('.metric-card').length;
    if(count)grid.style.setProperty('--metric-cols',count===5?3:(count>=7?4:count));
  }
  function normalizeArchitectureConnectors(section) {
    if (!section) return;
    section.querySelectorAll('.architecture-connector').forEach(node => node.remove());
    const layout = section.querySelector('.architecture-layout');
    if (!layout || section.dataset.mode !== 'process') return;
    const items = [...layout.querySelectorAll(':scope > .architecture-item')];
    items.slice(0,-1).forEach(item => item.insertAdjacentHTML('afterend', '<span class="architecture-connector" aria-hidden="true"></span>'));
  }

  function decorate() {
    decorateHeading('#metricsSection > h2','metric');
    decorateHeading('#tasksSection > h2','task');
    decorateHeading('#ownersSection > h2','owner');
    decorateHeading('#architectureSection > h2','architecture');

    document.querySelectorAll('.highlight-section').forEach(section=>{
      const kind=dynamicKind(section);
      if (!kind) return;
      decorateHeading(`.highlight-section.${kind} > h3`,kind.slice(0,-1));
    });
    document.querySelectorAll('.metric-card').forEach(card=>appendOnce(card,'.edit-v2-remove',removeButton('metric')));
    document.querySelectorAll('.report-item').forEach(item=>{
      const kind=(item.dataset.section||dynamicKind(item.closest('.highlight-section'))||'insights').replace(/s$/,'');
      appendOnce(item,'.edit-v2-remove',removeButton(kind));
    });
    document.querySelectorAll('.owner-card').forEach(card=>appendOnce(card,'.edit-v2-remove',removeButton('owner')));
    document.querySelectorAll('.task-cards .task-card').forEach(card=>appendOnce(card,'.edit-v2-remove',removeButton('task')));

    const table=document.querySelector('.task-table');
    if(table){
      const head=table.querySelector('thead tr');
      if(head&&!head.querySelector('.edit-v2-table-control'))head.appendChild(element('th','edit-v2-table-control',''));
      table.querySelectorAll('tbody tr').forEach(row=>{
        if(row.querySelector('.edit-v2-table-control'))return;
        const cell=element('td','edit-v2-table-control');
        cell.appendChild(removeButton('task'));
        row.appendChild(cell);
      });
    }
    normalizeTaskKeys();
    normalizeMetricGrid();

    document.querySelectorAll('#architectureContent > .architecture-section').forEach(section=>{
      appendOnce(section,':scope > .edit-v2-remove',removeButton('architecture-section'));
      const title=section.querySelector(':scope > .architecture-section-title');
      if(title){
        // Keep controls outside contenteditable headings. Browsers preserve
        // contenteditable=false descendants during fill(), which can pollute
        // the serialized title or prevent replacement altogether.
        appendOnce(section,':scope > .edit-v2-add[data-edit-v2-kind="architecture-item"]',addButton('architecture-item'));
      }
      section.querySelectorAll('.architecture-item').forEach(item=>appendOnce(item,'.edit-v2-remove',removeButton('architecture-item')));
    });
    ensurePicker();
  }

  function ensurePicker() {
    let picker=document.getElementById('editV2BlockPicker');
    if(!picker){
      picker=element('div','edit-v2-block-picker');
      picker.id='editV2BlockPicker';
      picker.appendChild(element('span','edit-v2-picker-label',copy().addBlock));
      KINDS.forEach(kind=>{
        const label=copy()[kind];
        const control=element('button','edit-v2-picker-button',`+ ${label}`);
        control.type='button';
        control.dataset.editV2Action='add';
        control.dataset.editV2Kind=kind;
        picker.appendChild(control);
      });
      const anchor=document.getElementById('detailsSection')||document.getElementById('brandingFooter');
      anchor?.parentNode?.insertBefore(picker,anchor);
    }
    picker.classList.toggle('hidden',!document.body.classList.contains('edit-mode'));
  }

  function ensureDynamicSection(kind) {
    const plural=`${kind}s`;
    const grid=document.getElementById('insightsDecisionsRisksGrid');
    grid.classList.remove('hidden');
    let root=grid.querySelector('.dynamic-card.highlights');
    if(!root){root=element('section','dynamic-card highlights');grid.appendChild(root);}
    let section=root.querySelector(`.highlight-section.${plural}`);
    if(!section){
      section=element('div',`highlight-section ${plural}`);
      section.appendChild(element('h3','',typeof t==='function'?t(plural):copy()[kind]));
      section.appendChild(element('div','item-list'));
      root.appendChild(section);
    }
    return section;
  }

  function addDynamic(kind) {
    const section=ensureDynamicSection(kind);
    const item=element('div','report-item');
    item.dataset.section=`${kind}s`;
    item.appendChild(element('span','report-dot'));
    const editor=element('div','editable dynamic-item-editor');
    editor.dataset.editable='true';
    editor.dataset.field=`${kind}s`;
    editor.appendChild(editable('strong','',copy().newTitle));
    editor.appendChild(editable('div','item-description',copy().description));
    if(kind==='risk'){
      for(const [className,label] of [['risk-impact',copy().impact],['risk-mitigation',copy().mitigation]]){
        const supplement=element('div',`risk-supplement ${className}`);
        supplement.appendChild(element('strong','',`${label}:`));
        supplement.append(' ');
        supplement.appendChild(editable('span','',label));
        editor.appendChild(supplement);
      }
    }
    item.appendChild(editor);
    section.querySelector('.item-list').appendChild(item);
    return editor.querySelector('strong');
  }

  function addMetric() {
    const section=document.getElementById('metricsSection');
    section.classList.remove('hidden');
    const grid=document.getElementById('metricsContent');
    const card=element('div','metric-card metric-card-v11');
    card.appendChild(editable('div','metric-label',copy().metric));
    card.appendChild(editable('div','metric-value','0'));
    card.appendChild(editable('div','metric-context',copy().description));
    grid.appendChild(card);
    const count=grid.querySelectorAll('.metric-card').length;
    grid.style.setProperty('--metric-cols',count===5?3:(count>=7?4:count));
    return card.querySelector('.metric-label');
  }

  function ensureTasks() {
    const section=document.getElementById('tasksSection');
    section.classList.remove('hidden');
    const content=document.getElementById('tasksContent');
    if(!content.querySelector('.task-table')){
      content.innerHTML=`<table class="task-table"><thead><tr><th>${escapeHtml(t('task'))}</th><th>${escapeHtml(t('owner'))}</th><th>${escapeHtml(t('dueDate'))}</th></tr></thead><tbody></tbody></table><div class="task-cards"></div>`;
    }
    return content;
  }
  function addTask() {
    const content=ensureTasks();
    const row=element('tr');
    const taskCell=editable('td','',copy().task);
    row.appendChild(taskCell);
    row.appendChild(editable('td','',copy().owner));
    const dueCell=element('td');
    dueCell.appendChild(editable('span','due-badge',typeof t==='function'?t('dueDate'):''));
    row.appendChild(dueCell);
    content.querySelector('tbody').appendChild(row);

    const card=element('div','task-card');
    card.appendChild(editable('div','task-title',copy().task));
    const owner=element('div','task-meta task-owner');
    owner.appendChild(element('strong','',`${t('owner')}:`));
    owner.appendChild(editable('span','',copy().owner));
    card.appendChild(owner);
    const due=element('div','task-meta task-due');
    due.appendChild(element('strong','',`${t('dueDate')}:`));
    due.appendChild(editable('span','due-badge',t('dueDate')));
    card.appendChild(due);
    content.querySelector('.task-cards').appendChild(card);
    return window.matchMedia('(max-width: 767px)').matches?card.querySelector('.task-title'):taskCell;
  }

  function addOwner() {
    const section=document.getElementById('ownersSection');
    const details=document.getElementById('detailsSection');
    const detailsContent=document.getElementById('detailsContent');
    section.classList.remove('hidden');details.classList.remove('hidden');detailsContent.classList.remove('hidden');
    const card=element('div','owner-card');
    card.appendChild(element('div','owner-avatar','+'));
    const body=element('div');
    const name=editable('div','owner-name',copy().owner);
    body.appendChild(name);
    body.appendChild(editable('div','owner-role',copy().description));
    card.appendChild(body);
    document.getElementById('ownersContent').appendChild(card);
    return name;
  }

  function architectureItem() {
    const item=element('div','architecture-item');
    item.setAttribute('role','listitem');
    item.appendChild(editable('h4','',copy().newTitle));
    item.appendChild(editable('p','',copy().description));
    return item;
  }
  function addArchitectureSection() {
    const outer=document.getElementById('architectureSection');
    const details=document.getElementById('detailsSection');
    const detailsContent=document.getElementById('detailsContent');
    outer.classList.remove('hidden');details.classList.remove('hidden');detailsContent.classList.remove('hidden');
    const section=element('div','architecture-section architecture-v11-section architecture-v2-section');
    section.dataset.layout='components';section.dataset.mode='components';
    const title=editable('h3','architecture-section-title',copy().architecture);
    section.appendChild(title);
    const layout=element('div','architecture-layout architecture-components');
    layout.setAttribute('role','list');layout.dataset.flowAxis='vertical';
    layout.dataset.direction=['ar','fa'].includes(language())?'rtl':'ltr';
    layout.appendChild(architectureItem());
    section.appendChild(layout);
    document.getElementById('architectureContent').appendChild(section);
    return title;
  }
  function addArchitectureItem(trigger) {
    const section=trigger.closest('.architecture-v2-section');
    if(!section)return addArchitectureSection();
    const item=architectureItem();
    section.querySelector('.architecture-layout').appendChild(item);
    normalizeArchitectureConnectors(section);
    return item.querySelector('h4');
  }

  function remove(trigger,kind) {
    if(kind==='task'){
      const holder=trigger.closest('[data-edit-v2-key]');
      const key=holder?.dataset.editV2Key;
      if(key!==undefined)document.querySelectorAll(`[data-edit-v2-key="${key}"]`).forEach(node=>node.remove());
    }else if(kind==='metric')trigger.closest('.metric-card')?.remove();
    else if(['insight','decision','risk'].includes(kind))trigger.closest('.report-item')?.remove();
    else if(kind==='owner')trigger.closest('.owner-card')?.remove();
    else if(kind==='architecture-item'){
      const section=trigger.closest('.architecture-v2-section');
      trigger.closest('.architecture-item')?.remove();
      normalizeArchitectureConnectors(section);
    }else if(kind==='architecture-section')trigger.closest('.architecture-v2-section')?.remove();
    if(typeof cleanupEmptyDynamicItems==='function')cleanupEmptyDynamicItems();
    cleanupStructure();
  }

  function cleanupStructure() {
    const metrics=document.querySelectorAll('#metricsContent .metric-card').length;
    document.getElementById('metricsSection')?.classList.toggle('hidden',metrics===0);
    normalizeMetricGrid();

    const taskRows=document.querySelectorAll('.task-table tbody tr').length;
    document.getElementById('tasksSection')?.classList.toggle('hidden',taskRows===0);
    document.getElementById('ownersSection')?.classList.toggle('hidden',!document.querySelector('.owner-card'));
    document.getElementById('architectureSection')?.classList.toggle('hidden',!document.querySelector('#architectureContent > .architecture-section'));

    const dynamic=document.querySelector('#insightsDecisionsRisksGrid .highlight-section');
    document.getElementById('insightsDecisionsRisksGrid')?.classList.toggle('hidden',!dynamic);
    const hasDetails=Boolean(document.querySelector('#architectureContent > .architecture-section,.owner-card'))||
      !document.getElementById('transcriptSection')?.classList.contains('hidden');
    document.getElementById('detailsSection')?.classList.toggle('hidden',!hasDetails);
  }

  function add(trigger,kind) {
    if(kind==='metric')return addMetric();
    if(['insight','decision','risk'].includes(kind))return addDynamic(kind);
    if(kind==='task')return addTask();
    if(kind==='owner')return addOwner();
    if(kind==='architecture-item')return addArchitectureItem(trigger);
    if(kind==='architecture')return addArchitectureSection();
    return null;
  }

  document.addEventListener('click',event=>{
    const trigger=event.target.closest('[data-edit-v2-action]');
    if(!trigger||!document.body.classList.contains('edit-mode'))return;
    event.preventDefault();event.stopPropagation();
    const action=trigger.dataset.editV2Action;
    const kind=trigger.dataset.editV2Kind;
    const focusTarget=action==='add'?add(trigger,kind):(remove(trigger,kind),null);
    decorate();
    focusTarget?.focus?.();
  });

  function sync(editing) {
    if(editing)decorate();
    else {
      document.querySelectorAll('.edit-v2-control').forEach(node=>node.remove());
      document.querySelectorAll('.edit-v2-table-control').forEach(node=>node.remove());
      document.querySelectorAll('.edit-v2-heading').forEach(node=>node.classList.remove('edit-v2-heading'));
    }
    const picker=document.getElementById('editV2BlockPicker');
    picker?.classList.toggle('hidden',!editing);
  }

  global.LOREVIEditV2=Object.freeze({version:'2.0.0',sync,decorate});
})(window);
