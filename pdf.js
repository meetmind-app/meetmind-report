/*
 * MeetMind AI
 * Executive PDF Generator v2
 *
 * Entry point for the Executive Slide Engine.
 *
 * Pipeline:
 * buildReportJson()
 *     -> ExecutiveSlideEngine.generate(report, options)
 *     -> Uint8Array / ArrayBuffer / Blob
 *     -> native mobile file share / browser download
 *
 * Patch 7.3.3:
 * Mobile Telegram WebViews receive the generated PDF as a File instead of
 * opening an ephemeral blob: URL that Telegram may share as a broken link.
 */

'use strict';

const PDF_CONFIG = {
    fileSuffix: ' - MeetMind AI.pdf'
};

const PDF_BUILDER_DEFAULT = {
    header: true,
    stats: true,
    metrics: true,
    summary: true,
    decisions: true,
    tasks: true,
    risks: true,
    insights: true,
    owners: true,
    architecture: true,
    footer: true
};

const PDF_SELECTABLE_OPTIONS = [
    'stats',
    'metrics',
    'summary',
    'decisions',
    'tasks',
    'risks',
    'insights',
    'owners',
    'architecture'
];

const PDF_UI_I18N = {
    en: {
        title: 'Export PDF',
        hint: 'Choose sections to include in the PDF',
        cancel: 'Cancel',
        export: 'Generate PDF',
        errorTitle: 'PDF export failed',
        close: 'Close',
        options: { stats: 'Meeting Statistics', metrics: 'Key Metrics', summary: 'Executive Summary', decisions: 'Decisions', tasks: 'Tasks', risks: 'Risks', insights: 'Insights', owners: 'Owners', architecture: 'Architecture & Process' }
    },
    ru: {
        title: 'Экспорт PDF',
        hint: 'Выберите разделы для PDF',
        cancel: 'Отмена',
        export: 'Сгенерировать PDF',
        errorTitle: 'Не удалось создать PDF',
        close: 'Закрыть',
        options: { stats: 'Статистика встречи', metrics: 'Ключевые метрики', summary: 'Резюме встречи', decisions: 'Решения', tasks: 'Задачи', risks: 'Риски', insights: 'Инсайты', owners: 'Владельцы', architecture: 'Архитектура и процесс' }
    },
    es: {
        title: 'Exportar PDF',
        hint: 'Elige las secciones que se incluirán en el PDF',
        cancel: 'Cancelar',
        export: 'Generar PDF',
        errorTitle: 'No se pudo exportar el PDF',
        close: 'Cerrar',
        options: { stats: 'Estadísticas de la reunión', metrics: 'Métricas clave', summary: 'Resumen ejecutivo', decisions: 'Decisiones', tasks: 'Tareas', risks: 'Riesgos', insights: 'Insights', owners: 'Responsables', architecture: 'Arquitectura y proceso' }
    },
    pt: {
        title: 'Exportar PDF',
        hint: 'Escolha as seções que serão incluídas no PDF',
        cancel: 'Cancelar',
        export: 'Gerar PDF',
        errorTitle: 'Falha ao exportar PDF',
        close: 'Fechar',
        options: { stats: 'Estatísticas da reunião', metrics: 'Métricas principais', summary: 'Resumo executivo', decisions: 'Decisões', tasks: 'Tarefas', risks: 'Riscos', insights: 'Insights', owners: 'Responsáveis', architecture: 'Arquitetura e processo' }
    },
    tr: {
        title: 'PDF dışa aktar',
        hint: 'PDF’ye dahil edilecek bölümleri seçin',
        cancel: 'İptal',
        export: 'PDF oluştur',
        errorTitle: 'PDF dışa aktarılamadı',
        close: 'Kapat',
        options: { stats: 'Toplantı istatistikleri', metrics: 'Temel metrikler', summary: 'Yönetici özeti', decisions: 'Kararlar', tasks: 'Görevler', risks: 'Riskler', insights: 'İçgörüler', owners: 'Sorumlular', architecture: 'Mimari ve süreç' }
    },
    id: {
        title: 'Ekspor PDF',
        hint: 'Pilih bagian yang akan disertakan dalam PDF',
        cancel: 'Batal',
        export: 'Buat PDF',
        errorTitle: 'Ekspor PDF gagal',
        close: 'Tutup',
        options: { stats: 'Statistik rapat', metrics: 'Metrik utama', summary: 'Ringkasan eksekutif', decisions: 'Keputusan', tasks: 'Tugas', risks: 'Risiko', insights: 'Insight', owners: 'Penanggung jawab', architecture: 'Arsitektur & proses' }
    },
    hi: {
        title: 'PDF एक्सपोर्ट करें',
        hint: 'PDF में शामिल किए जाने वाले सेक्शन चुनें',
        cancel: 'रद्द करें',
        export: 'PDF बनाएँ',
        errorTitle: 'PDF एक्सपोर्ट नहीं हो सका',
        close: 'बंद करें',
        options: { stats: 'मीटिंग आँकड़े', metrics: 'मुख्य मेट्रिक्स', summary: 'एग्जीक्यूटिव सारांश', decisions: 'निर्णय', tasks: 'कार्य', risks: 'जोखिम', insights: 'इनसाइट्स', owners: 'जिम्मेदार', architecture: 'आर्किटेक्चर और प्रक्रिया' }
    },
    ar: {
        title: 'تصدير PDF',
        hint: 'اختر الأقسام التي تريد تضمينها في ملف PDF',
        cancel: 'إلغاء',
        export: 'إنشاء PDF',
        errorTitle: 'تعذر تصدير ملف PDF',
        close: 'إغلاق',
        options: { stats: 'إحصاءات الاجتماع', metrics: 'المؤشرات الرئيسية', summary: 'الملخص التنفيذي', decisions: 'القرارات', tasks: 'المهام', risks: 'المخاطر', insights: 'الرؤى', owners: 'المسؤولون', architecture: 'البنية والعملية' }
    },
    uz: {
        title: 'PDF eksport',
        hint: 'PDF fayliga kiritiladigan bo‘limlarni tanlang',
        cancel: 'Bekor qilish',
        export: 'PDF yaratish',
        errorTitle: 'PDF eksport qilib bo‘lmadi',
        close: 'Yopish',
        options: { stats: 'Uchrashuv statistikasi', metrics: 'Asosiy ko‘rsatkichlar', summary: 'Ijrochi xulosa', decisions: 'Qarorlar', tasks: 'Vazifalar', risks: 'Xatarlar', insights: 'Tahlillar', owners: 'Mas’ullar', architecture: 'Arxitektura va jarayon' }
    },
    fa: {
        title: 'خروجی PDF',
        hint: 'بخش‌هایی را که می‌خواهید در PDF باشند انتخاب کنید',
        cancel: 'لغو',
        export: 'ساخت PDF',
        errorTitle: 'خروجی PDF ناموفق بود',
        close: 'بستن',
        options: { stats: 'آمار جلسه', metrics: 'شاخص‌های کلیدی', summary: 'خلاصه مدیریتی', decisions: 'تصمیم‌ها', tasks: 'وظایف', risks: 'ریسک‌ها', insights: 'بینش‌ها', owners: 'مسئولان', architecture: 'معماری و فرایند' }
    }
};

function getPdfUiLanguage() {
    const raw = currentMeeting?.report_language || currentMeeting?.language || currentLang || document.documentElement.lang || 'en';
    const lang = String(raw).toLowerCase().split('-')[0];
    return PDF_UI_I18N[lang] ? lang : 'en';
}

function getPdfUiText() {
    return PDF_UI_I18N[getPdfUiLanguage()];
}


let pdfBuilderOptions = {
    ...PDF_BUILDER_DEFAULT
};

function sanitizePdfFilename(value) {
    return String(value || 'Meeting Report')
        .replace(/[\\/:*?"<>|]/g, '')
        .replace(/\s+/g, ' ')
        .trim();
}

function getPdfTitle() {
    return (
        currentMeeting?.meeting_title ||
        currentMeeting?.title ||
        currentMeeting?.report?.meeting_title ||
        currentMeeting?.report?.title ||
        document.querySelector('.editable-title')?.innerText ||
        'Meeting Report'
    );
}

function getExecutiveSlideEngine() {
    const engine = window.ExecutiveSlideEngine;

    if (!engine || typeof engine.generate !== 'function') {
        throw new Error(
            'Executive Slide Engine is unavailable. ' +
            'Make sure index.js and all engine modules are loaded before pdf.js.'
        );
    }

    return engine;
}

function buildEngineOptions() {
    /*
     * UI checkbox IDs use renderer-facing aliases (stats, summary, metrics, ...).
     * ExecutiveSlideEngine.normalizeVisibility() intentionally reads the
     * visibility object and maps those aliases to canonical Composition IDs.
     *
     * Keep the flat values as compatibility aliases, but visibility is the
     * authoritative contract for Composition.
     */
    const visibility = Object.fromEntries(
        PDF_SELECTABLE_OPTIONS.map(key => [
            key,
            pdfBuilderOptions[key] !== false
        ])
    );

    return {
        ...pdfBuilderOptions,
        header: true,
        footer: true,
        visibility
    };
}

async function loadPdfFont() {
    const response = await fetch(
        '../meetmind-pdf-engine/fonts/Inter-Regular.ttf'
    );

    if (!response.ok) {
        throw new Error(
            'Unable to load ../meetmind-pdf-engine/fonts/Inter-Regular.ttf'
        );
    }

    return new Uint8Array(
        await response.arrayBuffer()
    );
}


function enrichReportForExecutivePdf(report) {
    const enriched = { ...(report || {}) };

    // buildReportJson() currently normalizes DOM text and therefore destroys paragraph breaks.
    // PDF owns a presentation-preserving read of the same visible Summary block.
    const summaryEl = document.getElementById('summaryContent');
    const rawSummary = summaryEl?.innerText?.replace(/\r\n?/g, '\n').trim();
    if (rawSummary) {
        enriched.summary = rawSummary;
        enriched.executive_summary = rawSummary;
    }

    // Preserve meeting metadata from the source object even when buildReportJson() does not
    // explicitly project it into the UI-derived payload.
    const meeting = currentMeeting || {};
    const sourceReport = meeting.report || {};
    const metadata = sourceReport.metadata || meeting.metadata || {};
    const rawDate =
        enriched.date || enriched.meeting_date || enriched.meeting_datetime ||
        sourceReport.date || sourceReport.meeting_date || sourceReport.meeting_datetime ||
        meeting.date || meeting.meeting_date || meeting.meeting_datetime ||
        meeting.started_at || meeting.created_at ||
        sourceReport.started_at || sourceReport.created_at ||
        metadata.date || metadata.meeting_date || metadata.started_at || metadata.created_at ||
        null;

    if (rawDate) {
        enriched.date = rawDate;
        if (!enriched.meeting_date) enriched.meeting_date = rawDate;
    }

    // report_language is the canonical language stored on meetings.
    // Keep language as a compatibility alias for engine versions that read it from report.
    const rawLanguage =
        meeting.report_language || meeting.language || currentLang || 'en';
    const normalizedLanguage = String(rawLanguage).toLowerCase().split('-')[0];
    const language = PDF_UI_I18N[normalizedLanguage]
        ? normalizedLanguage
        : 'en';
    enriched.report_language = language;
    enriched.language = language;

    return enriched;
}

async function generateExecutivePdf() {
   // 6H.1: preserve source metadata (date) and Summary paragraph breaks
   // before the report enters Composition/Layout/Renderer.
   const report = enrichReportForExecutivePdf(buildReportJson());
   const engine = getExecutiveSlideEngine();
   const fontBytes = await loadPdfFont();
   const language = report.report_language || report.language || currentLang || 'en';
   const options = {
    ...buildEngineOptions(),
    fontBytes,
    // Pass both names intentionally: current engine can consume language,
    // while report_language mirrors the DB contract and keeps the boundary explicit.
    language,
    report_language: language
};

    console.log('PDF Engine v2 input', {
        report,
        options,
        visibility: options.visibility
    });

    const result = await engine.generate(
        report,
        options
    );

    const blob = normalizePdfResult(result);
    const filename =
        sanitizePdfFilename(getPdfTitle()) +
        PDF_CONFIG.fileSuffix;

    const delivery = await deliverPdfBlob(blob, filename);

    console.log('PDF Engine v2 export complete', {
        filename,
        size: blob.size,
        delivery
    });
}

function normalizePdfResult(result) {
    if (result instanceof Blob) {
        return result.type === 'application/pdf'
            ? result
            : new Blob(
                [result],
                { type: 'application/pdf' }
            );
    }

    if (result instanceof Uint8Array) {
        return new Blob(
            [result],
            { type: 'application/pdf' }
        );
    }

    if (result instanceof ArrayBuffer) {
        return new Blob(
            [new Uint8Array(result)],
            { type: 'application/pdf' }
        );
    }

    if (
        ArrayBuffer.isView(result) &&
        result.buffer instanceof ArrayBuffer
    ) {
        return new Blob(
            [
                new Uint8Array(
                    result.buffer,
                    result.byteOffset,
                    result.byteLength
                )
            ],
            { type: 'application/pdf' }
        );
    }

    throw new Error(
        'Executive Slide Engine returned an unsupported PDF result. ' +
        'Expected Blob, Uint8Array, ArrayBuffer or another ArrayBuffer view.'
    );
}

function isMobilePdfShareTarget() {
    const telegramPlatform = String(
        window.Telegram?.WebApp?.platform || ''
    ).toLowerCase();

    if (
        telegramPlatform === 'ios' ||
        telegramPlatform === 'android'
    ) {
        return true;
    }

    const userAgent = String(
        window.navigator?.userAgent || ''
    );

    return /Android|iPhone|iPad|iPod/i.test(userAgent);
}

function createPdfFile(blob, filename) {
    if (typeof File !== 'function') {
        return null;
    }

    return new File(
        [blob],
        filename,
        {
            type: 'application/pdf',
            lastModified: Date.now()
        }
    );
}

function canSharePdfFile(file) {
    if (
        !file ||
        typeof navigator.share !== 'function' ||
        typeof navigator.canShare !== 'function'
    ) {
        return false;
    }

    try {
        return navigator.canShare({ files: [file] });
    } catch (error) {
        console.warn(
            'PDF file sharing capability check failed.',
            error
        );

        return false;
    }
}

async function sharePdfFile(file) {
    try {
        // Do not include url/text: Telegram must receive the PDF itself,
        // never the temporary blob: address of the preview.
        await navigator.share({ files: [file] });
        return 'shared';
    } catch (error) {
        // User cancellation is a successful, intentional end state.
        // Falling back here would unexpectedly reopen the PDF preview.
        if (error?.name === 'AbortError') {
            return 'cancelled';
        }

        console.warn(
            'Native PDF file share failed; falling back to browser download.',
            error
        );

        return null;
    }
}

async function deliverPdfBlob(blob, filename) {
    if (isMobilePdfShareTarget()) {
        const file = createPdfFile(blob, filename);

        if (canSharePdfFile(file)) {
            const shareResult = await sharePdfFile(file);

            if (shareResult) {
                return shareResult;
            }
        }
    }

    downloadPdfBlob(blob, filename);
    return 'downloaded';
}

function downloadPdfBlob(blob, filename) {
    const objectUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');

    link.href = objectUrl;
    link.download = filename;
    link.style.display = 'none';

    document.body.appendChild(link);
    link.click();
    link.remove();

    /*
     * Revocation is delayed because some browsers begin reading
     * the object URL only after the click handler has completed.
     */
    window.setTimeout(() => {
        URL.revokeObjectURL(objectUrl);
    }, 1000);
}

function buildPdfOptionsHtml() {
    const ui = getPdfUiText();

    return PDF_SELECTABLE_OPTIONS
        .map(key => `
            <label class="mm-option">
                <input
                    type="checkbox"
                    data-option="${key}"
                    ${pdfBuilderOptions[key] ? 'checked' : ''}
                >
                <span>${ui.options[key]}</span>
            </label>
        `)
        .join('');
}


function syncPdfOptionsFromModal() {
    document
        .querySelectorAll('.mm-option input[data-option]')
        .forEach(input => {
            const key = input.dataset.option;

            if (PDF_SELECTABLE_OPTIONS.includes(key)) {
                pdfBuilderOptions[key] = input.checked;
            }
        });

    // Brand chrome is mandatory and is never user-selectable.
    pdfBuilderOptions.header = true;
    pdfBuilderOptions.footer = true;
}

function bindPdfOptions() {
    document
        .querySelectorAll('.mm-option input[data-option]')
        .forEach(input => {
            input.addEventListener('change', syncPdfOptionsFromModal);
            input.addEventListener('change', updatePdfExportButtonState);
        });

    updatePdfExportButtonState();
}

function resetPdfBuilderOptions() {
    pdfBuilderOptions = {
        ...PDF_BUILDER_DEFAULT
    };
}

function updatePdfExportButtonState() {
    const checkboxes = Array.from(
        document.querySelectorAll('.mm-option input[data-option]')
    );

    const exportButton = document.querySelector('.mm-modal-button-primary');

    if (!exportButton || checkboxes.length === 0) {
        return;
    }

    exportButton.disabled = !checkboxes.some(input => input.checked);
}

function setPdfExportPending(isPending) {
    const exportButton =
        document.querySelector(
            '[data-action="export"], ' +
            '#export, ' +
            '.mm-modal-button-primary'
        );

    if (!exportButton) {
        return;
    }

    exportButton.disabled = isPending;
    exportButton.setAttribute(
        'aria-busy',
        String(isPending)
    );
}

function showPdfExportError(error) {
    console.error(
        'PDF Engine v2 export failed',
        error
    );

    const message =
        error instanceof Error
            ? error.message
            : String(error);

    if (
        window.Modal &&
        typeof window.Modal.show === 'function'
    ) {
        window.Modal.show({
            title: getPdfUiText().errorTitle,
            content: `
                <div class="mm-pdf-error">
                    ${escapePdfHtml(message)}
                </div>
            `,
            actions: [
                {
                    id: 'close',
                    label: getPdfUiText().close,
                    onClick() {
                        Modal.close();
                    }
                }
            ]
        });

        return;
    }

    window.alert(
        `PDF export failed: ${message}`
    );
}

function escapePdfHtml(value) {
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function showPdfBuilder() {
    resetPdfBuilderOptions();
    const ui = getPdfUiText();

    Modal.show({
        title: ui.title,

        content: `
            <div class="mm-pdf-builder">
                <p class="mm-pdf-options-hint">${ui.hint}</p>
                <div class="mm-pdf-options">
                    ${buildPdfOptionsHtml()}
                </div>
            </div>
        `,

        actions: [
            {
                id: 'cancel',
                label: ui.cancel,
                onClick() {
                    Modal.close();
                }
            },

            {
                id: 'export',
                label: ui.export,
                className:
                    'mm-modal-button-primary',

                async onClick() {
                    // Read the live checkbox state immediately before generation.
                    // This makes the modal UI the source of truth for this export.
                    syncPdfOptionsFromModal();

                    const hasVisibleContent = PDF_SELECTABLE_OPTIONS.some(
                        key => pdfBuilderOptions[key] !== false
                    );

                    if (!hasVisibleContent) {
                        updatePdfExportButtonState();
                        return;
                    }

                    setPdfExportPending(true);

                    try {
                        await generateExecutivePdf();
                        Modal.close();
                    } catch (error) {
                        Modal.close();
                        showPdfExportError(error);
                    } finally {
                        setPdfExportPending(false);
                    }
                }
            }
        ]
    });

    bindPdfOptions();
}

window.PDFBuilder = {
    show: showPdfBuilder,
    generate: generateExecutivePdf
};
