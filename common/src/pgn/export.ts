import { z } from 'zod';

/** Verifies a request to export a PGN as a PDF. */
export const PdfExportSchema = z.object({
    /** The PGN to convert to a PDF. */
    pgn: z.string(),

    /** The orientation of the board images in the PDF. */
    orientation: z.union([z.literal('white'), z.literal('black')]),

    /** The cohort of the game. */
    cohort: z.string().optional(),

    /** The id of the game. */
    id: z.string().optional(),

    /** Whether to skip rendering the header. */
    skipHeader: z.boolean().optional(),

    /** Whether to skip rendering the comments. */
    skipComments: z.boolean().optional(),

    /** Whether to skip rendering the NAGs. */
    skipNags: z.boolean().optional(),

    /** Whether to skip rendering the drawables. */
    skipDrawables: z.boolean().optional(),

    /** Whether to skip rendering variations. */
    skipVariations: z.boolean().optional(),

    /** Whether to skip rendering null moves. */
    skipNullMoves: z.boolean().optional(),

    /** Whether to skip rendering clock times. */
    skipClocks: z.boolean().optional(),

    /** Whether to skip rendering the QR code in the PDF. */
    skipQrCode: z.boolean().optional(),

    /** The number of ply between diagrams. */
    plyBetweenDiagrams: z.number().int().min(-1).max(40),
});

/** A request to export a PGN as a PDF. */
export type PdfExportRequest = z.infer<typeof PdfExportSchema>;
