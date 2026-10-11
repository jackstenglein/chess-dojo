'use strict';

import { APIGatewayProxyHandlerV2 } from 'aws-lambda';
import { errToApiGatewayProxyResultV2, requireUserInfo, success } from '../directoryService/api';
import { listAdminActions, requireAdmin } from './database';

/** Handles requests for the admin log, newest first. The caller must be a puzzle admin. */
export const listHandler: APIGatewayProxyHandlerV2 = async (event) => {
    try {
        console.log('Event: %j', event);
        const userInfo = requireUserInfo(event);
        await requireAdmin(userInfo.username);
        return success(await listAdminActions());
    } catch (err) {
        return errToApiGatewayProxyResultV2(err);
    }
};
