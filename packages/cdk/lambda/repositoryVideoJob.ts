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
import { initBedrockClient } from './utils/bedrockApi';

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
  const item = {
    id: userId,
    createdDate: `${Date.now()}`,
    jobId,
    invocationArn,
    status: 'InProgress',
    output: `s3://${BUCKET_NAME}/${jobId}/output.mp4`,
    modelId: req.model?.modelId,
    prompt: req.params.textToVideoParams.text,
    durationSeconds: req.params.videoGenerationConfig.durationSeconds,
    fps: req.params.videoGenerationConfig.fps,
    dimension: req.params.videoGenerationConfig.dimension,
    seed: req.params.videoGenerationConfig.seed,
  };

  await dynamoDbDocument.send(
    new PutCommand({
      TableName: TABLE_NAME,
      Item: item,
    })
  );

  return item;
};

const checkAndUpdateJob = async (
  job: VideoJob
): Promise<'InProgress' | 'Completed' | 'Failed'> => {
  const client = await initBedrockClient();
  const command = new GetAsyncInvokeCommand({
    invocationArn: job.invocationArn,
  });

  const res = await client.send(command);

  if (res.status !== 'InProgress') {
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
