import { SubscriptionTier } from '@jackstenglein/chess-dojo-common/src/database/user';
import { readFileSync } from 'fs';
import { ApiError } from '../directoryService/api';

interface MeetingInfo {
    keyPrefix: SubscriptionTier.GameReview | SubscriptionTier.Lecture;
    meetId: string;
}

export const MEETING_INFO: Record<string, Record<string, MeetingInfo>> = {
    prod: {
        'Team Morphy Peer Review': {
            keyPrefix: SubscriptionTier.GameReview,
            meetId: '',
        },
        'Team Morphy Sensei Review': {
            keyPrefix: SubscriptionTier.GameReview,
            meetId: '',
        },

        'Team Steinitz Peer Review': {
            keyPrefix: SubscriptionTier.GameReview,
            meetId: '',
        },
        'Team Steinitz Sensei Review': {
            keyPrefix: SubscriptionTier.GameReview,
            meetId: '',
        },

        'Team Lasker Peer Review': {
            keyPrefix: SubscriptionTier.GameReview,
            meetId: '',
        },
        'Team Lasker Sensei Review': {
            keyPrefix: SubscriptionTier.GameReview,
            meetId: '',
        },

        'Team Capablanca Peer Review': {
            keyPrefix: SubscriptionTier.GameReview,
            meetId: '',
        },
        'Team Capablanca Sensei Review': {
            keyPrefix: SubscriptionTier.GameReview,
            meetId: '',
        },

        'The Najdorf 1100+ | IM David Pruess': {
            keyPrefix: SubscriptionTier.Lecture,
            meetId: '',
        },
        'Endgame Fundamentals 0-1200 | GM Jesse Kraai': {
            keyPrefix: SubscriptionTier.Lecture,
            meetId: '',
        },
        'Calculation 1000+ | IM Kostya Kavutskiy': {
            keyPrefix: SubscriptionTier.Lecture,
            meetId: '',
        },
        'Endgames 1100+ | WGM Tatev Abrahamyan': {
            keyPrefix: SubscriptionTier.Lecture,
            meetId: '',
        },
        'Starter d4 Repertoire/Typical Plans 1100+ | IM Kostya Kavutskiy': {
            keyPrefix: SubscriptionTier.Lecture,
            meetId: '',
        },
        'Middlegame Decision Making 1100+ | GM Josh Friedel': {
            keyPrefix: SubscriptionTier.Lecture,
            meetId: '',
        },
        'Board Visualization U1000 | GM Jesse Kraai': {
            keyPrefix: SubscriptionTier.Lecture,
            meetId: '',
        },
    },
};

function init() {
    if (process.env.CI === 'true') {
        return;
    }

    const csv = readFileSync('meetingIds.csv', 'utf8');
    if (!csv) {
        throw new ApiError({
            statusCode: 500,
            publicMessage: 'Internal server error',
            privateMessage: 'meetingIds.csv file not found or empty',
        });
    }

    const lines = csv.trim().split('\n');
    if (lines.length !== Object.keys(MEETING_INFO.prod).length) {
        throw new ApiError({
            statusCode: 500,
            publicMessage: 'Internal server error',
            privateMessage:
                'meetingIds.csv file does not have same number of entries as MEETING_INFO.prod',
        });
    }

    for (const line of lines) {
        const [name, id] = line.split(',');
        if (!name || !id) {
            throw new ApiError({
                statusCode: 500,
                publicMessage: 'Internal server error',
                privateMessage: `meetingIds.csv file has invalid line: ${line}`,
            });
        }

        if (!MEETING_INFO.prod[name]) {
            throw new ApiError({
                statusCode: 500,
                publicMessage: 'Internal server error',
                privateMessage: `meetingIds.csv file has invalid name "${name}" not present in MEETING_INFO.prod`,
            });
        }

        MEETING_INFO.prod[name].meetId = id;
    }
}

init();
