/**
 * Executive Slide Engine
 * Report Schema
 *
 * This module defines the normalized report structure
 * used internally by the engine.
 *
 * Every component (Layout Engine, Registry, Renderer)
 * works only with this schema.
 */

export function normalizeReport(report = {}) {
    return {
        title: report.title || "",
        subtitle: report.subtitle || "",
        headline: report.headline || "",

        summary: report.summary || "",

        metrics: Array.isArray(report.metrics)
            ? report.metrics
            : [],

        decisions: Array.isArray(report.decisions)
            ? report.decisions
            : [],

        tasks: Array.isArray(report.tasks)
            ? report.tasks
            : [],

        owners: Array.isArray(report.owners)
            ? report.owners
            : [],

        risks: Array.isArray(report.risks)
            ? report.risks
            : [],

        insights: Array.isArray(report.insights)
            ? report.insights
            : [],

        architecture: report.architecture || {
            sections: []
        },

        participants: Array.isArray(report.participants)
            ? report.participants
            : [],

        stats: report.stats || {},

        transcript: report.transcript || ""
    };
}
