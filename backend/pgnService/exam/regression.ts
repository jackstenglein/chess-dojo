import {
    AttributeValue,
    BatchExecuteStatementCommand,
    BatchStatementRequest,
    DynamoDBClient,
} from '@aws-sdk/client-dynamodb';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';
import { Exam, isValidExamType } from '@jackstenglein/chess-dojo-common/src/database/exam';
import { UserExamSummary } from '@jackstenglein/chess-dojo-common/src/database/user';
import { getRegression, predictExamRating } from '@jackstenglein/chess-dojo-common/src/exam/scores';
import { DynamoDBRecord, DynamoDBStreamHandler } from 'aws-lambda';

const dynamo = new DynamoDBClient({ region: 'us-east-1' });
const userTable = process.env.stage + '-users';

interface UserExamSummaryUpdate {
    username: string;
    summary: UserExamSummary;
}

export const handler: DynamoDBStreamHandler = async (event) => {
    const promises = event.Records.map((r) => processRecord(r));
    await Promise.all(promises);
};

/**
 * Processes an update to a single DynamoDBRecord. If the record is not a MODIFY event on
 * an Exam object, then this function is a no-op. Otherwise, it recalculates the regression
 * for the exam and updates the corresponding UserExamSummary objects.
 * @param record The record to process
 * @returns A Promise that resolves after processing is complete.
 */
async function processRecord(record: DynamoDBRecord) {
    if (record.eventName !== 'MODIFY') {
        return;
    }

    const exam = unmarshall(record.dynamodb?.NewImage as Record<string, AttributeValue>) as Exam;

    if (!isValidExamType(exam.type)) {
        return;
    }
    console.log('Record: %j', record);

    const regression = getRegression(exam);
    if (!regression) {
        console.log('Not enough data for regression');
        return;
    }
    console.log('Regression: ', regression);

    const updates: UserExamSummaryUpdate[] = [];
    for (const [username, answer] of Object.entries(exam.answers)) {
        updates.push({
            username,
            summary: {
                examType: exam.type,
                cohortRange: exam.cohortRange,
                createdAt: answer.createdAt,
                rating: predictExamRating(regression, answer.score),
            },
        });
    }
    console.log('Updating %d users', updates.length);

    try {
        await updateUserExamRatings(exam.id, updates);
    } catch (err) {
        console.error('ERROR: Failed to update user summaries: ', err);
    }
}

/**
 * Applies the given UserExamSummaryUpdate objects for the given exam ID to the
 * user table.
 * @param examId The ID of the exam.
 * @param updates The updates to apply.
 */
async function updateUserExamRatings(examId: string, updates: UserExamSummaryUpdate[]) {
    for (let i = 0; i < updates.length; i += 25) {
        const statements: BatchStatementRequest[] = [];

        for (let j = i; j < updates.length && j < i + 25; j++) {
            const update = updates[j];
            const params = marshall([update.summary, update.username]);

            statements.push({
                Statement: `UPDATE "${userTable}" SET exams."${examId}"=? WHERE username=?`,
                Parameters: params as unknown as AttributeValue[],
            });
        }

        console.log('Sending BatchExecuteStatements: ', statements);
        const input = new BatchExecuteStatementCommand({ Statements: statements });
        const result = await dynamo.send(input);
        console.log('BatchExecuteResult: %j', result);
    }
}
