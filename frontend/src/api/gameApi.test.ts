import { GameImportTypes } from '@jackstenglein/chess-dojo-common/src/database/game';
import { describe, expect, it } from 'vitest';
import {
    isChesscomAnalysisURL,
    isChesscomGameURL,
    isLichessChapterURL,
    isLichessGameURL,
    isLichessStudyURL,
} from './gameApi';

const testURLs: Record<string, string[]> = {
    [GameImportTypes.chesscomGame]: ['https://www.chess.com/game/live/107855985867'],
    [GameImportTypes.chesscomAnalysis]: [
        'https://www.chess.com/analysis/game/live/108036079387?tab=review',
        'https://www.chess.com/a/2eUTHynZc2Jtfx?tab=analysis',
    ],
    [GameImportTypes.lichessGame]: [
        'https://lichess.org/mN1qj7pP/black',
        'https://lichess.org/mN1qj7pP/',
        'https://lichess.org/mN1qj7pP',
        'https://lichess.org/mN1qj7pP/white',
        'https://lichess.org/game/mN1qj7pP/black',
        'https://lichess.org/game/mN1qj7pP/',
        'https://lichess.org/game/mN1qj7pP',
        'https://lichess.org/game/mN1qj7pP/white',
        'https://lichess.org/game/abcdefghWXYZ',
    ],
    [GameImportTypes.lichessStudy]: ['https://lichess.org/study/JIPuIPVG/'],
    [GameImportTypes.lichessChapter]: ['https://lichess.org/study/y14Z6s3N/fqJZzUm8'],
};

const urlMatchers: Record<string, (url: string) => boolean> = {
    [GameImportTypes.chesscomGame]: isChesscomGameURL,
    [GameImportTypes.chesscomAnalysis]: isChesscomAnalysisURL,
    [GameImportTypes.lichessGame]: isLichessGameURL,
    [GameImportTypes.lichessStudy]: isLichessStudyURL,
    [GameImportTypes.lichessChapter]: isLichessChapterURL,
};

Object.entries(urlMatchers).forEach(([submissionType, match]) =>
    describe(`${submissionType} URL matcher`, () => {
        it('does not match URLs that other matchers match', () => {
            for (const [otherType, urls] of Object.entries(testURLs)) {
                if (otherType !== submissionType) {
                    for (const url of urls) {
                        expect(
                            match(url),
                            `${submissionType} url matcher should not match the ${otherType} url ${url}`,
                        ).toBeFalsy();
                    }
                }
            }
        });

        it('matches relevant URLs', () => {
            testURLs[submissionType].forEach((url) => {
                expect(
                    match(url),
                    `${submissionType} url matcher should match ${url}`,
                ).toBeTruthy();
            });
        });
    }),
);
