/**
 * Executive Slide Engine
 * Layout Engine
 *
 * Calculates block positions on the page.
 * No PDF rendering happens here.
 */

const PAGE = {
    width: 842,
    height: 595,
    margin: 32,
    gap: 16
};

export function createLayout(blocks = []) {
    let currentY = PAGE.margin;

    return blocks.map(block => {
        const layoutBlock = {
            ...block,
            x: PAGE.margin,
            y: currentY,
            width: PAGE.width - PAGE.margin * 2,
            height: 0
        };

        currentY += PAGE.gap;

        return layoutBlock;
    });
}

export { PAGE };
