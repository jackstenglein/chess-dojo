'use strict';

import { APIGatewayProxyHandlerV2 } from 'aws-lambda';
import { getPublicKeyJwk, jsonResponse, OIDC_BASE_URL } from './api';

/**
 * Returns the OIDC discovery document.
 * Cognito fetches this once and caches it to learn all other endpoint URLs.
 */
export const discoveryHandler: APIGatewayProxyHandlerV2 = async () => {
    const issuer = OIDC_BASE_URL;
    const config = {
        issuer,
        authorization_endpoint: `${issuer}/authorize`,
        token_endpoint: `${issuer}/token`,
        userinfo_endpoint: `${issuer}/userinfo`,
        jwks_uri: `${issuer}/.well-known/jwks.json`,
        response_types_supported: ['code'],
        subject_types_supported: ['public'],
        id_token_signing_alg_values_supported: ['RS256'],
        scopes_supported: ['openid', 'email:read'],
        token_endpoint_auth_methods_supported: ['client_secret_post', 'none'],
        claims_supported: ['sub', 'iss', 'aud', 'iat', 'exp', 'name', 'email', 'email_verified'],
    };
    return jsonResponse(200, config);
};

/**
 * Returns the JSON Web Key Set (JWKS) containing the public key used
 * to verify ID tokens signed by this proxy.
 */
export const jwksHandler: APIGatewayProxyHandlerV2 = async () => {
    try {
        const jwk = await getPublicKeyJwk();
        return jsonResponse(200, { keys: [jwk] });
    } catch (err) {
        console.error('Failed to load JWKS:', err);
        return jsonResponse(500, { error: 'server_error' });
    }
};
