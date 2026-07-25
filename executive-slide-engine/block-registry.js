/**
 * Executive Slide Engine
 * Block Registry
 *
 * Defines all supported report blocks and
 * their default rendering order.
 */

export const BLOCKS = [
    {
        id: "header",
        label: "Header",
        enabled: true
    },
    {
        id: "stats",
        label: "Meeting Statistics",
        enabled: true
    },
    {
        id: "metrics",
        label: "Key Metrics",
        enabled: true
    },
    {
        id: "summary",
        label: "Executive Summary",
        enabled: true
    },
    {
        id: "decisions",
        label: "Decisions",
        enabled: true
    },
    {
        id: "tasks",
        label: "Tasks",
        enabled: true
    },
    {
        id: "risks",
        label: "Risks",
        enabled: true
    },
    {
        id: "insights",
        label: "Insights",
        enabled: true
    },
    {
        id: "owners",
        label: "Owners",
        enabled: true
    },
    {
        id: "architecture",
        label: "Architecture",
        enabled: true
    },
    {
        id: "footer",
        label: "Footer",
        enabled: true
    }
];

export function getEnabledBlocks(options = {}) {
    return BLOCKS.filter(block => {
        if (options[block.id] === undefined) {
            return block.enabled;
        }

        return Boolean(options[block.id]);
    });
}
