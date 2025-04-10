import {
  S3Client,
  GetObjectCommand,
  PutObjectCommand,
  DeleteObjectsCommand,
  ListObjectsV2Command,
} from '@aws-sdk/client-s3';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { Readable } from 'stream';

export interface CopyVideoJobParams {
  id: string;
  createdDate: string;
  jobId: string;
  srcBucket: string;
  srcRegion: string;
}

const BUCKET_NAME: string = process.env.BUCKET_NAME!;
const TABLE_NAME: string = process.env.TABLE_NAME!;
const dynamoDb = new DynamoDBClient({});
const dynamoDbDocument = DynamoDBDocumentClient.from(dynamoDb);

const copyAndDeleteObject = async (
  jobId: string,
  srcBucket: string,
  srcRegion: string,
  dstBucket: string,
  dstRegion: string
) => {
  const srcS3 = new S3Client({ region: srcRegion });
  const dstS3 = new S3Client({ region: dstRegion });

  const { Body, ContentType, ContentLength } = await srcS3.send(
    new GetObjectCommand({
      Bucket: srcBucket,
      Key: `${jobId}/output.mp4`,
    })
  );

  const chunks = [];
  for await (const chunk of Body as Readable) {
    chunks.push(chunk);
  }
  const fileBuffer = Buffer.concat(chunks);

  await dstS3.send(
    new PutObjectCommand({
      Bucket: dstBucket,
      Key: `${jobId}/output.mp4`,
      Body: fileBuffer,
      ContentType,
      ContentLength,
    })
  );

  const listRes = await srcS3.send(
    new ListObjectsV2Command({
      Bucket: srcBucket,
      Prefix: jobId,
    })
  );

  const objects = listRes.Contents?.map((object) => ({
    Key: object.Key,
  }));

  await srcS3.send(
    new DeleteObjectsCommand({
      Bucket: srcBucket,
      Delete: {
        Objects: objects,
      },
    })
  );
};

export const handler = async (event: CopyVideoJobParams): Promise<void> => {
  console.log(event); // TODO: remove

  const id = event.id;
  const createdDate = event.createdDate;
  const jobId = event.jobId;
  const dstBucket = BUCKET_NAME;
  const dstRegion = process.env.AWS_DEFAULT_REGION!;
  const srcBucket = event.srcBucket;
  const srcRegion = event.srcRegion;

  try {
    await copyAndDeleteObject(
      jobId,
      srcBucket,
      srcRegion,
      dstBucket,
      dstRegion
    );

    const updateCommand = new UpdateCommand({
      TableName: TABLE_NAME,
      Key: {
        id,
        createdDate,
      },
      UpdateExpression: 'set #status = :status',
      ExpressionAttributeNames: {
        '#status': 'status',
      },
      ExpressionAttributeValues: {
        ':status': 'Completed',
      },
    });

    await dynamoDbDocument.send(updateCommand);
  } catch (error) {
    console.error(error);

    const updateCommand = new UpdateCommand({
      TableName: TABLE_NAME,
      Key: {
        id,
        createdDate,
      },
      UpdateExpression: 'set #status = :status',
      ExpressionAttributeNames: {
        '#status': 'status',
      },
      ExpressionAttributeValues: {
        ':status': 'Failed',
      },
    });

    await dynamoDbDocument.send(updateCommand);
  }
};
