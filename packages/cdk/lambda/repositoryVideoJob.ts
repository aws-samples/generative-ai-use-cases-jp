import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  PutCommand,
  QueryCommand,
  UpdateCommand,
  DeleteCommand,
} from '@aws-sdk/lib-dynamodb';
import {
  VideoJob,
  ListVideoJobsResponse,
  GenerateVideoRequest,
} from 'generative-ai-use-cases-jp';
import { GetAsyncInvokeCommand } from '@aws-sdk/client-bedrock-runtime';
import {
  S3Client,
  GetObjectCommand,
  PutObjectCommand,
  DeleteObjectsCommand,
  ListObjectsV2Command,
} from '@aws-sdk/client-s3';
import { initBedrockClient } from './utils/bedrockApi';
import { Readable } from 'stream';

const BUCKET_NAME: string = process.env.BUCKET_NAME!;
const TABLE_NAME: string = process.env.TABLE_NAME!;
const dynamoDb = new DynamoDBClient({});
const dynamoDbDocument = DynamoDBDocumentClient.from(dynamoDb);

export const createJob = async (
  _userId: string,
  invocationArn: string,
  req: GenerateVideoRequest
) => {
  const userId = `videoJob#${_userId}`;
  const jobId = invocationArn.split('/').slice(-1)[0];

  const params = req.params;

  // Nova Reel の 1 フレーム目画像指定が params に含まれていたら、その情報は ddb に保存しない
  if (params.images && params.images.length > 0) {
    params.images = [];
  }

  const item = {
    id: userId,
    createdDate: `${Date.now()}`,
    jobId,
    invocationArn,
    status: 'InProgress',
    output: `s3://${BUCKET_NAME}/${jobId}/output.mp4`,
    modelId: req.model!.modelId,
    region: req.model!.region,
    ...params,
  };

  await dynamoDbDocument.send(
    new PutCommand({
      TableName: TABLE_NAME,
      Item: item,
    })
  );

  return item;
};

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

const checkAndUpdateJob = async (
  job: VideoJob
): Promise<'InProgress' | 'Completed' | 'Failed'> => {
  const client = await initBedrockClient(job.region);
  const command = new GetAsyncInvokeCommand({
    invocationArn: job.invocationArn,
  });

  const res = await client.send(command);

  if (res.status !== 'InProgress') {
    const jobId = job.jobId;
    const dstBucket = BUCKET_NAME;
    const dstRegion = process.env.AWS_DEFAULT_REGION!;
    const srcRegion = job.region;
    const videoBucketRegionMap = JSON.parse(
      process.env.VIDEO_BUCKET_REGION_MAP ?? '{}'
    );
    const srcBucket = videoBucketRegionMap[srcRegion];

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
        id: job.id,
        createdDate: job.createdDate,
      },
      UpdateExpression: 'set #status = :status',
      ExpressionAttributeNames: {
        '#status': 'status',
      },
      ExpressionAttributeValues: {
        ':status': res.status,
      },
    });

    await dynamoDbDocument.send(updateCommand);
  }

  return res.status!;
};

export const listVideoJobs = async (
  _userId: string,
  _exclusiveStartKey?: string
): Promise<ListVideoJobsResponse> => {
  const exclusiveStartKey = _exclusiveStartKey
    ? JSON.parse(Buffer.from(_exclusiveStartKey, 'base64').toString())
    : undefined;

  const userId = `videoJob#${_userId}`;
  const res = await dynamoDbDocument.send(
    new QueryCommand({
      TableName: TABLE_NAME,
      KeyConditionExpression: '#id = :id',
      ExpressionAttributeNames: {
        '#id': 'id',
      },
      ExpressionAttributeValues: {
        ':id': userId,
      },
      ScanIndexForward: false,
      Limit: 10,
      ExclusiveStartKey: exclusiveStartKey,
    })
  );

  const jobs = res.Items as VideoJob[];

  // InProgress のものは最新のステータスを確認
  for (const job of jobs) {
    if (job.status === 'InProgress') {
      const newStatus = await checkAndUpdateJob(job);
      job.status = newStatus;
    }
  }

  return {
    data: jobs,
    lastEvaluatedKey: res.LastEvaluatedKey
      ? Buffer.from(JSON.stringify(res.LastEvaluatedKey)).toString('base64')
      : undefined,
  };
};

export const deleteVideoJob = async (
  _userId: string,
  createdDate: string
): Promise<void> => {
  const userId = `videoJob#${_userId}`;

  await dynamoDbDocument.send(
    new DeleteCommand({
      TableName: TABLE_NAME,
      Key: {
        id: userId,
        createdDate,
      },
    })
  );
};
