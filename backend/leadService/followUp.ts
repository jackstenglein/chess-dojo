import { AttributeValue } from '@aws-sdk/client-dynamodb';
import { unmarshall } from '@aws-sdk/util-dynamodb';
import { LeadType } from '@jackstenglein/chess-dojo-common/src/lead/api';
import { DynamoDBRecord, DynamoDBStreamHandler } from 'aws-lambda';
import { sendEmailTemplate } from '../notificationService/email';

/**
 * Handles sending follow-up lead emails as their DynamoDB records
 * are deleted via their TTL.
 * @param event The event that triggered the stream handler.
 */
export const handler: DynamoDBStreamHandler = async (event) => {
    console.log('Event: %j', event);

    for (const record of event.Records) {
        try {
            await processRecord(record);
        } catch (err) {
            console.error('Failed to process record %j: ', record, err);
        }
    }
};

/**
 * Handles sending an email for a specific follow-up record that
 * was just deleted via TTL.
 * @param record The deleted record.
 */
async function processRecord(record: DynamoDBRecord) {
    if (record.eventName !== 'REMOVE') {
        console.debug(
            `Skipping record with invalid eventName "${record.eventName}" (expected "REMOVE"): %j`,
            record,
        );
        return;
    }
    if (!record.dynamodb?.OldImage) {
        console.debug(`Skipping record as it has no OldImage: %j`, record);
        return;
    }

    const lead = unmarshall(record.dynamodb.OldImage as Record<string, AttributeValue>);
    if (!lead.hash) {
        throw new Error(`lead hash is empty`);
    }
    if (lead.leadType !== LeadType.enum.LIVE_CLASS) {
        throw new Error(`lead has unrecognized leadType: ${lead.leadType}`);
    }
    if (!lead.template) {
        throw new Error(`lead has no template field`);
    }

    await sendEmailTemplate(
        `classLead/${lead.template}`,
        lead,
        [lead.hash],
        'ChessDojo <chessdojo@chessdojo.club>',
    );
}
