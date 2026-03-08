import { GetObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';
import { auth, drive, drive_v3 } from '@googleapis/drive';
import { SubscriptionTier } from '@jackstenglein/chess-dojo-common/src/database/user';
import { createWriteStream } from 'fs';
import { PassThrough, Readable } from 'stream';
import { finished } from 'stream/promises';
import { MeetingInfo, parseMeetingInfo } from './meetingInfo';

const MEET_RECORDINGS_DRIVE_FOLDER = process.env.meetRecordingsDriveFolder;
const FINISHED_UPLOADS_DRIVE_FOLDER = process.env.finishedUploadsDriveFolder;
const S3_BUCKET = process.env.s3Bucket;
const STAGE = process.env.stage || '';
const MEET_DATE_REGEX = /(\d{4}-\d{2}-\d{2}|\d{4}\/\d{2}\/\d{2})/;
const S3_CLIENT = new S3Client({ region: 'us-east-1' });

/**
 * Syncs videos from MEET_RECORDINGS_DRIVE_FOLDER to S3.
 */
export const handler = async () => {
    console.log('Starting Drive to S3 sync...');

    try {
        const driveClient = await getDriveClient();
        const res = await driveClient.files.list({
            q: `"${MEET_RECORDINGS_DRIVE_FOLDER}" in parents and trashed = false`,
            fields: 'files(id, name, mimeType, trashed, parents)',
            pageSize: 100,
            includeItemsFromAllDrives: true,
            supportsAllDrives: true,
        });

        const files = res.data.files;
        if (!files || files.length === 0) {
            console.log('No files found.');
            return;
        }

        const lectureMeetingInfos = parseMeetingInfo(
            `lectures-${STAGE}.json`,
            SubscriptionTier.Lecture,
        );
        const gameReviewMeetingInfos = parseMeetingInfo(
            `game-reviews-${STAGE}.json`,
            SubscriptionTier.GameReview,
        );
        const meetingInfos = [...lectureMeetingInfos, ...gameReviewMeetingInfos];

        console.log(`Found ${files.length} files. Starting transfer...`);
        for (const file of files) {
            if (!file.id || !file.name || file.trashed || !file.parents) continue;
            if (!file.mimeType?.startsWith('video')) {
                console.log(`Skipping non-video: "${file.name}"`);
                continue;
            }

            await streamFileToS3({
                driveClient,
                fileId: file.id,
                fileName: file.name,
                mimeType: file.mimeType,
                fileParents: file.parents,
                meetingInfos,
            });
        }

        return { statusCode: 200, body: 'Sync complete' };
    } catch (error) {
        console.error('Fatal error:', error);
        throw error;
    }
};

/**
 * Downloads an object from S3 into the given local file path.
 * @param bucketName The S3 bucket to download from.
 * @param key The S3 key of the object to download.
 * @param localFilePath The file path to save the object.
 */
async function downloadS3ObjectToFile(
    bucketName: string,
    key: string,
    localFilePath: string,
): Promise<void> {
    const command = new GetObjectCommand({
        Bucket: bucketName,
        Key: key,
    });
    const response = await S3_CLIENT.send(command);
    const body = response.Body as Readable;
    if (!body) {
        throw new Error('Empty response body from S3.');
    }

    const fileStream = createWriteStream(localFilePath);
    body.pipe(fileStream);
    await finished(fileStream);
}

/**
 * @returns The Google Drive API client.
 */
async function getDriveClient() {
    await downloadS3ObjectToFile(
        `chess-dojo-${STAGE}-secrets`,
        'liveClassesServiceAccountKey.json',
        '/tmp/liveClassesServiceAccountKey.json',
    );
    const driveAuth = new auth.GoogleAuth({
        keyFilename: '/tmp/liveClassesServiceAccountKey.json',
        scopes: ['https://www.googleapis.com/auth/drive'],
    });
    return drive({ version: 'v3', auth: driveAuth });
}

/**
 * Gets the meeting info for a given Google Meet recording file name.
 * @param fileName The Google Meet recording file name (e.g. "Team Morphy Peer Review - 2/27/2025 10:00 AM - Recording").
 * @returns The meeting info object or undefined if none matches.
 */
export function getMeetingInfo(
    fileName: string,
    meetingInfos: MeetingInfo[],
): MeetingInfo | undefined {
    return meetingInfos.find((info) => {
        if (fileName.includes(info.googleMeetName)) {
            return true;
        }
        for (const googleMeetId of info.googleMeetIds) {
            if (fileName.includes(googleMeetId)) {
                return true;
            }
        }
        return false;
    });
}

export function getS3Key(fileName: string, meetingInfos: MeetingInfo[]): string {
    const meetInfo = getMeetingInfo(fileName, meetingInfos);
    if (!meetInfo) {
        console.warn(`Skipping "${fileName}" because it does not match any meeting info`);
        return '';
    }

    let meetDate = MEET_DATE_REGEX.exec(fileName)?.[1];
    if (!meetDate) {
        console.warn(`Skipping "${fileName}" because it does not match MEET_DATE_REGEX`);
        return '';
    }
    meetDate = meetDate.replaceAll('/', '-');
    return `${meetInfo.type}/${meetInfo.awsS3Folder}/${meetDate}`;
}

/**
 * Pipes a Google Drive file directly to S3 without loading the full file into memory/disk.
 * If the file is successfully copied to S3, it is moved into the "Finished Uploads" folder
 * in Google Drive.
 * @param driveClient The Google Drive API client.
 * @param fileId The ID of the file to move to S3.
 * @param fileName The name of the file to move to S3.
 * @param mimeType The mime type of the file to move.
 * @param fileParents The current parents of the file in Google Drive.
 * @param meetingInfos The list of meeting infos to match the recording to.
 */
async function streamFileToS3({
    driveClient,
    fileId,
    fileName,
    mimeType,
    fileParents,
    meetingInfos,
}: {
    driveClient: drive_v3.Drive;
    fileId: string;
    fileName: string;
    mimeType: string;
    fileParents: string[];
    meetingInfos: MeetingInfo[];
}) {
    console.log(`Processing: "${fileName}" (${fileId}) with mimeType ${mimeType}`);
    const s3Key = getS3Key(fileName, meetingInfos);
    if (!s3Key) {
        return;
    }

    try {
        const driveResponse = await driveClient.files.get(
            { fileId, alt: 'media' },
            { responseType: 'stream' },
        );

        const passThrough = new PassThrough();
        driveResponse.data.pipe(passThrough);

        const upload = new Upload({
            client: S3_CLIENT,
            params: {
                Bucket: S3_BUCKET,
                Key: s3Key,
                Body: passThrough,
                ContentType: mimeType || '',
            },
            queueSize: 4,
            partSize: 1024 * 1024 * 5, // 5MB min part size
            leavePartsOnError: false, // Clean up incomplete uploads
        });

        await upload.done();
        console.log(`Successfully uploaded "${fileName}" to S3 at "${S3_BUCKET}/${s3Key}"`);
        await driveClient.files.update({
            fileId,
            addParents: FINISHED_UPLOADS_DRIVE_FOLDER,
            removeParents: fileParents.join(','),
        });
        console.log(`Successfully moved "${fileName}" to Finished Uploads folder in Google Drive`);
    } catch (err) {
        console.error(`Failed to process "${fileName}":`, err);
    }
}
