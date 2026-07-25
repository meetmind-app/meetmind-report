/**
 * Executive Slide Engine
 * PDF Renderer
 *
 * Temporary renderer.
 * Later this module will generate the PDF.
 */

export async function renderPdf({
    report,
    blocks,
    layout
}) {
    return {
        report,
        blocks,
        layout
    };
}
