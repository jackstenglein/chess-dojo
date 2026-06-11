import { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';
import { ZodType } from 'zod';

export class ApiError extends Error {
    statusCode: number;
    publicMessage: string;
    privateMessage?: string;
    cause: any;

    constructor({
        statusCode,
        publicMessage,
        privateMessage,
        cause,
    }: {
        statusCode: number;
        publicMessage?: string;
        privateMessage?: string;
        cause?: any;
    }) {
        super();
        this.statusCode = statusCode;
        this.publicMessage = publicMessage || 'Temporary server error';
        this.privateMessage = privateMessage;
        this.cause = cause;
    }

    apiGatewayResultV2(): APIGatewayProxyResultV2 {
        console.error(
            'Status Code:%d\rPublic Message: %s\rPrivate Message:%s\rCause:%s\rStack:%s\r',
            this.statusCode,
            this.publicMessage,
            this.privateMessage,
            this.cause,
            this.stack,
        );
        return {
            statusCode: this.statusCode,
            isBase64Encoded: false,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
            },
            body: JSON.stringify({
                message: this.publicMessage,
                code: this.statusCode,
                privateMessage: this.privateMessage,
            }),
        };
    }
}

function unknownError(err: any): APIGatewayProxyResultV2 {
    console.error('Unknown error: ', err);
    return {
        statusCode: 500,
        isBase64Encoded: false,
        headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({ message: 'Temporary server error', code: 500, privateMessage: err }),
    };
}

/**
 * Converts the given error to an APIGatewayProxyResultV2. The error
 * will also be logged.
 * @param err The error to convert.
 * @returns The API gateway result object.
 */
export function errToApiGatewayProxyResultV2(err: any): APIGatewayProxyResultV2 {
    if (err instanceof ApiError) {
        return err.apiGatewayResultV2();
    }
    return unknownError(err);
}

/**
 * Returns a successful API response, with the given value marshalled as
 * the JSON body.
 * @param value The JSON body to return.
 * @returns The API gateway result object.
 */
export function success(value: any): APIGatewayProxyResultV2 {
    console.log('Response: %j', value);
    return {
        statusCode: 200,
        body: JSON.stringify(value),
    };
}

/** The info of a user making an API request. */
export interface UserInfo {
    /** The user's username. */
    username: string;

    /** The user's email. */
    email: string;
}

/**
 * Extracts the user info from the Lambda event.
 * @param event The Lambda event to get the user info from.
 * @returns An object containing the username and email, if present on the event.
 */
export function getUserInfo(event: any): UserInfo {
    const claims = event.requestContext?.authorizer?.jwt?.claims;
    if (!claims) {
        return {
            username: '',
            email: '',
        };
    }

    return {
        username: claims['cognito:username'] || '',
        email: claims['email'] || '',
    };
}

/**
 * Like getUserInfo, but throws a 400 error if the extracted username is empty.
 * @param event The Lambda event to get the user info from.
 * @returns An object containing the username and email, if present on the event.
 */
export function requireUserInfo(event: any): UserInfo {
    const userInfo = getUserInfo(event);
    if (!userInfo.username) {
        throw new ApiError({
            statusCode: 400,
            publicMessage: 'Invalid request: username is required',
        });
    }
    return userInfo;
}

/**
 * Parses the given Zod schema from the given API gateway event. The event's body,
 * path parameters and query string parameters are all combined together to parse
 * the event.
 * @param event The event to parse.
 * @param schema The Zod schema to parse.
 * @returns The parsed event.
 */
export function parseEvent<Output>(event: APIGatewayProxyEventV2, schema: ZodType<Output>): Output {
    try {
        const body = JSON.parse(event.body || '{}');
        const request = {
            ...body,
            ...event.pathParameters,
            ...event.queryStringParameters,
        };
        return schema.parse(request);
    } catch (err) {
        throw new ApiError({
            statusCode: 400,
            publicMessage: 'Invalid request: could not be unmarshaled',
            cause: err,
        });
    }
}

/**
 * Parses the given Zod schema from the given API gateway event body. If the body fails
 * to parse, a 400 error is thrown.
 * @param event The event to extract the body from.
 * @param schema The Zod schema to parse.
 * @returns The parsed request body.
 */
export function parseBody<Output>(event: APIGatewayProxyEventV2, schema: ZodType<Output>): Output {
    try {
        const body = JSON.parse(event.body || '{}');
        return schema.parse(body);
    } catch (err) {
        throw new ApiError({
            statusCode: 400,
            publicMessage: 'Invalid request: body could not be unmarshaled',
            cause: err,
        });
    }
}

/**
 * Parses the given Zod schema from the given API gateway event path parameters. If the
 * parameters fail to parse, a 400 error is thrown.
 * @param event The event to extract the path parameters from.
 * @param schema The Zod schema to parse.
 * @returns The parsed parameters.
 */
export function parsePathParameters<Output>(
    event: APIGatewayProxyEventV2,
    schema: ZodType<Output>,
): Output {
    try {
        return schema.parse(event.pathParameters);
    } catch (err) {
        throw new ApiError({
            statusCode: 400,
            publicMessage: 'Invalid request: path parameters could not be unmarshaled',
            cause: err,
        });
    }
}
