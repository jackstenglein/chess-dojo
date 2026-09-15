import { PutItemCommand } from '@aws-sdk/client-dynamodb';
import { marshall } from '@aws-sdk/util-dynamodb';
import { ScheduledEvent } from 'aws-lambda';
import { dynamo } from '../directoryService/database';
import { LeaderboardCalculator } from './LeaderboardCalculator';

const tournamentsTable = process.env.stage + '-tournaments';

export const handler = async (event: ScheduledEvent) => {
    try {
        console.log('Event: ', event);
        const month = event.detail.month ?? new Date().toISOString().slice(0, '2026-01'.length);
        const calculator = new LeaderboardCalculator();
        const leaderboard = await calculator.calculate(month);
        await dynamo.send(
            new PutItemCommand({
                Item: marshall(leaderboard, { removeUndefinedValues: true }),
                TableName: tournamentsTable,
            }),
        );
    } catch (err) {
        console.error(err);
    }
};
