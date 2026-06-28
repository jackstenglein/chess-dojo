/**
 * Uploads live class recordings from S3 to YouTube using titles from video_titles.csv.
 * Only classes with a playlistId in lectures-{stage}.json are uploaded.
 *
 * Requires AWS credentials with access to the live classes bucket and YouTube OAuth secret.
 *
 * Run from the backend directory, e.g.:
 *   cd backend && stage=prod npx tsx liveClassService/testUpload.ts
 */

import { GetObjectCommand, HeadObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { SubscriptionTier } from '@jackstenglein/chess-dojo-common/src/database/user';
import csvParser from 'csv-parser';
import { createReadStream } from 'fs';
import path from 'path';
import { stdin as input, stdout as output } from 'process';
import { createInterface } from 'readline/promises';
import { Readable } from 'stream';
import { getYoutubeClient, uploadVideoToYouTube } from './copyRecordings';
import { MeetingInfo, parseMeetingInfo } from './meetingInfo';

const STAGE = process.env.stage || '';
const S3_BUCKET = process.env.s3Bucket || `chess-dojo-${STAGE}-live-classes`;
const S3_CLIENT = new S3Client({ region: 'us-east-1' });
const VIDEO_TITLES_PATH = path.join(__dirname, 'video_titles.csv');

/** Maps CSV class names to the name field in lectures-{stage}.json. */
const CLASS_NAME_ALIASES: Record<string, string> = {
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

interface UploadJob {
    lecture: LectureConfig;
    className: string;
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

function buildUploadJobs(
    rows: VideoTitleRow[],
    lecturesByName: Map<string, LectureConfig>,
): UploadJob[] {
    const jobs: UploadJob[] = [];

    for (const row of rows) {
        const lectureName = resolveLectureName(row.className);
        const lecture = lecturesByName.get(lectureName);
        if (!lecture?.playlistId) {
            console.log(
                `Skipping "${row.className}" / "${row.title}" — no playlist ID configured.`,
            );
            continue;
        }

        const date = parseCsvDate(row.date);
        const s3Key = `${SubscriptionTier.Lecture}/${lecture.awsS3Folder}/${date}`;
        jobs.push({
            lecture,
            className: row.className,
            date,
            title: row.title,
            description: row.description,
            s3Key,
            playlistId: lecture.playlistId,
        });
    }

    return jobs;
}

async function s3ObjectExists(uploadJob: UploadJob): Promise<boolean> {
    try {
        await S3_CLIENT.send(new HeadObjectCommand({ Bucket: S3_BUCKET, Key: uploadJob.s3Key }));
        return true;
    } catch {
        for (const googleMeetName of uploadJob.lecture.googleMeetNames) {
            const fallbackKey = `${SubscriptionTier.Lecture}/${uploadJob.lecture.awsS3Folder}/${googleMeetName} (${uploadJob.date})`;
            try {
                await S3_CLIENT.send(
                    new HeadObjectCommand({ Bucket: S3_BUCKET, Key: fallbackKey }),
                );
                uploadJob.s3Key = fallbackKey;
                return true;
            } catch {
                continue;
            }
        }
        return false;
    }
}

async function getS3ObjectStream(key: string): Promise<{ body: Readable; contentType?: string }> {
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
    return { body, contentType: response.ContentType };
}

async function main() {
    if (!STAGE) {
        throw new Error('Set the stage environment variable (e.g. stage=prod).');
    }

    const lectures = parseMeetingInfo(
        path.join(__dirname, `lectures-${STAGE}.json`),
        SubscriptionTier.Lecture,
    ) as LectureConfig[];
    const lecturesByName = new Map(lectures.map((lecture) => [lecture.name, lecture]));

    const rows = await readCsv(VIDEO_TITLES_PATH);
    const jobs = buildUploadJobs(rows, lecturesByName);
    if (jobs.length === 0) {
        console.log('No videos to upload.');
        return;
    }

    const missingS3Keys: string[] = [];
    for (const job of jobs) {
        if (!(await s3ObjectExists(job))) {
            missingS3Keys.push(job.s3Key);
        }
    }
    if (missingS3Keys.length > 0) {
        console.error('Missing S3 objects:');
        for (const key of missingS3Keys) {
            console.error(`  s3://${S3_BUCKET}/${key}`);
        }
        throw new Error(`${missingS3Keys.length} recording(s) not found in S3.`);
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

    console.log(`Authenticated channel: ${channel.snippet.title} (${channel.id})`);
    console.log(`S3 bucket: ${S3_BUCKET}`);
    console.log(`Videos to upload: ${jobs.length}`);
    for (const job of jobs) {
        console.log(`  [${job.className}] ${job.date} — "${job.title}" (${job.s3Key})`);
    }

    const confirmed = await confirmUpload('Upload these videos to YouTube?');
    if (!confirmed) {
        console.log('Upload cancelled.');
        return;
    }

    for (const [index, job] of jobs.entries()) {
        console.log(`Uploading ${index + 1}/${jobs.length}: "${job.title}"...`);
        const { body, contentType } = await getS3ObjectStream(job.s3Key);
        const result = await uploadVideoToYouTube({
            youtubeClient,
            videoStream: body,
            title: job.title,
            playlistId: job.playlistId,
            description: job.description,
            mimeType: contentType || 'video/mp4',
        });
        console.log(`  Uploaded: ${result.videoUrl}`);
    }

    console.log('All uploads complete.');
}

main().catch((error) => {
    console.error('Upload failed:', error);
    process.exit(1);
});
