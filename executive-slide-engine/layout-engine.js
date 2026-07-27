/*
 * MeetMind AI
 * Executive Slide Engine
 *
 * Layout Engine v1
 *
 * Visual hierarchy:
 *
 * Level 1:
 * Executive Summary + Key Metrics
 *
 * Level 2:
 * Decisions + Tasks + Risks + Insights
 *
 * Level 3:
 * Architecture
 *
 * Service information:
 * Owners + Meeting Statistics
 */

(function initializeLayoutEngine(global) {
    'use strict';

    const engine = global.ExecutiveSlideEngine || {};

    const PAGE = {
        width: 842,
        height: 595,

        margin: {
            top: 28,
            right: 32,
            bottom: 24,
            left: 32
        },

        gap: 10,
        columnGap: 12
    };

    const CONTENT_WIDTH =
        PAGE.width -
        PAGE.margin.left -
        PAGE.margin.right;

    const FOOTER_HEIGHT = 18;

    /**
     * Creates the complete one-page Executive Slide layout.
     *
     * Coordinates use top-left origin.
     *
     * @param {Object} report
     * @param {Array<{id: string}>} blocks
     * @returns {{
     *   page: Object,
     *   blocks: Array<Object>
     * }}
     */
    function createLayout(report, blocks) {
        const layout = [];

        let y = PAGE.margin.top;

        const footerY =
            PAGE.height -
            PAGE.margin.bottom -
            FOOTER_HEIGHT;

        // -----------------------------------------
        // DOCUMENT HEADER
        // -----------------------------------------

        if (exists('header')) {
            addBlock({
                id: 'header',
                x: PAGE.margin.left,
                y,
                width: CONTENT_WIDTH,
                height: 46,
                level: 0,
                role: 'document'
            });

            y += 46 + PAGE.gap;
        }

        // -----------------------------------------
        // LEVEL 1
        // SUMMARY + KEY METRICS
        // -----------------------------------------

        const hasSummary = exists('summary');
        const hasMetrics = exists('metrics');

        if (hasSummary || hasMetrics) {
            const heroHeight = estimateHeroHeight(report);

            if (hasSummary && hasMetrics) {
                const summaryWidth = Math.round(
                    (CONTENT_WIDTH - PAGE.columnGap) * 0.67
                );

                const metricsWidth =
                    CONTENT_WIDTH -
                    summaryWidth -
                    PAGE.columnGap;

                addBlock({
                    id: 'summary',
                    x: PAGE.margin.left,
                    y,
                    width: summaryWidth,
                    height: heroHeight,
                    level: 1,
                    role: 'primary'
                });

                addBlock({
                    id: 'metrics',
                    x:
                        PAGE.margin.left +
                        summaryWidth +
                        PAGE.columnGap,
                    y,
                    width: metricsWidth,
                    height: heroHeight,
                    level: 1,
                    role: 'primary'
                });
            } else {
                addBlock({
                    id: hasSummary ? 'summary' : 'metrics',
                    x: PAGE.margin.left,
                    y,
                    width: CONTENT_WIDTH,
                    height: heroHeight,
                    level: 1,
                    role: 'primary'
                });
            }

            y += heroHeight + PAGE.gap;
        }

        // -----------------------------------------
        // LEVEL 2
        // DECISIONS / TASKS / RISKS / INSIGHTS
        // -----------------------------------------

       const coreRows = [
    ['decisions', 'insights'],
    ['risks']
];

        coreRows.forEach(rowIds => {
            const visibleIds = rowIds.filter(exists);

            if (visibleIds.length === 0) {
                return;
            }

            const rowHeight = Math.max(
                ...visibleIds.map(id =>
                    estimateCoreHeight(id, report)
                )
            );

            if (visibleIds.length === 1) {
                addBlock({
                    id: visibleIds[0],
                    x: PAGE.margin.left,
                    y,
                    width: CONTENT_WIDTH,
                    height: rowHeight,
                    level: 2,
                    role: 'core'
                });
            } else {
                const columnWidth =
                    (CONTENT_WIDTH - PAGE.columnGap) / 2;

                addBlock({
                    id: visibleIds[0],
                    x: PAGE.margin.left,
                    y,
                    width: columnWidth,
                    height: rowHeight,
                    level: 2,
                    role: 'core'
                });

                addBlock({
                    id: visibleIds[1],
                    x:
                        PAGE.margin.left +
                        columnWidth +
                        PAGE.columnGap,
                    y,
                    width: columnWidth,
                    height: rowHeight,
                    level: 2,
                    role: 'core'
                });
            }

            y += rowHeight + PAGE.gap;
        });

        // -----------------------------------------
// TASKS
// -----------------------------------------

if (exists('tasks')) {

    const tasksHeight =
        estimateTasksHeight(report);

    addBlock({
        id: 'tasks',
        x: PAGE.margin.left,
        y,
        width: CONTENT_WIDTH,
        height: tasksHeight,
        level: 3,
        role: 'supporting'
    });

    y += tasksHeight + PAGE.gap;
}

        // -----------------------------------------
        // LEVEL 3
        // ARCHITECTURE
        // -----------------------------------------

        if (exists('architecture')) {
            const architectureHeight =
                estimateArchitectureHeight(report);

            addBlock({
                id: 'architecture',
                x: PAGE.margin.left,
                y,
                width: CONTENT_WIDTH,
                height: architectureHeight,
                level: 3,
                role: 'supporting'
            });

            y += architectureHeight + PAGE.gap;
        }

        // -----------------------------------------
        // SERVICE INFORMATION
        // OWNERS + MEETING STATISTICS
        // -----------------------------------------

        const serviceIds = [
            'owners',
            'stats'
        ].filter(exists);

        if (serviceIds.length > 0) {
            const serviceHeight = estimateServiceHeight(
                report,
                footerY - y
            );

            if (serviceIds.length === 1) {
                addBlock({
                    id: serviceIds[0],
                    x: PAGE.margin.left,
                    y,
                    width: CONTENT_WIDTH,
                    height: serviceHeight,
                    level: 4,
                    role: 'service'
                });
            } else {
                const columnWidth =
                    (CONTENT_WIDTH - PAGE.columnGap) / 2;

                addBlock({
                    id: serviceIds[0],
                    x: PAGE.margin.left,
                    y,
                    width: columnWidth,
                    height: serviceHeight,
                    level: 4,
                    role: 'service'
                });

                addBlock({
                    id: serviceIds[1],
                    x:
                        PAGE.margin.left +
                        columnWidth +
                        PAGE.columnGap,
                    y,
                    width: columnWidth,
                    height: serviceHeight,
                    level: 4,
                    role: 'service'
                });
            }
        }

        // -----------------------------------------
        // FIXED FOOTER
        // -----------------------------------------

        if (exists('footer')) {
            addBlock({
                id: 'footer',
                x: PAGE.margin.left,
                y: footerY,
                width: CONTENT_WIDTH,
                height: FOOTER_HEIGHT,
                level: 0,
                role: 'document'
            });
        }

        return {
            page: PAGE,
            blocks: layout,
            contentBottom: footerY
        };

        function exists(id) {
            return blocks.some(block => block.id === id);
        }

        function addBlock(block) {
            layout.push(block);
        }
    }

    /**
     * Calculates the height of the main Level 1 row.
     */
    function estimateHeroHeight(report) {
        const summaryLength =
            String(report.summary || '').length;

        if (summaryLength <= 220) {
            return 76;
        }

        if (summaryLength <= 450) {
            return 88;
        }

        return 98;
    }

    /**
     * Calculates Level 2 card height.
     *
     * Heights are capped because the Executive Slide
     * must remain a one-page summary.
     */
    function estimateCoreHeight(id, report) {
        const items = getItems(id, report);
        const count = items.length;

        const baseHeight = 38;

let itemHeight = 14;

switch (id) {

    case 'tasks':
        itemHeight = 24;
        break;

    case 'decisions':
    case 'insights':
    case 'risks':
        itemHeight = 18;
        break;
}

const desiredHeight =
    baseHeight +
    count * itemHeight;

const maxHeight =
    id === 'tasks'
        ? 180
        : 140;

return clamp(
    desiredHeight,
    66,
    maxHeight
);
}

    function estimateTasksHeight(report) {
    const count =
        Array.isArray(report.tasks)
            ? report.tasks.length
            : 0;
    return clamp(
        44 + count * 18,
        72,
        150
    );
}

    /**
     * Architecture remains compact and visually subordinate
     * to the main analytical blocks.
     */
    function estimateArchitectureHeight(report) {
        const count = Array.isArray(report.architecture)
            ? report.architecture.length
            : 0;

        return clamp(
            44 + count * 7,
            58,
            78
        );
    }

    /**
     * Owners and Statistics are service information.
     * They use only the space remaining above the footer.
     */
    function estimateServiceHeight(report, availableHeight) {
        const ownersCount = Array.isArray(report.owners)
            ? report.owners.length
            : 0;

        const desiredHeight = clamp(
            34 + ownersCount * 10,
            42,
            58
        );

        return Math.max(
            34,
            Math.min(desiredHeight, availableHeight)
        );
    }

    function getItems(id, report) {
        const value = report[id];

        return Array.isArray(value)
            ? value
            : [];
    }

    function clamp(value, min, max) {
        return Math.max(
            min,
            Math.min(value, max)
        );
    }

    engine.layout = {
        PAGE,
        createLayout
    };

    global.ExecutiveSlideEngine = engine;

})(window);
