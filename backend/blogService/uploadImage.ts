import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { APIGatewayProxyHandlerV2 } from 'aws-lambda';
import { randomUUID } from 'crypto';
import { z } from 'zod';
import {
    ApiError,
    errToApiGatewayProxyResultV2,
    parseBody,
    requireUserInfo,
    success,
} from '../directoryService/api';
import { getUser } from './database';

const s3 = new S3Client({});
const schema = z.object({
    contentType: z.enum(['image/jpeg', 'image/png', 'image/webp', 'image/gif']),
    data: z
        .string()
        .min(1)
        .max(4 * 1024 * 1024)
        .regex(/^[A-Za-z0-9+/]+={0,2}$/),
});

/** Stores admin-uploaded raster images under immutable, randomly generated keys. */
export const handler: APIGatewayProxyHandlerV2 = async (event) => {
    try {
        const user = await getUser(requireUserInfo(event).username);
        if (!user.isAdmin)
            throw new ApiError({ statusCode: 403, publicMessage: 'Admin access required' });
        const { contentType, data } = parseBody(event, schema);
        const body = Buffer.from(data, 'base64');
        const validType =
            (contentType === 'image/jpeg' &&
                body.subarray(0, 3).equals(Buffer.from([255, 216, 255]))) ||
            (contentType === 'image/png' &&
                body.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) ||
            (contentType === 'image/gif' &&
                ['GIF87a', 'GIF89a'].includes(body.toString('ascii', 0, 6))) ||
            (contentType === 'image/webp' &&
                body.toString('ascii', 0, 4) === 'RIFF' &&
                body.toString('ascii', 8, 12) === 'WEBP');
        if (!validType || body.length > 3 * 1024 * 1024) {
            throw new ApiError({
                statusCode: 400,
                publicMessage: 'Choose a JPEG, PNG, WebP, or GIF image up to 3 MB.',
            });
        }
        const extension = contentType === 'image/jpeg' ? 'jpg' : contentType.split('/')[1];
        const key = `images/${randomUUID()}.${extension}`;
        const bucket = process.env.blogImagesBucket;
        if (!bucket) throw new Error('Blog image bucket is not configured');
        await s3.send(
            new PutObjectCommand({
                Bucket: bucket,
                Key: key,
                Body: body,
                ContentType: contentType,
                CacheControl: 'public, max-age=31536000, immutable',
            }),
        );
        return success({ url: `https://${bucket}.s3.us-east-1.amazonaws.com/${key}` });
    } catch (err) {
        return errToApiGatewayProxyResultV2(err);
    }
};
