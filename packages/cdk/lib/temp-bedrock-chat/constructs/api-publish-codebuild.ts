// import { Construct } from "constructs";
// import { RemovalPolicy } from "aws-cdk-lib";
// import * as codebuild from "aws-cdk-lib/aws-codebuild";
// import * as s3 from "aws-cdk-lib/aws-s3";
// import * as iam from "aws-cdk-lib/aws-iam";
// import * as logs from "aws-cdk-lib/aws-logs";
// import { NagSuppressions } from "cdk-nag";

// export interface ApiPublishCodebuildProps {
//   readonly envName: string;
//   readonly envPrefix: string;
//   readonly bedrockRegion: string;
//   readonly sourceBucket: s3.Bucket;
// }

// export class ApiPublishCodebuild extends Construct {
//   public readonly project: codebuild.Project;
//   constructor(scope: Construct, id: string, props: ApiPublishCodebuildProps) {
//     super(scope, id);
//     const sourceBucket = props.sourceBucket;

//     const logGroup = new logs.LogGroup(this, "LogGroup", {
//       retention: logs.RetentionDays.THREE_MONTHS,
//       removalPolicy: RemovalPolicy.DESTROY,
//     });
//     const project = new codebuild.Project(this, "Project", {
//       source: codebuild.Source.s3({
//         bucket: sourceBucket,
//         path: "",
//       }),
//       environment: {
//         buildImage: codebuild.LinuxBuildImage.STANDARD_7_0,
//         privileged: true,
//       },
//       environmentVariables: {
//         ENV_NAME: { value: props.envName },
//         ENV_PREFIX: { value: props.envPrefix },
//         BEDROCK_REGION: { value: props.bedrockRegion },
//       },
//       buildSpec: codebuild.BuildSpec.fromObject({
//         version: "0.2",
//         phases: {
//           install: {
//             "runtime-versions": {
//               nodejs: "18",
//             },
//             "on-failure": "ABORT",
//           },
//           build: {
//             commands: [
//               "cd cdk",
//               "npm ci",
//               // Replace cdk's entrypoint. This is a workaround to avoid the issue that cdk synthesize all stacks.
//               "sed -i 's|bin/bedrock-chat.ts|bin/api-publish.ts|' cdk.json",
//               "npx cdk deploy --require-approval never ApiPublishmentStack$PUBLISHED_API_ID",
//             ],
//           },
//         },
//       }),
//       logging: {
//         cloudWatch: {
//           enabled: true,
//           logGroup,
//         },
//       },
//     });
//     sourceBucket.grantRead(project.role!);

//     // Allow `cdk deploy`
//     project.role!.addToPrincipalPolicy(
//       new iam.PolicyStatement({
//         actions: ["sts:AssumeRole"],
//         resources: ["arn:aws:iam::*:role/cdk-*"],
//       })
//     );

//     NagSuppressions.addResourceSuppressions(project, [
//       {
//         id: "AwsPrototyping-CodeBuildProjectKMSEncryptedArtifacts",
//         reason:
//           "default: The AWS-managed CMK for Amazon Simple Storage Service (Amazon S3) is used.",
//       },
//       {
//         id: "AwsPrototyping-CodeBuildProjectPrivilegedModeDisabled",
//         reason: "for runnning on the docker daemon on the docker container",
//       },
//     ]);

//     this.project = project;
//   }
// }
