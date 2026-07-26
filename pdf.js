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
 *     -> browser download
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

const PDF_OPTION_LABELS = {
    header: 'Header',
    stats: 'Meeting Statistics',
    metrics: 'Key Metrics',
    summary: 'Executive Summary',
    decisions: 'Decisions',
    tasks: 'Tasks',
    risks: 'Risks',
    insights: 'Insights',
    owners: 'Owners',
    architecture: 'Architecture',
    footer: 'Footer'
};

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
     * Block IDs intentionally match block-registry.js:
     * header, stats, summary, decisions, tasks, risks,
     * insights, owners, architecture, metrics, footer.
     *
     * The engine receives only the current UI state.
     * It remains responsible for resolving enabled blocks,
     * creating the layout and rendering the PDF.
     */
    return {
        ...pdfBuilderOptions
    };
}

async function generateExecutivePdf() {
    const report = buildReportJson();
    const engine = getExecutiveSlideEngine();
    const options = buildEngineOptions();

    console.log('PDF Engine v2 input', {
        report,
        options
    });

    const result = await engine.generate(
        report,
        options
    );

    const blob = normalizePdfResult(result);
    const filename =
        sanitizePdfFilename(getPdfTitle()) +
        PDF_CONFIG.fileSuffix;

    downloadPdfBlob(blob, filename);

    console.log('PDF Engine v2 export complete', {
        filename,
        size: blob.size
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
    return Object.entries(pdfBuilderOptions)
        .map(([key, value]) => `
            <label class="mm-option">
                <input
                    type="checkbox"
                    data-option="${key}"
                    ${value ? 'checked' : ''}
                >
                <span>${PDF_OPTION_LABELS[key]}</span>
            </label>
        `)
        .join('');
}

function bindPdfOptions() {
    document
        .querySelectorAll('.mm-option input')
        .forEach(input => {
            input.addEventListener('change', event => {
                const key = event.target.dataset.option;

                if (!(key in pdfBuilderOptions)) {
                    return;
                }

                pdfBuilderOptions[key] =
                    event.target.checked;
            });
        });
}

function resetPdfBuilderOptions() {
    pdfBuilderOptions = {
        ...PDF_BUILDER_DEFAULT
    };
}

function setPdfExportPending(isPending) {
    const exportButton =
        document.querySelector(
            '[data-modal-action="export"], ' +
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
            title: 'PDF export failed',
            content: `
                <div class="mm-pdf-error">
                    ${escapePdfHtml(message)}
                </div>
            `,
            actions: [
                {
                    id: 'close',
                    label: 'Close',
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

    Modal.show({
        title: 'Export PDF',

        content: `
            <div class="mm-pdf-options">
                ${buildPdfOptionsHtml()}
            </div>
        `,

        actions: [
            {
                id: 'cancel',
                label: 'Cancel',
                onClick() {
                    Modal.close();
                }
            },

            {
                id: 'export',
                label: 'Export PDF',
                className:
                    'mm-modal-button-primary',

                async onClick() {
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
