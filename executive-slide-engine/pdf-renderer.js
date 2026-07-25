/**
 * Executive Slide Engine
 * PDF Renderer
 *
 * Converts a prepared layout into a PDF document.
 * This is the only module allowed to work directly
 * with the PDF library.
 */

export async function renderPdf({ report, blocks, layout }) {
    if (!report) {
        throw new Error("Report is required.");
    }

    if (!blocks) {
        throw new Error("Blocks are required.");
    }

    if (!layout) {
        throw new Error("Layout is required.");
    }

    throw new Error(
        "PDF rendering is not implemented yet."
    );
}
