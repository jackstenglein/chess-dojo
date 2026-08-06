'use strict';

/** The name of the DynamoDB table containing blog posts. */
export const blogTable = process.env.stage + '-blogs';

export {
    GetItemBuilder,
    UpdateItemBuilder,
    and,
    attributeExists,
    attributeNotExists,
    dynamo,
    equal,
    getUser,
    or,
} from '../directoryService/database';
