import { Stack, StackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { RagKnowledgeBase } from './construct';

interface RagKnowledgeBaseStackProps extends StackProps {}

export class RagKnowledgeBaseStack extends Stack {
  constructor(scope: Construct, id: string, props: RagKnowledgeBaseStackProps) {
    super(scope, id, props);

    new RagKnowledgeBase(this, 'RagKnowledgeBase', {});
  }
}
