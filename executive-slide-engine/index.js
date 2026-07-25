/*
 * MeetMind AI
 * Executive Slide Engine
 *
 * Public API and generation pipeline.
 *
 * This file does not render PDF directly.
 * It coordinates schema normalization,
 * block selection, layout calculation
 * and final PDF rendering.
 */

(function initializeExecutiveSlideEngine(global) {
    'use strict';

    const engine = global.ExecutiveSlideEngine || {};

    /**
     * Validates that an internal engine module is available.
     *
     * @param {string} moduleName
     * @param {string} methodName
     * @returns {Function}
     */
    function requireMethod(moduleName, methodName) {
        const module = engine[moduleName];
        const method = module?.[methodName];

        if (typeof method !== 'function') {
            throw new Error(
                `Executive Slide Engine: ${moduleName}.${methodName}() is not available.`
            );
        }

        return method;
    }

    /**
     * Generates an Executive PDF from a meeting report.
     *
     * @param {Object} reportJson Raw meeting report.
     * @param {Object} options Selected blocks and export settings.
     * @returns {Promise<Uint8Array>} Generated PDF bytes.
     */
    async function generate(reportJson, options = {}) {
        if (!reportJson || typeof reportJson !== 'object') {
            throw new Error(
                'Executive Slide Engine: reportJson must be an object.'
            );
        }

        const normalizeReport = requireMethod(
            'schema',
            'normalizeReport'
        );

        const getEnabledBlocks = requireMethod(
            'blocks',
            'getEnabledBlocks'
        );

        const createLayout = requireMethod(
            'layout',
            'createLayout'
        );

        const renderPdf = requireMethod(
            'renderer',
            'renderPdf'
        );

        const report = normalizeReport(reportJson);

        const blocks = getEnabledBlocks(
            report,
            options
        );

        const layout = createLayout(
            report,
            blocks,
            options
        );

        return renderPdf({
            report,
            blocks,
            layout,
            options
        });
    }

    engine.version = '2.0.0';
    engine.generate = generate;

    global.ExecutiveSlideEngine = engine;

})(window);
