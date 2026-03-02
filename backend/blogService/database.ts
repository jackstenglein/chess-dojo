'use strict';

/** The name of the DynamoDB table containing blog posts. */
export const blogTable = process.env.stage + '-blogs';

export {
    GetItemBuilder,
    UpdateItemBuilder,
    attributeExists,
    dynamo,
    getUser,
} from '../directoryService/database';
