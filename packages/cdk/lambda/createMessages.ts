import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { CreateMessagesRequest, ExtraData } from 'generative-ai-use-cases';
import { batchCreateMessages, findChatById } from './repository';
import { getTenantId } from './utils/tenantUtils';
import {
  getTenantBucketNameByTenantId,
} from './utils/tenantS3Utils';

const FILE_UPLOAD_BUCKET_NAME = process.env.BUCKET_NAME!;

const isValidExtraData = (extra: ExtraData, bucketName: string): boolean => {
  return extra.source.data.startsWith(
    `https://${bucketName}.s3.${process.env.AWS_REGION}.amazonaws.com/`
  );
};

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    const req: CreateMessagesRequest = JSON.parse(event.body!);
    const userId: string =
      event.requestContext.authorizer!.claims['cognito:username'];
    const chatId = event.pathParameters!.chatId!;

    // Extract tenant ID to determine appropriate file upload bucket
    const tenantId = getTenantId(event);
    console.log(`Processing create messages request for tenant: ${tenantId}`);

    // Authorization check: Verify if the specified chat belongs to the user
    const chat = await findChatById(userId, chatId, event);
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

    // Get appropriate upload bucket for validation (tenant-specific or fallback)
    const uploadBucketName = await getTenantBucketNameByTenantId(
      tenantId,
      'chat',
      FILE_UPLOAD_BUCKET_NAME
    );
    console.log(
      `Using upload bucket for validation: ${uploadBucketName}`
    );

    if (req.messages) {
      for (const message of req.messages) {
        if (message.extraData && message.extraData.length > 0) {
          for (const extra of message.extraData) {
            if (!isValidExtraData(extra, uploadBucketName)) {
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
          }
        }
      }
    }

    const messages = await batchCreateMessages(
      req.messages,
      userId,
      chatId,
      event
    );

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
