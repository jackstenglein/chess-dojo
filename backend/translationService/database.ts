'use strict';

/** The name of the DynamoDB table containing translations. */
export const translationsTable = process.env.stage + '-translations';

export { GetItemBuilder, dynamo, getUser } from '../directoryService/database';
