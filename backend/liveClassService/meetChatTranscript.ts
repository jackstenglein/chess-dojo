import { drive_v3 } from '@googleapis/drive';

const RECORDING_SUFFIX = / - Recording$/i;
const NOTES_SUFFIX = ' - Notes by Gemini';

/**
 * Returns the expected Google Meet transcript file name for a recording file name.
 */
export function getTranscriptFilename(recordingFileName: string): string {
    return recordingFileName.replace(RECORDING_SUFFIX, '') + NOTES_SUFFIX;
}

/**
 * Finds the Google Meet transcript file associated with a recording.
 * Transcripts are saved as files ending in " - Notes by Gemini".
 */
export function findTranscriptFile(
    recordingFileName: string,
    files: drive_v3.Schema$File[],
): drive_v3.Schema$File | undefined {
    const transcriptFilename = getTranscriptFilename(recordingFileName);
    console.log('Transcript filename: ', transcriptFilename);
    const exactMatch = files.find((file) => file.name === transcriptFilename);
    if (exactMatch?.id) {
        return exactMatch;
    }

    const prefix = recordingFileName.replace(RECORDING_SUFFIX, '');
    console.log('prefix: ', prefix);
    return files.find((file) => {
        const name = file.name ?? '';
        return name.startsWith(prefix) && name.endsWith(NOTES_SUFFIX);
    });
}
