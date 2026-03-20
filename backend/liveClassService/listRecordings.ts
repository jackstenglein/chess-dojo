import { _Object, ListObjectsV2Command, S3Client } from '@aws-sdk/client-s3';
import { SubscriptionTier } from '@jackstenglein/chess-dojo-common/src/database/user';
import { LiveClass } from '@jackstenglein/chess-dojo-common/src/liveClasses/api';
import { APIGatewayProxyHandlerV2 } from 'aws-lambda';
import { errToApiGatewayProxyResultV2, success } from '../directoryService/api';
import { MeetingInfo, parseMeetingInfo } from './meetingInfo';

const S3_BUCKET = process.env.s3Bucket;
const S3_CLIENT = new S3Client({ region: 'us-east-1' });
const STAGE = process.env.stage || '';
const DATE_REGEX = /\d{4}-\d{2}-\d{2}/;

var meetingInfos: MeetingInfo[] = [];

/**
 * Returns a list of class recordings found in S3.
 * @param event The event that triggered the lambda.
 * @returns A list of class recordings found in S3.
 */
export const handler: APIGatewayProxyHandlerV2 = async (event) => {
    try {
        console.log('Event: ', event);
        const meetingInfos = getMeetingInfos();
        const command = new ListObjectsV2Command({ Bucket: S3_BUCKET });
        const response = await S3_CLIENT.send(command);
        const classes = getLiveClasses(response.Contents ?? [], meetingInfos);
        return success({ classes });
    } catch (err) {
        return errToApiGatewayProxyResultV2(err);
    }
};

/**
 * Gets the list of live classes from the S3 items and meeting infos.
 * @param s3Items The list of S3 items to process.
 * @param meetingInfos The list of meeting infos to use.
 * @returns The list of live classes.
 */
export function getLiveClasses(s3Items: _Object[], meetingInfos: MeetingInfo[]): LiveClass[] {
    const classMap: Record<string, LiveClass> = {};
    for (const item of s3Items) {
        processItem(item, meetingInfos, classMap);
    }

    const classes = Object.values(classMap).sort((lhs, rhs) =>
        lhs.recordings[0].date.localeCompare(rhs.recordings[0].date),
    );
    for (const liveClass of classes) {
        liveClass.recordings.sort((lhs, rhs) => lhs.date.localeCompare(rhs.date));
    }
    return classes;
}

/**
 * Gets the list of meeting infos from the local files. The result is cached
 * for the lifetime of the lambda context.
 * @returns The list of meeting infos.
 */
function getMeetingInfos(): MeetingInfo[] {
    if (meetingInfos.length > 0) {
        return meetingInfos;
    }
    meetingInfos = [
        ...parseMeetingInfo(`lectures-${STAGE}.json`, SubscriptionTier.Lecture),
        ...parseMeetingInfo(`game-reviews-${STAGE}.json`, SubscriptionTier.GameReview),
    ];
    return meetingInfos;
}

/**
 * Adds the S3 item to the classes map. If the item does not match
 * any of the meeting info's AWS S3 folders, it will be skipped.
 * @param item The item to add to the classes map.
 * @param meetingInfos The list of meeting infos to use.
 * @param classes The map of classes already found.
 */
function processItem(
    item: _Object,
    meetingInfos: MeetingInfo[],
    classes: Record<string, LiveClass>,
) {
    const meetingInfo = meetingInfos.find((info) => item.Key?.includes(`/${info.awsS3Folder}/`));
    if (!meetingInfo) {
        console.error(`No meeting info found for item ${item.Key}`);
        return;
    }

    const date = item.Key?.split('/').at(-1);
    if (!date || !DATE_REGEX.test(date)) {
        console.error(`No date found for item ${item.Key}`);
        return;
    }

    if (!classes[meetingInfo.name]) {
        classes[meetingInfo.name] = { ...meetingInfo, recordings: [] };
    }
    classes[meetingInfo.name].recordings.push({ date, s3Key: item.Key ?? '' });
}
