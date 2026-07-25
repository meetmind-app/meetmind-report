/**
 * Executive Slide Engine
 * Layout Engine
 *
 * Calculates block positions on the page.
 * No PDF rendering happens here.
 */

export const PAGE = {

    width: 842,

    height: 595,

    margin: {

        top: 32,

        right: 32,

        bottom: 32,

        left: 32

    },

    gap: 16,

    contentWidth: 842 - 32 - 32,

    contentHeight: 595 - 32 - 32

};

export function createLayout(blocks = []) {
    let currentY = PAGE.margin.top;

    return blocks.map(block => {
        const layoutBlock = {
            ...block,
            x: PAGE.margin.left,

            y: currentY,

            width: PAGE.contentWidth,
            height: 0
        };

        currentY += PAGE.gap;

        return layoutBlock;
    });
}

export { PAGE };
