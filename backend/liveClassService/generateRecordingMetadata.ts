import axios from 'axios';
import { z } from 'zod';
import { MeetingInfo } from './meetingInfo';

const GEMINI_MODEL = 'gemini-2.5-flash';
const MAX_CHAT_TRANSCRIPT_CHARS = 30_000;

const recordingMetadataSchema = z.object({
    title: z.string().min(1),
    description: z.string().min(1),
    startTimestamp: z.string().min(1).max(8),
});

export interface RecordingMetadata {
    title: string;
    description: string;
    startTimestamp: string;
}

/**
 * Generates a YouTube title, description, and start timestamp for a live class recording
 * using Gemini. If no transcript is available, a fallback title and description are returned
 * using the class name and date.
 * @param apiKey The Google Generative AI API key.
 * @param meetingInfo The meeting info for the recording.
 * @param meetDate The recording date in YYYY-MM-DD format.
 * @param transcript The parsed Google Meet transcript, if available.
 * @returns The generated title, description, and start timestamp.
 */
export async function generateRecordingMetadata({
    apiKey,
    meetingInfo,
    meetDate,
    transcript,
}: {
    apiKey: string;
    meetingInfo: MeetingInfo;
    meetDate: string;
    transcript?: string;
}): Promise<RecordingMetadata> {
    if (!transcript) {
        return getFallbackRecordingMetadata(meetingInfo, meetDate);
    }

    const trimmedTranscript = transcript?.slice(0, MAX_CHAT_TRANSCRIPT_CHARS) ?? '';
    const prompt = [
        'You write YouTube titles and descriptions for Chess Dojo live class recordings.',
        'You also determine the start timestamp of the recording. Cut out irrelevant chatting in the beginning of the recording and return the timestamp when teaching actually begins (e.g "00:03:00").',
        'Return JSON only with keys "title", "description", and "startTimestamp".',
        'The title must be at most 100 characters and describe this specific session.',
        'The description should summarize what was covered, be informative, and at most 1000 characters.',
        '',
        `Class name: ${meetingInfo.name}`,
        `Teacher: ${meetingInfo.teacher ?? 'Unknown'}`,
        `Class description: ${meetingInfo.description}`,
        `Recording date: ${meetDate}`,
        trimmedTranscript
            ? `\nGoogle Meet transcript:\n${trimmedTranscript}`
            : '\nNo meeting transcript was available for this recording.',
    ].join('\n');

    console.log('Prompt:', prompt);

    const response = await axios.post(
        `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`,
        {
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
                responseMimeType: 'application/json',
            },
        },
        {
            params: { key: apiKey },
            timeout: 60_000,
        },
    );

    const text = response.data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) {
        throw new Error('Gemini returned an empty response.');
    }

    const result = recordingMetadataSchema.parse(JSON.parse(text));
    result.description += `\n\nOriginally recorded on ${meetDate}.`;
    return result;
}

/**
 * Builds a fallback title and description when AI generation is unavailable.
 */
export function getFallbackRecordingMetadata(
    meetingInfo: MeetingInfo,
    meetDate: string,
): RecordingMetadata {
    return {
        title: `${meetingInfo.name} - ${meetDate}`,
        description: `${meetingInfo.description}\n\nOriginally recorded on ${meetDate}.`,
        startTimestamp: '0',
    };
}
