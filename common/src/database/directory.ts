import { v4 as uuidv4 } from 'uuid';
import * as z from 'zod';
import { PdfExportSchema } from '../pgn/export';

const gameMetadataSchema = z.object({
    /** The cohort of the game. */
    cohort: z.string(),

    /** The id of the game. */
    id: z.string(),

    /** The username of the owner of the game. */
    owner: z.string(),

    /** The display name of the owner of the game. */
    ownerDisplayName: z.string().optional().nullable(),

    /** The datetime the game was uploaded to the database, in ISO format. */
    createdAt: z.string(),

    /** The player with the white pieces. */
    white: z.string(),

    /** The player with the black pieces. */
    black: z.string(),

    /** The elo of the player with the white pieces. */
    whiteElo: z.string().optional().nullable(),

    /** The elo of the player with the black pieces. */
    blackElo: z.string().optional().nullable(),

    /** The result of the game. */
    result: z.string().optional().nullable(),

    /** Whether the game is unlisted or not. */
    unlisted: z.boolean().optional(),
});

/** Metadata about a game in a directory. */
export type DirectoryGameMetadata = z.infer<typeof gameMetadataSchema>;

const directoryVisibility = z.enum(['PUBLIC', 'PRIVATE']);

/** The visibility of a directory. */
export const DirectoryVisibility = directoryVisibility.enum;

export type DirectoryVisibilityType = z.infer<typeof directoryVisibility>;

const directoryItemType = z.enum(['DIRECTORY', 'OWNED_GAME', 'MASTER_GAME', 'DOJO_GAME']);

export type DirectoryItemType = z.infer<typeof directoryItemType>;

/** The type of a directory item. */
export const DirectoryItemTypes = directoryItemType.enum;

/** The id of the home directory. */
export const HOME_DIRECTORY_ID = 'home';

/** The id of the shared with me directory. */
export const SHARED_DIRECTORY_ID = 'shared';

/** The id of the all my uploads directory. */
export const ALL_MY_UPLOADS_DIRECTORY_ID = 'uploads';

/** The id of the my games directory. */
export const MY_GAMES_DIRECTORY_ID = 'mygames';

/** Verifies the type of a directory item. */
export const DirectoryItemSchema = z.discriminatedUnion('type', [
    z.object({
        /** The type of the directory item. */
        type: z.literal(DirectoryItemTypes.DIRECTORY),

        /**
         * The id of the directory item. For a subdirectory, this is the id of the directory. */
        id: z.union([
            z.uuid(),
            z.literal(HOME_DIRECTORY_ID),
            z.literal(SHARED_DIRECTORY_ID),
            z.literal(MY_GAMES_DIRECTORY_ID),
            z.literal(ALL_MY_UPLOADS_DIRECTORY_ID),
        ]),

        /**
         * The username of the person who added the item to the directory. If
         * not included, the directory owner is the adder.
         */
        addedBy: z.string().optional(),

        /** The metadata of the directory item. */
        metadata: z.object({
            /** The datetime the directory was created, in ISO format. */
            createdAt: z.iso.datetime(),

            /** The datetime the directory was updated, in ISO format. */
            updatedAt: z.iso.datetime(),

            /** The visibility of the directory. */
            visibility: directoryVisibility,

            /** The name of the directory. */
            name: z.string().trim().max(100),

            /** The description of the directory. */
            description: z.string().trim().max(100).optional(),

            /**
             * The recursive count of games in this directory and its subdirectories
             * visible to the viewer. Computed server-side at fetch time; not stored in DynamoDB.
             */
            gameCount: z.number().optional(),
        }),
    }),
    z.object({
        /** The type of the directory item. */
        type: z.literal(DirectoryItemTypes.OWNED_GAME),

        /** The id of the directory item. For a game, this is the value cohort/id. */
        id: z.string(),

        /**
         * The username of the person who added the item to the directory. If
         * not included, the directory owner is the adder.
         */
        addedBy: z.string().optional(),

        /** The metadata of the directory item. */
        metadata: gameMetadataSchema,
    }),
    z.object({
        /** The type of the directory item. */
        type: z.literal(DirectoryItemTypes.MASTER_GAME),

        /** The id of the directory item. */
        id: z.string(),

        /**
         * The username of the person who added the item to the directory. If
         * not included, the directory owner is the adder.
         */
        addedBy: z.string().optional(),

        /** The metadata of the directory item. */
        metadata: gameMetadataSchema,
    }),
    z.object({
        /** The type of the directory item. */
        type: z.literal(DirectoryItemTypes.DOJO_GAME),

        /** The id of the directory item. */
        id: z.string(),

        /**
         * The username of the person who added the item to the directory. If
         * not included, the directory owner is the adder.
         */
        addedBy: z.string().optional(),

        /** The metadata of the directory item. */
        metadata: gameMetadataSchema,
    }),
]);

/** The ids of default directories. */
const DEFAULT_DIRECTORIES = [
    HOME_DIRECTORY_ID,
    SHARED_DIRECTORY_ID,
    ALL_MY_UPLOADS_DIRECTORY_ID,
    MY_GAMES_DIRECTORY_ID,
];

/**
 * The ids of directories fully managed by the platform.
 * These directories cannot be manually updated.
 */
const PLATFORM_MANAGED_DIRECTORIES = [SHARED_DIRECTORY_ID, ALL_MY_UPLOADS_DIRECTORY_ID];

/**
 * Returns true if the given id is a default directory.
 * @param id The id to check.
 */
export function isDefaultDirectory(id: string): boolean {
    return DEFAULT_DIRECTORIES.includes(id);
}

/**
 * Returns true if the given id is a platform-managed directory.
 * These directories cannot be manually updated.
 * @param id The id to check.
 */
export function isManagedDirectory(id: string): boolean {
    return PLATFORM_MANAGED_DIRECTORIES.includes(id);
}

/**
 * Returns true if the given directory is selectable.
 * @param id The id to check.
 */
export function isSelectableDirectory(id: string): boolean {
    return id !== ALL_MY_UPLOADS_DIRECTORY_ID;
}

/**
 * Access roles a user can have on a shared directory.
 */
export enum DirectoryAccessRole {
    /** Viewers can see all games and sub directories. */
    Viewer = 'VIEWER',

    /** Editors can add games and remove games they added. */
    Editor = 'EDITOR',

    /** Admins can perform all directory actions except deleting the directory. */
    Admin = 'ADMIN',

    /** The owner of the directory. Can perform all directory actions. */
    Owner = 'OWNER',
}

export const DirectorySchema = z.object({
    /** The username of the owner of the directory. */
    owner: z.string(),

    /**
     * The id of the directory. Most directories are v4 UUIDs, but some have
     * fixed, known values:
     *   - The home directory is `home`.
     *   - The shared with me directory is `shared`.
     *   - The all uploads directory is `uploads`.
     */
    id: z.union([
        z.uuid(),
        z.literal(HOME_DIRECTORY_ID),
        z.literal(SHARED_DIRECTORY_ID),
        z.literal(ALL_MY_UPLOADS_DIRECTORY_ID),
        z.literal(MY_GAMES_DIRECTORY_ID),
    ]),

    /** The id of the parent directory. Top-level directories use uuid.NIL. */
    parent: z.union([z.uuid(), z.literal(HOME_DIRECTORY_ID), z.literal(MY_GAMES_DIRECTORY_ID)]),

    /** The name of the directory. */
    name: z.string().trim().max(100),

    /** The description of the directory. */
    description: z.string().trim().max(100).optional(),

    /** Whether the directory is visible to other users. */
    visibility: directoryVisibility,

    /** The items in the directory, mapped by their ids. */
    items: z.record(z.string(), DirectoryItemSchema),

    /** The ids of the items in the directory in their default order. */
    itemIds: z.string().array(),

    /** The datetime the directory was created, in ISO format. */
    createdAt: z.iso.datetime(),

    /** The datetime the directory was updated, in ISO format. */
    updatedAt: z.iso.datetime(),

    /** A map from username to the user's access role in the directory. */
    access: z.record(z.string(), z.nativeEnum(DirectoryAccessRole)).optional(),
});

/** A directory owned by a user. */
export type Directory = z.TypeOf<typeof DirectorySchema>;

/** A single item in a directory. */
export type DirectoryItem = z.TypeOf<typeof DirectoryItemSchema>;

/** A subdirectory in another directory. */
export type DirectoryItemSubdirectory = z.infer<(typeof DirectoryItemSchema.options)[0]>;

/** A directory item representing a game. */
export type DirectoryItemGame = z.infer<
    | (typeof DirectoryItemSchema.options)[1]
    | (typeof DirectoryItemSchema.options)[2]
    | (typeof DirectoryItemSchema.options)[3]
>;

/** The metadata of a game in a directory. */
export type DirectoryItemGameMetadata = z.infer<typeof gameMetadataSchema>;

/** Verifies a request to create a directory. */
const CreateDirectorySchemaV2Client = DirectorySchema.pick({
    owner: true,
    parent: true,
    name: true,
    visibility: true,
});

/**
 * Verifies a request to create a directory.
 */
export const CreateDirectorySchemaV2 = CreateDirectorySchemaV2Client.transform((value) => {
    return { ...value, id: uuidv4() };
});

/** A request to create a directory, as seen by the server. */
export type CreateDirectoryRequestV2 = z.infer<typeof CreateDirectorySchemaV2>;

/** A request to create a directory, as seen by the client. */
export type CreateDirectoryRequestV2Client = z.infer<typeof CreateDirectorySchemaV2Client>;

/** Verifies a request to update a directory. */
export const UpdateDirectorySchemaV2 = DirectorySchema.pick({
    /** The owner of the directory to update. */
    owner: true,

    /** The id of the directory to update. */
    id: true,

    /** The new name to set on the directory. */
    name: true,

    /** The new visibility to set on the directory. */
    visibility: true,

    /** The new order of the items to set on the directory. */
    itemIds: true,
}).partial({ name: true, visibility: true, itemIds: true });

/** A request to update a directory. */
export type UpdateDirectoryRequestV2 = z.infer<typeof UpdateDirectorySchemaV2>;

/** Verifies a request to delete directories. */
export const DeleteDirectoriesSchemaV2 = z.object({
    /** The owner of the directories to delete. */
    owner: z.string(),

    /** The ids of the directories to delete. */
    ids: z.string().array(),
});

/** A request to delete directories. All directories in the request must have the same parent. */
export type DeleteDirectoriesRequestV2 = z.infer<typeof DeleteDirectoriesSchemaV2>;

/**
 * Verifies a request to add items to a directory. Currently, only
 * games are handled by this request. Subdirectories can be added using
 * the create directory request.
 */
export const AddDirectoryItemsSchemaV2 = DirectorySchema.pick({
    /** The owner of the directory to add items to. */
    owner: true,

    /** The id of the directory to add items to. */
    id: true,
}).extend({
    /** The games to add to the directory. */
    games: gameMetadataSchema.array(),
});

/** A request to add items to a directory. */
export type AddDirectoryItemsRequestV2 = z.infer<typeof AddDirectoryItemsSchemaV2>;

/**
 * Verifies a request to remove items from a directory. Currently, only
 * games are handled by this request. Subdirectories can be removed using
 * the delete directory request.
 */
export const RemoveDirectoryItemsSchemaV2 = z.object({
    /** The owner of the directory to remove the items from. */
    owner: DirectorySchema.shape.owner,

    /** The id of the directory to remove the items from. */
    directoryId: DirectorySchema.shape.id,

    /** The ids of the item to remove. */
    itemIds: z.string().array(),
});

/** A request to remove game items from a directory. */
export type RemoveDirectoryItemsRequestV2 = z.infer<typeof RemoveDirectoryItemsSchemaV2>;

/**
 * Verifies a request to move items between directories.
 */
export const MoveDirectoryItemsSchemaV2 = z
    .object({
        /** The directory currently containing the items. */
        source: z.object({
            /** The owner of the directory currently containing the items. */
            owner: DirectorySchema.shape.owner,
            /** The id of the directory currently containing the items. */
            id: DirectorySchema.shape.id,
        }),

        /** The directory to move the items into. */
        target: z.object({
            /** The owner of the directory to move the items into. */
            owner: DirectorySchema.shape.owner,
            /** The id of the directory to move the items into. */
            id: DirectorySchema.shape.id,
        }),

        /** The ids of the items to move. */
        items: z.string().array(),
    })
    .refine((val) => val.source.owner !== val.target.owner || val.source.id !== val.target.id, {
        message: 'source/target directories must be different',
    });

/** A request to move items between directories. */
export type MoveDirectoryItemsRequestV2 = z.infer<typeof MoveDirectoryItemsSchemaV2>;

/** Verifies the type of a request to share a directory. */
export const ShareDirectorySchema = DirectorySchema.pick({
    owner: true,
    id: true,
    access: true,
}).required();

/** A request to share a directory. */
export type ShareDirectoryRequest = z.infer<typeof ShareDirectorySchema>;

/** Verifies the type of a request to list the breadcrumbs for a directory. */
export const ListBreadcrumbsSchema = DirectorySchema.pick({
    /** The owner of the directory. */
    owner: true,
    /** The id of the directory. */
    id: true,
})
    .extend({
        /** Whether the viewer is looking at a shared directory. */
        shared: z.string().optional(),
    })
    .transform((val) => ({ ...val, shared: val.shared === 'true' }));

/** A request to list the breadcrumbs of a directory. */
export type ListBreadcrumbsRequest = z.infer<typeof ListBreadcrumbsSchema>;

/** Verifies the type of a request to export a directory. */
export const ExportDirectorySchema = z
    .object({
        /** Individual games to export. */
        games: z
            .object({
                /** The cohort the game is in. */
                cohort: z.string(),
                /** The id the game is in. */
                id: z.string(),
            })
            .array()
            .optional(),
        /** Directories to export. */
        directories: DirectorySchema.pick({
            /** The owner of the directory. */
            owner: true,
            /** The id of the directory. */
            id: true,
        })
            .array()
            .optional(),
        /** Whether to recursively export subdirectories of the given directories. */
        recursive: z.boolean().optional(),
        /** Options when exporting the PGNs. */
        options: PdfExportSchema.pick({
            skipHeader: true,
            skipComments: true,
            skipNags: true,
            skipDrawables: true,
            skipVariations: true,
            skipNullMoves: true,
        })
            .extend({
                /** Whether to skip clock tags. */
                skipClocks: z.boolean().optional(),
            })
            .optional(),
    })
    .refine((val) => val.games?.length || val.directories?.length, {
        message: 'At least one game or directory is required',
    });

/** A request to export a directory. */
export type ExportDirectoryRequest = z.infer<typeof ExportDirectorySchema>;

/** Verifies the type of a request to check a directory export. */
export const CheckExportDirectorySchema = z.object({
    /** The id of the directory export run to check. */
    id: z.string(),
});

/** A request to check the status of a directory export run. */
export type CheckExportDirectoryRequest = z.infer<typeof CheckExportDirectorySchema>;

/** The status of an export directory run. */
export const exportDirectoryRunStatus = z.enum(['IN_PROGRESS', 'COMPLETED', 'FAILED']);

/** Verifies an export directory run. */
export const exportDirectoryRunSchema = z.object({
    /** The username of the user who started the run. */
    username: z.string(),
    /** The id of the run. */
    id: z.string(),
    /** The status of the run. */
    status: exportDirectoryRunStatus,
    /** The number of games exported so far. */
    progress: z.number(),
    /** The total number of games to export. */
    total: z.number(),
    /** The request that initiated the run. */
    request: ExportDirectorySchema,
    /** When the run started, in ISO 8601. */
    startedAt: z.string(),
    /** When the run completed, in ISO 8601. */
    completedAt: z.string().optional(),
    /** A presigned S3 URL to download the final zip. */
    downloadUrl: z.string().optional(),
    /** The DynamoDB time to live for the run. */
    ttl: z.number(),
});

/** A run to export a directory. */
export type ExportDirectoryRun = z.infer<typeof exportDirectoryRunSchema>;

/** Verifies a request to get directory stats. */
export const GetDirectoryStatsRequestSchema = DirectorySchema.pick({
    owner: true,
    id: true,
}).extend({
    /** The username of the player to fetch ratings for, as recorded in the PGN. */
    username: z.string().min(1),
    /** The rating system to fetch ratings for. */
    ratingSystem: z.string().min(1),
});

/** A request to get directory stats. */
export type GetDirectoryStatsRequest = z.infer<typeof GetDirectoryStatsRequestSchema>;

interface ColorPerformanceStats {
    /** The metric overall. */
    total: number;
    /** The metric as white. */
    white: number;
    /** The metric as black. */
    black: number;
}

export interface PerformanceStats {
    /** The number of games the user won. */
    wins: ColorPerformanceStats;
    /* The number of games the user drew. */
    draws: ColorPerformanceStats;
    /** The number of games the user lost. */
    losses: ColorPerformanceStats;
    /** The user's combined performance rating in the original rating system. */
    rating: ColorPerformanceStats;
    /** The user's combined performance rating normalized to the Dojo system. */
    normalizedRating: ColorPerformanceStats;
    /** The average rating of the opponents in the original rating system. */
    avgOppRating: ColorPerformanceStats;
    /** The average rating of the opponents normalized to the Dojo system. */
    normalizedAvgOppRating: ColorPerformanceStats;
    /** The stats for the rating broken down by cohort. */
    cohortRatings: Record<string, CohortPerformanceStats>;
}

export type CohortPerformanceStats = Omit<PerformanceStats, 'cohortRatings'>;

/**
 * Returns true if currRole has permissions greater than or equal to minRole.
 * @param minRole The minimum required role.
 * @param currRole The current role to check.
 */
export function compareRoles(
    minRole: DirectoryAccessRole,
    currRole: DirectoryAccessRole | undefined,
): boolean {
    switch (minRole) {
        case DirectoryAccessRole.Viewer:
            return currRole !== undefined;
        case DirectoryAccessRole.Editor:
            return (
                currRole === DirectoryAccessRole.Editor ||
                currRole === DirectoryAccessRole.Admin ||
                currRole === DirectoryAccessRole.Owner
            );
        case DirectoryAccessRole.Admin:
            return currRole === DirectoryAccessRole.Admin || currRole === DirectoryAccessRole.Owner;

        case DirectoryAccessRole.Owner:
            return currRole === DirectoryAccessRole.Owner;
    }
}
