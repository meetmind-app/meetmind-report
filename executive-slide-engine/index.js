import { normalizeReport } from "./schema.js";
import { getEnabledBlocks } from "./block-registry.js";
import { createLayout } from "./layout-engine.js";
import { renderPdf } from "./pdf-renderer.js";

export async function generate(reportJson, options = {}) {
    const report = normalizeReport(reportJson);

    const blocks = getEnabledBlocks(options);

    const layout = createLayout(blocks);

    return renderPdf({
        report,
        blocks,
        layout
    });
}
