import { z } from 'zod';

const gameOrientation = z.enum(['white', 'black']);

/** The orientation of a game. */
export type GameOrientation = z.infer<typeof gameOrientation>;

/** The values for the orientation of a game. */
export const GameOrientations = gameOrientation.enum;

const onlineGameImportType = z.enum([
    'lichessChapter',
    'lichessStudy',
    'lichessGame',
    'chesscomGame',
    'chesscomAnalysis',
]);

export type OnlineGameImportType = z.infer<typeof onlineGameImportType>;

const gameImportType = z.enum([
    ...onlineGameImportType.options,
    'editor',
    'manual',
    'startingPosition',
    'fen',
    'clone',
]);

/** The import type of a game. */
export type GameImportType = z.infer<typeof gameImportType>;

/** The values for the import type of a game. */
export const GameImportTypes = gameImportType.enum;

const onlineGameSchema = z.object({
    /** The URL to import from. */
    url: z.string(),

    /** The PGN text of the game. */
    pgnText: z.string().optional(),

    /** The directory to add the game to. */
    directory: z
        .object({
            /** The owner of the directory. */
            owner: z.string(),

            /** The id of the directory. */
            id: z.string(),
        })
        .optional(),

    /** Whether to publish the game when creating it. */
    publish: z.boolean().optional(),

    /**
     * The orientation of the game. If excluded, the orientation is inferred
     * from the usernames of the players.
     */
    orientation: gameOrientation.optional(),
});

const pgnTextSchema = z.object({
    /** The PGN text of the game. */
    pgnText: z.string(),

    /** The directory to add the game to. */
    directory: z
        .object({
            /** The owner of the directory. */
            owner: z.string(),

            /** The id of the directory. */
            id: z.string(),
        })
        .optional(),

    /** Whether to publish the game when creating it. */
    publish: z.boolean().optional(),

    /**
     * The orientation of the game. If excluded, the orientation is inferred
     * from the usernames of the players.
     */
    orientation: gameOrientation.optional(),
});

/** Verifies a request to create a game. */
export const CreateGameSchema = z.discriminatedUnion('type', [
    z
        .object({
            /** The import type of the game. */
            type: z.literal(GameImportTypes.lichessChapter),
        })
        .extend(onlineGameSchema.shape),

    z
        .object({
            /** The import type of the game. */
            type: z.literal(GameImportTypes.lichessStudy),
        })
        .extend(onlineGameSchema.shape),

    z
        .object({
            /** The import type of the game. */
            type: z.literal(GameImportTypes.lichessGame),
        })
        .extend(onlineGameSchema.shape),

    z
        .object({
            /** The import type of the game. */
            type: z.literal(GameImportTypes.chesscomGame),
        })
        .extend(onlineGameSchema.shape),

    z
        .object({
            /** The import type of the game. */
            type: z.literal(GameImportTypes.chesscomAnalysis),
        })
        .extend(onlineGameSchema.shape),

    z
        .object({
            /** The import type of the game. */
            type: z.literal(GameImportTypes.editor),
        })
        .extend(pgnTextSchema.shape),

    z
        .object({
            /** The import type of the game. */
            type: z.literal(GameImportTypes.manual),
        })
        .extend(pgnTextSchema.shape),

    z
        .object({
            /** The import type of the game. */
            type: z.literal(GameImportTypes.startingPosition),
        })
        .extend(pgnTextSchema.shape),

    z
        .object({
            /** The import type of the game. */
            type: z.literal(GameImportTypes.fen),
        })
        .extend(pgnTextSchema.shape),

    z
        .object({
            /** The import type of the game. */
            type: z.literal(GameImportTypes.clone),
        })
        .extend(pgnTextSchema.shape),
]);

/** A request to create a game. */
export type CreateGameRequest = z.infer<typeof CreateGameSchema>;

/** Verifies the import header of a game. */
const gameHeaderSchema = z.object({
    /** The name of the player with white. */
    white: z.string(),

    /** The name of the player with black. */
    black: z.string(),

    /** The date the game was played. */
    date: z.string(),

    /** The result of the game. */
    result: z.string(),
});

/** The import header of a game. */
export type GameHeader = z.infer<typeof gameHeaderSchema>;

/** Verifies the update portion of an update game request. */
const updateGame = z.object({
    /** The cohort of the game to update. */
    cohort: z.string(),

    /** The id of the game to update. */
    id: z.string(),

    /** The eixsting timeline id of the game. */
    timelineId: z.string().optional(),

    /** If specified, updates whether the game should be unlisted. */
    unlisted: z.boolean().optional(),

    /** If specified, updates the default orientation of the game when it is first opened. */
    orientation: gameOrientation.optional(),

    /** The import headers of the game. */
    headers: gameHeaderSchema.optional(),
});

/** Verifies a request to update a game. */
export const UpdateGameSchema = z
    .discriminatedUnion('type', [
        CreateGameSchema.options[0].omit({ directory: true }).extend(updateGame.shape),
        CreateGameSchema.options[1].omit({ directory: true }).extend(updateGame.shape),
        CreateGameSchema.options[2].omit({ directory: true }).extend(updateGame.shape),
        CreateGameSchema.options[3].omit({ directory: true }).extend(updateGame.shape),
        CreateGameSchema.options[4].omit({ directory: true }).extend(updateGame.shape),
        CreateGameSchema.options[5].omit({ directory: true }).extend(updateGame.shape),
        CreateGameSchema.options[6].omit({ directory: true }).extend(updateGame.shape),
        CreateGameSchema.options[7].omit({ directory: true }).extend(updateGame.shape),
        CreateGameSchema.options[8].omit({ directory: true }).extend(updateGame.shape),
        CreateGameSchema.options[9].omit({ directory: true }).extend(updateGame.shape),
        z
            .object({
                type: z.undefined(),
            })
            .extend(updateGame.shape),
    ])
    .refine((val) => val.type || val.orientation || val.unlisted !== undefined, {
        message: 'At least one of type, orientation or unlisted is required',
    })
    .transform((val) => {
        val.id = atob(val.id);
        return val;
    });

/** A request to update a game. */
export type UpdateGameRequest = z.infer<typeof UpdateGameSchema>;

/** Verifies a request to delete a game. */
export const DeleteGamesSchema = z
    .object({
        /** The cohort of the game to delete. */
        cohort: z.string(),

        /** The id of the game to delete. */
        id: z.string(),
    })
    .array()
    .min(1)
    .max(100);

/** A request to delete games. Up to 100 games can be deleted in a single call. */
export type DeleteGamesRequest = z.infer<typeof DeleteGamesSchema>;

/** The response to a delete games request. Contains the keys of the successfully deleted games. */
export type DeleteGamesResponse = DeleteGamesRequest;

/** The key of a game in the database. */
export interface GameKey {
    /** The cohort the game is in. */
    cohort: string;
    /** The id of the game. */
    id: string;
}

export enum GameResult {
    White = '1-0',
    Black = '0-1',
    Draw = '1/2-1/2',
    Incomplete = '*',
}

export interface PgnHeaders {
    White: string;
    WhiteElo?: string;
    Black: string;
    BlackElo?: string;
    Date: string;
    Site: string;
    Result: GameResult;
    [key: string]: string | undefined;
}

export interface GameInfo extends GameKey {
    date: string;
    owner: string;
    ownerDisplayName: string;
    ownerPreviousCohort: string;
    headers: PgnHeaders;
    createdAt: string;

    /** When the game was last updated. */
    updatedAt?: string;

    /** When the game was last changed from unlisted to public. */
    publishedAt?: string;

    /** Whether the game is unlisted or not. */
    unlisted?: boolean;

    /**
     * The review status of the game. Omitted if the game
     * is not submitted for review.
     */
    reviewStatus?: GameReviewStatus;

    /**
     * The date the user requested a review for this game in ISO
     * format. Omitted if the game was not submitted for review.
     */
    reviewRequestedAt?: string;

    /**
     * The game review metadata. Omitted if the game was not submitted
     * for review.
     */
    review?: GameReview;

    /** The time class of the game. Currently set only on master games. */
    timeClass?: string;

    /** Whether the game has been marked as well annotated by an admin. */
    isFeatured?: string;

    /** The date the game was marked as well annotated in ISO format. */
    featuredAt?: string;
}

export interface CommentOwner {
    /** The username of the comment owner. */
    username: string;

    /** The display name of the comment owner. */
    displayName: string;

    /** The current cohort of the comment owner, at the time of creating the comment. */
    cohort: string;

    /** The cohort the comment owner most recently graduated from, at the time of creating the comment. */
    previousCohort: string;
}

export interface PositionComment {
    /** A v4 UUID identifying the comment. */
    id: string;

    /** The normalized FEN of the position the comment was added to. */
    fen: string;

    /** The ply of the position the comment was added to. */
    ply?: number;

    /** The san of the position the comment was added to. */
    san?: string;

    /** The poster of the comment. */
    owner: CommentOwner;

    /** The time the comment was created. */
    createdAt: string;

    /** The time the comment was last updated. */
    updatedAt: string;

    /** The text content of the comment, which may contain mention markup. */
    content: string;

    /** A comma-separated list of the parent comment ids. Empty for a top-level comment. */
    parentIds?: string;

    /** Replies to this comment, mapped by their IDs. */
    replies: Record<string, PositionComment>;

    /** A PGN which suggests a variation starting from this position. */
    suggestedVariation?: string;
}

export type Game = GameInfo & {
    pgn: string;
    orientation?: 'white' | 'black';
    timelineId?: string;
    /**
     * A map from the normalized FEN of a position to a map from the id of a comment
     * to the comment.
     */
    positionComments: Record<string, Record<string, PositionComment>>;
};

/** The status of a game review. */
export enum GameReviewStatus {
    Pending = 'PENDING',
    None = '',
}

export enum GameReviewType {
    Quick = 'QUICK',
    Deep = 'DEEP',
}

export interface GameReview {
    /** The type of review requested. */
    type: GameReviewType;

    /**
     * The date the game was reviewed in ISO format. Omitted if the game
     * was not reviewed yet.
     */
    reviewedAt?: string;

    /** The reviewer of the game. */
    reviewer?: {
        /** The username of the reviewer. */
        username: string;

        /** The display name of the reviewer. */
        displayName: string;

        /** The cohort of the reviewer. */
        cohort: string;
    };
}
