import { GetObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { GetSecretValueCommand, SecretsManagerClient } from '@aws-sdk/client-secrets-manager';
import { Upload } from '@aws-sdk/lib-storage';
import { auth, drive, drive_v3 } from '@googleapis/drive';
import { youtube, youtube_v3, auth as youtubeAuth } from '@googleapis/youtube';
import { SubscriptionTier } from '@jackstenglein/chess-dojo-common/src/database/user';
import { execSync } from 'child_process';
import { createReadStream, createWriteStream } from 'fs';
import { unlink, writeFile } from 'fs/promises';
import { PassThrough, Readable } from 'stream';
import { finished } from 'stream/promises';
import { LIVE_CLASSES_TABLE, UpdateItemBuilder } from '../directoryService/database';
import {
    generateRecordingMetadata,
    getFallbackRecordingMetadata,
} from './generateRecordingMetadata';
import { findTranscriptFile } from './meetChatTranscript';
import { MeetingInfo, parseMeetingInfo } from './meetingInfo';

const MEET_RECORDINGS_DRIVE_FOLDER = process.env.meetRecordingsDriveFolder;
const FINISHED_UPLOADS_DRIVE_FOLDER = process.env.finishedUploadsDriveFolder;
const S3_BUCKET = process.env.s3Bucket;
const STAGE = process.env.stage || '';
const MEET_DATE_REGEX = /(\d{4}-\d{2}-\d{2}|\d{4}\/\d{2}\/\d{2})/;
const MEET_CHAT_REGEX = / - Chat( Transcript)?$/;
const S3_CLIENT = new S3Client({ region: 'us-east-1' });
const SECRETS_MANAGER_CLIENT = new SecretsManagerClient({ region: 'us-east-1' });
const S3_INVALID_TAG_REGEX = /[^a-zA-Z\s\d_.:\/=+\-@]/g;
const IS_PROD = STAGE === 'prod';
const SHORT_INTRO_PATH = '/opt/data/short_intro.mp4';

/**
 * Syncs videos from MEET_RECORDINGS_DRIVE_FOLDER to S3 and YouTube.
 */
export const handler = async () => {
    console.log('Starting Drive to S3/YouTube sync...');

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
            if (MEET_CHAT_REGEX.test(file.name)) {
                await deleteDriveFile({
                    driveClient,
                    fileId: file.id,
                    fileName: file.name,
                    fileParents: file.parents,
                });
                continue;
            }
            if (!file.mimeType?.startsWith('video')) {
                console.log(`Skipping non-video: "${file.name}"`);
                continue;
            }

            await processRecording({
                driveClient,
                driveFiles: files,
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
        for (const googleMeetName of info.googleMeetNames) {
            if (fileName.includes(googleMeetName)) {
                return true;
            }
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

    const meetDate = getMeetDate(fileName);
    if (!meetDate) {
        console.warn(`Skipping "${fileName}" because it does not match MEET_DATE_REGEX`);
        return '';
    }
    return `${meetInfo.type}/${meetInfo.awsS3Folder}/${meetDate}`;
}

/**
 * Extracts the meeting date from a Google Meet recording file name.
 */
function getMeetDate(fileName: string): string {
    let meetDate = MEET_DATE_REGEX.exec(fileName)?.[1];
    if (!meetDate) {
        return '';
    }
    return meetDate.replaceAll('/', '-');
}

async function downloadDriveFileAsText(
    driveClient: drive_v3.Drive,
    fileId: string,
): Promise<string> {
    const response = await driveClient.files.export({
        fileId,
        mimeType: 'text/plain',
    });
    return response.data as string;
}

async function getGoogleGenerativeAiApiKey(): Promise<string | undefined> {
    try {
        return await getSecret(`chess-dojo-${STAGE}-googleGenerativeAiApiKey`);
    } catch (error) {
        console.warn('Unable to load Google Generative AI API key:', error);
        return undefined;
    }
}

async function getRecordingMetadata({
    meetingInfo,
    meetDate,
    transcript,
}: {
    meetingInfo: MeetingInfo;
    meetDate: string;
    transcript?: string;
}) {
    const apiKey = await getGoogleGenerativeAiApiKey();
    if (!apiKey) {
        return getFallbackRecordingMetadata(meetingInfo, meetDate);
    }

    try {
        return await generateRecordingMetadata({
            apiKey,
            meetingInfo,
            meetDate,
            transcript,
        });
    } catch (error) {
        console.warn(
            `Failed to generate metadata for "${meetingInfo.name}" on ${meetDate}:`,
            error,
        );
        return getFallbackRecordingMetadata(meetingInfo, meetDate);
    }
}

/**
 * Copies a Google Drive recording to S3 and optionally uploads it to YouTube.
 * If a matching Google Meet transcript is found, it is passed to Gemini to
 * generate the YouTube title and description.
 */
async function processRecording({
    driveClient,
    driveFiles,
    fileId,
    fileName,
    mimeType,
    fileParents,
    meetingInfos,
}: {
    driveClient: drive_v3.Drive;
    driveFiles: drive_v3.Schema$File[];
    fileId: string;
    fileName: string;
    mimeType: string;
    fileParents: string[];
    meetingInfos: MeetingInfo[];
}) {
    console.log(`Processing: "${fileName}" (${fileId}) with mimeType ${mimeType}`);
    const meetingInfo = getMeetingInfo(fileName, meetingInfos);
    const s3Key = getS3Key(fileName, meetingInfos);
    if (!meetingInfo || !s3Key) {
        return;
    }

    const meetDate = getMeetDate(fileName);
    if (!meetDate) {
        return;
    }

    try {
        await streamFileToS3({
            driveClient,
            fileId,
            fileName,
            mimeType,
            s3Key,
        });

        await handleYouTubeUpload({
            driveClient,
            driveFiles,
            fileId,
            fileName,
            mimeType,
            meetingInfo,
            meetDate,
            s3Key,
        });

        await deleteDriveFile({
            driveClient,
            fileId,
            fileName,
            fileParents,
        });
    } catch (err) {
        console.error(`Failed to process "${fileName}":`, err);
    }
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
 * @param s3Key The S3 key to upload the file to.
 */
async function streamFileToS3({
    driveClient,
    fileId,
    fileName,
    mimeType,
    s3Key,
}: {
    driveClient: drive_v3.Drive;
    fileId: string;
    fileName: string;
    mimeType: string;
    s3Key: string;
}) {
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
            tags: [
                {
                    Key: 'googleDriveFilename',
                    Value: fileName.replaceAll(S3_INVALID_TAG_REGEX, '/'),
                },
                { Key: 'googleDriveFileId', Value: fileId.replaceAll(S3_INVALID_TAG_REGEX, '/') },
            ],
            queueSize: 4,
            partSize: 1024 * 1024 * 5, // 5MB min part size
            leavePartsOnError: false, // Clean up incomplete uploads
        });

        await upload.done();
        console.log(`Successfully uploaded "${fileName}" to S3 at "${S3_BUCKET}/${s3Key}"`);
    } catch (err) {
        console.error(`Failed to upload "${fileName}" to S3:`, err);
        throw err;
    }
}

/**
 * Uploads a video to YouTube. The video is prepended with the ChessDojo intro video using ffmpeg.
 * Gemini is used to generate the YouTube title and description. After a successful upload, the
 * class is updated in DynamoDB.
 * @param driveClient The Google Drive API client.
 * @param driveFiles The list of all Google Drive files.
 * @param fileId The ID of the file to upload.
 * @param fileName The name of the file to upload.
 * @param mimeType The mime type of the file to upload.
 * @param meetingInfo The meeting info for the file.
 * @param meetDate The date of the meeting.
 * @param s3Key The S3 key of the file.
 */
async function handleYouTubeUpload({
    driveClient,
    driveFiles,
    fileId,
    fileName,
    mimeType,
    meetingInfo,
    meetDate,
    s3Key,
}: {
    driveClient: drive_v3.Drive;
    driveFiles: drive_v3.Schema$File[];
    fileId: string;
    fileName: string;
    mimeType: string;
    meetingInfo: MeetingInfo;
    meetDate: string;
    s3Key: string;
}) {
    if (!meetingInfo.id || !meetingInfo.playlistId) {
        console.warn(
            `Skipping YouTube upload for ${fileId} because meet info does not have both id and playlist id: ${JSON.stringify(meetingInfo, null, 2)}`,
        );
        return;
    }
    if (!IS_PROD) {
        console.warn(
            `Skipping YouTube upload for ${fileId} because current stage "${STAGE}" is not "prod."`,
        );
        return;
    }

    const transcriptFile = findTranscriptFile(fileName, driveFiles);
    let transcriptText: string | undefined;
    if (transcriptFile?.id) {
        console.log(`Found meet transcript "${transcriptFile.name}" for "${fileName}"`);
        transcriptText = await downloadDriveFileAsText(driveClient, transcriptFile.id);
    } else {
        console.warn(`No meet transcript found for "${fileName}"`);
    }

    const metadata = await getRecordingMetadata({
        meetingInfo,
        meetDate,
        transcript: transcriptText,
    });
    console.log(`Generated metadata for "${fileName}": ${JSON.stringify(metadata, null, 2)}`);

    let recordingPath = `/tmp/${fileId}-recording.mp4`;
    const concatPath = `/tmp/${fileId}-concat.mp4`;
    try {
        await downloadDriveFileToPath(driveClient, fileId, recordingPath);
        recordingPath = await trimRecordingToStartTimestamp(recordingPath, metadata.startTimestamp);
        await prependIntroToRecording(recordingPath, concatPath);
        const durationSeconds = getVideoDurationSeconds(concatPath);
        const { videoId } = await uploadVideoToYouTube({
            videoStream: createReadStream(concatPath),
            title: metadata.title,
            description: metadata.description,
            playlistId: meetingInfo.playlistId,
            mimeType: mimeType || 'video/mp4',
        });
        await new UpdateItemBuilder()
            .key('type', meetingInfo.type)
            .key('id', meetingInfo.id)
            .appendToList('recordings', [
                {
                    date: meetDate,
                    s3Key,
                    url: `https://www.youtube.com/embed/${videoId}`,
                    title: metadata.title,
                    description: metadata.description,
                    durationSeconds,
                },
            ])
            .table(LIVE_CLASSES_TABLE)
            .send();
    } finally {
        await Promise.all([
            unlink(recordingPath).catch(console.error),
            unlink(concatPath).catch(console.error),
        ]);
    }

    if (transcriptFile) {
        await deleteDriveFile({
            driveClient,
            fileName: transcriptFile.name,
            fileId: transcriptFile.id,
            fileParents: transcriptFile.parents,
        });
    }
}

/**
 * Downloads a Google Drive file to a local file path.
 * @param driveClient The Google Drive API client.
 * @param fileId The ID of the file to download.
 * @param localFilePath The path to save the file.
 */
async function downloadDriveFileToPath(
    driveClient: drive_v3.Drive,
    fileId: string,
    localFilePath: string,
): Promise<void> {
    const driveResponse = await driveClient.files.get(
        { fileId, alt: 'media' },
        { responseType: 'stream' },
    );
    const fileStream = createWriteStream(localFilePath);
    driveResponse.data.pipe(fileStream);
    await finished(fileStream);
}

/**
 * Prepends the ChessDojo intro video to a meeting recording using ffmpeg's concat demuxer.
 * @param recordingPath The path to the recording file.
 * @param outputPath The path to save the output file.
 */
async function prependIntroToRecording(recordingPath: string, outputPath: string): Promise<void> {
    const filesListPath = '/tmp/files.txt';
    const filesList = `file '${SHORT_INTRO_PATH}'\nfile '${recordingPath}'\n`;
    await writeFile(filesListPath, filesList);
    try {
        runFfmpeg(['-f', 'concat', '-safe', '0', '-i', filesListPath, '-c', 'copy', outputPath]);
    } finally {
        await unlink(filesListPath).catch(console.error);
    }
}

/**
 * Runs ffmpeg with the given arguments.
 * @param args The arguments to pass to ffmpeg.
 */
function runFfmpeg(args: string[]) {
    execSync(`ffmpeg ${args.join(' ')}`, {
        cwd: '/tmp',
    });
}

/**
 * Trims a video file to the given start timestamp.
 * @param filePath The path to the video file.
 * @param startTimestamp The start timestamp to trim to.
 */
async function trimRecordingToStartTimestamp(
    filePath: string,
    startTimestamp: string,
): Promise<string> {
    if (startTimestamp === '0') {
        return filePath;
    }
    runFfmpeg([
        '-ss',
        startTimestamp,
        '-i',
        filePath,
        '-c',
        'copy',
        '-y',
        filePath.replace('.mp4', '-trimmed.mp4'),
    ]);
    await unlink(filePath).catch(console.error);
    return filePath.replace('.mp4', '-trimmed.mp4');
}

/**
 * Returns the duration of a video file in seconds.
 * @param filePath The path to the video file.
 */
function getVideoDurationSeconds(filePath: string): number {
    const output = execSync(
        `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${filePath}"`,
        { encoding: 'utf-8' },
    ).trim();
    const duration = parseFloat(output);
    if (!Number.isFinite(duration)) {
        throw new Error(`Could not read duration from ${filePath}`);
    }
    return Math.round(duration);
}

interface YouTubeOAuthCredentials {
    client_id: string;
    client_secret: string;
    refresh_token: string;
}

/**
 * Fetches a secret from AWS Secrets Manager.
 * @param secretName The name of the secret to fetch.
 * @returns The secret string value.
 */
async function getSecret(secretName: string): Promise<string> {
    const response = await SECRETS_MANAGER_CLIENT.send(
        new GetSecretValueCommand({
            SecretId: secretName,
        }),
    );
    if (!response.SecretString) {
        throw new Error(`Secret "${secretName}" is empty or not a string.`);
    }
    return response.SecretString;
}

/**
 * @returns The YouTube Data API client.
 */
export async function getYoutubeClient(): Promise<youtube_v3.Youtube> {
    const credentials = JSON.parse(
        await getSecret(`chess-dojo-${STAGE}-liveClassesYouTubeOAuthCredentials`),
    ) as YouTubeOAuthCredentials;

    const oauth2Client = new youtubeAuth.OAuth2(credentials.client_id, credentials.client_secret);
    oauth2Client.setCredentials({ refresh_token: credentials.refresh_token });

    return youtube({
        version: 'v3',
        auth: oauth2Client,
    });
}

/**
 * Uploads a video to YouTube as unlisted and adds it to the given playlist.
 * YouTube does not support service account auth, so OAuth credentials with a
 * refresh token must be stored in AWS Secrets Manager as
 * chess-dojo-{stage}-liveClassesYouTubeOAuthCredentials.
 * @param youtubeClient The YouTube Data API client.
 * @param videoStream A readable stream of the video file.
 * @param title The title of the video.
 * @param playlistId The ID of the playlist to add the video to.
 * @param description An optional description for the video.
 * @param mimeType The MIME type of the video. Defaults to video/mp4.
 * @returns The uploaded video's ID and watch URL.
 */
export async function uploadVideoToYouTube({
    youtubeClient: providedYoutubeClient,
    videoStream,
    title,
    playlistId,
    description = '',
    mimeType = 'video/mp4',
}: {
    youtubeClient?: youtube_v3.Youtube;
    videoStream: Readable;
    title: string;
    playlistId: string;
    description?: string;
    mimeType?: string;
}): Promise<{ videoId: string; videoUrl: string }> {
    const youtubeClient = providedYoutubeClient ?? (await getYoutubeClient());

    const uploadResponse = await youtubeClient.videos.insert({
        part: ['snippet', 'status'],
        notifySubscribers: false,
        requestBody: {
            snippet: {
                title,
                description,
                categoryId: '20', // Gaming
            },
            status: {
                privacyStatus: 'unlisted',
                selfDeclaredMadeForKids: false,
            },
        },
        media: {
            mimeType,
            body: videoStream,
        },
    });

    const videoId = uploadResponse.data.id;
    if (!videoId) {
        throw new Error(`YouTube upload for "${title}" did not return a video ID`);
    }

    await youtubeClient.playlistItems.insert({
        part: ['snippet'],
        requestBody: {
            snippet: {
                playlistId,
                resourceId: {
                    kind: 'youtube#video',
                    videoId,
                },
            },
        },
    });

    const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
    console.log(`Successfully uploaded "${title}" to YouTube at ${videoUrl}`);
    return { videoId, videoUrl };
}

/**
 * Soft-deletes a Google Drive file by moving it to the finished uploads folder.
 */
async function deleteDriveFile({
    driveClient,
    fileName,
    fileId,
    fileParents,
}: {
    driveClient: drive_v3.Drive;
    fileName?: string | null;
    fileId?: string | null;
    fileParents?: string[] | null;
}) {
    if (!fileName || !fileId || !fileParents) {
        return;
    }
    if (!IS_PROD) {
        console.log(
            `Skipping delete of file ${fileName} because current stage ${STAGE} is not prod.`,
        );
        return;
    }
    await driveClient.files.update({
        fileId,
        addParents: FINISHED_UPLOADS_DRIVE_FOLDER,
        removeParents: fileParents.join(','),
    });
    console.log(`Successfully moved "${fileName}" to Finished Uploads folder in Google Drive`);
}
