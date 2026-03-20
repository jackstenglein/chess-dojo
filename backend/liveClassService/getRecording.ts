import { GetObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import {
    getSubscriptionTier,
    SubscriptionTier,
} from '@jackstenglein/chess-dojo-common/src/database/user';
import {
    getRecordingRequestSchema,
    SAMPLE_LIVE_CLASS_S3_KEY,
} from '@jackstenglein/chess-dojo-common/src/liveClasses/api';
import { APIGatewayProxyHandlerV2 } from 'aws-lambda';
import {
    ApiError,
    errToApiGatewayProxyResultV2,
    parseEvent,
    requireUserInfo,
    success,
} from '../directoryService/api';
import { getUser } from '../directoryService/database';

const S3_CLIENT = new S3Client({ region: 'us-east-1' });
const S3_BUCKET = process.env.s3Bucket;

/**
 * Generates and returns an S3 presigned URL to download a live class
 * recording.
 * @param event The event that triggered the request.
 * @returns The presigned S3 URL for the recording.
 */
export const handler: APIGatewayProxyHandlerV2 = async (event) => {
    try {
        console.log('Event: ', event);
        const request = parseEvent(event, getRecordingRequestSchema);
        if (request.s3Key === SAMPLE_LIVE_CLASS_S3_KEY) {
            const url = await getRecordingUrl(request.s3Key);
            return success({ url });
        }

        const userInfo = requireUserInfo(event);
        const user = await getUser(userInfo.username);
        const subscriptionTier = getSubscriptionTier(user);

        if (
            request.s3Key.startsWith(SubscriptionTier.GameReview) &&
            subscriptionTier !== SubscriptionTier.GameReview
        ) {
            throw new ApiError({
                statusCode: 403,
                publicMessage: `You must be a subscriber on the Game & Profile Review tier to download this recording`,
            });
        }
        if (
            subscriptionTier !== SubscriptionTier.GameReview &&
            subscriptionTier !== SubscriptionTier.Lecture
        ) {
            throw new ApiError({
                statusCode: 403,
                publicMessage: `You must be a subscriber on the Group Classes tier or higher to download this recording`,
            });
        }

        const url = await getRecordingUrl(request.s3Key);
        return success({ url });
    } catch (err) {
        return errToApiGatewayProxyResultV2(err);
    }
};

async function getRecordingUrl(s3Key: string): Promise<string> {
    const command = new GetObjectCommand({ Bucket: S3_BUCKET, Key: s3Key });
    return await getSignedUrl(S3_CLIENT, command, { expiresIn: 86400 });
}
