/**
 * Uploads live class recordings from S3 to YouTube for classes in lectures-{stage}.json.
 * For each class, compares S3 recordings against DynamoDB and uploads any missing dates.
 * Titles and descriptions come from video_titles.csv.
 *
 * Requires AWS credentials with access to the live classes bucket, DynamoDB table,
 * and YouTube OAuth secret.
 *
 * Run from the backend directory, e.g.:
 *   cd backend && stage=prod npx tsx liveClassService/testUpload.ts
 *   cd backend && stage=prod npx tsx liveClassService/testUpload.ts --dry-run
 */

import { GetObjectCommand, ListObjectsV2Command, S3Client } from '@aws-sdk/client-s3';
import { SubscriptionTier } from '@jackstenglein/chess-dojo-common/src/database/user';
import { LiveClass } from '@jackstenglein/chess-dojo-common/src/liveClasses/api';
import { execSync } from 'child_process';
import csvParser from 'csv-parser';
import { createReadStream, createWriteStream } from 'fs';
import { unlink } from 'fs/promises';
import path from 'path';
import { stdin as input, stdout as output } from 'process';
import { createInterface } from 'readline/promises';
import { Readable } from 'stream';
import { finished } from 'stream/promises';
import {
    GetItemBuilder,
    LIVE_CLASSES_TABLE,
    UpdateItemBuilder,
} from '../directoryService/database';
import { getYoutubeClient, uploadVideoToYouTube } from './copyRecordings';
import { MeetingInfo, parseMeetingInfo } from './meetingInfo';

const STAGE = process.env.stage || '';
const DRY_RUN = process.argv.includes('--dry-run') || process.env.dryRun === 'true';
const S3_BUCKET = process.env.s3Bucket || `chess-dojo-${STAGE}-live-classes`;
const S3_CLIENT = new S3Client({ region: 'us-east-1' });
const VIDEO_TITLES_PATH = path.join(__dirname, 'video_titles.csv');
const DATE_REGEX = /\d{4}-\d{2}-\d{2}/;

/** Maps CSV class names to the name field in lectures-{stage}.json. */
const CLASS_NAME_ALIASES: Record<string, string> = {
    'Board Visualization': 'Basic Board Visualization',
    'Calculation Training': 'Calculation 1000+',
    '1.d4 Starter Repertoire / Typical Plans': 'Starter d4 Repertoire/Typical Plans',
};

interface LectureConfig extends MeetingInfo {
    playlistId?: string;
}

interface VideoTitleRow {
    className: string;
    date: string;
    title: string;
    description: string;
}

interface S3Recording {
    date: string;
    s3Key: string;
}

interface UploadJob {
    lecture: LectureConfig;
    date: string;
    title: string;
    description: string;
    s3Key: string;
    playlistId: string;
}

async function confirmUpload(prompt: string): Promise<boolean> {
    const rl = createInterface({ input, output });
    try {
        const answer = await rl.question(`${prompt} [y/N] `);
        const normalized = answer.trim().toLowerCase();
        return normalized === 'y' || normalized === 'yes';
    } finally {
        rl.close();
    }
}

function readCsv(filePath: string): Promise<VideoTitleRow[]> {
    return new Promise((resolve, reject) => {
        const rows: VideoTitleRow[] = [];
        createReadStream(filePath)
            .pipe(csvParser())
            .on('data', (row: Record<string, string>) => {
                const className = row['Class Name']?.trim() ?? '';
                const date = row['Date']?.trim() ?? '';
                const title = row['Title']?.trim() ?? '';
                const description = row['Description']?.trim() ?? '';
                if (!className || !date || !title) {
                    return;
                }
                rows.push({ className, date, title, description });
            })
            .on('end', () => resolve(rows))
            .on('error', reject);
    });
}

/**
 * Parses a CSV date into YYYY-MM-DD for S3 keys.
 * Supports M/D/YYYY, MM/DD/YY, and MM/DD (assumes 2026).
 */
function parseCsvDate(dateStr: string): string {
    const parts = dateStr
        .trim()
        .split('/')
        .map((part) => part.trim());
    if (parts.length === 3) {
        const [month, day, yearPart] = parts;
        const year = yearPart.length === 2 ? `20${yearPart}` : yearPart;
        return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }
    if (parts.length === 2) {
        const [month, day] = parts;
        return `2026-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }
    throw new Error(`Unparseable date: "${dateStr}"`);
}

function resolveLectureName(csvClassName: string): string {
    return CLASS_NAME_ALIASES[csvClassName] ?? csvClassName;
}

function buildTitlesByLectureAndDate(rows: VideoTitleRow[]): Map<string, VideoTitleRow> {
    const titlesByLectureAndDate = new Map<string, VideoTitleRow>();
    for (const row of rows) {
        const lectureName = resolveLectureName(row.className);
        const date = parseCsvDate(row.date);
        titlesByLectureAndDate.set(`${lectureName}:${date}`, row);
    }
    return titlesByLectureAndDate;
}

function parseS3KeyDate(s3Key: string): string | undefined {
    const lastSegment = s3Key.split('/').at(-1);
    if (!lastSegment) {
        return undefined;
    }
    return DATE_REGEX.exec(lastSegment)?.[0];
}

async function fetchLiveClassFromDynamo(lecture: LectureConfig): Promise<LiveClass | undefined> {
    if (!lecture.id) {
        return undefined;
    }
    return new GetItemBuilder<LiveClass>()
        .key('type', SubscriptionTier.GameReview)
        .key('id', lecture.id)
        .table(LIVE_CLASSES_TABLE)
        .send();
}

async function listS3RecordingsForClass(lecture: LectureConfig): Promise<S3Recording[]> {
    const prefix = `${SubscriptionTier.GameReview}/${lecture.awsS3Folder}/`;
    const recordings: S3Recording[] = [];
    let continuationToken: string | undefined;

    do {
        const response = await S3_CLIENT.send(
            new ListObjectsV2Command({
                Bucket: S3_BUCKET,
                Prefix: prefix,
                ContinuationToken: continuationToken,
            }),
        );

        for (const item of response.Contents ?? []) {
            if (!item.Key) {
                continue;
            }
            const date = parseS3KeyDate(item.Key);
            if (!date) {
                console.warn(`Skipping S3 object with unparseable date: ${item.Key}`);
                continue;
            }
            recordings.push({ date, s3Key: item.Key });
        }

        continuationToken = response.IsTruncated ? response.NextContinuationToken : undefined;
    } while (continuationToken);

    return recordings.sort((lhs, rhs) => lhs.date.localeCompare(rhs.date));
}

function buildUploadJobsForClass({
    lecture,
    dynamoClass,
    s3Recordings,
    titlesByLectureAndDate,
}: {
    lecture: LectureConfig;
    dynamoClass: LiveClass | undefined;
    s3Recordings: S3Recording[];
    titlesByLectureAndDate: Map<string, VideoTitleRow>;
}): UploadJob[] {
    if (!lecture.playlistId) {
        console.log(`Skipping "${lecture.name}" — no playlist ID configured.`);
        return [];
    }

    const existingDates = new Set(
        (dynamoClass?.recordings ?? []).map((recording) => recording.date),
    );
    const jobs: UploadJob[] = [];

    for (const s3Recording of s3Recordings) {
        if (existingDates.has(s3Recording.date)) {
            continue;
        }

        const titleRow = titlesByLectureAndDate.get(`${lecture.name}:${s3Recording.date}`);
        jobs.push({
            lecture,
            date: s3Recording.date,
            title: titleRow?.title || `${lecture.name} — ${s3Recording.date}`,
            description: titleRow?.description || '',
            s3Key: s3Recording.s3Key,
            playlistId: lecture.playlistId,
        });
    }

    return jobs;
}

async function downloadS3ObjectToFile(
    key: string,
    localFilePath: string,
): Promise<string | undefined> {
    const response = await S3_CLIENT.send(
        new GetObjectCommand({
            Bucket: S3_BUCKET,
            Key: key,
        }),
    );
    const body = response.Body as Readable;
    if (!body) {
        throw new Error(`Empty response body for s3://${S3_BUCKET}/${key}`);
    }

    const fileStream = createWriteStream(localFilePath);
    body.pipe(fileStream);
    await finished(fileStream);
    return response.ContentType;
}

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

async function updateDynamoDBRecording({
    lecture,
    job,
    videoId,
    durationSeconds,
}: {
    lecture: LectureConfig;
    job: UploadJob;
    videoId: string;
    durationSeconds: number;
}): Promise<void> {
    if (!lecture.id) {
        throw new Error(`Cannot update DynamoDB for "${lecture.name}" because it has no id.`);
    }

    await new UpdateItemBuilder()
        .key('type', SubscriptionTier.GameReview)
        .key('id', lecture.id)
        .appendToList('recordings', [
            {
                date: job.date,
                s3Key: job.s3Key,
                url: `https://www.youtube.com/embed/${videoId}`,
                title: job.title,
                description: job.description,
                durationSeconds,
            },
        ])
        .table(LIVE_CLASSES_TABLE)
        .send();
}

async function main() {
    if (!STAGE) {
        throw new Error('Set the stage environment variable (e.g. stage=prod).');
    }

    const lectures = parseMeetingInfo(
        path.join(__dirname, `game-reviews-${STAGE}.json`),
        SubscriptionTier.GameReview,
    ) as LectureConfig[];
    const titlesByLectureAndDate = buildTitlesByLectureAndDate(await readCsv(VIDEO_TITLES_PATH));

    const jobs: UploadJob[] = [];
    for (const lecture of lectures) {
        console.log(`Checking "${lecture.name}"...`);
        const dynamoClass = await fetchLiveClassFromDynamo(lecture);
        if (!dynamoClass) {
            console.warn(`No DynamoDB record found for "${lecture.name}" (${lecture.id}).`);
        } else {
            console.log(
                `  DynamoDB has ${dynamoClass.recordings.length} recording(s): ${dynamoClass.recordings.map((recording) => recording.date).join(', ') || '(none)'}`,
            );
        }

        const s3Recordings = await listS3RecordingsForClass(lecture);
        console.log(
            `  S3 has ${s3Recordings.length} recording(s): ${s3Recordings.map((recording) => recording.date).join(', ') || '(none)'}`,
        );

        const classJobs = buildUploadJobsForClass({
            lecture,
            dynamoClass,
            s3Recordings,
            titlesByLectureAndDate,
        });
        jobs.push(...classJobs);
    }

    if (jobs.length === 0) {
        console.log('No recordings to upload.');
        return;
    }

    console.log(`\n${DRY_RUN ? '[DRY RUN] ' : ''}Videos to upload: ${jobs.length}`);
    for (const job of jobs) {
        console.log(`  [${job.lecture.name}] ${job.date} — "${job.title}" (${job.s3Key})`);
    }

    if (DRY_RUN) {
        console.log('\nDry run complete. No uploads or DynamoDB updates were performed.');
        return;
    }

    const youtubeClient = await getYoutubeClient();
    const channelsResponse = await youtubeClient.channels.list({
        part: ['snippet'],
        mine: true,
    });
    const channel = channelsResponse.data.items?.[0];
    if (!channel?.id || !channel.snippet?.title) {
        throw new Error('No YouTube channel found for these OAuth credentials.');
    }

    console.log(`\nAuthenticated channel: ${channel.snippet.title} (${channel.id})`);
    console.log(`S3 bucket: ${S3_BUCKET}`);
    console.log(`DynamoDB table: ${LIVE_CLASSES_TABLE}`);

    const confirmed = await confirmUpload('Upload these videos to YouTube and update DynamoDB?');
    if (!confirmed) {
        console.log('Upload cancelled.');
        return;
    }

    let success = 0;
    for (const [index, job] of jobs.entries()) {
        console.log(`Uploading ${index + 1}/${jobs.length}: "${job.title}"...`);
        const localFilePath = `/tmp/test-upload-${index}.mp4`;
        try {
            const contentType = await downloadS3ObjectToFile(job.s3Key, localFilePath);
            const durationSeconds = getVideoDurationSeconds(localFilePath);
            const result = await uploadVideoToYouTube({
                youtubeClient,
                videoStream: createReadStream(localFilePath),
                title: job.title,
                playlistId: job.playlistId,
                description: job.description,
                mimeType: contentType || 'video/mp4',
            });
            console.log(`  Uploaded: ${result.videoUrl}`);

            await updateDynamoDBRecording({
                lecture: job.lecture,
                job,
                videoId: result.videoId,
                durationSeconds,
            });
            console.log(`  Updated DynamoDB for "${job.lecture.name}" on ${job.date}.`);
            success++;
            if (success >= 10) {
                break;
            }
        } finally {
            await unlink(localFilePath).catch(console.error);
        }
    }

    console.log('All uploads complete.');
}

main().catch((error) => {
    console.error('Upload failed:', error);
    process.exit(1);
});
