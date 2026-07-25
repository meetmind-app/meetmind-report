import {
    PDFDocument,
    StandardFonts,
    rgb
} from "pdf-lib";

/**
 * Executive Slide Engine
 * PDF Renderer
 */

export async function renderPdf({
    report,
    blocks,
    layout
}) {
    if (!report) {
        throw new Error("Report is required.");
    }

    const pdf = await PDFDocument.create();

    const page = pdf.addPage([842, 595]);

    const font = await pdf.embedFont(StandardFonts.Helvetica);

    page.drawText(report.title || "Untitled Meeting", {
        x: 40,
        y: 555,
        size: 24,
        font,
        color: rgb(0.15, 0.15, 0.15)
    });

    const pdfBytes = await pdf.save();

    return pdfBytes;
}
