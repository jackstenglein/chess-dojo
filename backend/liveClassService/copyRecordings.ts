import { GetObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';
import { auth, drive, drive_v3 } from '@googleapis/drive';
import { createWriteStream } from 'fs';
import { PassThrough, Readable } from 'stream';
import { finished } from 'stream/promises';
import { MEETING_INFO } from './meetingInfo';

const MEET_RECORDINGS_DRIVE_FOLDER = process.env.meetRecordingsDriveFolder;
const FINISHED_UPLOADS_DRIVE_FOLDER = process.env.finishedUploadsDriveFolder;
const S3_BUCKET = process.env.s3Bucket;
const STAGE = process.env.stage || '';
const MEET_RECORDING_REGEX = /^(.*) - (.*) - Recording/;
const S3_CLIENT = new S3Client({ region: 'us-east-1' });

/**
 * Parses a Meet recording file name into meeting name and date.
 * @param fileName The file name (e.g. "Team Morphy Peer Review - 2/27/2025 10:00 AM - Recording").
 * @returns The meeting name and date (YYYY-MM-DD), or null if the name does not match MEET_RECORDING_REGEX.
 */
export function parseMeetRecordingFileName(
    fileName: string,
): { meetName: string; meetDate: string } | null {
    const matches = MEET_RECORDING_REGEX.exec(fileName);
    if (!matches || matches.length < 3) return null;
    const meetName = matches[1];
    const meetDate = matches[2].split(' ')[0].replaceAll('/', '-');
    return { meetName, meetDate };
}

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

        console.log(`Found ${files.length} files. Starting transfer...`);

        for (const file of files) {
            if (!file.id || !file.name || file.trashed || !file.parents) continue;
            if (!file.mimeType?.startsWith('video')) {
                console.log(`Skipping non-video: "${file.name}"`);
                continue;
            }

            await streamFileToS3(driveClient, file.id, file.name, file.mimeType, file.parents);
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
 * Pipes a Google Drive file directly to S3 without loading the full file into memory/disk.
 * If the file is successfully copied to S3, it is moved into the "Finished Uploads" folder
 * in Google Drive.
 * @param driveClient The Google Drive API client.
 * @param fileId The ID of the file to move to S3.
 * @param fileName The name of the file to move to S3.
 * @param mimeType The mime type of the file to move.
 * @param fileParents The current parents of the file in Google Drive.
 */
async function streamFileToS3(
    driveClient: drive_v3.Drive,
    fileId: string,
    fileName: string,
    mimeType: string,
    fileParents: string[],
) {
    console.log(`Processing: "${fileName}" (${fileId}) with mimeType ${mimeType}`);
    const parsed = parseMeetRecordingFileName(fileName);
    if (!parsed) {
        console.warn(`Skipping "${fileName}" because it does not match MEET_RECORDING_REGEX`);
        return;
    }

    const { meetName, meetDate } = parsed;
    const meetInfo = MEETING_INFO[STAGE]?.[meetName];
    if (!meetInfo) {
        console.warn(
            `Skipping "${fileName}" because its meeting name "${meetName}" has no associated meeting info for stage "${STAGE}"`,
        );
        return;
    }

    try {
        const driveResponse = await driveClient.files.get(
            { fileId, alt: 'media' },
            { responseType: 'stream' },
        );

        const passThrough = new PassThrough();
        driveResponse.data.pipe(passThrough);

        const s3Key = `${meetInfo.keyPrefix}/${meetInfo.meetId}/${meetName.replaceAll('/', ' & ')} (${meetDate})`;
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
