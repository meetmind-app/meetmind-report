/*
 * MeetMind AI
 * Executive Slide Engine
 *
 * Report normalization layer.
 */

(function (global) {
    'use strict';

    const engine = global.ExecutiveSlideEngine || {};

    function first(...values) {
        for (const value of values) {
            if (
                value !== undefined &&
                value !== null &&
                value !== ''
            ) {
                return value;
            }
        }

        return null;
    }

    function array(value) {
        if (Array.isArray(value)) {
            return value;
        }

        return [];
    }

    function normalizeReport(report) {

        return {

            // ---------- Header ----------

            title: first(
                report.title,
                report.headline,
                report.meeting_title
            ),

            subtitle: first(
                report.subtitle,
                report.objective,
                report.meeting_type
            ),

            meetingDate: first(
                report.meeting_date,
                report.date
            ),

            // ---------- Summary ----------

            summary: first(
                report.executive_summary,
                report.summary,
                report.meeting_summary
            ) || '',

            // ---------- Main blocks ----------

            decisions: array(report.decisions),

            tasks: array(report.tasks),

            risks: array(report.risks),

            insights: array(report.insights),

            owners: array(report.owners),

            participants: array(report.participants),

            architecture: array(report.architecture),

            metrics: array(report.metrics),

            transcript: first(
                report.transcript,
                report.meeting_transcript
            ) || '',

            stats: report.stats || {},

            raw: report
        };
    }

    engine.schema = {
        normalizeReport
    };

    global.ExecutiveSlideEngine = engine;

})(window);
