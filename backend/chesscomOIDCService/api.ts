'use strict';

import { GetSecretValueCommand, SecretsManagerClient } from '@aws-sdk/client-secrets-manager';
import axios from 'axios';
import { createPrivateKey, createPublicKey, createSign } from 'node:crypto';

// Chess.com OAuth endpoints — confirm these when credentials are issued.
// Chess.com's developer docs may specify different URLs.
export const CHESSCOM_AUTHORIZE_URL = 'https://oauth.chess.com/authorize';
export const CHESSCOM_TOKEN_URL = 'https://oauth.chess.com/token';
export const CHESSCOM_API_BASE = 'https://api.chess.com';

// The scope Chess.com requires to access profile + email.
// Confirm supported scopes with Chess.com when applying for credentials.
export const CHESSCOM_SCOPE = 'openid email profile';

// Environment variables
export const STAGE = process.env.stage || 'dev';
export const CHESSCOM_CLIENT_ID = process.env.chesscomClientId || '';
export const CHESSCOM_CLIENT_SECRET = process.env.chesscomClientSecret || '';
export const OIDC_BASE_URL = process.env.oidcBaseUrl || '';
export const RSA_SECRET_NAME = process.env.rsaSecretName || '';

// Key ID embedded in all signed JWTs and exposed in JWKS.
export const KEY_ID = 'chesscom-oidc-v1';

const secretsClient = new SecretsManagerClient({ region: 'us-east-1' });

// Cached RSA private key PEM (loaded once per Lambda container lifetime).
let cachedPrivateKey: string | null = null;

export async function getPrivateKey(): Promise<string> {
    if (cachedPrivateKey) {
        return cachedPrivateKey;
    }
    const response = await secretsClient.send(
        new GetSecretValueCommand({ SecretId: RSA_SECRET_NAME }),
    );
    const secret = JSON.parse(response.SecretString || '{}') as { privateKey: string };
    cachedPrivateKey = secret.privateKey;
    return cachedPrivateKey;
}

/** Returns the RSA public key as a JWK, derived from the stored private key. */
export async function getPublicKeyJwk(): Promise<Record<string, string>> {
    const privateKeyPem = await getPrivateKey();
    const privateKeyObj = createPrivateKey(privateKeyPem);
    const publicKeyObj = createPublicKey(privateKeyObj);
    const jwk = publicKeyObj.export({ format: 'jwk' }) as { n: string; e: string };
    return {
        kty: 'RSA',
        alg: 'RS256',
        use: 'sig',
        kid: KEY_ID,
        n: jwk.n,
        e: jwk.e,
    };
}

interface IdTokenPayload {
    iss: string;
    aud: string;
    sub: string;
    iat: number;
    exp: number;
    name: string;
    email: string;
    email_verified: boolean;
    nonce?: string;
}

/** Creates a signed RS256 JWT ID token. */
export function createIdToken(payload: IdTokenPayload, privateKeyPem: string): string {
    const header = JSON.stringify({ alg: 'RS256', typ: 'JWT', kid: KEY_ID });
    const encodedHeader = Buffer.from(header).toString('base64url');
    const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64url');
    const signingInput = `${encodedHeader}.${encodedPayload}`;
    const signer = createSign('RSA-SHA256');
    signer.update(signingInput);
    const signature = signer.sign(privateKeyPem, 'base64url');
    return `${signingInput}.${signature}`;
}

export interface ChesscomTokenResponse {
    access_token: string;
    token_type: string;
    expires_in: number;
    // Chess.com may include the username directly in the token response.
    // Confirm with Chess.com documentation when credentials are issued.
    username?: string;
}

export interface ChesscomUserInfo {
    /** Chess.com numeric user ID — used as OIDC `sub`. */
    id: number;
    username: string;
    name?: string;
    /** Email is returned only if the user grants the email scope. */
    email?: string;
}

/**
 * Exchanges a Chess.com authorization code for an access token.
 * @param code The authorization code from Chess.com.
 * @param redirectUri The redirect URI used in the original authorize request.
 */
export async function exchangeChesscomCode(
    code: string,
    redirectUri: string,
): Promise<ChesscomTokenResponse> {
    const params = new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
        client_id: CHESSCOM_CLIENT_ID,
        client_secret: CHESSCOM_CLIENT_SECRET,
    });
    const response = await axios.post<ChesscomTokenResponse>(CHESSCOM_TOKEN_URL, params, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
    return response.data;
}

/**
 * Fetches user info from the Chess.com API using the provided access token.
 * If the token endpoint already returned the username, passes it through to
 * avoid an extra API call for the public profile lookup.
 */
export async function fetchChesscomUser(
    accessToken: string,
    username?: string,
): Promise<ChesscomUserInfo> {
    // Try a /me or userinfo endpoint first (confirm URL with Chess.com).
    // Chess.com's public API: https://api.chess.com/pub/player/{username}
    // Their OAuth API may expose: https://api.chess.com/v1/me or similar.
    try {
        const meResponse = await axios.get<ChesscomUserInfo>(`${CHESSCOM_API_BASE}/v1/me`, {
            headers: { Authorization: `Bearer ${accessToken}` },
        });
        return meResponse.data;
    } catch {
        // Fall back to public profile if /me is not available.
        if (!username) {
            throw new Error('Cannot fetch Chess.com user info: no username available');
        }
        const profileResponse = await axios.get<{
            id: number;
            username: string;
            name?: string;
        }>(`${CHESSCOM_API_BASE}/pub/player/${username}`);
        return {
            id: profileResponse.data.id,
            username: profileResponse.data.username,
            name: profileResponse.data.name,
            // Email is not available from the public API.
        };
    }
}

/** Returns a standard CORS + JSON response. */
export function jsonResponse(statusCode: number, body: unknown) {
    return {
        statusCode,
        headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify(body),
    };
}

/** Returns a redirect response. */
export function redirectResponse(location: string) {
    return {
        statusCode: 302,
        headers: { Location: location },
        body: '',
    };
}
