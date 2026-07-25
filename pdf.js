/*
 * MeetMind AI
 * Executive PDF Generator
 */

'use strict';
const PDF_CONFIG = {
    pageWidth: 1280,
    pageHeight: 720,
    fileSuffix: ' - MeetMind AI.pdf'
};


const PDF_BUILDER_DEFAULT = {
    header: true,
    statistics: true,
    keyMetrics: true,
    summary: true,
    findings: true,
    tasks: true,
    owners: true,
    architecture: true,
    footer: true
};

let pdfBuilderOptions = {
    ...PDF_BUILDER_DEFAULT
};

const PDF_OPTION_LABELS = {
    header: "Header",
    statistics: "Meeting Statistics",
    keyMetrics: "Key Metrics",
    summary: "Executive Summary",
    findings: "Insights",
    tasks: "Tasks",
    owners: "Owners",
    architecture: "Architecture",
    footer: "Footer"
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

function isPdfValueVisible(value) {
    return value !== null &&
        value !== undefined &&
        String(value).trim() !== '' &&
        value !== 'Не указано' &&
        value !== 'Not specified';
}

function normalizePdfItem(item) {
    if (typeof item === 'string') {
        return {
            title: item,
            details: ''
        };
    }
    
    const title = item.title || item.task || item.name || '';
    const details = [
        item.details,
        item.description,
        item.owner ? `Owner: ${item.owner}` : '',
        item.due_date ? `Due: ${item.due_date}` : '',
        item.dueDate ? `Due: ${item.dueDate}` : ''
    ]
        .filter(Boolean)
        .join(' · ');
    return {
        title,
        details
    };
}

async function evaluatePdfCandidate(report, candidateOptions) {
    const html = await MeetMindPDF.generate(
        report,
        candidateOptions
    );

    const root = document.createElement("div");
    root.className = "pdf-root";
    root.innerHTML = html;

    root.style.position = "fixed";
    root.style.left = "-100000px";
    root.style.top = "0";
    root.style.pointerEvents = "none";
    root.style.zIndex = "-1";

    root.style.width = PDF_CONFIG.pageWidth + "px";
    root.style.height = PDF_CONFIG.pageHeight + "px";

    document.body.appendChild(root);

    const measurement = LayoutEvaluator.measure(
        root.querySelector(".mm-report")
    );

    root.remove();
    return {
        html,
        measurement,
        options: candidateOptions
    };
}

async function findBestPdfCandidate(report) {
    const selected =
        await LayoutOptimizer.optimize({
            report,
            builderOptions: pdfBuilderOptions,
            evaluateCandidate:
                evaluatePdfCandidate,
            pageHeight:
                PDF_CONFIG.pageHeight
        });

    console.log("PDF LAYOUT RESULT", {
        fits: selected?.fits,
        overflow: selected?.overflow,
        height:
            selected?.measurement?.totalHeight,
        densityMode:
            selected?.options?.densityMode,
        layoutModes:
            selected?.options?.layoutModes,
        penalty:
            selected?.penalty
    });

    return selected;
}

async function generateExecutivePdf() {
    
    const report = buildReportJson();

    const bestCandidate = await findBestPdfCandidate(report);

    console.log("PDF EXPORT BEST:", bestCandidate.options.layoutModes);
    console.log("PDF EXPORT HEIGHT:", bestCandidate.measurement.totalHeight);

    const html = bestCandidate.html;

    const pdfRoot = document.createElement("div");
    pdfRoot.className = "pdf-root";

    pdfRoot.style.background = "#ffffff";
    pdfRoot.style.position = "fixed";
    pdfRoot.style.left = "-100000px";
    pdfRoot.style.top = "0";
    pdfRoot.style.pointerEvents = "none";
    pdfRoot.style.zIndex = "-1";
    pdfRoot.style.width = PDF_CONFIG.pageWidth + "px";

    pdfRoot.innerHTML = html;
    document.body.appendChild(pdfRoot);

    await new Promise(resolve => setTimeout(resolve, 500));

    const filename =
        sanitizePdfFilename(getPdfTitle()) +
        PDF_CONFIG.fileSuffix;

    const options = {
        margin: 0,
        filename,
        image: {
            type: "jpeg",
            quality: 1
        },
        html2canvas: {
            scale: 2,
            useCORS: true
        },
        jsPDF: {
            unit: "px",
            format: [PDF_CONFIG.pageWidth, PDF_CONFIG.pageHeight],
            orientation: "landscape"
        }
    };

    try {
        await html2pdf()
            .set(options)
            .from(pdfRoot.querySelector(".mm-report"))
            .save();
    } finally {
        pdfRoot.remove();
    }
}

function buildPdfOptionsHtml() {
    return Object.entries(pdfBuilderOptions)
        .map(([key, value]) => `
            <label class="mm-option">
                <input
                    type="checkbox"
                    data-option="${key}"
                    ${value ? "checked" : ""}
                >
                <span>${PDF_OPTION_LABELS[key]}</span>
            </label>
        `)
        .join("");
}

function bindPdfOptions() {
    document
        .querySelectorAll(".mm-option input")
        .forEach(input => {
            input.addEventListener("change", event => {
                const key = event.target.dataset.option;
                pdfBuilderOptions[key] = event.target.checked;
                console.log(
                    "PDF option:",
                    key,
                    pdfBuilderOptions[key]
                );
            });
        });
}

function resetPdfBuilderOptions() {
    pdfBuilderOptions = {
        ...PDF_BUILDER_DEFAULT
    };
}

function showPdfBuilder() {
    resetPdfBuilderOptions();
    const optionsHtml = buildPdfOptionsHtml();
    
    Modal.show({
        title: "Export PDF",
        
        content: `
    <div class="mm-pdf-options">
        ${optionsHtml}
    </div>
`,

       actions: [
    {
        id: "cancel",
        label: "Cancel",
        onClick() {
            Modal.close();
        }
    },

    {
        id: "export",
        label: "Export PDF",
        className: "mm-modal-button-primary",
        async onClick() {
            Modal.close();
            await generateExecutivePdf();
        }
    }
]
    });
    
bindPdfOptions();
}

window.PDFBuilder = {
    show: showPdfBuilder
};
    

    
