import { describe, expect, it } from 'vitest';
import { parseMeetRecordingFileName } from './copyRecordings';

describe('parseMeetRecordingFileName', () => {
    it('returns meetName and meetDate for valid recording file name', () => {
        const result = parseMeetRecordingFileName(
            'Team Morphy Peer Review - 2/27/2025 10:00 AM - Recording',
        );
        expect(result).toEqual({
            meetName: 'Team Morphy Peer Review',
            meetDate: '2-27-2025',
        });
    });

    it('normalizes date by replacing slashes with hyphens', () => {
        const result = parseMeetRecordingFileName(
            'The Najdorf 1100+ | IM David Pruess - 12/1/2024 3:00 PM - Recording',
        );
        expect(result).toEqual({
            meetName: 'The Najdorf 1100+ | IM David Pruess',
            meetDate: '12-1-2024',
        });
    });

    it('uses only the first segment of the date (before space)', () => {
        const result = parseMeetRecordingFileName(
            'Team Lasker Sensei Review - 6/15/2025 2:30 PM - Recording',
        );
        expect(result).toEqual({
            meetName: 'Team Lasker Sensei Review',
            meetDate: '6-15-2025',
        });
    });

    it('returns null for name without " - Recording" suffix', () => {
        expect(parseMeetRecordingFileName('Team Morphy Peer Review - 2/27/2025')).toBeNull();
        expect(parseMeetRecordingFileName('Some Random Video.mp4')).toBeNull();
    });

    it('returns null for empty string', () => {
        expect(parseMeetRecordingFileName('')).toBeNull();
    });

    it('returns null for name with only one " - " segment', () => {
        expect(parseMeetRecordingFileName('Just One Part - Recording')).toBeNull();
    });

    it('handles meeting names containing " - " (multiple segments)', () => {
        const result = parseMeetRecordingFileName(
            'Starter d4 Repertoire/Typical Plans 1100+ | IM Kostya Kavutskiy - 1/10/2025 9:00 AM - Recording',
        );
        expect(result).toEqual({
            meetName: 'Starter d4 Repertoire/Typical Plans 1100+ | IM Kostya Kavutskiy',
            meetDate: '1-10-2025',
        });
    });
});

