/*
 * MeetMind AI
 * Executive Slide Engine
 *
 * Layout Engine v1
 */

(function (global) {
    'use strict';

    const engine = global.ExecutiveSlideEngine || {};

    const PAGE = {

        width: 842,
        height: 595,

        margin: {
            top: 32,
            right: 32,
            bottom: 32,
            left: 32
        },

        gap: 16,

        columnGap: 16

    };

    function createLayout(report, blocks) {

        const contentWidth =
            PAGE.width -
            PAGE.margin.left -
            PAGE.margin.right;

        const leftWidth = Math.floor((contentWidth - PAGE.columnGap) * 0.65);

        const rightWidth =
            contentWidth -
            leftWidth -
            PAGE.columnGap;

        let y = PAGE.margin.top;

        const layout = [];

        // ----------------------------
        // HEADER
        // ----------------------------

        addFull('header', 64);

        addFull('stats', 36);

        addFull('summary', estimateSummaryHeight(report));

        // ----------------------------
        // TWO COLUMN AREA
        // ----------------------------

        let leftY = y;
        let rightY = y;

        [
            'decisions',
            'tasks',
            'risks',
            'insights'
        ].forEach(id => {

            if (!exists(id)) return;

            layout.push({

                id,

                x: PAGE.margin.left,

                y: leftY,

                width: leftWidth,

                height: estimateBlockHeight(id, report)

            });

            leftY +=
                estimateBlockHeight(id, report) +
                PAGE.gap;

        });

        [
            'owners',
            'architecture',
            'metrics'
        ].forEach(id => {

            if (!exists(id)) return;

            layout.push({

                id,

                x:
                    PAGE.margin.left +
                    leftWidth +
                    PAGE.columnGap,

                y: rightY,

                width: rightWidth,

                height: estimateBlockHeight(id, report)

            });

            rightY +=
                estimateBlockHeight(id, report) +
                PAGE.gap;

        });

        y = Math.max(leftY, rightY);

        // ----------------------------
        // FOOTER
        // ----------------------------

        if (exists('footer')) {

            layout.push({

                id: 'footer',

                x: PAGE.margin.left,

                y,

                width: contentWidth,

                height: 24

            });

        }

        return {

            page: PAGE,

            blocks: layout

        };

        // ----------------------------

        function addFull(id, height) {

            if (!exists(id)) return;

            layout.push({

                id,

                x: PAGE.margin.left,

                y,

                width: contentWidth,

                height

            });

            y += height + PAGE.gap;

        }

        function exists(id) {

            return blocks.some(b => b.id === id);

        }

    }

    function estimateSummaryHeight(report) {

        const text = report.summary || '';

        if (text.length < 200) return 70;

        if (text.length < 450) return 95;

        return 120;

    }

    function estimateBlockHeight(id, report) {

        switch (id) {

            case 'tasks':
                return Math.max(
                    80,
                    report.tasks.length * 18 + 30
                );

            case 'decisions':
                return Math.max(
                    70,
                    report.decisions.length * 18 + 30
                );

            case 'risks':
                return Math.max(
                    60,
                    report.risks.length * 18 + 30
                );

            case 'insights':
                return Math.max(
                    60,
                    report.insights.length * 18 + 30
                );

            case 'owners':
                return Math.max(
                    60,
                    report.owners.length * 20 + 24
                );

            case 'architecture':
                return 100;

            case 'metrics':
                return 70;

            default:
                return 60;

        }

    }

    engine.layout = {

        PAGE,

        createLayout

    };

    global.ExecutiveSlideEngine = engine;

})(window);
