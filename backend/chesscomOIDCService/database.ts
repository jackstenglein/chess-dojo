'use strict';

import { DeleteItemCommand, DynamoDBClient, GetItemCommand, PutItemCommand } from '@aws-sdk/client-dynamodb';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';
import { STAGE } from './api';

export const TABLE_NAME = `${STAGE}-chesscom-oidc-state`;

const dynamo = new DynamoDBClient({ region: 'us-east-1' });

const TTL_STATE_SECONDS = 10 * 60; // 10 minutes for auth state
const TTL_CODE_SECONDS = 10 * 60; // 10 minutes for proxy codes
const TTL_TOKEN_SECONDS = 60 * 60; // 1 hour for access tokens

function ttlEpoch(seconds: number): number {
    return Math.floor(Date.now() / 1000) + seconds;
}

// ---- Auth State (authorize → Chess.com redirect) ----

export interface AuthState {
    cognitoState: string;
    cognitoRedirectUri: string;
    scope: string;
    nonce?: string;
}

export async function putAuthState(proxyState: string, state: AuthState): Promise<void> {
    await dynamo.send(
        new PutItemCommand({
            TableName: TABLE_NAME,
            Item: marshall(
                { pk: `state:${proxyState}`, ...state, ttl: ttlEpoch(TTL_STATE_SECONDS) },
                { removeUndefinedValues: true },
            ),
        }),
    );
}

export async function getAuthState(proxyState: string): Promise<AuthState | null> {
    const result = await dynamo.send(
        new GetItemCommand({ TableName: TABLE_NAME, Key: marshall({ pk: `state:${proxyState}` }) }),
    );
    if (!result.Item) {
        return null;
    }
    return unmarshall(result.Item) as AuthState;
}

// ---- Proxy Code (callback → Cognito redirect) ----

export interface ProxyCodeData {
    sub: string;
    name: string;
    email: string;
    email_verified: boolean;
    nonce?: string;
    cognitoRedirectUri: string;
    cognitoState: string;
}

export async function putProxyCode(code: string, data: ProxyCodeData): Promise<void> {
    await dynamo.send(
        new PutItemCommand({
            TableName: TABLE_NAME,
            Item: marshall(
                { pk: `code:${code}`, ...data, ttl: ttlEpoch(TTL_CODE_SECONDS) },
                { removeUndefinedValues: true },
            ),
        }),
    );
}

export async function getProxyCode(code: string): Promise<ProxyCodeData | null> {
    const result = await dynamo.send(
        new GetItemCommand({ TableName: TABLE_NAME, Key: marshall({ pk: `code:${code}` }) }),
    );
    if (!result.Item) {
        return null;
    }
    return unmarshall(result.Item) as ProxyCodeData;
}

export async function deleteProxyCode(code: string): Promise<void> {
    await dynamo.send(
        new DeleteItemCommand({ TableName: TABLE_NAME, Key: marshall({ pk: `code:${code}` }) }),
    );
}

// ---- Access Token (userinfo lookup) ----

export interface TokenData {
    sub: string;
    name: string;
    email: string;
    email_verified: boolean;
}

export async function putAccessToken(token: string, data: TokenData): Promise<void> {
    await dynamo.send(
        new PutItemCommand({
            TableName: TABLE_NAME,
            Item: marshall(
                { pk: `token:${token}`, ...data, ttl: ttlEpoch(TTL_TOKEN_SECONDS) },
                { removeUndefinedValues: true },
            ),
        }),
    );
}

export async function getAccessToken(token: string): Promise<TokenData | null> {
    const result = await dynamo.send(
        new GetItemCommand({ TableName: TABLE_NAME, Key: marshall({ pk: `token:${token}` }) }),
    );
    if (!result.Item) {
        return null;
    }
    return unmarshall(result.Item) as TokenData;
}
