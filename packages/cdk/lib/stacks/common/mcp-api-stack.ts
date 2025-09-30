import { NestedStack, StackProps } from 'aws-cdk-lib';
import { Api, Auth, McpApi } from '../../construct';
import { Construct } from 'constructs';

interface McpApiStackProps extends StackProps {
  auth: Auth;
  isSageMakerStudio: boolean;
  api: Api;
}

class McpApiStack extends NestedStack {
  readonly mcpApi: McpApi;

  constructor(scope: Construct, id: string, props: McpApiStackProps) {
    super(scope, id, props);

    const { auth, api } = props;

    const mcpApi = new McpApi(this, 'McpApi', {
      idPool: auth.idPool,
      isSageMakerStudio: props.isSageMakerStudio,
      fileBucket: api.fileBucket,
    });

    this.mcpApi = mcpApi;
  }
}

export default McpApiStack;
