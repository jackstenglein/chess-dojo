export const BOX_SIZE = 24;
export const EMPTY_COLOR = '#ebedf0';

export const HEATMAP_STYLE_MINIFIED = `.heatmap-block { width: ${BOX_SIZE}px; height: ${BOX_SIZE}px; border-radius: 2px; background-color: ${EMPTY_COLOR}; } .swords { background: center / contain no-repeat url(https://chess-dojo-images.s3.us-east-1.amazonaws.com/emails/swords.png); } .cross { background: center / contain no-repeat url(https://chess-dojo-images.s3.us-east-1.amazonaws.com/emails/cross.png); } .checkmark { background: center / contain no-repeat
url(https://chess-dojo-images.s3.us-east-1.amazonaws.com/emails/checkmark.png); } .legend-block { width: 11.5px; height: 11.5px; background-size: contain; border-radius: 2px; } .legend-text { font-size: 10px; color: #888; padding-right: 8px; padding-left: 2px; }`;

const _HEATMAP_STYLE = `
    .heatmap-block {
        width: ${BOX_SIZE}px;
        height: ${BOX_SIZE}px;
        border-radius: 2px;
        background-color: ${EMPTY_COLOR};
    }

    .swords {
        background: center / contain no-repeat url(https://chess-dojo-images.s3.us-east-1.amazonaws.com/emails/swords.png);
    }

    .cross {
        background: center / contain no-repeat url(https://chess-dojo-images.s3.us-east-1.amazonaws.com/emails/cross.png);
    }

    .checkmark {
        background: center / contain no-repeat url(https://chess-dojo-images.s3.us-east-1.amazonaws.com/emails/checkmark.png);
    }

    .legend-block {
        width: 11.5px;
        height: 11.5px;
        background-size: contain;
        border-radius: 2px;
    }

    .legend-text {
        font-size: 10px;
        color: #888;
        padding-right: 8px;
        padding-left: 2px;
    }
`;
