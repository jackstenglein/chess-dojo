import {
    GetChatHistoryRequestSchema,
    GetChatHistoryResponse,
} from '@jackstenglein/chess-dojo-common/src/chatBot/api';
import { APIGatewayProxyHandlerV2 } from 'aws-lambda';
import axios from 'axios';
import { errToApiGatewayProxyResultV2, parseEvent, success } from '../directoryService/api';

/**
 * Handles requests to get the message history.
 * @param event The API gateway event that triggered the request.
 * @returns The message history.
 */
export const handler: APIGatewayProxyHandlerV2 = async (event) => {
    try {
        const request = parseEvent(event, GetChatHistoryRequestSchema);
        const history = await getChatHistory(request.threadId);
        return success(history);
    } catch (err) {
        return errToApiGatewayProxyResultV2(err);
    }
};

/**
 * Gets the chat history for given thread.
 * @param threadId The ID of the thread to get.
 * @returns The list of messages.
 */
async function getChatHistory(threadId: string): Promise<GetChatHistoryResponse> {
    const historyEndpoint = `${process.env.endpoint}/api/memory/threads/${threadId}/messages`;
    const historyResponse = await axios.get(historyEndpoint, {
        params: { agentId: process.env.agent },
    });
    return { messages: historyResponse.data.uiMessages };
}
