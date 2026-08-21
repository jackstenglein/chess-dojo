/** The scopes that can be granted to a personal access token. */
export enum PatScope {
    /** Grants read-only access (GET requests). */
    Read = 'read',

    /** Grants write access (POST/PUT/DELETE requests). */
    Write = 'write',
}

/**
 * A personal access token that third-party integrations (Eg: MCP servers)
 * can use to call the ChessDojo API on behalf of a user. The raw token value
 * is never stored and is only returned once, at creation time.
 */
export interface PersonalAccessToken {
    /** A random UUID identifying this token. Used to revoke tokens. */
    id: string;

    /** A human-readable name for the token (Eg: `ChessAgine MCP`). */
    name: string;

    /** The first characters of the raw token (Eg: `dojo_pat_AbC1`). */
    displayPrefix: string;

    /** The scopes granted to this token. */
    scopes: PatScope[];

    /** The date the token was created, in ISO 8601. */
    createdAt: string;

    /** The date the token expires, in ISO 8601. Undefined if it never expires. */
    expiresAt?: string;

    /** The date the token was last used to authenticate, in ISO 8601. */
    lastUsedAt?: string;
}

/** A request to create a new personal access token. */
export interface CreatePatRequest {
    /** A human-readable name for the token. */
    name: string;

    /** The scopes granted to the token. Defaults to [read] if empty. */
    scopes: PatScope[];

    /** The number of days until the token expires. If zero, the token never expires. */
    expirationDays: number;
}

/** The response from creating a new personal access token. */
export interface CreatePatResponse {
    /** The metadata of the created token. */
    token: PersonalAccessToken;

    /** The raw token value. This is the only time it is ever returned. */
    accessToken: string;
}

/** The response from listing personal access tokens. */
export interface ListPatsResponse {
    /** The current user's tokens. */
    tokens: PersonalAccessToken[];
}
