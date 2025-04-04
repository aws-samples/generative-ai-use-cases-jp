import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { CreateMessagesRequest } from 'generative-ai-use-cases';
import { batchCreateMessages, findChatById } from './repository';
import sanitizeHtml from 'sanitize-html';

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    const req: CreateMessagesRequest = JSON.parse(event.body!);
    const userId: string =
      event.requestContext.authorizer!.claims['cognito:username'];
    const chatId = event.pathParameters!.chatId!;

    // Authorization check: Verify if the specified chat belongs to the user
    const chat = await findChatById(userId, chatId);
    if (chat === null) {
      return {
        statusCode: 403,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({
          message: 'You do not have permission to post messages in the chat.',
        }),
      };
    }

    if (req.messages) {
      for (const message of req.messages) {
        if (message.extraData && message.extraData.length > 0) {
          // Sanitize HTML content in extraData
          for (const extra of message.extraData) {
            if (extra.source.data.startsWith('javascript:')) {
              return {
                statusCode: 400,
                headers: {
                  'Content-Type': 'application/json',
                  'Access-Control-Allow-Origin': '*',
                },
                body: JSON.stringify({
                  message: 'Invalid extraData',
                }),
              };
            }

            extra.source.data = sanitizeHtml(extra.source.data, {
              allowedTags: [
                ...sanitizeHtml.defaults.allowedTags,
                'body',
                'html',
              ],
            });
          }
        }
      }
    }

    const messages = await batchCreateMessages(req.messages, userId, chatId);

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        messages,
      }),
    };
  } catch (error) {
    console.log(error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({ message: 'Internal Server Error' }),
    };
  }
};
