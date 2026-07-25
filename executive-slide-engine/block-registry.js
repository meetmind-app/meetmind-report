/*
 * MeetMind AI
 * Executive Slide Engine
 *
 * Block Registry
 */

(function (global) {
    'use strict';

    const engine = global.ExecutiveSlideEngine || {};

    const DEFAULT_BLOCKS = [
        'header',
        'stats',
        'summary',
        'decisions',
        'tasks',
        'risks',
        'insights',
        'owners',
        'architecture',
        'metrics',
        'footer'
    ];

    function hasContent(blockId, report) {

        switch (blockId) {

            case 'header':
                return true;

            case 'footer':
                return true;

            case 'summary':
                return !!report.summary;

            case 'stats':
                return Object.keys(report.stats || {}).length > 0;

            case 'decisions':
                return report.decisions.length > 0;

            case 'tasks':
                return report.tasks.length > 0;

            case 'risks':
                return report.risks.length > 0;

            case 'insights':
                return report.insights.length > 0;

            case 'owners':
                return report.owners.length > 0;

            case 'architecture':
                return report.architecture.length > 0;

            case 'metrics':
                return report.metrics.length > 0;

            default:
                return false;
        }

    }

    function getEnabledBlocks(report, options = {}) {

        const enabled = options.enabledBlocks || DEFAULT_BLOCKS;

        return enabled
            .filter(block => hasContent(block, report))
            .map(block => ({
                id: block
            }));

    }

    engine.blocks = {
        DEFAULT_BLOCKS,
        getEnabledBlocks
    };

    global.ExecutiveSlideEngine = engine;

})(window);
