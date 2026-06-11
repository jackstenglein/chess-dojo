'use strict';

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';

export const dynamo = new DynamoDBClient({ region: 'us-east-1' });
export const gamesTable = process.env.stage + '-games';
export const timelineTable = process.env.stage + '-timeline';
export const usersTable = process.env.stage + '-users';
export const directoriesTable = process.env.stage + '-directories';
