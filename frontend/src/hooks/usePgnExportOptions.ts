import { useLocalStorage } from 'usehooks-ts';

export const pgnExportOptions = {
    skipComments: {
        key: 'export-pgn/skip-comments',
        default: false,
    },
    skipNags: {
        key: 'export-pgn/skip-nags',
        default: false,
    },
    skipDrawables: {
        key: 'export-pgn/skip-drawables',
        default: false,
    },
    skipVariations: {
        key: 'export-pgn/skip-variations',
        default: false,
    },
    skipNullMoves: {
        key: 'export-pgn/skip-null-moves',
        default: false,
    },
    skipHeader: {
        key: 'export-pgn/skip-header',
        default: false,
    },
    skipClocks: {
        key: 'export-pgn/skip-clocks',
        default: false,
    },
    skipQrCode: {
        key: 'export-pgn/skip-qr-code',
        default: false,
    },
    pdfDiagramMode: {
        key: 'export-pgn/pdf-diagram-mode',
        default: 'markedPositions',
    },
    plyBetweenDiagrams: {
        key: 'export-pgn/ply-between-diagrams',
        default: 10,
        min: 8,
        max: 40,
    },
} as const;

/**
 * Returns options and setters for exporting a PGN.
 */
export function usePgnExportOptions() {
    const [skipComments, setSkipComments] = useLocalStorage<boolean>(
        pgnExportOptions.skipComments.key,
        pgnExportOptions.skipComments.default,
    );
    const [skipNags, setSkipNags] = useLocalStorage<boolean>(
        pgnExportOptions.skipNags.key,
        pgnExportOptions.skipNags.default,
    );
    const [skipDrawables, setSkipDrawables] = useLocalStorage<boolean>(
        pgnExportOptions.skipDrawables.key,
        pgnExportOptions.skipDrawables.default,
    );
    const [skipVariations, setSkipVariations] = useLocalStorage<boolean>(
        pgnExportOptions.skipVariations.key,
        pgnExportOptions.skipVariations.default,
    );
    const [skipNullMoves, setSkipNullMoves] = useLocalStorage<boolean>(
        pgnExportOptions.skipNullMoves.key,
        pgnExportOptions.skipNullMoves.default,
    );
    const [skipHeader, setSkipHeader] = useLocalStorage<boolean>(
        pgnExportOptions.skipHeader.key,
        pgnExportOptions.skipHeader.default,
    );
    const [skipClocks, setSkipClocks] = useLocalStorage<boolean>(
        pgnExportOptions.skipClocks.key,
        pgnExportOptions.skipClocks.default,
    );
    const [skipQrCode, setSkipQrCode] = useLocalStorage<boolean>(
        pgnExportOptions.skipQrCode.key,
        pgnExportOptions.skipQrCode.default,
    );
    const [pdfDiagramMode, setPdfDiagramMode] = useLocalStorage<'markedPositions' | 'numMoves'>(
        pgnExportOptions.pdfDiagramMode.key,
        pgnExportOptions.pdfDiagramMode.default,
    );
    const [plyBetweenDiagrams, setPlyBetweenDiagrams] = useLocalStorage<number>(
        pgnExportOptions.plyBetweenDiagrams.key,
        pgnExportOptions.plyBetweenDiagrams.default,
    );

    return {
        skipComments,
        setSkipComments,
        skipNags,
        setSkipNags,
        skipDrawables,
        setSkipDrawables,
        skipVariations,
        setSkipVariations,
        skipNullMoves,
        setSkipNullMoves,
        skipHeader,
        setSkipHeader,
        skipClocks,
        setSkipClocks,
        skipQrCode,
        setSkipQrCode,
        pdfDiagramMode,
        setPdfDiagramMode,
        plyBetweenDiagrams,
        setPlyBetweenDiagrams,
    };
}
