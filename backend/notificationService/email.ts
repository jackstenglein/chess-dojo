import { SESv2Client, SendEmailCommand } from '@aws-sdk/client-sesv2';
import * as fs from 'fs';

const ses = new SESv2Client({ region: 'us-east-1' });

/**
 * Sends the given email template, which must be located in the emailTemplates/
 * directory. The template must have a .subject, .minified.html and .txt file.
 * For example, if `template` was `foo/bar`, then the following files must exist:
 *   - emailTemplates/foo/bar.subject
 *   - emailTemplates/foo/bar.minified.html
 *   - emailTemplates/foo/bar.txt
 *
 * If not specified, the sender email address defaults to
 * `ChessDojo <notifications@chessdojo.club>`.
 * @param template The template to send.
 * @param templateData The data to insert into the template.
 * @param addresses The email addresses to send the email to.
 * @param sender The address the email will be sent from.
 */
export async function sendEmailTemplate(
    template: string,
    templateData: Record<string, string>,
    addresses: string[],
    sender = 'ChessDojo <notifications@chessdojo.club>',
) {
    const subject = readFile(`emailTemplates/${template}.subject`);
    const html = readFile(`emailTemplates/${template}.minified.html`);
    const text = readFile(`emailTemplates/${template}.txt`);

    await ses.send(
        new SendEmailCommand({
            Destination: {
                ToAddresses: addresses,
            },
            FromEmailAddress: sender,
            Content: {
                Template: {
                    TemplateData: JSON.stringify(templateData),
                    TemplateContent: {
                        Subject: subject,
                        Html: html,
                        Text: text,
                    },
                },
            },
        }),
    );
}

/**
 * Reads the file at the given relative path.
 * @param filePath The file to read.
 * @returns The entire file data as a string.
 */
function readFile(filePath: string): string {
    return fs.readFileSync(filePath, 'utf-8');
}
