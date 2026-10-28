'use strict';

import { GetSecretValueCommand, SecretsManagerClient } from '@aws-sdk/client-secrets-manager';
import axios from 'axios';
import { createPrivateKey, createPublicKey, createSign } from 'node:crypto';

export const LICHESS_AUTHORIZE_URL = 'https://lichess.org/oauth';
export const LICHESS_TOKEN_URL = 'https://lichess.org/api/token';
export const LICHESS_API_BASE = 'https://lichess.org/api';
export const LICHESS_SCOPE = 'email:read';

// Environment variables
export const STAGE = process.env.stage || 'dev';
export const LICHESS_CLIENT_ID = process.env.lichessClientId || '';
export const LICHESS_CLIENT_SECRET = process.env.lichessClientSecret || '';
export const OIDC_BASE_URL = process.env.oidcBaseUrl || '';
export const RSA_SECRET_NAME = process.env.rsaSecretName || '';

// Key ID embedded in all signed JWTs and exposed in JWKS.
export const KEY_ID = 'lichess-oidc-v1';

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

export interface LichessTokenResponse {
    access_token: string;
    token_type: string;
    expires_in: number;
}

export interface LichessUser {
    /** Lowercase, stable Lichess username — used as OIDC `sub`. */
    id: string;
    /** Case-preserved display name. */
    username: string;
}

export interface LichessEmail {
    email: string;
}

/**
 * Exchanges a Lichess authorization code for an access token.
 */
export async function exchangeLichessCode(
    code: string,
    redirectUri: string,
): Promise<LichessTokenResponse> {
    const params: Record<string, string> = {
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
        client_id: LICHESS_CLIENT_ID,
    };
    if (LICHESS_CLIENT_SECRET) {
        params.client_secret = LICHESS_CLIENT_SECRET;
    }
    const response = await axios.post<LichessTokenResponse>(
        LICHESS_TOKEN_URL,
        new URLSearchParams(params),
        { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } },
    );
    return response.data;
}

/**
 * Fetches Lichess account info and email using the provided access token.
 * Returns the user's id, username, and email (placeholder if not granted).
 */
export async function fetchLichessUser(accessToken: string): Promise<{
    sub: string;
    name: string;
    email: string;
    email_verified: boolean;
}> {
    const headers = { Authorization: `Bearer ${accessToken}` };

    const [accountResponse, emailResponse] = await Promise.allSettled([
        axios.get<LichessUser>(`${LICHESS_API_BASE}/account`, { headers }),
        axios.get<LichessEmail>(`${LICHESS_API_BASE}/account/email`, { headers }),
    ]);

    if (accountResponse.status === 'rejected') {
        throw new Error(`Failed to fetch Lichess account: ${String(accountResponse.reason)}`);
    }

    const user = accountResponse.value.data;
    const sub = user.id;
    const name = user.username;

    let email: string;
    let email_verified: boolean;

    if (emailResponse.status === 'fulfilled' && emailResponse.value.data.email) {
        email = emailResponse.value.data.email;
        email_verified = true;
    } else {
        email = `${sub}@lichess.org`;
        email_verified = false;
    }

    return { sub, name, email, email_verified };
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
