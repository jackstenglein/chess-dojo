'use strict';

import { SendMessageCommand, SQSClient } from '@aws-sdk/client-sqs';
import { Blog } from '@jackstenglein/chess-dojo-common/src/blog/api';
import { NotificationEventTypes } from '@jackstenglein/chess-dojo-common/src/database/notification';

const sqs = new SQSClient({ region: 'us-east-1' });

/**
 * Sends a BLOG_PUBLISHED notification event to SQS.
 * @param blog The blog that was published.
 */
export async function sendBlogPublishedEvent(blog: Blog): Promise<void> {
    await sqs.send(
        new SendMessageCommand({
            QueueUrl: process.env.notificationEventSqsUrl,
            MessageBody: JSON.stringify({
                type: NotificationEventTypes.BLOG_PUBLISHED,
                blogId: blog.id,
                title: blog.title,
                subtitle: blog.subtitle,
                description: blog.description,
                coverImage: blog.coverImage,
            }),
        }),
    );
}
