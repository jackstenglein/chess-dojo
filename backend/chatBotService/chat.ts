import { ChatRequestSchema, ChatResponse } from '@jackstenglein/chess-dojo-common/src/chatBot/api';
import { APIGatewayProxyHandlerV2 } from 'aws-lambda';
import axios from 'axios';
import { Filter } from 'bad-words';
import { errToApiGatewayProxyResultV2, parseEvent, success } from '../directoryService/api';

/**
 * Handles requests to send a message to agent.
 * @param event The API gateway event that triggered the request.
 * @returns The agent's message.
 */
export const handler: APIGatewayProxyHandlerV2 = async (event) => {
    try {
        const request = parseEvent(event, ChatRequestSchema);
        const agentResponse = await sendMessage(
            request.message,
            request.threadId,
            request.resourceId,
        );
        return success(agentResponse);
    } catch (err) {
        return errToApiGatewayProxyResultV2(err);
    }
};

/**
 * Sends a message to the agent.
 * @param message The message content.
 * @param threadId The message thread.
 * @param resourceId The user's ID the thread and message belong to.
 * @returns The agent's response.
 */
async function sendMessage(
    message: string,
    threadId: string,
    resourceId: string,
): Promise<ChatResponse> {
    const chatEndpoint = `${process.env.endpoint}/api/agents/${process.env.agent}/generate`;
    const cleaned = cleanedMessage(message);
    const response = await axios.post(chatEndpoint, {
        messages: [cleaned],
        threadId,
        resourceId,
    });
    return { text: response.data.text };
}

/**
 * Removes bad words from a message.
 * @param message The user's message.
 * @returns The cleaned message.
 */
function cleanedMessage(message: string): string {
    const customFilter = new Filter({ placeHolder: '' });
    return customFilter.clean(message);
}
