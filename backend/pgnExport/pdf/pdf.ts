'use strict';

import { PdfExportSchema } from '@jackstenglein/chess-dojo-common/src/pgn/export';
import { APIGatewayProxyHandlerV2 } from 'aws-lambda';
import { execSync } from 'child_process';
import * as fs from 'fs';
import { errToApiGatewayProxyResultV2, parseBody } from '../../directoryService/api';
import { TypstGenerator } from './TypstGenerator';

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
    try {
        console.log('Event: %j', event);

        const request = parseBody(event, PdfExportSchema);
        const generator = new TypstGenerator({
            ...request,
            qrcodeFilename: request.skipQrCode
                ? undefined
                : `/tmp/${event.requestContext.requestId}-qrcode.png`,
        });
        fs.writeFileSync(`/tmp/${event.requestContext.requestId}.typ`, await generator.toTypst());
        console.log('Generated typ file');

        execSync(`typst compile ${event.requestContext.requestId}.typ`, {
            cwd: '/tmp',
            stdio: 'inherit',
        });

        const base64body = fs
            .readFileSync(`/tmp/${event.requestContext.requestId}.pdf`)
            .toString('base64');
        return {
            headers: { 'Content-Type': 'application/pdf' },
            statusCode: 200,
            body: base64body,
            isBase64Encoded: true,
        };
    } catch (err) {
        return errToApiGatewayProxyResultV2(err);
    }
};
