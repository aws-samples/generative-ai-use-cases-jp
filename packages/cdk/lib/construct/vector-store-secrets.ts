import { SecretValue } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { StringParameter } from 'aws-cdk-lib/aws-ssm';
import { Secret } from "aws-cdk-lib/aws-secretsmanager";

export interface VectorStoreSecretsProps {}
  
export class VectorStoreSecretsConstruct extends Construct {
    public readonly vectorStoreUrl: StringParameter;
    public readonly vectorStoreSecret: Secret;

    constructor(scope: Construct, id: string, props: VectorStoreSecretsProps) {
        super(scope, id);


        // pineconeの接続用urlを取得する
        const pineconeUrl = process.env.PINECONE_URL; // https://pinecone-kb-test-index-h7u1t19.svc.aped-4627-b74a.pinecone.io
        if (!pineconeUrl) {
            throw new Error("process.env.PINECONE_URL is undefined");
        };
        const vectorStoreUrl = new StringParameter(
            this,
            "vector-store-url",
            {
                parameterName: "PineconeURL",
                stringValue: pineconeUrl,
            }
        )

        
        // PineconeのApiキーを取得する
        const pineconeApiKey = process.env.PINECONE_API_KEY
        if (!pineconeApiKey) {
            throw new Error("process.env.PINECONE_API_KEY is undefined");
        };
        const vectorStoreSecret = new Secret(
            this,
            "pinecone-api-key",
            {
                secretName: "pinecone-api-key",
                description: "Pinecone API Key",
                secretObjectValue: {
                // 本番環境ではSecretValue.unsafePlainTextを使わないようにする
                apiKey: SecretValue.unsafePlainText(pineconeApiKey),
                },
            }
        );
        // secretFullArnがundefinedでないことを確認
        if (!vectorStoreSecret.secretFullArn) {
            throw new Error("Secret ARN is undefined");
        };


        this.vectorStoreUrl = vectorStoreUrl;
        this.vectorStoreSecret = vectorStoreSecret;
    }
}