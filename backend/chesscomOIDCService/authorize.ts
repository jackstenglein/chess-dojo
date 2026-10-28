'use strict';

import { APIGatewayProxyHandlerV2 } from 'aws-lambda';
import { randomBytes } from 'node:crypto';
import {
    CHESSCOM_AUTHORIZE_URL,
    CHESSCOM_CLIENT_ID,
    CHESSCOM_SCOPE,
    OIDC_BASE_URL,
    jsonResponse,
    redirectResponse,
} from './api';
import { putAuthState } from './database';

/**
 * Handles Cognito's OIDC authorize request. Stores Cognito's state, then
 * redirects the user to Chess.com's OAuth authorization page.
 */
export const authorizeHandler: APIGatewayProxyHandlerV2 = async (event) => {
    const params = event.queryStringParameters ?? {};
    const cognitoState = params.state;
    const cognitoRedirectUri = params.redirect_uri;
    const scope = params.scope ?? CHESSCOM_SCOPE;
    const nonce = params.nonce;

    if (!cognitoState || !cognitoRedirectUri) {
        return jsonResponse(400, { error: 'invalid_request', error_description: 'Missing state or redirect_uri' });
    }

    // Generate a fresh state value for the Chess.com leg of the flow.
    const proxyState = randomBytes(32).toString('hex');

    await putAuthState(proxyState, {
        cognitoState,
        cognitoRedirectUri,
        scope,
        nonce,
    });

    const callbackUri = `${OIDC_BASE_URL}/callback`;
    const chesscomParams = new URLSearchParams({
        response_type: 'code',
        client_id: CHESSCOM_CLIENT_ID,
        redirect_uri: callbackUri,
        scope,
        state: proxyState,
    });

    return redirectResponse(`${CHESSCOM_AUTHORIZE_URL}?${chesscomParams.toString()}`);
};
