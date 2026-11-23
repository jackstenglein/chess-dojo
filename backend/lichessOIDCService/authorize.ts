'use strict';

import { APIGatewayProxyHandlerV2 } from 'aws-lambda';
import { randomBytes } from 'node:crypto';
import {
    LICHESS_AUTHORIZE_URL,
    LICHESS_CLIENT_ID,
    LICHESS_SCOPE,
    OIDC_BASE_URL,
    jsonResponse,
    redirectResponse,
} from './api';
import { putAuthState } from './database';

/**
 * Handles Cognito's OIDC authorize request. Stores Cognito's state, then
 * redirects the user to Lichess's OAuth authorization page.
 */
export const authorizeHandler: APIGatewayProxyHandlerV2 = async (event) => {
    const params = event.queryStringParameters ?? {};
    const cognitoState = params.state;
    const cognitoRedirectUri = params.redirect_uri;
    const scope = params.scope ?? LICHESS_SCOPE;
    const nonce = params.nonce;

    if (!cognitoState || !cognitoRedirectUri) {
        return jsonResponse(400, { error: 'invalid_request', error_description: 'Missing state or redirect_uri' });
    }

    // Generate a fresh state value for the Lichess leg of the flow.
    const proxyState = randomBytes(32).toString('hex');

    await putAuthState(proxyState, {
        cognitoState,
        cognitoRedirectUri,
        scope,
        nonce,
    });

    const callbackUri = `${OIDC_BASE_URL}/callback`;
    const lichessParams = new URLSearchParams({
        response_type: 'code',
        client_id: LICHESS_CLIENT_ID,
        redirect_uri: callbackUri,
        scope: LICHESS_SCOPE,
        state: proxyState,
    });

    return redirectResponse(`${LICHESS_AUTHORIZE_URL}?${lichessParams.toString()}`);
};
