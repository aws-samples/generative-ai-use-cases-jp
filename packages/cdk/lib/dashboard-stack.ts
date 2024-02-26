import { Stack, StackProps, CfnOutput, Duration } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as cw from 'aws-cdk-lib/aws-cloudwatch';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as cognito from 'aws-cdk-lib/aws-cognito';

export interface DashboardStackProps extends StackProps {
  userPool: cognito.UserPool;
  userPoolClient: cognito.UserPoolClient;
  appRegion: string;
}

export class DashboardStack extends Stack {
  public readonly logGroup: logs.LogGroup;
  public readonly dashboard: cw.Dashboard;

  constructor(scope: Construct, id: string, props: DashboardStackProps) {
    super(scope, id, props);

    // packages/cdk/lib/construct/api.ts に合わせてデフォルト値を設定
    const modelIds: string[] = this.node.tryGetContext('modelIds') || [
      'anthropic.claude-v2',
    ];
    const imageGenerationModelIds: string[] = this.node.tryGetContext(
      'imageGenerationModelIds'
    ) || ['stability.stable-diffusion-xl-v1'];

    // Bedrock のログの出力先として設定する LogGroup
    const logGroup = new logs.LogGroup(this, 'LogGroup', {
      // 1 年でリテンションする設定
      retention: logs.RetentionDays.ONE_YEAR,
    });

    const inputTokenCounts = modelIds.map((modelId: string) => {
      return new cw.Metric({
        namespace: 'AWS/Bedrock',
        metricName: 'InputTokenCount',
        dimensionsMap: {
          ModelId: modelId,
        },
        period: Duration.days(1),
        statistic: 'Sum',
      });
    });

    const outputTokenCounts = modelIds.map((modelId: string) => {
      return new cw.Metric({
        namespace: 'AWS/Bedrock',
        metricName: 'OutputTokenCount',
        dimensionsMap: {
          ModelId: modelId,
        },
        period: Duration.days(1),
        statistic: 'Sum',
      });
    });

    const invocations = [...modelIds, ...imageGenerationModelIds].map(
      (modelId: string) => {
        return new cw.Metric({
          namespace: 'AWS/Bedrock',
          metricName: 'Invocations',
          dimensionsMap: {
            ModelId: modelId,
          },
          period: Duration.days(1),
          statistic: 'Sum',
        });
      }
    );

    const userPoolMetrics = [
      'SignInSuccesses',
      'TokenRefreshSuccesses',
      'SignUpSuccesses',
    ].map((metricName: string) => {
      return new cw.Metric({
        namespace: 'AWS/Cognito',
        metricName,
        dimensionsMap: {
          UserPool: props.userPool.userPoolId,
          UserPoolClient: props.userPoolClient.userPoolClientId,
        },
        period: Duration.hours(1),
        statistic: 'Sum',
        region: props.appRegion,
      });
    });

    const dashboard = new cw.Dashboard(this, 'Dashboard', {
      defaultInterval: Duration.days(7),
    });

    dashboard.addWidgets(
      new cw.TextWidget({
        markdown: '**Amazon Bedrock Metrics**',
        width: 18,
        height: 1,
      }),
      new cw.TextWidget({
        markdown: '**User Metrics**',
        width: 6,
        height: 1,
      })
    );

    dashboard.addWidgets(
      new cw.GraphWidget({
        title: 'InputTokenCount (Daily)',
        width: 6,
        height: 6,
        left: inputTokenCounts,
      }),
      new cw.GraphWidget({
        title: 'OutputTokenCount (Daily)',
        width: 6,
        height: 6,
        left: outputTokenCounts,
      }),
      new cw.GraphWidget({
        title: 'Invocations (Daily)',
        width: 6,
        height: 6,
        left: invocations,
      }),
      new cw.GraphWidget({
        title: 'UserPool',
        width: 6,
        height: 6,
        left: userPoolMetrics,
      })
    );

    dashboard.addWidgets(
      new cw.TextWidget({
        markdown: '**Prompt Logs**',
        width: 24,
        height: 1,
      })
    );

    // ログの出力から抜き出す
    dashboard.addWidgets(
      new cw.LogQueryWidget({
        title: 'Prompt Logs',
        width: 24,
        height: 6,
        logGroupNames: [logGroup.logGroupName],
        view: cw.LogQueryVisualizationType.TABLE,
        queryLines: [
          "filter @logStream = 'aws/bedrock/modelinvocations'",
          'filter input.inputBodyJson.prompt like /Human: .*/',
          'filter input.inputBodyJson.prompt not like /Human: <conversation>.*/',
          'fields @timestamp, input.inputBodyJson.prompt',
        ],
      })
    );

    this.logGroup = logGroup;
    this.dashboard = dashboard;

    new CfnOutput(this, 'BedrockLogGroup', {
      value: this.logGroup.logGroupName,
    });

    new CfnOutput(this, 'DashboardName', {
      value: this.dashboard.dashboardName,
    });

    new CfnOutput(this, 'DashboardUrl', {
      value: `https://console.aws.amazon.com/cloudwatch/home#dashboards/dashboard/${this.dashboard.dashboardName}`,
    });
  }
}
