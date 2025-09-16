import { Construct } from "constructs";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as athena from "aws-cdk-lib/aws-athena";
import { CfnOutput, RemovalPolicy, Stack } from "aws-cdk-lib";
import * as glue from "@aws-cdk/aws-glue-alpha";
import * as events from "aws-cdk-lib/aws-events";
import * as targets from "aws-cdk-lib/aws-events-targets";
import * as python from "@aws-cdk/aws-lambda-python-alpha";
import * as path from "path";
import { Runtime } from "aws-cdk-lib/aws-lambda";
import { aws_glue } from "aws-cdk-lib";
import { Database } from "./database";
import * as iam from "aws-cdk-lib/aws-iam";
import * as logs from "aws-cdk-lib/aws-logs";

export interface UsageAnalysisProps {
  envPrefix: string;
  sourceDatabase: Database;
  accessLogBucket?: s3.Bucket;
}

export class UsageAnalysis extends Construct {
  public readonly database: glue.IDatabase;
  public readonly ddbExportTable: glue.ITable;
  public readonly ddbBucket: s3.IBucket;
  public readonly resultOutputBucket: s3.IBucket;
  public readonly workgroupName: string;
  public readonly workgroupArn: string;
  constructor(scope: Construct, id: string, props: UsageAnalysisProps) {
    super(scope, id);

    const safeStackName = Stack.of(this)
      .stackName.toLowerCase()
      .replace("-", "_");

    const GLUE_DATABASE_NAME = `${safeStackName}_usage_analysis`;

    const sepUnderscore = props.envPrefix ? "_" : "";
    const DDB_EXPORT_TABLE_NAME = `${props.envPrefix}${sepUnderscore}ddb_export`;

    // Bucket to export DynamoDB data
    const ddbBucket = new s3.Bucket(this, "DdbBucket", {
      encryption: s3.BucketEncryption.S3_MANAGED,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      enforceSSL: true,
      removalPolicy: RemovalPolicy.DESTROY,
      objectOwnership: s3.ObjectOwnership.OBJECT_WRITER,
      autoDeleteObjects: true,
      serverAccessLogsBucket: props.accessLogBucket,
      serverAccessLogsPrefix: "DdbBucket",
    });

    // Bucket for Athena query results
    const queryResultBucket = new s3.Bucket(this, "QueryResultBucket", {
      encryption: s3.BucketEncryption.S3_MANAGED,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      enforceSSL: true,
      removalPolicy: RemovalPolicy.DESTROY,
      objectOwnership: s3.ObjectOwnership.OBJECT_WRITER,
      autoDeleteObjects: true,
      serverAccessLogsBucket: props.accessLogBucket,
      serverAccessLogsPrefix: "QueryResultBucket",
    });

    // Workgroup for Athena
    const wg = new athena.CfnWorkGroup(this, "Wg", {
      name: `${safeStackName}_wg`,
      description: "Workgroup for Athena",
      recursiveDeleteOption: true,
      workGroupConfiguration: {
        resultConfiguration: {
          outputLocation: `s3://${queryResultBucket.bucketName}`,
        },
      },
    });

    const database = new glue.Database(this, "Database", {
      databaseName: GLUE_DATABASE_NAME,
    });

    const imageSchemaType = glue.Schema.struct([
      {
        name: "CreateTime",
        type: glue.Schema.struct([{ name: "N", type: glue.Schema.STRING }]),
      },
      {
        name: "LastMessageId",
        type: glue.Schema.struct([{ name: "S", type: glue.Schema.STRING }]),
      },
      {
        name: "MessageMap",
        type: glue.Schema.struct([{ name: "S", type: glue.Schema.STRING }]),
      },
      {
        name: "IsLargeMessage",
        type: glue.Schema.struct([{ name: "BOOL", type: glue.Schema.BOOLEAN }]),
      },
      {
        name: "PK",
        type: glue.Schema.struct([{ name: "S", type: glue.Schema.STRING }]),
      },
      {
        name: "SK",
        type: glue.Schema.struct([{ name: "S", type: glue.Schema.STRING }]),
      },
      {
        name: "Title",
        type: glue.Schema.struct([{ name: "S", type: glue.Schema.STRING }]),
      },
      {
        name: "TotalPrice",
        type: glue.Schema.struct([
          { name: "N", type: glue.Schema.decimal(20, 10) },
        ]),
      },
      {
        name: "BotId",
        type: glue.Schema.struct([{ name: "S", type: glue.Schema.STRING }]),
      },
      {
        name: "Description",
        type: glue.Schema.struct([{ name: "S", type: glue.Schema.STRING }]),
      },
      {
        name: "Instruction",
        type: glue.Schema.struct([{ name: "S", type: glue.Schema.STRING }]),
      },
      {
        name: "PublicBotId",
        type: glue.Schema.struct([{ name: "S", type: glue.Schema.STRING }]),
      },
      {
        name: "IsStarred",
        type: glue.Schema.struct([{ name: "BOOL", type: glue.Schema.BOOLEAN }]),
      },
      {
        name: "Knowledge",
        type: glue.Schema.struct([
          {
            name: "M",
            type: glue.Schema.map(
              glue.Schema.STRING,
              glue.Schema.array(glue.Schema.STRING)
            ),
          },
        ]),
      },
      {
        name: "LastBotUsed",
        type: glue.Schema.struct([{ name: "N", type: glue.Schema.STRING }]),
      },
      {
        name: "LastExecId",
        type: glue.Schema.struct([{ name: "S", type: glue.Schema.STRING }]),
      },
      {
        name: "SyncStatus",
        type: glue.Schema.struct([{ name: "S", type: glue.Schema.STRING }]),
      },
      {
        name: "SyncStatusReason",
        type: glue.Schema.struct([{ name: "S", type: glue.Schema.STRING }]),
      },
      {
        name: "PublishedApiStackName",
        type: glue.Schema.struct([{ name: "S", type: glue.Schema.STRING }]),
      },
      {
        name: "PublishedApiDatetime",
        type: glue.Schema.struct([{ name: "S", type: glue.Schema.STRING }]),
      },
    ]);

    const ddbExportTable = new glue.S3Table(this, "DdbExportTable", {
      database,
      bucket: ddbBucket,
      tableName: DDB_EXPORT_TABLE_NAME,
      partitionKeys: [
        {
          name: "datehour",
          type: glue.Schema.STRING,
        },
      ],
      columns: [
        {
          name: "Metadata",
          type: glue.Schema.struct([
            {
              name: "WriteTimestampMicros",
              type: glue.Schema.struct([
                { name: "N", type: glue.Schema.STRING },
              ]),
            },
          ]),
        },
        {
          name: "Keys",
          type: glue.Schema.struct([
            {
              name: "PK",
              type: glue.Schema.struct([
                { name: "S", type: glue.Schema.STRING },
              ]),
            },
            {
              name: "SK",
              type: glue.Schema.struct([
                { name: "S", type: glue.Schema.STRING },
              ]),
            },
          ]),
        },
        {
          name: "OldImage",
          type: imageSchemaType,
        },
        {
          name: "NewImage",
          type: imageSchemaType,
        },
      ],
      dataFormat: glue.DataFormat.JSON,
    });
    // Add partition projection using escape hatch
    // Ref: https://docs.aws.amazon.com/cdk/v2/guide/cfn_layer.html
    const cfnDdbExportTable = ddbExportTable.node
      .defaultChild as aws_glue.CfnTable;
    cfnDdbExportTable.addPropertyOverride("TableInput.Parameters", {
      has_encrypted_data: false,
      "projection.enabled": true,
      "projection.datehour.type": "date",
      // NOTE: To account for timezones that are ahead of UTC, specify a far future date instead of `NOW` for the end of the range.
      "projection.datehour.range": "2023/01/01/00,2123/01/01/00",
      "projection.datehour.format": "yyyy/MM/dd/HH",
      "projection.datehour.interval": 1,
      "projection.datehour.interval.unit": "HOURS",
      "storage.location.template":
        `s3://${ddbBucket.bucketName}/` + "${datehour}/AWSDynamoDB/data/",
    });

    const exportHandler = new python.PythonFunction(this, "ExportHandler", {
      entry: path.join(__dirname, "../backend/s3_exporter/"),
      runtime: Runtime.PYTHON_3_13,
      environment: {
        BUCKET_NAME: ddbBucket.bucketName,
        TABLE_ARN: props.sourceDatabase.conversationTable.tableArn,
      },
      logRetention: logs.RetentionDays.THREE_MONTHS,
    });
    exportHandler.role?.addToPrincipalPolicy(
      new iam.PolicyStatement({
        actions: ["dynamodb:ExportTableToPointInTime"],
        resources: [props.sourceDatabase.conversationTable.tableArn],
      })
    );
    ddbBucket.grantReadWrite(exportHandler);

    new events.Rule(this, "ScheduleRule", {
      schedule: events.Schedule.cron({ minute: "5" }),
      targets: [new targets.LambdaFunction(exportHandler)],
    });

    new CfnOutput(this, "UsageAnalysisWorkgroup", {
      value: wg.name,
    });
    new CfnOutput(this, "UsageAnalysisOutputLocation", {
      value: `s3://${queryResultBucket.bucketName}`,
    });

    this.database = database;
    this.ddbBucket = ddbBucket;
    this.ddbExportTable = ddbExportTable;
    this.workgroupName = wg.name;
    this.resultOutputBucket = queryResultBucket;
    this.workgroupArn = `arn:aws:athena:*:${Stack.of(this).account}:workgroup/${
      wg.name
    }`;
  }
}
