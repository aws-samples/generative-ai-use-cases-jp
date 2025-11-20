import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { CreateMessagesRequest, ExtraData } from 'generative-ai-use-cases';
import { batchCreateMessages, findChatById } from './repository';
import { getTenantId, getUsername } from './utils/tenantUtils';
import {
  getTenantBucketNameByTenantId,
  extractAccountIdFromRoleArn,
} from './utils/tenantS3Utils';
import { getTenant } from './tenantManager';
import {
  badRequest400Response,
  internalServerError500Response,
  notFound404Response,
  ok200Response,
} from './utils/apiResponse';

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
    const userId = getUsername(event);
    const chatId = event.pathParameters!.chatId!;

    // Extract tenant ID to determine appropriate file upload bucket
    const tenantId = getTenantId(event);
    console.log(`Processing create messages request for tenant: ${tenantId}`);

    // Authorization check: Verify if the specified chat belongs to the user
    const chat = await findChatById(userId, chatId, event);
    if (chat === null) {
      return notFound404Response({
        message: 'Chat not found',
      });
    }

    // Get tenant information for bucket name generation
    const tenant = await getTenant(tenantId);
    const tenantAccountId = tenant?.roleArn
      ? extractAccountIdFromRoleArn(tenant.roleArn)
      : undefined;
    const tenantRegion = tenant?.region || process.env.AWS_REGION!;
    const tenantEnvironment = tenant?.environment || process.env.ENVIRONMENT!;

    // Get appropriate upload bucket for validation (tenant-specific or fallback)
    const uploadBucketName = await getTenantBucketNameByTenantId(
      tenantId,
      'chat',
      FILE_UPLOAD_BUCKET_NAME,
      tenantAccountId || process.env.AWS_ACCOUNT_ID!,
      tenantRegion,
      tenantEnvironment
    );
    console.log(`Using upload bucket for validation: ${uploadBucketName}`);

    if (req.messages) {
      for (const message of req.messages) {
        if (message.extraData && message.extraData.length > 0) {
          for (const extra of message.extraData) {
            if (!isValidExtraData(extra, uploadBucketName)) {
              return badRequest400Response({
                message: 'Invalid extraData',
              });
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

    return ok200Response({
      messages,
    });
  } catch (error) {
    console.log(error);
    return internalServerError500Response({ message: 'Internal Server Error' });
  }
};
