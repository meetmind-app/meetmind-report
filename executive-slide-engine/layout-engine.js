/*
 * MeetMind AI
 * Executive Slide Engine
 *
 * Layout Engine
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

        gap: 16

    };

    function createLayout(report, blocks) {

        let y = PAGE.margin.top;

        const layout = [];

        blocks.forEach(block => {

            const height = estimateHeight(block.id);

            layout.push({

                id: block.id,

                x: PAGE.margin.left,

                y,

                width:
                    PAGE.width -
                    PAGE.margin.left -
                    PAGE.margin.right,

                height

            });

            y += height + PAGE.gap;

        });

        return {

            page: PAGE,

            blocks: layout

        };

    }

    function estimateHeight(blockId) {

        switch (blockId) {

            case 'header':
                return 60;

            case 'stats':
                return 40;

            case 'summary':
                return 90;

            case 'decisions':
                return 70;

            case 'tasks':
                return 100;

            case 'risks':
                return 60;

            case 'insights':
                return 60;

            case 'owners':
                return 60;

            case 'architecture':
                return 80;

            case 'metrics':
                return 60;

            case 'footer':
                return 28;

            default:
                return 50;

        }

    }

    engine.layout = {

        PAGE,

        createLayout

    };

    global.ExecutiveSlideEngine = engine;

})(window);
