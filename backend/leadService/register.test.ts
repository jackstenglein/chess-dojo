import { ConditionalCheckFailedException } from '@aws-sdk/client-dynamodb';
import { WC_LOCK_AT_UTC } from '@jackstenglein/chess-dojo-common/src/lead/worldChampionship';
import { APIGatewayProxyEventV2, APIGatewayProxyStructuredResultV2 } from 'aws-lambda';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { handler } from './register';

const mocks = vi.hoisted(() => ({
    dynamoSend: vi.fn(),
    sendEmailTemplate: vi.fn(),
}));

vi.mock('../directoryService/database', () => ({ dynamo: { send: mocks.dynamoSend } }));
vi.mock('../notificationService/email', () => ({ sendEmailTemplate: mocks.sendEmailTemplate }));

const LOCK_AT_MS = Date.parse(WC_LOCK_AT_UTC);
const HOUR = 60 * 60 * 1000;

const picks = {
    winner: 'sindarov',
    tiebreaks: false,
    score: '7.5-5.5',
    decisiveGames: 4,
    firstDecisiveGame: 3,
    game1Moves: 41,
};

async function register(body: object): Promise<APIGatewayProxyStructuredResultV2> {
    const event = { body: JSON.stringify(body) } as APIGatewayProxyEventV2;
    return (await handler(
        event,
        {} as never,
        () => undefined,
    )) as APIGatewayProxyStructuredResultV2;
}

/** The input of the nth PutItem call, with the item as DynamoDB attribute values. */
function putItem(call = 0) {
    const command = mocks.dynamoSend.mock.calls[call][0] as {
        input: {
            TableName: string;
            Item: Record<string, Record<string, unknown>>;
            ConditionExpression?: string;
        };
    };
    return command.input;
}

beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(LOCK_AT_MS - HOUR);
    vi.spyOn(console, 'log').mockImplementation(() => undefined);
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    mocks.dynamoSend.mockReset().mockResolvedValue({});
    mocks.sendEmailTemplate.mockReset().mockResolvedValue(undefined);
});

afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
});

describe('register World Championship prediction', () => {
    it('saves the picks under the lowercased email and emails a copy', async () => {
        const result = await register({
            type: 'WC_PREDICTION',
            email: 'Player@Example.com',
            displayName: 'Pat',
            picks,
            attribution: { utm_source: 'youtube' },
        });

        expect(result.statusCode).toBe(200);
        expect(mocks.dynamoSend).toHaveBeenCalledTimes(1);
        const { Item, ConditionExpression } = putItem();
        // Picks are final, so the write only goes through for a new email.
        expect(ConditionExpression).toBe('attribute_not_exists(#hash)');
        expect(Item.hash).toEqual({ S: 'WC_PREDICTION' });
        expect(Item.range).toEqual({ S: 'player@example.com' });
        expect(Item.email).toEqual({ S: 'Player@Example.com' });
        expect(Item.displayName).toEqual({ S: 'Pat' });
        expect(Item.winner).toEqual({ S: 'sindarov' });
        expect(Item.score).toEqual({ S: '7.5-5.5' });
        expect(Item.tiebreaks).toEqual({ BOOL: false });
        expect(Item.decisiveGames).toEqual({ N: '4' });
        expect(Item.firstDecisiveGame).toEqual({ N: '3' });
        expect(Item.game1Moves).toEqual({ N: '41' });
        expect(Item.attribution).toEqual({ M: { utm_source: { S: 'youtube' } } });
        // No ttl, so the follow-up stream never sees a prediction.
        expect(Item.ttl).toBeUndefined();

        expect(mocks.sendEmailTemplate).toHaveBeenCalledWith(
            'wcPrediction/confirmation',
            {
                winner: 'Javokhir Sindarov',
                finish: '7.5-5.5 in the classical games',
                decisiveGames: '4',
                firstDecisiveGame: 'Game 3',
                game1Moves: '41',
                lockMoment: 'Tuesday, November 24 at 15:00 Geneva time (14:00 UTC)',
            },
            ['Player@Example.com'],
            'ChessDojo <chessdojo@chessdojo.club>',
        );
    });

    it('describes a tiebreak pick with no decisive game', async () => {
        await register({
            type: 'WC_PREDICTION',
            email: 'player@example.com',
            picks: {
                winner: 'gukesh',
                tiebreaks: true,
                score: '7-7',
                decisiveGames: 0,
                firstDecisiveGame: 'none',
                game1Moves: 60,
            },
        });

        expect(putItem().Item.firstDecisiveGame).toEqual({ S: 'none' });
        expect(putItem().Item.displayName).toBeUndefined();
        expect(mocks.sendEmailTemplate.mock.calls[0][1]).toMatchObject({
            winner: 'Gukesh Dommaraju',
            finish: 'In tiebreaks, after 7-7 in the classical games',
            firstDecisiveGame: 'None',
        });
    });

    it('still accepts the entry when the confirmation email fails', async () => {
        mocks.sendEmailTemplate.mockRejectedValue(new Error('SES is down'));

        const result = await register({
            type: 'WC_PREDICTION',
            email: 'player@example.com',
            picks,
        });

        expect(result.statusCode).toBe(200);
        expect(mocks.dynamoSend).toHaveBeenCalledTimes(1);
    });

    it('refuses a prediction once Game 1 has started', async () => {
        vi.setSystemTime(LOCK_AT_MS);

        const result = await register({
            type: 'WC_PREDICTION',
            email: 'player@example.com',
            picks,
        });

        expect(result.statusCode).toBe(403);
        expect(mocks.dynamoSend).not.toHaveBeenCalled();
        expect(mocks.sendEmailTemplate).not.toHaveBeenCalled();
    });

    it('refuses a second prediction for the same email and sends no email', async () => {
        mocks.dynamoSend.mockRejectedValue(
            new ConditionalCheckFailedException({ message: 'exists', $metadata: {} }),
        );

        const result = await register({
            type: 'WC_PREDICTION',
            email: 'player@example.com',
            picks: { ...picks, winner: 'gukesh' },
        });

        expect(result.statusCode).toBe(409);
        expect(mocks.sendEmailTemplate).not.toHaveBeenCalled();
    });

    it('answers with a server error when the table cannot be written', async () => {
        mocks.dynamoSend.mockRejectedValue(new Error('throttled'));

        const result = await register({
            type: 'WC_PREDICTION',
            email: 'player@example.com',
            picks,
        });

        expect(result.statusCode).toBe(500);
        expect(mocks.sendEmailTemplate).not.toHaveBeenCalled();
    });

    it.each([
        ['no picks', undefined],
        ['a score that does not match the tiebreak pick', { ...picks, tiebreaks: true }],
        ['an unknown player', { ...picks, winner: 'carlsen' }],
        ['a game number past 14', { ...picks, firstDecisiveGame: 15 }],
    ])('refuses a prediction with %s', async (_name, badPicks) => {
        const result = await register({
            type: 'WC_PREDICTION',
            email: 'player@example.com',
            picks: badPicks,
        });

        expect(result.statusCode).toBe(400);
        expect(mocks.dynamoSend).not.toHaveBeenCalled();
    });
});

describe('register World Championship results sign up', () => {
    it('saves the email after the lock, without sending anything', async () => {
        vi.setSystemTime(LOCK_AT_MS + HOUR);

        const result = await register({ type: 'WC_RESULTS', email: 'Fan@Example.com' });

        expect(result.statusCode).toBe(200);
        const { Item } = putItem();
        expect(Item.hash).toEqual({ S: 'WC_RESULTS' });
        expect(Item.range).toEqual({ S: 'fan@example.com' });
        expect(mocks.sendEmailTemplate).not.toHaveBeenCalled();
    });
});

describe('register live class lead', () => {
    it('still saves the lead, sends the class and schedules the follow-ups', async () => {
        const result = await register({
            type: 'LIVE_CLASS',
            email: 'student@example.com',
            classId: 'CALCULATION',
        });

        expect(result.statusCode).toBe(200);
        // The submitted lead plus five follow-up records.
        expect(mocks.dynamoSend).toHaveBeenCalledTimes(6);
        expect(putItem().Item.hash).toEqual({ S: 'SUBMITTED_LEAD' });
        expect(mocks.sendEmailTemplate).toHaveBeenCalledWith(
            'classLead/n1-class-link',
            { className: 'Calculation 1000+', classId: 'CALCULATION' },
            ['student@example.com'],
            'ChessDojo <chessdojo@chessdojo.club>',
        );
    });
});
