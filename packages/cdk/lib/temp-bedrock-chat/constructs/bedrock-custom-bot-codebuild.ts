import { Construct } from "constructs";
import * as codebuild from "aws-cdk-lib/aws-codebuild";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as iam from "aws-cdk-lib/aws-iam";

export interface BedrockCustomBotCodebuildProps {
  readonly envName: string;
  readonly envPrefix: string;
  readonly bedrockRegion: string;
  readonly sourceBucket: s3.Bucket;
}

export class BedrockCustomBotCodebuild extends Construct {
  public readonly project: codebuild.Project;
  constructor(
    scope: Construct,
    id: string,
    props: BedrockCustomBotCodebuildProps
  ) {
    super(scope, id);

    const sourceBucket = props.sourceBucket;
    const project = new codebuild.Project(this, "Project", {
      source: codebuild.Source.s3({
        bucket: sourceBucket,
        path: "",
      }),
      environment: {
        buildImage: codebuild.LinuxBuildImage.STANDARD_7_0,
        privileged: true,
      },
      environmentVariables: {
        ENV_NAME: { value: props.envName },
        ENV_PREFIX: { value: props.envPrefix },
        BEDROCK_REGION: { value: props.bedrockRegion },
      },
      buildSpec: codebuild.BuildSpec.fromObject({
        version: "0.2",
        phases: {
          install: {
            "runtime-versions": {
              nodejs: "18",
            },
            "on-failure": "ABORT",
          },
          build: {
            commands: [
              "cd cdk",
              "npm ci",
              // Extract BOT_ID from SK. Note that SK is given like BOT#<bot-id>
              `export BOT_ID=$(echo $SK | awk -F'#' '{print $2}')`,
              // Replace cdk's entrypoint. This is a workaround to avoid the issue that cdk synthesize all stacks.
              "sed -i 's|bin/bedrock-chat.ts|bin/bedrock-custom-bot.ts|' cdk.json",
              `npx cdk deploy --require-approval never BrChatKbStack$BOT_ID`,
            ],
          },
        },
      }),
    });
    sourceBucket.grantRead(project.role!);

    // Allow `cdk deploy`
    project.role!.addToPrincipalPolicy(
      new iam.PolicyStatement({
        actions: ["sts:AssumeRole"],
        resources: ["arn:aws:iam::*:role/cdk-*"],
      })
    );

    this.project = project;
  }
}