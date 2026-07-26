/*
 * MeetMind AI
 * Executive Slide Engine
 *
 * PDF Renderer v1
 *
 * Plain browser JavaScript.
 * Requires pdf-lib to be loaded before this file:
 * <script src="https://unpkg.com/pdf-lib/dist/pdf-lib.min.js"></script>
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
            cardBorder: [0.88, 0.88, 0.88],
            title: [0.12, 0.12, 0.12],
            body: [0.22, 0.22, 0.22],
            secondary: [0.50, 0.50, 0.50],
            accent: [0.12, 0.47, 0.92],
            white: [1.00, 1.00, 1.00]
        },

        typography: {
            headerTitle: { size: 20, lineHeight: 23 },
            headerSubtitle: { size: 9, lineHeight: 12 },
            title: { size: 12, lineHeight: 15 },
            body: { size: 8.5, lineHeight: 11 },
            small: { size: 7.5, lineHeight: 9.5 },
            metricValue: { size: 18, lineHeight: 20 },
            metricLabel: { size: 7, lineHeight: 9 }
        },

        hierarchy: {
            primary: { titleSize: 12, bodySize: 9, lineHeight: 11.5 },
            core: { titleSize: 10.5, bodySize: 8, lineHeight: 10.5 },
            supporting: { titleSize: 9.5, bodySize: 7.5, lineHeight: 9.5 },
            service: { titleSize: 8.5, bodySize: 7, lineHeight: 9 },
            document: { titleSize: 10, bodySize: 8, lineHeight: 10 }
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

    // ============================================================
    // PUBLIC API
    // ============================================================

    async function renderPdf(report, layout, options = {}) {
        requirePdfLib();

        const { PDFDocument, StandardFonts } = global.PDFLib;
        const pdf = await PDFDocument.create();
        const page = pdf.addPage([layout.page.width, layout.page.height]);
        const fonts = await loadFonts(pdf, StandardFonts, options);

        const ctx = {
            pdf,
            page,
            fonts,
            report,
            layout,
            options
        };

        drawPageBackground(ctx);

        for (const block of layout.blocks) {
            const renderer = BlockRenderers[block.id];

            if (typeof renderer === 'function') {
                renderer(ctx, block);
            }
        }

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
        const title = textValue(report.title, 'Meeting Report');
        const subtitleParts = [report.subtitle, report.meetingDate].filter(Boolean);

        drawText(ctx, {
            text: title,
            x: block.x,
            yTop: block.y,
            size: DESIGN.typography.headerTitle.size,
            lineHeight: DESIGN.typography.headerTitle.lineHeight,
            colorName: 'title',
            fontName: 'bold',
            maxWidth: block.width,
            maxLines: 1
        });

        if (subtitleParts.length > 0) {
            drawText(ctx, {
                text: subtitleParts.join(' • '),
                x: block.x,
                yTop: block.y + DESIGN.typography.headerTitle.lineHeight + 3,
                size: DESIGN.typography.headerSubtitle.size,
                lineHeight: DESIGN.typography.headerSubtitle.lineHeight,
                colorName: 'secondary',
                fontName: 'regular',
                maxWidth: block.width,
                maxLines: 1
            });
        }
    }

    function summary(ctx, block) {
        drawCard(ctx, block);
        drawTitle(ctx, block, 'Executive Summary');
        drawParagraph(ctx, block, ctx.report.summary, {
            maxLines: DESIGN.limits.summaryLines
        });
    }

    function metrics(ctx, block) {
        drawCard(ctx, block);
        drawTitle(ctx, block, 'Key Metrics');

        const metricsData = normalizeMetrics(ctx.report.metrics, ctx.report.stats);
        drawMetricGrid(ctx, block, metricsData.slice(0, DESIGN.limits.metricItems));
    }

    function decisions(ctx, block) {
        drawCard(ctx, block);
        drawTitle(ctx, block, 'Decisions');
        drawBulletList(ctx, block, ctx.report.decisions, {
            maxItems: DESIGN.limits.decisionItems
        });
    }

    function tasks(ctx, block) {
        drawCard(ctx, block);
        drawTitle(ctx, block, 'Tasks');
        drawTaskList(ctx, block, ctx.report.tasks, {
            maxItems: DESIGN.limits.taskItems
        });
    }

    function risks(ctx, block) {
        drawCard(ctx, block);
        drawTitle(ctx, block, 'Risks');
        drawBulletList(ctx, block, ctx.report.risks, {
            maxItems: DESIGN.limits.riskItems
        });
    }

    function insights(ctx, block) {
        drawCard(ctx, block);
        drawTitle(ctx, block, 'Insights');
        drawBulletList(ctx, block, ctx.report.insights, {
            maxItems: DESIGN.limits.insightItems
        });
    }

    function architecture(ctx, block) {
        drawCard(ctx, block);
        drawTitle(ctx, block, 'Architecture');
        drawArchitectureGrid(ctx, block, ctx.report.architecture);
    }

    function owners(ctx, block) {
        drawCard(ctx, block, { backgroundName: 'pageBackground' });
        drawTitle(ctx, block, 'Owners');
        drawCompactList(ctx, block, ctx.report.owners, {
            maxItems: DESIGN.limits.ownerItems
        });
    }

    function stats(ctx, block) {
        drawCard(ctx, block, { backgroundName: 'pageBackground' });
        drawTitle(ctx, block, 'Meeting Statistics');
        drawStatsLine(ctx, block, ctx.report.stats);
    }

    function footer(ctx, block) {
        const footerText = ctx.options.footerText || 'Generated by MeetMind AI';

        drawDivider(ctx, block.x, block.y, block.width);
        drawText(ctx, {
            text: footerText,
            x: block.x,
            yTop: block.y + 6,
            size: DESIGN.typography.small.size,
            lineHeight: DESIGN.typography.small.lineHeight,
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
        const pageSize = ctx.page.getSize();

        ctx.page.drawRectangle({
            x: 0,
            y: 0,
            width: pageSize.width,
            height: pageSize.height,
            color: color('pageBackground')
        });
    }

    function drawCard(ctx, block, options = {}) {
        const backgroundName = options.backgroundName || 'cardBackground';

        ctx.page.drawRectangle({
            x: block.x,
            y: toPdfY(ctx, block.y + block.height),
            width: block.width,
            height: block.height,
            color: color(backgroundName),
            borderColor: color('cardBorder'),
            borderWidth: DESIGN.card.borderWidth
        });
    }

    function drawTitle(ctx, block, title) {
        const roleStyle = style(block.role);

        drawText(ctx, {
            text: title,
            x: block.x + DESIGN.spacing.cardPadding,
            yTop: block.y + DESIGN.spacing.cardPadding,
            size: roleStyle.titleSize,
            lineHeight: roleStyle.titleSize + 2,
            colorName: 'title',
            fontName: 'bold',
            maxWidth: block.width - DESIGN.spacing.cardPadding * 2,
            maxLines: 1
        });
    }

    function drawParagraph(ctx, block, text, options = {}) {
        const roleStyle = style(block.role);
        const content = textValue(text, '—');

        drawText(ctx, {
            text: content,
            x: block.x + DESIGN.spacing.cardPadding,
            yTop: contentTop(block, roleStyle),
            size: roleStyle.bodySize,
            lineHeight: roleStyle.lineHeight,
            colorName: 'body',
            fontName: 'regular',
            maxWidth: block.width - DESIGN.spacing.cardPadding * 2,
            maxLines: options.maxLines || availableLineCount(block, roleStyle)
        });
    }

    function drawBulletList(ctx, block, items, options = {}) {
        const roleStyle = style(block.role);
        const normalized = normalizeListItems(items);
        const maxItems = options.maxItems || normalized.length;
        const visibleItems = normalized.slice(0, maxItems);
        const hiddenCount = Math.max(0, normalized.length - visibleItems.length);
        const x = block.x + DESIGN.spacing.cardPadding;
        let yTop = contentTop(block, roleStyle);
        const rightLimit = block.x + block.width - DESIGN.spacing.cardPadding;
        const textX = x + DESIGN.bullets.indent;
        const maxWidth = rightLimit - textX;

        visibleItems.forEach(item => {
            const lines = wrapText(item, maxWidth, ctx.fonts.regular, roleStyle.bodySize);
            const remainingHeight = block.y + block.height - DESIGN.spacing.cardPadding - yTop;
            const maxLines = Math.max(1, Math.floor(remainingHeight / roleStyle.lineHeight));
            const renderedLines = truncateLines(lines, maxLines);

            drawBullet(ctx, {
                x,
                yTop: yTop + roleStyle.bodySize * 0.45
            });

            drawLines(ctx, {
                lines: renderedLines,
                x: textX,
                yTop,
                size: roleStyle.bodySize,
                lineHeight: roleStyle.lineHeight,
                colorName: 'body',
                fontName: 'regular'
            });

            yTop += renderedLines.length * roleStyle.lineHeight + DESIGN.spacing.bulletGap;
        });

        if (hiddenCount > 0) {
            drawText(ctx, {
                text: `… +${hiddenCount} more`,
                x: textX,
                yTop,
                size: roleStyle.bodySize,
                lineHeight: roleStyle.lineHeight,
                colorName: 'secondary',
                fontName: 'regular',
                maxWidth,
                maxLines: 1
            });
        }
    }

    function drawTaskList(ctx, block, tasksData, options = {}) {
        const roleStyle = style(block.role);
        const tasks = normalizeTasks(tasksData);
        const maxItems = options.maxItems || tasks.length;
        const visibleTasks = tasks.slice(0, maxItems);
        const hiddenCount = Math.max(0, tasks.length - visibleTasks.length);
        const x = block.x + DESIGN.spacing.cardPadding;
        let yTop = contentTop(block, roleStyle);
        const maxWidth = block.width - DESIGN.spacing.cardPadding * 2;

        visibleTasks.forEach(task => {
            const line = [task.owner, task.title, task.due].filter(Boolean).join(' — ');

            drawText(ctx, {
                text: line || '—',
                x,
                yTop,
                size: roleStyle.bodySize,
                lineHeight: roleStyle.lineHeight,
                colorName: 'body',
                fontName: 'regular',
                maxWidth,
                maxLines: 1
            });

            yTop += roleStyle.lineHeight + DESIGN.spacing.bulletGap;
        });

        if (hiddenCount > 0) {
            drawText(ctx, {
                text: `… +${hiddenCount} more`,
                x,
                yTop,
                size: roleStyle.bodySize,
                lineHeight: roleStyle.lineHeight,
                colorName: 'secondary',
                fontName: 'regular',
                maxWidth,
                maxLines: 1
            });
        }
    }

    function drawCompactList(ctx, block, items, options = {}) {
        const roleStyle = style(block.role);
        const normalized = normalizeListItems(items);
        const maxItems = options.maxItems || normalized.length;
        const visibleItems = normalized.slice(0, maxItems);
        const hiddenCount = Math.max(0, normalized.length - visibleItems.length);
        const content = visibleItems.join(' • ') + (hiddenCount > 0 ? ` • … +${hiddenCount} more` : '');

        drawText(ctx, {
            text: content || '—',
            x: block.x + DESIGN.spacing.cardPadding,
            yTop: contentTop(block, roleStyle),
            size: roleStyle.bodySize,
            lineHeight: roleStyle.lineHeight,
            colorName: 'body',
            fontName: 'regular',
            maxWidth: block.width - DESIGN.spacing.cardPadding * 2,
            maxLines: 2
        });
    }

    function drawMetricGrid(ctx, block, metricsData) {
        const metrics = Array.isArray(metricsData) ? metricsData : [];

        if (metrics.length === 0) {
            drawParagraph(ctx, block, '—', { maxLines: 1 });
            return;
        }

        const padding = DESIGN.spacing.cardPadding;
        const top = contentTop(block, style(block.role));
        const availableWidth = block.width - padding * 2;
        const columns = metrics.length <= 2 ? metrics.length : 2;
        const rows = Math.ceil(metrics.length / columns);
        const cellWidth = (availableWidth - DESIGN.spacing.metricGap * (columns - 1)) / columns;
        const availableHeight = block.y + block.height - padding - top;
        const cellHeight = availableHeight / Math.max(rows, 1);

        metrics.forEach((metric, index) => {
            const column = index % columns;
            const row = Math.floor(index / columns);
            const x = block.x + padding + column * (cellWidth + DESIGN.spacing.metricGap);
            const yTop = top + row * cellHeight;

            drawText(ctx, {
                text: textValue(metric.value, '—'),
                x,
                yTop,
                size: DESIGN.typography.metricValue.size,
                lineHeight: DESIGN.typography.metricValue.lineHeight,
                colorName: 'title',
                fontName: 'bold',
                maxWidth: cellWidth,
                maxLines: 1
            });

            drawText(ctx, {
                text: textValue(metric.label, ''),
                x,
                yTop: yTop + DESIGN.typography.metricValue.lineHeight,
                size: DESIGN.typography.metricLabel.size,
                lineHeight: DESIGN.typography.metricLabel.lineHeight,
                colorName: 'secondary',
                fontName: 'regular',
                maxWidth: cellWidth,
                maxLines: 2
            });
        });
    }

    function drawArchitectureGrid(ctx, block, architectureData) {
        const roleStyle = style(block.role);
        const items = normalizeListItems(architectureData).slice(0, DESIGN.limits.architectureItems);

        if (items.length === 0) {
            drawParagraph(ctx, block, '—', { maxLines: 1 });
            return;
        }

        const columns = 4;
        const rows = Math.ceil(items.length / columns);
        const padding = DESIGN.spacing.cardPadding;
        const top = contentTop(block, roleStyle);
        const availableWidth = block.width - padding * 2;
        const columnGap = 5;
        const rowGap = 4;
        const cellWidth = (availableWidth - columnGap * (columns - 1)) / columns;
        const availableHeight = block.y + block.height - padding - top;
        const cellHeight = (availableHeight - rowGap * Math.max(rows - 1, 0)) / Math.max(rows, 1);

        items.forEach((item, index) => {
            const column = index % columns;
            const row = Math.floor(index / columns);
            const x = block.x + padding + column * (cellWidth + columnGap);
            const yTop = top + row * (cellHeight + rowGap);

            ctx.page.drawRectangle({
                x,
                y: toPdfY(ctx, yTop + cellHeight),
                width: cellWidth,
                height: cellHeight,
                color: color('pageBackground'),
                borderColor: color('cardBorder'),
                borderWidth: 0.5
            });

            drawText(ctx, {
                text: item,
                x: x + 4,
                yTop: yTop + 3,
                size: roleStyle.bodySize,
                lineHeight: roleStyle.lineHeight,
                colorName: 'body',
                fontName: 'regular',
                maxWidth: cellWidth - 8,
                maxLines: 2
            });
        });
    }

    function drawStatsLine(ctx, block, statsData) {
        const roleStyle = style(block.role);
        const entries = normalizeStats(statsData);
        const text = entries.map(entry => `${entry.label}: ${entry.value}`).join('   •   ');

        drawText(ctx, {
            text: text || '—',
            x: block.x + DESIGN.spacing.cardPadding,
            yTop: contentTop(block, roleStyle),
            size: roleStyle.bodySize,
            lineHeight: roleStyle.lineHeight,
            colorName: 'secondary',
            fontName: 'regular',
            maxWidth: block.width - DESIGN.spacing.cardPadding * 2,
            maxLines: 2
        });
    }

    function drawDivider(ctx, x, yTop, width) {
        ctx.page.drawLine({
            start: { x, y: toPdfY(ctx, yTop) },
            end: { x: x + width, y: toPdfY(ctx, yTop) },
            thickness: 0.6,
            color: color('cardBorder')
        });
    }

    function drawBullet(ctx, options) {
        ctx.page.drawCircle({
            x: options.x + DESIGN.bullets.radius,
            y: toPdfY(ctx, options.yTop),
            size: DESIGN.bullets.radius,
            color: color('accent')
        });
    }

    function drawText(ctx, options) {
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

        const font = ctx.fonts[fontName] || ctx.fonts.regular;
        const safeText = sanitizeText(text);
        let lines;

        if (Number.isFinite(maxWidth) && maxWidth > 0) {
            lines = wrapText(safeText, maxWidth, font, size);
        } else {
            lines = safeText.split(/\r?\n/);
        }

        lines = truncateLines(lines, maxLines);

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
            height: lines.length * lineHeight
        };
    }

    function drawLines(ctx, options) {
        const { lines, x, yTop, size, lineHeight, colorName, fontName } = options;
        const font = ctx.fonts[fontName] || ctx.fonts.regular;

        lines.forEach((line, index) => {
            const baselineTop = yTop + index * lineHeight;

            ctx.page.drawText(line, {
                x,
                y: toPdfY(ctx, baselineTop) - size,
                size,
                font,
                color: color(colorName)
            });
        });
    }

    function wrapText(text, maxWidth, font, fontSize) {
        if (!text) return [];

        const paragraphs = String(text).split(/\r?\n/);
        const lines = [];

        paragraphs.forEach((paragraph, paragraphIndex) => {
            const words = paragraph.trim().split(/\s+/).filter(Boolean);

            if (words.length === 0) {
                lines.push('');
                return;
            }

            let currentLine = '';

            words.forEach(word => {
                const candidate = currentLine ? `${currentLine} ${word}` : word;
                const candidateWidth = safeTextWidth(font, candidate, fontSize);

                if (candidateWidth <= maxWidth) {
                    currentLine = candidate;
                    return;
                }

                if (currentLine) lines.push(currentLine);

                if (safeTextWidth(font, word, fontSize) <= maxWidth) {
                    currentLine = word;
                    return;
                }

                const fragments = splitLongWord(word, maxWidth, font, fontSize);
                lines.push(...fragments.slice(0, -1));
                currentLine = fragments[fragments.length - 1] || '';
            });

            if (currentLine) lines.push(currentLine);
            if (paragraphIndex < paragraphs.length - 1) lines.push('');
        });

        return lines;
    }

    // ============================================================
    // DATA NORMALIZATION
    // ============================================================

    function normalizeListItems(items) {
        if (!Array.isArray(items)) return [];

        return items
            .map(item => {
                if (typeof item === 'string' || typeof item === 'number') {
                    return String(item);
                }

                if (item && typeof item === 'object') {
                    return textValue(
                        item.title,
                        item.text,
                        item.name,
                        item.description,
                        item.decision,
                        item.risk,
                        item.insight,
                        item.owner
                    );
                }

                return '';
            })
            .map(item => item.trim())
            .filter(Boolean);
    }

    function normalizeTasks(tasksData) {
        if (!Array.isArray(tasksData)) return [];

        return tasksData
            .map(item => {
                if (typeof item === 'string') {
                    return { title: item, owner: '', due: '' };
                }

                if (!item || typeof item !== 'object') return null;

                return {
                    title: textValue(item.title, item.task, item.text, item.description),
                    owner: textValue(item.owner, item.assignee, item.responsible),
                    due: textValue(item.due, item.deadline, item.due_date, item.dueDate)
                };
            })
            .filter(Boolean)
            .filter(task => task.title || task.owner || task.due);
    }

    function normalizeMetrics(metricsData, statsData) {
        const result = [];

        if (Array.isArray(metricsData)) {
            metricsData.forEach(metric => {
                if (metric && typeof metric === 'object') {
                    result.push({
                        label: textValue(metric.label, metric.name, metric.title),
                        value: textValue(metric.value, metric.amount, metric.metric)
                    });
                }
            });
        } else if (metricsData && typeof metricsData === 'object') {
            Object.entries(metricsData).forEach(([label, value]) => {
                result.push({ label: humanizeKey(label), value: textValue(value) });
            });
        }

        if (result.length === 0 && statsData && typeof statsData === 'object') {
            Object.entries(statsData)
                .slice(0, DESIGN.limits.metricItems)
                .forEach(([label, value]) => {
                    result.push({ label: humanizeKey(label), value: textValue(value) });
                });
        }

        return result.filter(metric => metric.label || metric.value);
    }

    function normalizeStats(statsData) {
        if (!statsData || typeof statsData !== 'object') return [];

        return Object.entries(statsData)
            .filter(([, value]) => value !== undefined && value !== null && value !== '')
            .map(([label, value]) => ({
                label: humanizeKey(label),
                value: String(value)
            }));
    }

    // ============================================================
    // FONT HANDLING
    // ============================================================

    async function loadFonts(pdf, StandardFonts, options) {
        const customFontBytes = options.fontBytes || global.MeetMindPdfFontBytes;

        if (customFontBytes) {
            const regular = await pdf.embedFont(customFontBytes, { subset: true });
            const bold = options.boldFontBytes
                ? await pdf.embedFont(options.boldFontBytes, { subset: true })
                : regular;

            return { regular, bold, supportsUnicode: true };
        }

        const regular = await pdf.embedFont(StandardFonts.Helvetica);
        const bold = await pdf.embedFont(StandardFonts.HelveticaBold);

        return { regular, bold, supportsUnicode: false };
    }

    // ============================================================
    // HELPERS
    // ============================================================

    function requirePdfLib() {
        if (!global.PDFLib || !global.PDFLib.PDFDocument) {
            throw new Error('PDFLib is not loaded. Load pdf-lib before pdf-renderer.js.');
        }
    }

    function color(name) {
        const value = DESIGN.colors[name] || DESIGN.colors.body;
        return global.PDFLib.rgb(value[0], value[1], value[2]);
    }

    function style(role) {
        return DESIGN.hierarchy[role] || DESIGN.hierarchy.core;
    }

    function contentTop(block, roleStyle) {
        return block.y + DESIGN.spacing.cardPadding + roleStyle.titleSize + DESIGN.spacing.titleGap;
    }

    function availableLineCount(block, roleStyle) {
        const availableHeight =
            block.height -
            DESIGN.spacing.cardPadding * 2 -
            roleStyle.titleSize -
            DESIGN.spacing.titleGap;

        return Math.max(1, Math.floor(availableHeight / roleStyle.lineHeight));
    }

    function toPdfY(ctx, yTop) {
        return ctx.layout.page.height - yTop;
    }

    function textValue(...values) {
        for (const value of values) {
            if (value === undefined || value === null) continue;
            const stringValue = String(value).trim();
            if (stringValue) return stringValue;
        }
        return '';
    }

    function sanitizeText(value) {
        const text = value === undefined || value === null ? '' : String(value);
        return text.replace(/\t/g, ' ').replace(/[ ]{2,}/g, ' ').trim();
    }

    function humanizeKey(key) {
        return String(key)
            .replace(/[_-]+/g, ' ')
            .replace(/([a-z])([A-Z])/g, '$1 $2')
            .replace(/\b\w/g, character => character.toUpperCase());
    }

    function truncateLines(lines, maxLines) {
        if (!Number.isFinite(maxLines) || lines.length <= maxLines) return lines;

        const result = lines.slice(0, maxLines);
        const lastIndex = result.length - 1;
        result[lastIndex] = `${result[lastIndex].replace(/…$/, '').trim()}…`;
        return result;
    }

    function safeTextWidth(font, text, fontSize) {
        try {
            return font.widthOfTextAtSize(text, fontSize);
        } catch (error) {
            return String(text).length * fontSize * 0.55;
        }
    }

    function splitLongWord(word, maxWidth, font, fontSize) {
        const fragments = [];
        let current = '';

        for (const character of word) {
            const candidate = current + character;

            if (safeTextWidth(font, candidate, fontSize) <= maxWidth) {
                current = candidate;
            } else {
                if (current) fragments.push(current);
                current = character;
            }
        }

        if (current) fragments.push(current);
        return fragments;
    }

    // ============================================================
    // MODULE EXPORT
    // ============================================================

    engine.renderer = {
        renderPdf
    };

    global.ExecutiveSlideEngine = engine;

})(window);
