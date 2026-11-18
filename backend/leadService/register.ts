import { PutItemCommand } from '@aws-sdk/client-dynamodb';
import { marshall } from '@aws-sdk/util-dynamodb';
import {
    LeadType,
    RegisterLeadRequest,
    registerLeadRequestSchema,
} from '@jackstenglein/chess-dojo-common/src/lead/api';
import { WC_LOCK_AT_UTC } from '@jackstenglein/chess-dojo-common/src/lead/worldChampionship';
import { APIGatewayProxyHandlerV2 } from 'aws-lambda';
import { LiveClassLeadId } from '../../common/src/lead/api';
import {
    ApiError,
    errToApiGatewayProxyResultV2,
    parseEvent,
    success,
} from '../directoryService/api';
import { dynamo } from '../directoryService/database';
import { sendEmailTemplate } from '../notificationService/email';
import { wcConfirmationData } from './wcPrediction';

const leadTable = `${process.env.stage}-leads`;

/**
 * Registers a new lead. An initial email is sent and the lead is added to the lead table
 * for follow-up emails.
 */
export const handler: APIGatewayProxyHandlerV2 = async (event) => {
    try {
        console.log('Event: ', event);
        const request = parseEvent(event, registerLeadRequestSchema);
        switch (request.type) {
            case LeadType.enum.LIVE_CLASS:
                return await handleLiveClassLead(request);

            case LeadType.enum.WC_PREDICTION:
                return await handleWcPrediction(request);

            case LeadType.enum.WC_RESULTS:
                return await handleWcResultsSignup(request);

            default:
                throw new ApiError({
                    statusCode: 400,
                    publicMessage: `Unhandled lead type ${request.type}`,
                });
        }
    } catch (err) {
        return errToApiGatewayProxyResultV2(err);
    }
};

const liveClassSchedule = [
    {
        days: 2,
        template: 'n2-three-a-week',
    },
    {
        days: 4,
        template: 'n3-member-results',
    },
    {
        days: 6,
        template: 'n4-game-review',
    },
    {
        days: 8,
        template: 'n5-your-week',
    },
    {
        days: 10,
        template: 'n6-plans',
    },
];

const liveClassNames: Record<LiveClassLeadId, string> = {
    [LiveClassLeadId.enum.LOGICAL_CHESS]: 'Logical Chess Move by Move',
    [LiveClassLeadId.enum.CALCULATION]: 'Calculation 1000+',
    [LiveClassLeadId.enum.GAME_REVIEW]: 'Sensei Review',
};

/**
 * Sends the initial live class lead email, and inserts the necessary DynamoDB
 * records with a TTL to trigger follow-up emails.
 * @param request The request to register a lead.
 */
async function handleLiveClassLead(request: RegisterLeadRequest) {
    const { email, classId, attribution } = request;

    if (!classId) {
        throw new ApiError({
            statusCode: 400,
            publicMessage: `Invalid ${LeadType.enum.LIVE_CLASS} lead: no classId set`,
        });
    }

    const className = liveClassNames[classId];
    await dynamo.send(
        new PutItemCommand({
            TableName: leadTable,
            Item: marshall(
                {
                    hash: 'SUBMITTED_LEAD',
                    range: email,
                    leadType: LeadType.enum.LIVE_CLASS,
                    createdAt: new Date().toISOString(),
                    classId,
                    className,
                    attribution,
                },
                { removeUndefinedValues: true },
            ),
        }),
    );

    await sendEmailTemplate(
        'classLead/n1-class-link',
        { className, classId },
        [email],
        'ChessDojo <chessdojo@chessdojo.club>',
    );

    for (const item of liveClassSchedule) {
        const ttl = new Date();
        ttl.setDate(ttl.getDate() + item.days);

        await dynamo.send(
            new PutItemCommand({
                TableName: leadTable,
                Item: marshall(
                    {
                        hash: email,
                        range: `${LeadType.enum.LIVE_CLASS}|${item.template}`,
                        ttl: ttl.valueOf() / 1000,
                        leadType: LeadType.enum.LIVE_CLASS,
                        template: item.template,
                        createdAt: new Date().toISOString(),
                        classId,
                        className,
                        attribution,
                    },
                    { removeUndefinedValues: true },
                ),
            }),
        );
    }

    return success(null);
}

/**
 * Saves a World Championship prediction and emails the visitor a copy of their
 * picks. The record is keyed by email, so entering again replaces the earlier
 * picks. Predictions are refused once Game 1 has started, whatever the
 * visitor's own clock says.
 * @param request The request to register a lead.
 */
async function handleWcPrediction(request: RegisterLeadRequest) {
    const { picks, displayName, attribution } = request;

    if (!picks) {
        throw new ApiError({
            statusCode: 400,
            publicMessage: `Invalid ${LeadType.enum.WC_PREDICTION} lead: no picks set`,
        });
    }
    if (Date.now() >= Date.parse(WC_LOCK_AT_UTC)) {
        throw new ApiError({
            statusCode: 409,
            publicMessage: 'Predictions closed when Game 1 started',
        });
    }

    await dynamo.send(
        new PutItemCommand({
            TableName: leadTable,
            Item: marshall(
                {
                    hash: LeadType.enum.WC_PREDICTION,
                    range: request.email.toLowerCase(),
                    leadType: LeadType.enum.WC_PREDICTION,
                    createdAt: new Date().toISOString(),
                    email: request.email,
                    displayName: displayName || undefined,
                    ...picks,
                    attribution,
                },
                { removeUndefinedValues: true },
            ),
        }),
    );

    try {
        await sendEmailTemplate(
            'wcPrediction/confirmation',
            wcConfirmationData(picks),
            [request.email],
            'ChessDojo <chessdojo@chessdojo.club>',
        );
    } catch (err) {
        // The picks are saved, so a failed email must not tell the visitor to enter again.
        console.error('Failed to send World Championship confirmation email: ', err);
    }

    return success(null);
}

/**
 * Saves the email of a visitor who arrived after predictions locked and asked
 * for the results.
 * @param request The request to register a lead.
 */
async function handleWcResultsSignup(request: RegisterLeadRequest) {
    await dynamo.send(
        new PutItemCommand({
            TableName: leadTable,
            Item: marshall(
                {
                    hash: LeadType.enum.WC_RESULTS,
                    range: request.email.toLowerCase(),
                    leadType: LeadType.enum.WC_RESULTS,
                    createdAt: new Date().toISOString(),
                    email: request.email,
                    attribution: request.attribution,
                },
                { removeUndefinedValues: true },
            ),
        }),
    );

    return success(null);
}
