/*
 * MeetMind AI
 * Executive Slide Engine
 *
 * PDF Renderer v2
 *
 * Plain browser JavaScript.
 *
 * Requires pdf-lib to be loaded before this file:
 * <script src="https://unpkg.com/pdf-lib/dist/pdf-lib.min.js"></script>
 *
 * Public contract:
 *
 * ExecutiveSlideEngine.renderer.renderPdf({
 *     report,
 *     blocks,
 *     layout,
 *     options
 * })
 *
 * Returns:
 * Promise<Uint8Array>
 */

(function initializePdfRenderer(global) {
    'use strict';

    const engine = global.ExecutiveSlideEngine || {};

    // ============================================================
    // DESIGN SYSTEM
    // ============================================================

    const DESIGN = {
        colors: {
            pageBackground: [1.00, 1.00, 1.00],
            cardBackground: [0.985, 0.985, 0.985],
            serviceBackground: [1.00, 1.00, 1.00],
            cardBorder: [0.88, 0.88, 0.88],
            title: [0.12, 0.12, 0.12],
            body: [0.22, 0.22, 0.22],
            secondary: [0.50, 0.50, 0.50],
            accent: [0.12, 0.47, 0.92],
            white: [1.00, 1.00, 1.00]
        },

        typography: {
            headerTitle: {
                size: 20,
                lineHeight: 23
            },

            headerSubtitle: {
                size: 9,
                lineHeight: 12
            },

            small: {
                size: 7.5,
                lineHeight: 9.5
            },

            metricValue: {
                size: 18,
                lineHeight: 20
            },

            metricLabel: {
                size: 7,
                lineHeight: 9
            }
        },

        hierarchy: {
            primary: {
                titleSize: 12,
                bodySize: 9,
                lineHeight: 11.5
            },

            core: {
                titleSize: 10.5,
                bodySize: 8,
                lineHeight: 10.5
            },

            supporting: {
                titleSize: 9.5,
                bodySize: 7.5,
                lineHeight: 9.5
            },

            service: {
                titleSize: 8.5,
                bodySize: 7,
                lineHeight: 9
            },

            document: {
                titleSize: 10,
                bodySize: 8,
                lineHeight: 10
            }
        },

        spacing: {
            cardPadding: 10,
            titleGap: 6,
            paragraphGap: 5,
            bulletGap: 3,
            metricGap: 6
        },

        card: {
            borderWidth: 0.75
        },

        bullets: {
            radius: 1.4,
            indent: 9
        },

        limits: {
            summaryLines: 6,
            decisionItems: 5,
            taskItems: 6,
            riskItems: 4,
            insightItems: 4,
            ownerItems: 6,
            architectureItems: 16,
            metricItems: 6
        }
    };

    const REQUIRED_LAYOUT_FIELDS = [
        'id',
        'x',
        'y',
        'width',
        'height',
        'role'
    ];

    // ============================================================
    // PUBLIC API
    // ============================================================

    /**
     * Renders a normalized report using the calculated slide layout.
     *
     * This signature intentionally matches index.js:
     *
     * renderPdf({
     *     report,
     *     blocks,
     *     layout,
     *     options
     * })
     *
     * @param {{
     *   report: Object,
     *   blocks: Array<{id: string}>,
     *   layout: {
     *     page: {width: number, height: number},
     *     blocks: Array<Object>
     *   },
     *   options?: Object
     * }} input
     *
     * @returns {Promise<Uint8Array>}
     */
    async function renderPdf(input) {
        requirePdfLib();

        const payload = normalizeRenderInput(input);
        validateRenderInput(payload);

        const {
            report,
            blocks,
            layout,
            options
        } = payload;

        const {
            PDFDocument,
            StandardFonts
        } = global.PDFLib;

        const pdf = await PDFDocument.create();

        const page = pdf.addPage([
            layout.page.width,
            layout.page.height
        ]);

        const fonts = await loadFonts(
            pdf,
            StandardFonts,
            options,
            report
        );
        
        console.log('Loaded fonts', fonts);

        const enabledBlockIds = new Set(
            blocks.map(block => block.id)
        );

        const ctx = {
            pdf,
            page,
            fonts,
            report,
            blocks,
            enabledBlockIds,
            layout,
            options
        };

        drawPageBackground(ctx);

        layout.blocks.forEach(block => {
            if (!enabledBlockIds.has(block.id)) {
                return;
            }

            const renderer = BlockRenderers[block.id];

            if (typeof renderer !== 'function') {
                return;
            }

            renderer(ctx, block);
        });

        return pdf.save();
    }

    // ============================================================
    // BLOCK REGISTRY
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
    // BLOCK RENDERERS
    // ============================================================

    function header(ctx, block) {
        const report = ctx.report;

        const title = textValue(
            report.title,
            'Meeting Report'
        );

        const subtitleParts = [
            report.subtitle,
            report.meetingDate
        ].filter(Boolean);

        drawText(ctx, {
            text: title,
            x: block.x,
            yTop: block.y,
            size: DESIGN.typography.headerTitle.size,
            lineHeight:
                DESIGN.typography.headerTitle.lineHeight,
            colorName: 'title',
            fontName: 'bold',
            maxWidth: block.width,
            maxLines: 1
        });

        if (subtitleParts.length === 0) {
            return;
        }

        drawText(ctx, {
            text: subtitleParts.join(' • '),
            x: block.x,
            yTop:
                block.y +
                DESIGN.typography.headerTitle.lineHeight +
                3,
            size:
                DESIGN.typography.headerSubtitle.size,
            lineHeight:
                DESIGN.typography.headerSubtitle.lineHeight,
            colorName: 'secondary',
            fontName: 'regular',
            maxWidth: block.width,
            maxLines: 1
        });
    }

    function summary(ctx, block) {
        drawCard(ctx, block);

        drawTitle(
            ctx,
            block,
            'Executive Summary'
        );

        drawParagraph(
            ctx,
            block,
            ctx.report.summary,
            {
                maxLines:
                    DESIGN.limits.summaryLines
            }
        );
    }

    function metrics(ctx, block) {
        drawCard(ctx, block);

        drawTitle(
            ctx,
            block,
            'Key Metrics'
        );

        const metricsData = normalizeMetrics(
            ctx.report.metrics,
            ctx.report.stats
        );

        drawMetricGrid(
            ctx,
            block,
            metricsData.slice(
                0,
                DESIGN.limits.metricItems
            )
        );
    }

    function decisions(ctx, block) {
        drawCard(ctx, block);

        drawTitle(
            ctx,
            block,
            'Decisions'
        );

        drawBulletList(
            ctx,
            block,
            ctx.report.decisions,
            {
                maxItems:
                    DESIGN.limits.decisionItems
            }
        );
    }

    function tasks(ctx, block) {
        drawCard(ctx, block);

        drawTitle(
            ctx,
            block,
            'Tasks'
        );
      
        drawTaskList(
            ctx,
            block,
            ctx.report.tasks,
            {
                maxItems:
                    DESIGN.limits.taskItems,
                headerHeight: 12
            }
        );
    }

    function risks(ctx, block) {
        drawCard(ctx, block);

        drawTitle(
            ctx,
            block,
            'Risks'
        );

        drawBulletList(
            ctx,
            block,
            ctx.report.risks,
            {
                maxItems:
                    DESIGN.limits.riskItems
            }
        );
    }

    function insights(ctx, block) {
        drawCard(ctx, block);

        drawTitle(
            ctx,
            block,
            'Insights'
        );

        drawBulletList(
            ctx,
            block,
            ctx.report.insights,
            {
                maxItems:
                    DESIGN.limits.insightItems
            }
        );
    }

    function architecture(ctx, block) {
        drawCard(ctx, block);

        drawTitle(
            ctx,
            block,
            'Architecture'
        );

        drawArchitectureGrid(
            ctx,
            block,
            ctx.report.architecture
        );
    }

    function owners(ctx, block) {
        drawCard(
            ctx,
            block,
            {
                backgroundName:
                    'serviceBackground'
            }
        );

        drawTitle(
            ctx,
            block,
            'Owners'
        );

        drawCompactList(
            ctx,
            block,
            ctx.report.owners,
            {
                maxItems:
                    DESIGN.limits.ownerItems
            }
        );
    }

    function stats(ctx, block) {
        drawCard(
            ctx,
            block,
            {
                backgroundName:
                    'serviceBackground'
            }
        );

        drawTitle(
            ctx,
            block,
            'Meeting Statistics'
        );

        drawStatsLine(
            ctx,
            block,
            ctx.report.stats
        );
    }

    function footer(ctx, block) {
        const footerText = textValue(
            ctx.options.footerText,
            'Generated by MeetMind AI'
        );

        drawDivider(
            ctx,
            block.x,
            block.y,
            block.width
        );

        drawText(ctx, {
            text: footerText,
            x: block.x,
            yTop: block.y + 6,
            size:
                DESIGN.typography.small.size,
            lineHeight:
                DESIGN.typography.small.lineHeight,
            colorName: 'secondary',
            fontName: 'regular',
            maxWidth: block.width,
            maxLines: 1
        });
    }

    // ============================================================
    // DRAWING API
    // ============================================================

    function drawPageBackground(ctx) {
        const pageSize =
            ctx.page.getSize();

        ctx.page.drawRectangle({
            x: 0,
            y: 0,
            width: pageSize.width,
            height: pageSize.height,
            color:
                color('pageBackground')
        });
    }

    function drawCard(
        ctx,
        block,
        options = {}
    ) {
        const backgroundName =
            options.backgroundName ||
            'cardBackground';

        ctx.page.drawRectangle({
            x: block.x,
            y:
                toPdfY(
                    ctx,
                    block.y + block.height
                ),
            width: block.width,
            height: block.height,
            color:
                color(backgroundName),
            borderColor:
                color('cardBorder'),
            borderWidth:
                DESIGN.card.borderWidth
        });
    }

    function drawTitle(
        ctx,
        block,
        title
    ) {
        const roleStyle =
            style(block.role);

        drawText(ctx, {
            text: title,
            x:
                block.x +
                DESIGN.spacing.cardPadding,
            yTop:
                block.y +
                DESIGN.spacing.cardPadding,
            size:
                roleStyle.titleSize,
            lineHeight:
                roleStyle.titleSize + 2,
            colorName: 'title',
            fontName: 'bold',
            maxWidth:
                block.width -
                DESIGN.spacing.cardPadding * 2,
            maxLines: 1
        });
    }

    function drawParagraph(
        ctx,
        block,
        text,
        options = {}
    ) {
        const roleStyle =
            style(block.role);

        const content =
            textValue(text, '—');

        drawText(ctx, {
            text: content,
            x:
                block.x +
                DESIGN.spacing.cardPadding,
            yTop:
                contentTop(
                    block,
                    roleStyle
                ),
            size:
                roleStyle.bodySize,
            lineHeight:
                roleStyle.lineHeight,
            colorName: 'body',
            fontName: 'regular',
            maxWidth:
                block.width -
                DESIGN.spacing.cardPadding * 2,
            maxLines:
                options.maxLines ||
                availableLineCount(
                    block,
                    roleStyle
                )
        });
    }

    function drawBulletList(
        ctx,
        block,
        items,
        options = {}
    ) {
        const roleStyle =
            style(block.role);

        const normalized =
            normalizeListItems(items);

        const maxItems =
            options.maxItems ||
            normalized.length;

        const visibleItems =
            normalized.slice(
                0,
                maxItems
            );

        const hiddenCount =
            Math.max(
                0,
                normalized.length -
                visibleItems.length
            );

        const x =
            block.x +
            DESIGN.spacing.cardPadding;

        let yTop =
            contentTop(
                block,
                roleStyle
            );

        const rightLimit =
            block.x +
            block.width -
            DESIGN.spacing.cardPadding;

        const textX =
            x +
            DESIGN.bullets.indent;

        const maxWidth =
            rightLimit - textX;

        for (const item of visibleItems) {
            const remainingHeight =
                block.y +
                block.height -
                DESIGN.spacing.cardPadding -
                yTop;

            if (remainingHeight <
                roleStyle.lineHeight) {
                break;
            }

            const lines =
                wrapText(
                    item,
                    maxWidth,
                    ctx.fonts.regular,
                    roleStyle.bodySize
                );

            const maxLines =
                Math.max(
                    1,
                    Math.floor(
                        remainingHeight /
                        roleStyle.lineHeight
                    )
                );

            const renderedLines =
                truncateLines(
                    lines,
                    maxLines
                );

            drawBullet(ctx, {
                x,
                yTop:
                    yTop +
                    roleStyle.bodySize * 0.45
            });

            drawLines(ctx, {
                lines:
                    renderedLines,
                x: textX,
                yTop,
                size:
                    roleStyle.bodySize,
                lineHeight:
                    roleStyle.lineHeight,
                colorName: 'body',
                fontName: 'regular'
            });

            yTop +=
                renderedLines.length *
                roleStyle.lineHeight +
                DESIGN.spacing.bulletGap;
        }

        if (hiddenCount > 0) {
            drawText(ctx, {
                text:
                    `… +${hiddenCount} more`,
                x: textX,
                yTop,
                size:
                    roleStyle.bodySize,
                lineHeight:
                    roleStyle.lineHeight,
                colorName: 'secondary',
                fontName: 'regular',
                maxWidth,
                maxLines: 1
            });
        }
    }

   function drawTaskList(
    ctx,
    block,
    tasksData,
    options = {}
) {
    const roleStyle =
        style(block.role);

    const tasks =
        normalizeTasks(tasksData);

    const maxItems =
        options.maxItems ||
        tasks.length;

    const visibleTasks =
        tasks.slice(
            0,
            maxItems
        );

    const hiddenCount =
        Math.max(
            0,
            tasks.length -
            visibleTasks.length
        );

    const x =
        block.x +
        DESIGN.spacing.cardPadding;

    let yTop =
        contentTop(
            block,
            roleStyle
       ) +
    (options.headerHeight || 0);

    const maxWidth =
        block.width -
        DESIGN.spacing.cardPadding * 2;

    const columnGap = 10;

    const ownerWidth =
        Math.max(
            ...visibleTasks.map(task =>
                safeTextWidth(
                    ctx.fonts.regular,
                    textValue(
                        task.owner,
                        '—'
                    ),
                    roleStyle.bodySize
                )
            ),
            50
        ) + 10;

    const dueWidth =
        Math.max(
            ...visibleTasks.map(task =>
                safeTextWidth(
                    ctx.fonts.regular,
                    textValue(
                        task.due,
                        '—'
                    ),
                    roleStyle.bodySize
                )
            ),
            45
        ) + 10;

    const taskWidth =
        maxWidth -
        ownerWidth -
        dueWidth -
        columnGap * 2;

    for (const task of visibleTasks) {

        const remainingHeight =
            block.y +
            block.height -
            DESIGN.spacing.cardPadding -
            yTop;

        if (
            remainingHeight <
            roleStyle.lineHeight
        ) {
            break;
        }

        const taskResult =
            drawText(ctx, {
                text:
                    textValue(
                        task.title,
                        '—'
                    ),
                x,
                yTop,
                size:
                    roleStyle.bodySize,
                lineHeight:
                    roleStyle.lineHeight,
                colorName: 'body',
                fontName: 'regular',
                maxWidth:
                    taskWidth,
                maxLines: 2
            });

        const ownerResult =
            drawText(ctx, {
                text:
                    textValue(
                        task.owner,
                        '—'
                    ),
                x:
                    x +
                    taskWidth +
                    columnGap,
                yTop,
                size:
                    roleStyle.bodySize,
                lineHeight:
                    roleStyle.lineHeight,
                colorName: 'body',
                fontName: 'regular',
                maxWidth:
                    ownerWidth,
                maxLines: 1
            });

        const dueResult =
            drawText(ctx, {
                text:
                    textValue(
                        task.due,
                        '—'
                    ),
                x:
                    x +
                    taskWidth +
                    columnGap +
                    ownerWidth +
                    columnGap,
                yTop,
                size:
                    roleStyle.bodySize,
                lineHeight:
                    roleStyle.lineHeight,
                colorName: 'secondary',
                fontName: 'regular',
                maxWidth:
                    dueWidth,
                maxLines: 1
            });

        const rowHeight =
            Math.max(
                taskResult.height,
                ownerResult.height,
                dueResult.height
            );

        yTop += rowHeight;
    }

    if (hiddenCount > 0) {
        drawText(ctx, {
            text:
                `… +${hiddenCount} more`,
            x,
            yTop,
            size:
                roleStyle.bodySize,
            lineHeight:
                roleStyle.lineHeight,
            colorName: 'secondary',
            fontName: 'regular',
            maxWidth,
            maxLines: 1
        });
    }
}

    function drawCompactList(
        ctx,
        block,
        items,
        options = {}
    ) {
        const roleStyle =
            style(block.role);

        const normalized =
            normalizeListItems(items);

        const maxItems =
            options.maxItems ||
            normalized.length;

        const visibleItems =
            normalized.slice(
                0,
                maxItems
            );

        const hiddenCount =
            Math.max(
                0,
                normalized.length -
                visibleItems.length
            );

        const content = [
            visibleItems.join(' • '),
            hiddenCount > 0
                ? `… +${hiddenCount} more`
                : ''
        ]
            .filter(Boolean)
            .join(' • ');

        drawText(ctx, {
            text:
                content || '—',
            x:
                block.x +
                DESIGN.spacing.cardPadding,
            yTop:
                contentTop(
                    block,
                    roleStyle
                ),
            size:
                roleStyle.bodySize,
            lineHeight:
                roleStyle.lineHeight,
            colorName: 'body',
            fontName: 'regular',
            maxWidth:
                block.width -
                DESIGN.spacing.cardPadding * 2,
            maxLines: 2
        });
    }

    function drawMetricGrid(
        ctx,
        block,
        metricsData
    ) {
        const metrics =
            Array.isArray(metricsData)
                ? metricsData
                : [];

        if (metrics.length === 0) {
            drawParagraph(
                ctx,
                block,
                '—',
                {
                    maxLines: 1
                }
            );
            return;
        }

        const padding =
            DESIGN.spacing.cardPadding;

        const top =
            contentTop(
                block,
                style(block.role)
            );

        const availableWidth =
            block.width -
            padding * 2;

        const columns =
            metrics.length <= 2
                ? metrics.length
                : 2;

        const rows =
            Math.ceil(
                metrics.length /
                columns
            );

        const cellWidth =
            (
                availableWidth -
                DESIGN.spacing.metricGap *
                (columns - 1)
            ) / columns;

        const availableHeight =
            block.y +
            block.height -
            padding -
            top;

        const cellHeight =
            availableHeight /
            Math.max(rows, 1);

        metrics.forEach(
            (metric, index) => {
                const column =
                    index % columns;

                const row =
                    Math.floor(
                        index / columns
                    );

                const x =
                    block.x +
                    padding +
                    column *
                    (
                        cellWidth +
                        DESIGN.spacing.metricGap
                    );

                const yTop =
                    top +
                    row *
                    cellHeight;

                drawText(ctx, {
                    text:
                        textValue(
                            metric.value,
                            '—'
                        ),
                    x,
                    yTop,
                    size:
                        DESIGN.typography
                            .metricValue
                            .size,
                    lineHeight:
                        DESIGN.typography
                            .metricValue
                            .lineHeight,
                    colorName: 'title',
                    fontName: 'bold',
                    maxWidth:
                        cellWidth,
                    maxLines: 1
                });

                drawText(ctx, {
                    text:
                        textValue(
                            metric.label,
                            ''
                        ),
                    x,
                    yTop:
                        yTop +
                        DESIGN.typography
                            .metricValue
                            .lineHeight,
                    size:
                        DESIGN.typography
                            .metricLabel
                            .size,
                    lineHeight:
                        DESIGN.typography
                            .metricLabel
                            .lineHeight,
                    colorName: 'secondary',
                    fontName: 'regular',
                    maxWidth:
                        cellWidth,
                    maxLines: 2
                });
            }
        );
    }

    function drawArchitectureGrid(
        ctx,
        block,
        architectureData
    ) {
        const roleStyle =
            style(block.role);

        const items =
            normalizeArchitectureItems(
                architectureData
            ).slice(
                0,
                DESIGN.limits
                    .architectureItems
            );

        if (items.length === 0) {
            drawParagraph(
                ctx,
                block,
                '—',
                {
                    maxLines: 1
                }
            );
            return;
        }

        const columns = 4;

        const rows =
            Math.ceil(
                items.length /
                columns
            );

        const padding =
            DESIGN.spacing.cardPadding;

        const top =
            contentTop(
                block,
                roleStyle
            );

        const availableWidth =
            block.width -
            padding * 2;

        const columnGap = 5;
        const rowGap = 4;

        const cellWidth =
            (
                availableWidth -
                columnGap *
                (columns - 1)
            ) / columns;

        const availableHeight =
            block.y +
            block.height -
            padding -
            top;

        const cellHeight =
            (
                availableHeight -
                rowGap *
                Math.max(
                    rows - 1,
                    0
                )
            ) /
            Math.max(rows, 1);

        items.forEach(
            (item, index) => {
                const column =
                    index % columns;

                const row =
                    Math.floor(
                        index / columns
                    );

                const x =
                    block.x +
                    padding +
                    column *
                    (
                        cellWidth +
                        columnGap
                    );

                const yTop =
                    top +
                    row *
                    (
                        cellHeight +
                        rowGap
                    );

                ctx.page.drawRectangle({
                    x,
                    y:
                        toPdfY(
                            ctx,
                            yTop +
                            cellHeight
                        ),
                    width:
                        cellWidth,
                    height:
                        cellHeight,
                    color:
                        color(
                            'pageBackground'
                        ),
                    borderColor:
                        color(
                            'cardBorder'
                        ),
                    borderWidth: 0.5
                });

                drawText(ctx, {
                    text: item,
                    x: x + 4,
                    yTop: yTop + 3,
                    size:
                        roleStyle.bodySize,
                    lineHeight:
                        roleStyle.lineHeight,
                    colorName: 'body',
                    fontName: 'regular',
                    maxWidth:
                        cellWidth - 8,
                    maxLines: 2
                });
            }
        );
    }

    function drawStatsLine(
        ctx,
        block,
        statsData
    ) {
        const roleStyle =
            style(block.role);

        const entries =
            normalizeStats(statsData);

        const text =
            entries
                .map(entry =>
                    `${entry.label}: ${entry.value}`
                )
                .join('   •   ');

        drawText(ctx, {
            text:
                text || '—',
            x:
                block.x +
                DESIGN.spacing.cardPadding,
            yTop:
                contentTop(
                    block,
                    roleStyle
                ),
            size:
                roleStyle.bodySize,
            lineHeight:
                roleStyle.lineHeight,
            colorName: 'secondary',
            fontName: 'regular',
            maxWidth:
                block.width -
                DESIGN.spacing.cardPadding * 2,
            maxLines: 2
        });
    }

    function drawDivider(
        ctx,
        x,
        yTop,
        width
    ) {
        ctx.page.drawLine({
            start: {
                x,
                y:
                    toPdfY(
                        ctx,
                        yTop
                    )
            },

            end: {
                x:
                    x + width,
                y:
                    toPdfY(
                        ctx,
                        yTop
                    )
            },

            thickness: 0.6,
            color:
                color('cardBorder')
        });
    }

    function drawBullet(
        ctx,
        options
    ) {
        ctx.page.drawCircle({
            x:
                options.x +
                DESIGN.bullets.radius,

            y:
                toPdfY(
                    ctx,
                    options.yTop
                ),

            size:
                DESIGN.bullets.radius,

            color:
                color('accent')
        });
    }

    function drawText(
        ctx,
        options
    ) {
        const {
            text = '',
            x,
            yTop,
            size,
            lineHeight = size + 2,
            colorName = 'body',
            fontName = 'regular',
            maxWidth,
            maxLines = Infinity
        } = options;

        const font =
            ctx.fonts[fontName] ||
            ctx.fonts.regular;

        const safeText =
            sanitizeText(text);

        let lines;

        if (
            Number.isFinite(maxWidth) &&
            maxWidth > 0
        ) {
            lines =
                wrapText(
                    safeText,
                    maxWidth,
                    font,
                    size
                );
        } else {
            lines =
                safeText.split(
                    /\r?\n/
                );
        }

        lines =
            truncateLines(
                lines,
                maxLines
            );

        drawLines(ctx, {
            lines,
            x,
            yTop,
            size,
            lineHeight,
            colorName,
            fontName
        });

        return {
            lines,
            height:
                lines.length *
                lineHeight
        };
    }

    function drawLines(
        ctx,
        options
    ) {
        const {
            lines,
            x,
            yTop,
            size,
            lineHeight,
            colorName,
            fontName
        } = options;

        const font =
            ctx.fonts[fontName] ||
            ctx.fonts.regular;

        lines.forEach(
            (line, index) => {
                const baselineTop =
                    yTop +
                    index *
                    lineHeight;

                ctx.page.drawText(
                    line,
                    {
                        x,
                        y:
                            toPdfY(
                                ctx,
                                baselineTop
                            ) - size,
                        size,
                        font,
                        color:
                            color(
                                colorName
                            )
                    }
                );
            }
        );
    }

    function wrapText(
        text,
        maxWidth,
        font,
        fontSize
    ) {
        if (!text) {
            return [];
        }

        const paragraphs =
            String(text).split(
                /\r?\n/
            );

        const lines = [];

        paragraphs.forEach(
            (
                paragraph,
                paragraphIndex
            ) => {
                const words =
                    paragraph
                        .trim()
                        .split(/\s+/)
                        .filter(Boolean);

                if (words.length === 0) {
                    lines.push('');
                    return;
                }

                let currentLine = '';

                words.forEach(word => {
                    const candidate =
                        currentLine
                            ? `${currentLine} ${word}`
                            : word;

                    const candidateWidth =
                        safeTextWidth(
                            font,
                            candidate,
                            fontSize
                        );

                    if (
                        candidateWidth <=
                        maxWidth
                    ) {
                        currentLine =
                            candidate;
                        return;
                    }

                    if (currentLine) {
                        lines.push(
                            currentLine
                        );
                    }

                    if (
                        safeTextWidth(
                            font,
                            word,
                            fontSize
                        ) <= maxWidth
                    ) {
                        currentLine =
                            word;
                        return;
                    }

                    const fragments =
                        splitLongWord(
                            word,
                            maxWidth,
                            font,
                            fontSize
                        );

                    lines.push(
                        ...fragments.slice(
                            0,
                            -1
                        )
                    );

                    currentLine =
                        fragments[
                            fragments.length -
                            1
                        ] || '';
                });

                if (currentLine) {
                    lines.push(
                        currentLine
                    );
                }

                if (
                    paragraphIndex <
                    paragraphs.length - 1
                ) {
                    lines.push('');
                }
            }
        );

        return lines;
    }

    // ============================================================
    // DATA NORMALIZATION
    // ============================================================

    function normalizeListItems(items) {
        if (!Array.isArray(items)) {
            return [];
        }

        return items
            .map(item => {
                if (
                    typeof item === 'string' ||
                    typeof item === 'number'
                ) {
                    return String(item);
                }

                if (
                    item &&
                    typeof item === 'object'
                ) {
                    return textValue(
                        item.title,
                        item.text,
                        item.name,
                        item.description,
                        item.decision,
                        item.risk,
                        item.insight,
                        item.owner,
                        item.value
                    );
                }

                return '';
            })
            .map(item =>
                item.trim()
            )
            .filter(Boolean);
    }

    function normalizeArchitectureItems(
        architectureData
    ) {
        if (!Array.isArray(
            architectureData
        )) {
            return [];
        }

        return architectureData
            .map(item => {
                if (
                    typeof item === 'string' ||
                    typeof item === 'number'
                ) {
                    return String(item);
                }

                if (
                    !item ||
                    typeof item !== 'object'
                ) {
                    return '';
                }

                const name =
                    textValue(
                        item.title,
                        item.name,
                        item.component,
                        item.service,
                        item.label
                    );

                const details =
                    textValue(
                        item.description,
                        item.details,
                        item.type,
                        item.technology
                    );

                return [
                    name,
                    details
                ]
                    .filter(Boolean)
                    .join(' — ');
            })
            .map(item =>
                item.trim()
            )
            .filter(Boolean);
    }

    function normalizeTasks(
        tasksData
    ) {
        if (!Array.isArray(tasksData)) {
            return [];
        }

        return tasksData
            .map(item => {
                if (
                    typeof item === 'string'
                ) {
                    return {
                        title: item,
                        owner: '',
                        due: ''
                    };
                }

                if (
                    !item ||
                    typeof item !== 'object'
                ) {
                    return null;
                }

                return {
                    title:
                        textValue(
                            item.title,
                            item.task,
                            item.text,
                            item.description
                        ),

                    owner:
                        textValue(
                            item.owner,
                            item.assignee,
                            item.responsible
                        ),

                    due:
                        textValue(
                            item.due,
                            item.deadline,
                            item.due_date,
                            item.dueDate
                        )
                };
            })
            .filter(Boolean)
            .filter(task =>
                task.title ||
                task.owner ||
                task.due
            );
    }

    function buildTaskLine(task) {
        const taskText =
            textValue(task.title);

        const ownerText =
            textValue(task.owner);

        const dueText =
            textValue(task.due);

        if (
            ownerText &&
            taskText &&
            dueText
        ) {
            return (
                `${ownerText} — ` +
                `${taskText} — ` +
                `${dueText}`
            );
        }

        if (
            ownerText &&
            taskText
        ) {
            return (
                `${ownerText} — ` +
                `${taskText}`
            );
        }

        if (
            taskText &&
            dueText
        ) {
            return (
                `${taskText} — ` +
                `${dueText}`
            );
        }

        return textValue(
            taskText,
            ownerText,
            dueText
        );
    }

    function normalizeMetrics(
        metricsData,
        statsData
    ) {
        const result = [];

        if (
            Array.isArray(metricsData)
        ) {
            metricsData.forEach(
                metric => {
                    if (
                        metric &&
                        typeof metric === 'object'
                    ) {
                        result.push({
                            label:
                                textValue(
                                    metric.label,
                                    metric.name,
                                    metric.title
                                ),

                            value:
                                textValue(
                                    metric.value,
                                    metric.amount,
                                    metric.metric
                                )
                        });
                    }
                }
            );
        } else if (
            metricsData &&
            typeof metricsData === 'object'
        ) {
            Object.entries(
                metricsData
            ).forEach(
                ([label, value]) => {
                    result.push({
                        label:
                            humanizeKey(
                                label
                            ),

                        value:
                            textValue(
                                value
                            )
                    });
                }
            );
        }

        if (
            result.length === 0 &&
            statsData &&
            typeof statsData === 'object'
        ) {
            Object.entries(
                statsData
            )
                .slice(
                    0,
                    DESIGN.limits
                        .metricItems
                )
                .forEach(
                    ([label, value]) => {
                        result.push({
                            label:
                                humanizeKey(
                                    label
                                ),

                            value:
                                textValue(
                                    value
                                )
                        });
                    }
                );
        }

        return result.filter(
            metric =>
                metric.label ||
                metric.value
        );
    }

    function normalizeStats(
        statsData
    ) {
        if (
            !statsData ||
            typeof statsData !== 'object' ||
            Array.isArray(statsData)
        ) {
            return [];
        }

        return Object.entries(
            statsData
        )
            .filter(
                ([, value]) =>
                    value !== undefined &&
                    value !== null &&
                    value !== ''
            )
            .map(
                ([label, value]) => ({
                    label:
                        humanizeKey(
                            label
                        ),

                    value:
                        String(value)
                })
            );
    }

    // ============================================================
    // FONT HANDLING
    // ============================================================

    async function loadFonts(
        pdf,
        StandardFonts,
        options,
        report
    ) {
        const regularFontBytes =
            options.fontBytes ||
            global.MeetMindPdfFontBytes;

        const boldFontBytes =
            options.boldFontBytes ||
            global.MeetMindPdfBoldFontBytes;

        if (regularFontBytes) {
            registerFontkitIfAvailable(
                pdf
            );

           const regular =
    await pdf.embedFont(
        regularFontBytes
    );

const bold =
    boldFontBytes
        ? await pdf.embedFont(
              boldFontBytes
          )
        : regular;
            
            return {
                regular,
                bold,
                supportsUnicode: true
            };
        }

        if (
            reportContainsNonWinAnsi(
                report
            )
        ) {
            throw new Error(
                'Executive Slide Engine: the report contains Unicode characters. ' +
                'Provide options.fontBytes or window.MeetMindPdfFontBytes with a Unicode TTF/OTF font.'
            );
        }

        const regular =
            await pdf.embedFont(
                StandardFonts.Helvetica
            );

        const bold =
            await pdf.embedFont(
                StandardFonts.HelveticaBold
            );

        return {
            regular,
            bold,
            supportsUnicode: false
        };
    }

    function registerFontkitIfAvailable(
        pdf
    ) {
        const fontkit =
            global.fontkit ||
            global.Fontkit;

        if (
            fontkit &&
            typeof pdf.registerFontkit ===
                'function'
        ) {
            pdf.registerFontkit(
                fontkit
            );
        }
    }

    // ============================================================
    // INPUT VALIDATION
    // ============================================================

    function normalizeRenderInput(input) {
        if (
            !input ||
            typeof input !== 'object' ||
            Array.isArray(input)
        ) {
            throw new Error(
                'Executive Slide Engine: renderer.renderPdf() expects one input object.'
            );
        }

        return {
            report:
                input.report || {},

            blocks:
                Array.isArray(input.blocks)
                    ? input.blocks
                    : [],

            layout:
                input.layout || null,

            options:
                input.options &&
                typeof input.options ===
                    'object'
                    ? input.options
                    : {}
        };
    }

    function validateRenderInput(
        payload
    ) {
        if (
            !payload.report ||
            typeof payload.report !==
                'object'
        ) {
            throw new Error(
                'Executive Slide Engine: renderer input.report must be an object.'
            );
        }

        if (
            !Array.isArray(
                payload.blocks
            )
        ) {
            throw new Error(
                'Executive Slide Engine: renderer input.blocks must be an array.'
            );
        }

        if (
            !payload.layout ||
            typeof payload.layout !==
                'object'
        ) {
            throw new Error(
                'Executive Slide Engine: renderer input.layout is required.'
            );
        }

        const page =
            payload.layout.page;

        if (
            !page ||
            !isPositiveNumber(
                page.width
            ) ||
            !isPositiveNumber(
                page.height
            )
        ) {
            throw new Error(
                'Executive Slide Engine: layout.page.width and layout.page.height must be positive numbers.'
            );
        }

        if (
            !Array.isArray(
                payload.layout.blocks
            )
        ) {
            throw new Error(
                'Executive Slide Engine: layout.blocks must be an array.'
            );
        }

        payload.layout.blocks.forEach(
            (
                block,
                index
            ) => {
                validateLayoutBlock(
                    block,
                    index
                );
            }
        );
    }

    function validateLayoutBlock(
        block,
        index
    ) {
        if (
            !block ||
            typeof block !== 'object'
        ) {
            throw new Error(
                `Executive Slide Engine: layout.blocks[${index}] must be an object.`
            );
        }

        REQUIRED_LAYOUT_FIELDS.forEach(
            field => {
                if (
                    block[field] ===
                    undefined ||
                    block[field] ===
                    null
                ) {
                    throw new Error(
                        `Executive Slide Engine: layout.blocks[${index}].${field} is required.`
                    );
                }
            }
        );

        [
            'x',
            'y',
            'width',
            'height'
        ].forEach(field => {
            if (
                !Number.isFinite(
                    block[field]
                )
            ) {
                throw new Error(
                    `Executive Slide Engine: layout.blocks[${index}].${field} must be a finite number.`
                );
            }
        });

        if (
            block.width <= 0 ||
            block.height <= 0
        ) {
            throw new Error(
                `Executive Slide Engine: layout.blocks[${index}] must have positive width and height.`
            );
        }
    }

    // ============================================================
    // HELPERS
    // ============================================================

    function requirePdfLib() {
        if (
            !global.PDFLib ||
            !global.PDFLib.PDFDocument
        ) {
            throw new Error(
                'PDFLib is not loaded. Load pdf-lib before pdf-renderer.js.'
            );
        }
    }

    function color(name) {
        const value =
            DESIGN.colors[name] ||
            DESIGN.colors.body;

        return global.PDFLib.rgb(
            value[0],
            value[1],
            value[2]
        );
    }

    function style(role) {
        return (
            DESIGN.hierarchy[role] ||
            DESIGN.hierarchy.core
        );
    }

    function contentTop(
        block,
        roleStyle
    ) {
        return (
            block.y +
            DESIGN.spacing.cardPadding +
            roleStyle.titleSize +
            DESIGN.spacing.titleGap
        );
    }

    function availableLineCount(
        block,
        roleStyle
    ) {
        const availableHeight =
            block.height -
            DESIGN.spacing.cardPadding * 2 -
            roleStyle.titleSize -
            DESIGN.spacing.titleGap;

        return Math.max(
            1,
            Math.floor(
                availableHeight /
                roleStyle.lineHeight
            )
        );
    }

    function toPdfY(
        ctx,
        yTop
    ) {
        return (
            ctx.layout.page.height -
            yTop
        );
    }

    function textValue(
        ...values
    ) {
        for (const value of values) {
            if (
                value === undefined ||
                value === null
            ) {
                continue;
            }

            const stringValue =
                String(value).trim();

            if (stringValue) {
                return stringValue;
            }
        }

        return '';
    }

    function sanitizeText(value) {
        const text =
            value === undefined ||
            value === null
                ? ''
                : String(value);

        return text
            .replace(/\p{Extended_Pictographic}/gu, '')
            .replace(/\t/g, ' ')
            .replace(/[ ]{2,}/g, ' ')
            .trim();
    }

    function humanizeKey(key) {
        return String(key)
            .replace(
                /[_-]+/g,
                ' '
            )
            .replace(
                /([a-z])([A-Z])/g,
                '$1 $2'
            )
            .replace(
                /\b\w/g,
                character =>
                    character.toUpperCase()
            );
    }

    function truncateLines(
        lines,
        maxLines
    ) {
        if (
            !Number.isFinite(maxLines) ||
            lines.length <= maxLines
        ) {
            return lines;
        }

        const result =
            lines.slice(
                0,
                maxLines
            );

        const lastIndex =
            result.length - 1;

        result[lastIndex] =
            `${
                result[lastIndex]
                    .replace(/…$/, '')
                    .trim()
            }…`;

        return result;
    }

    function safeTextWidth(
        font,
        text,
        fontSize
    ) {
        try {
            return font.widthOfTextAtSize(
                text,
                fontSize
            );
        } catch (error) {
            return (
                String(text).length *
                fontSize *
                0.55
            );
        }
    }

    function splitLongWord(
        word,
        maxWidth,
        font,
        fontSize
    ) {
        const fragments = [];
        let current = '';

        for (
            const character of word
        ) {
            const candidate =
                current +
                character;

            if (
                safeTextWidth(
                    font,
                    candidate,
                    fontSize
                ) <= maxWidth
            ) {
                current =
                    candidate;
            } else {
                if (current) {
                    fragments.push(
                        current
                    );
                }

                current =
                    character;
            }
        }

        if (current) {
            fragments.push(
                current
            );
        }

        return fragments;
    }

    function isPositiveNumber(
        value
    ) {
        return (
            Number.isFinite(value) &&
            value > 0
        );
    }

    function reportContainsNonWinAnsi(
        report
    ) {
        const seen =
            new WeakSet();

        function visit(value) {
            if (
                value === null ||
                value === undefined
            ) {
                return false;
            }

            if (
                typeof value === 'string'
            ) {
                return /[^\x00-\xFF]/.test(
                    value
                );
            }

            if (
                typeof value !== 'object'
            ) {
                return false;
            }

            if (
                seen.has(value)
            ) {
                return false;
            }

            seen.add(value);

            if (
                Array.isArray(value)
            ) {
                return value.some(
                    visit
                );
            }

            return Object.values(
                value
            ).some(
                visit
            );
        }

        return visit(report);
    }

    // ============================================================
    // MODULE EXPORT
    // ============================================================

    engine.renderer = {
        renderPdf
    };

    global.ExecutiveSlideEngine =
        engine;

})(window);
