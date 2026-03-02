import { SendEmailCommand, SESv2Client } from '@aws-sdk/client-sesv2';
import csvParser from 'csv-parser';
import { createReadStream, readFileSync, writeFileSync } from 'fs';
import { parse } from 'ts-command-line-args';
import { DigestData, getDigestData } from './getDigestData';
import { HEATMAP_STYLE_MINIFIED } from './heatmapStyle';

const ses = new SESv2Client({ region: 'us-east-1' });

interface Arguments {
    /** The path to the main email HTML file. */
    emailPath: string;
    /** The path to the email HTML file which includes a month summary. */
    summaryEmailPath: string;
    /** The subject of the email. */
    subject: string;
    /** The paths to the subscribers CSV file. */
    subscribersPath: string[];
    /** The path to the unsubscribers CSV file. */
    unsubscribersPath: string;
    /** The year of the email. */
    year: number;
    /** The month of the email. */
    month: number;
    /** Whether to print the usage guide. */
    help?: boolean;
}

const args = parse<Arguments>(
    {
        emailPath: { type: String, description: 'The path to the main email HTML file.' },
        summaryEmailPath: {
            type: String,
            description: 'The path to the email HTML file which includes a month summary.',
        },
        subject: { type: String, description: 'The subject of the email.' },
        subscribersPath: {
            type: String,
            description: 'The path(s) to the subscribers CSV file.',
            multiple: true,
        },
        unsubscribersPath: { type: String, description: 'The path to the unsubscribers CSV file.' },
        year: { type: Number, description: 'The year of the email' },
        month: { type: Number, description: 'The month of the email (1-indexed).' },
        help: {
            type: Boolean,
            optional: true,
            alias: 'h',
            description: 'Prints this usage guide.',
        },
    },
    { helpArg: 'help' },
);

async function main() {
    if (
        !args.emailPath ||
        !args.summaryEmailPath ||
        !args.subject ||
        !args.subscribersPath.length ||
        !args.unsubscribersPath ||
        !args.month
    ) {
        throw new Error(`Not all required parameters passed. To view the help guide pass -h`);
    }

    const subscribers = await getSubscribers(args);
    console.log(`Sending to ${subscribers.length} subscribers`);

    const basicHtml = readFileSync(args.emailPath, 'utf8');
    if (!basicHtml) {
        throw new Error(`Failed to read email HTML file (or it is empty): ${args.emailPath}`);
    }

    let summaryHtml = readFileSync(args.summaryEmailPath, 'utf8');
    if (!summaryHtml) {
        throw new Error(
            `Failed to read summary email HTML file (or it is empty): ${args.summaryEmailPath}`,
        );
    }
    summaryHtml = summaryHtml.replace('</style>', HEATMAP_STYLE_MINIFIED + '</style>');

    let total = 0;
    let failed = 0;
    let basicSuccess = 0;
    let summarySuccess = 0;
    for (const subscriber of subscribers) {
        total++;
        try {
            let data: DigestData | undefined = undefined;
            try {
                data = await getDigestData(args.year, args.month, subscriber.username);
            } catch (err) {
                console.error(`Failed to get digest data for ${subscriber.username}: `, err);
            }

            if (!data?.time || !data.heatmapHtml) {
                // Send basic email
                await sendEmail(subscriber.email, basicHtml, args.subject);
                basicSuccess++;
            } else {
                // Send email with previous month summary
                await sendSummaryEmail(subscriber.email, summaryHtml, args.subject, data);
                summarySuccess++;
            }
        } catch (err) {
            console.error(`Failed to send email to ${subscriber.email}: `, err);
            failed++;
        }

        if (total % 1000 === 0) {
            console.log(
                `In progress with ${basicSuccess} basic successes, ${summarySuccess} summary successes, and ${failed} failures.`,
            );
        }
    }

    console.log(
        `Finished with ${basicSuccess} basic successes, ${summarySuccess} summary successes, and ${failed} failures.`,
    );
}

interface Unsubscriber {
    Email: string;
}

interface Subscriber {
    username?: string;
    email: string;
}

/**
 * Returns the list of subscribers to the Dojo digest. Any emails which are included in the
 * unsubscriber CSV will be skipped. Duplicate emails will be removed, keeping whichever instance
 * was first.
 * @param args The arguments to the script.
 * @returns A list of subscribers.
 */
async function getSubscribers(args: Arguments): Promise<Subscriber[]> {
    const unsubscribers: Set<string> = await new Promise((resolve, reject) => {
        const unsubscribers = new Set<string>();
        createReadStream(args.unsubscribersPath)
            .pipe(csvParser())
            .on('data', (row: Unsubscriber) => {
                unsubscribers.add(row.Email);
            })
            .on('end', () => resolve(unsubscribers))
            .on('error', reject);
    });
    console.log(`Will skip ${unsubscribers.size} unsubscribed users`);

    const subscribers: Subscriber[] = [];
    const subscriberSet = new Set<string>();
    for (const subscribersPath of args.subscribersPath) {
        await new Promise((resolve, reject) => {
            createReadStream(subscribersPath)
                .pipe(csvParser())
                .on('data', (row: Subscriber) => {
                    if (!unsubscribers.has(row.email) && !subscriberSet.has(row.email)) {
                        subscribers.push(row);
                        subscriberSet.add(row.email);
                    }
                })
                .on('end', resolve)
                .on('error', reject);
        });
    }
    return subscribers;
}

async function sendSummaryEmail(address: string, html: string, subject: string, data: DigestData) {
    const finalHtml = html
        .replace('{{time}}', data.time)
        .replace('{{games}}', `${data.games}`)
        .replace('{{heatmap_html}}', data.heatmapHtml);
    writeFileSync('email.html', finalHtml);
    return sendEmail(address, finalHtml, subject);
}

async function sendEmail(address: string, html: string, subject: string) {
    return ses.send(
        new SendEmailCommand({
            Destination: {
                ToAddresses: [address],
            },
            FromEmailAddress: 'ChessDojo Digest <digest@mail.chessdojo.club>',
            Content: {
                Simple: {
                    Subject: { Data: subject },
                    Body: { Html: { Data: html } },
                    Headers: [
                        {
                            Name: 'List-Unsubscribe-Post',
                            Value: 'List-Unsubscribe=One-Click',
                        },
                        {
                            Name: 'List-Unsubscribe',
                            Value: `<https://g4shdaq6ug.execute-api.us-east-1.amazonaws.com/public/dojodigest/unsubscribe?email=${address}>`,
                        },
                    ],
                },
            },
        }),
    );
}

main();
