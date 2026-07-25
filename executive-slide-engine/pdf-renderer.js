/*
 * MeetMind AI
 * Executive Slide Engine
 *
 * PDF Renderer
 */

(function (global) {

    'use strict';

    const engine = global.ExecutiveSlideEngine || {};

    // ============================================================
// DESIGN SYSTEM
// ============================================================

const DESIGN = {

    colors: {

        pageBackground: rgb(1.00, 1.00, 1.00),

        cardBackground: rgb(0.985, 0.985, 0.985),

        cardBorder: rgb(0.88, 0.88, 0.88),

        title: rgb(0.12, 0.12, 0.12),

        body: rgb(0.22, 0.22, 0.22),

        secondary: rgb(0.50, 0.50, 0.50),

        accent: rgb(0.12, 0.47, 0.92)

    },

    typography: {

        title: {
            size: 15,
            lineHeight: 18
        },

        subtitle: {
            size: 11,
            lineHeight: 14
        },

        body: {
            size: 9.5,
            lineHeight: 13
        },

        small: {
            size: 8,
            lineHeight: 10
        },

        metricValue: {
            size: 22,
            lineHeight: 24
        },

        metricLabel: {
            size: 8,
            lineHeight: 10
        }

    },

    hierarchy: {

        primary: {

            titleSize: 15,

            bodySize: 10

        },

        core: {

            titleSize: 13,

            bodySize: 9

        },

        supporting: {

            titleSize: 11,

            bodySize: 8.5

        },

        service: {

            titleSize: 10,

            bodySize: 8

        }

    },

    spacing: {

        cardPadding: 12,

        titleGap: 8,

        paragraphGap: 6,

        bulletGap: 5,

        sectionGap: 12

    },

    card: {

        radius: 8,

        borderWidth: 0.75

    },

    bullets: {

        radius: 1.8,

        indent: 10

    }

};

// ============================================================
// HELPERS
// ============================================================

function color(name) {

    return DESIGN.colors[name];

}

function style(role) {

    return DESIGN.hierarchy[role] ||
           DESIGN.hierarchy.core;

}

    // ============================================================
    // PUBLIC API
    // ============================================================

    async function renderPdf(report, layout) {

        const pdf = await PDFLib.PDFDocument.create();

        const page = pdf.addPage([
            layout.page.width,
            layout.page.height
        ]);

        // default font
        const font = await pdf.embedFont(
            PDFLib.StandardFonts.Helvetica
        );

        const context = {
            pdf,
            page,
            font,
            report,
            layout
        };

        for (const block of layout.blocks) {

            const renderer = BlockRenderers[block.id];

            if (renderer) {

                renderer(context, block);

            }

        }

        return await pdf.save();

    }

    // ============================================================
    // BLOCK RENDERERS
    // ============================================================

    const BlockRenderers = {

        header,

        summary,

        metrics,

        decisions,

        tasks,

        risks,

        insights,

        architecture,

        owners,

        stats,

        footer

    };

    // ============================================================
    // BLOCKS
    // ============================================================

    function header(ctx, block) {}

    function summary(ctx, block) {}

    function metrics(ctx, block) {}

    function decisions(ctx, block) {}

    function tasks(ctx, block) {}

    function risks(ctx, block) {}

    function insights(ctx, block) {}

    function architecture(ctx, block) {}

    function owners(ctx, block) {}

    function stats(ctx, block) {}

    function footer(ctx, block) {}

    // ============================================================
    // DRAWING API
    // ============================================================

    function drawCard(ctx, block) {}

    function drawTitle(ctx, block, title) {}

    function drawParagraph(ctx, block, text) {}

    function drawBulletList(ctx, block, items) {}

    function drawMetricGrid(ctx, block, metrics) {}

    function drawDivider(ctx, x, y, width) {}

    function drawText(ctx, options) {}

    function wrapText(text, width, font, size) {

        return [text];

    }

    function truncate(text, limit) {

        if (!text) return "";

        if (text.length <= limit) {

            return text;

        }

        return text.substring(0, limit - 1) + "…";

    }

    // ============================================================

    engine.renderer = {

        renderPdf

    };

    global.ExecutiveSlideEngine = engine;

})(window);
