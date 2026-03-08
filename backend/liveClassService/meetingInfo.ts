import { SubscriptionTier } from '@jackstenglein/chess-dojo-common/src/database/user';
import { LiveClass } from '@jackstenglein/chess-dojo-common/src/liveClasses/api';
import { readFileSync } from 'fs';
import { ApiError } from '../directoryService/api';

export interface MeetingInfo extends Omit<LiveClass, 'recordings'> {
    /** The name of the meeting. */
    name: string;
    /** The name of the Google Meet for the meeting. */
    googleMeetName: string;
    /** The IDs of the Google Meet for the meeting. */
    googleMeetIds: string[];
    /** The AWS S3 folder of the meeting's recordings. */
    awsS3Folder: string;
}

/**
 * Parses the meeting info file into a list of meeting info objects. The
 * given tier will be added to the meeting info objects.
 * @param filePath The path to the meeting info file.
 * @param tier The tier to add to the meeting info objects.
 * @returns A list of meeting info objects.
 */
export function parseMeetingInfo(
    filePath: string,
    tier: SubscriptionTier.GameReview | SubscriptionTier.Lecture,
): MeetingInfo[] {
    const data = readFileSync(filePath, 'utf8');
    if (!data) {
        throw new ApiError({
            statusCode: 500,
            publicMessage: 'Internal server error',
            privateMessage: `meeting info file ${filePath} not found or empty`,
        });
    }

    try {
        const meetingInfos: Omit<MeetingInfo, 'type'>[] = JSON.parse(data);
        return meetingInfos.map((info) => ({ ...info, type: tier }));
    } catch (error) {
        throw new ApiError({
            statusCode: 500,
            publicMessage: 'Internal server error',
            privateMessage: `meeting info file ${filePath} is not valid JSON`,
            cause: error,
        });
    }
}
