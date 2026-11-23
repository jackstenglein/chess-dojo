'use strict';

import { APIGatewayProxyHandlerV2 } from 'aws-lambda';
import { getAccessToken } from './database';
import { jsonResponse } from './api';

/**
 * Returns OIDC user claims for a valid access token.
 * Cognito may call this endpoint after the token exchange.
 */
export const userinfoHandler: APIGatewayProxyHandlerV2 = async (event) => {
    const authHeader = event.headers?.authorization ?? event.headers?.Authorization ?? '';
    const token = authHeader.replace(/^Bearer\s+/i, '');

    if (!token) {
        return {
            statusCode: 401,
            headers: {
                'WWW-Authenticate': 'Bearer error="invalid_token"',
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ error: 'invalid_token' }),
        };
    }

    const tokenData = await getAccessToken(token);
    if (!tokenData) {
        return {
            statusCode: 401,
            headers: {
                'WWW-Authenticate': 'Bearer error="invalid_token"',
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ error: 'invalid_token', error_description: 'Token not found or expired' }),
        };
    }

    return jsonResponse(200, {
        sub: tokenData.sub,
        name: tokenData.name,
        email: tokenData.email,
        email_verified: tokenData.email_verified,
    });
};
