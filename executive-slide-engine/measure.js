function measureText({
    text,
    font,
    fontSize,
    maxWidth,
    lineHeight
}) {

    const lines = wrapText(
        text,
        font,
        fontSize,
        maxWidth
    );

    return {
        lines,
        lineCount: lines.length,
        height:
            lines.length *
            lineHeight
    };
}

    function measureBulletBlock({
    items,
    font,
    fontSize,
    maxWidth,
    lineHeight,
    bulletGap = 6
}) {

    let totalHeight = 0;

    const measurements = [];

    for (const item of items) {

        const title =
            item.title ||
            item.text ||
            '';

        const description =
            item.description ||
            '';

        const titleMeasure =
            measureText({
                text: title,
                font,
                fontSize,
                maxWidth,
                lineHeight
            });

        let descriptionMeasure = {
            height: 0,
            lineCount: 0,
            lines: []
        };

        if (description.trim()) {

            descriptionMeasure =
                measureText({
                    text: description,
                    font,
                    fontSize: fontSize - 1,
                    maxWidth,
                    lineHeight
                });

        }

        const itemHeight =
            titleMeasure.height +
            descriptionMeasure.height +
            bulletGap;

        totalHeight += itemHeight;

        measurements.push({
            title: titleMeasure,
            description: descriptionMeasure,
            height: itemHeight
        });

    }

    return {
        height: totalHeight,
        items: measurements
    };
}

module.exports = {
    measureText,
    measureBulletBlock
};
