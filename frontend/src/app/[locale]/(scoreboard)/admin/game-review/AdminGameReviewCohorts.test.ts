import { LectureTierUser } from '@/api/liveClassesApi';
import { describe, expect, it } from 'vitest';
import { groupLectureUsersByCohort } from './groupLectureUsersByCohort';

function makeUser(username: string, dojoCohort: string): LectureTierUser {
    return { username, displayName: username, dojoCohort };
}

describe('groupLectureUsersByCohort', () => {
    it('returns an empty map for an empty list', () => {
        const result = groupLectureUsersByCohort([]);
        expect(result.size).toBe(0);
    });

    it('groups users by their dojoCohort', () => {
        const users = [
            makeUser('alice', '1200-1300'),
            makeUser('bob', '1200-1300'),
            makeUser('charlie', '1800-1900'),
        ];
        const result = groupLectureUsersByCohort(users);
        expect(result.get('1200-1300')?.length).toBe(2);
        expect(result.get('1800-1900')?.length).toBe(1);
    });

    it('sorts groups by cohort range ascending (lowest first)', () => {
        const users = [
            makeUser('alice', '1800-1900'),
            makeUser('bob', '0-300'),
            makeUser('charlie', '1200-1300'),
        ];
        const result = groupLectureUsersByCohort(users);
        const keys = [...result.keys()];
        expect(keys).toEqual(['0-300', '1200-1300', '1800-1900']);
    });

    it('places 2400+ cohort after lower cohorts', () => {
        const users = [makeUser('alice', '2400+'), makeUser('bob', '800-900')];
        const result = groupLectureUsersByCohort(users);
        const keys = [...result.keys()];
        expect(keys).toEqual(['800-900', '2400+']);
    });

    it('places users with empty dojoCohort into Unknown at the end', () => {
        const users = [makeUser('alice', '1200-1300'), makeUser('bob', '')];
        const result = groupLectureUsersByCohort(users);
        const keys = [...result.keys()];
        expect(keys).toEqual(['1200-1300', 'Unknown']);
        expect(result.get('Unknown')?.length).toBe(1);
    });

    it('keeps multiple Unknown users together at the end', () => {
        const users = [
            makeUser('alice', ''),
            makeUser('bob', '1500-1600'),
            makeUser('charlie', ''),
        ];
        const result = groupLectureUsersByCohort(users);
        const keys = [...result.keys()];
        expect(keys[keys.length - 1]).toBe('Unknown');
        expect(result.get('Unknown')?.length).toBe(2);
    });
});
