import { normalizeReport } from "./schema.js";
import { getEnabledBlocks } from "./block-registry.js";
import { createLayout } from "./layout-engine.js";
import { renderPdf } from "./pdf-renderer.js";

async function generate(reportJson, options = {}) {

    const report = normalizeReport(reportJson);

    const blocks = getEnabledBlocks(options);

    const layout = createLayout(blocks);

    return await renderPdf({
        report,
        blocks,
        layout
    });
}

window.ExecutiveSlideEngine = {
    generate
};

export {
    generate
};
