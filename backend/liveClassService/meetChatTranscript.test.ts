import { describe, expect, it } from 'vitest';
import { findTranscriptFile, getTranscriptFilename } from './meetChatTranscript';

describe('getTranscriptFilename', () => {
    it('replaces Recording suffix with Chat', () => {
        expect(
            getTranscriptFilename('Endgame Fundamentals - 2026/01/09 10:00 AM - Recording'),
        ).toBe('Endgame Fundamentals - 2026/01/09 10:00 AM - Notes by Gemini');
    });
});

describe('findTranscriptFile', () => {
    it('finds an exact file match', () => {
        const files = [
            { id: '1', name: 'Class - 2026-01-09 10:00 AM - Recording' },
            { id: '2', name: 'Class - 2026-01-09 10:00 AM - Notes by Gemini' },
        ];
        expect(findTranscriptFile('Class - 2026-01-09 10:00 AM - Recording', files)?.id).toBe('2');
    });

    it('finds a file without recording suffix', () => {
        const files = [
            { id: '1', name: 'dnc-dsbj-gqy (2026-01-09 10:00 AM)' },
            { id: '2', name: 'dnc-dsbj-gqy (2026-01-09 10:00 AM) - Notes by Gemini' },
        ];
        expect(findTranscriptFile('dnc-dsbj-gqy (2026-01-09 10:00 AM)', files)?.id).toBe('2');
    });
});
