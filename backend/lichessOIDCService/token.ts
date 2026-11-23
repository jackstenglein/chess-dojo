'use strict';

import { APIGatewayProxyHandlerV2 } from 'aws-lambda';
import { randomBytes } from 'node:crypto';
import {
    OIDC_BASE_URL,
    createIdToken,
    exchangeLichessCode,
    fetchLichessUser,
    getPrivateKey,
    jsonResponse,
    redirectResponse,
} from './api';
import {
    deleteProxyCode,
    getAuthState,
    getProxyCode,
    putAccessToken,
    putProxyCode,
} from './database';

/**
 * Handles Lichess's OAuth callback. Exchanges the Lichess code for tokens,
 * fetches the user profile, stores a short-lived proxy code, then redirects
 * back to Cognito's callback URL.
 */
export const callbackHandler: APIGatewayProxyHandlerV2 = async (event) => {
    const params = event.queryStringParameters ?? {};
    const lichessCode = params.code;
    const proxyState = params.state;

    if (!lichessCode || !proxyState) {
        return jsonResponse(400, { error: 'invalid_request', error_description: 'Missing code or state' });
    }

    const authState = await getAuthState(proxyState);
    if (!authState) {
        return jsonResponse(400, { error: 'invalid_state', error_description: 'State not found or expired' });
    }

    const callbackUri = `${OIDC_BASE_URL}/callback`;

    let sub: string;
    let name: string;
    let email: string;
    let email_verified: boolean;

    try {
        const lichessTokens = await exchangeLichessCode(lichessCode, callbackUri);
        const lichessUser = await fetchLichessUser(lichessTokens.access_token);

        sub = lichessUser.sub;
        name = lichessUser.name;
        email = lichessUser.email;
        email_verified = lichessUser.email_verified;
    } catch (err) {
        console.error('Lichess token/user fetch failed:', err);
        const errorParams = new URLSearchParams({
            error: 'server_error',
            state: authState.cognitoState,
        });
        return redirectResponse(`${authState.cognitoRedirectUri}?${errorParams.toString()}`);
    }

    const proxyCode = randomBytes(32).toString('hex');
    await putProxyCode(proxyCode, {
        sub,
        name,
        email,
        email_verified,
        nonce: authState.nonce,
        cognitoRedirectUri: authState.cognitoRedirectUri,
        cognitoState: authState.cognitoState,
    });

    const redirectParams = new URLSearchParams({
        code: proxyCode,
        state: authState.cognitoState,
    });
    return redirectResponse(`${authState.cognitoRedirectUri}?${redirectParams.toString()}`);
};

/**
 * Handles Cognito's token request (POST /token). Exchanges the proxy code
 * for an OIDC ID token + access token and returns them to Cognito.
 */
export const tokenHandler: APIGatewayProxyHandlerV2 = async (event) => {
    // Token requests from Cognito arrive as application/x-www-form-urlencoded.
    const body = new URLSearchParams(event.body ?? '');
    const grantType = body.get('grant_type');
    const code = body.get('code');

    if (grantType !== 'authorization_code' || !code) {
        return jsonResponse(400, { error: 'invalid_request', error_description: 'Missing code or unsupported grant_type' });
    }

    const codeData = await getProxyCode(code);
    if (!codeData) {
        return jsonResponse(400, { error: 'invalid_grant', error_description: 'Code not found or expired' });
    }

    // Delete the code immediately — authorization codes are single-use.
    await deleteProxyCode(code);

    const now = Math.floor(Date.now() / 1000);
    const expiresIn = 3600;

    let idToken: string;
    try {
        const privateKey = await getPrivateKey();
        idToken = createIdToken(
            {
                iss: OIDC_BASE_URL,
                aud: 'lichess-oidc',
                sub: codeData.sub,
                iat: now,
                exp: now + expiresIn,
                name: codeData.name,
                email: codeData.email,
                email_verified: codeData.email_verified,
                nonce: codeData.nonce,
            },
            privateKey,
        );
    } catch (err) {
        console.error('Failed to create ID token:', err);
        return jsonResponse(500, { error: 'server_error' });
    }

    const accessToken = randomBytes(32).toString('hex');
    await putAccessToken(accessToken, {
        sub: codeData.sub,
        name: codeData.name,
        email: codeData.email,
        email_verified: codeData.email_verified,
    });

    return jsonResponse(200, {
        access_token: accessToken,
        token_type: 'Bearer',
        expires_in: expiresIn,
        id_token: idToken,
    });
};
