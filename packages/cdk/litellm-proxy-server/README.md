# LiteLLM Proxy Server for AWS Lambda

This directory contains the implementation of a LiteLLM proxy server that runs on AWS Lambda using the Lambda Web Adapter. The proxy provides a unified OpenAI-compatible API interface for various AI models, particularly AWS Bedrock models.

## Overview

The LiteLLM proxy server is deployed as a Docker container on AWS Lambda with the following features:

- **Lambda Web Adapter**: Enables FastAPI application to run on Lambda
- **Function URL with IAM Authentication**: Provides secure internal service access
- **AWS Bedrock Integration**: Native support for Anthropic Claude, Amazon Nova, and other Bedrock models
- **Secrets Manager Integration**: Secure storage and retrieval of API keys and configuration
- **OpenAI-Compatible API**: Standard chat completions endpoint for easy integration

## Files

- `Dockerfile`: Container configuration with Lambda Web Adapter
- `config.yaml`: LiteLLM proxy configuration with model definitions
- `startup.py`: Python startup script that configures and launches the proxy
- `README.md`: This documentation file

## Configuration

### Environment Variables

The following environment variables are set by the CDK deployment:

- `AWS_LWA_PORT=8000`: Port for Lambda Web Adapter
- `AWS_LWA_READINESS_CHECK_PATH=/health`: Health check endpoint
- `AWS_LWA_INVOKE_MODE=RESPONSE_STREAM`: Enable streaming responses
- `AWS_REGION`: AWS region for Bedrock access
- `LITELLM_SECRET_NAME`: Name of the Secrets Manager secret containing configuration
- `LITELLM_LOG=INFO`: Logging level

### Secrets Manager

The deployment creates a secret in AWS Secrets Manager with the following structure:

```json
{
  "master_key": "your-generated-master-key",
  "openai_api_key": "optional-openai-api-key-for-external-models"
}
```

### Model Configuration

The default configuration includes:

- **Claude 3.5 Sonnet**: `claude-3-5-sonnet`
- **Claude 3.5 Haiku**: `claude-3-5-haiku`
- **Amazon Nova Pro**: `nova-pro`

Additional models can be added by modifying the `config.yaml` file or by updating the configuration through environment variables.

## Usage

### Direct API Access

The proxy provides OpenAI-compatible endpoints:

```bash
# Get available models
curl -X GET "${LITELLM_ENDPOINT}/v1/models" \
  -H "Authorization: Bearer ${AWS_ACCESS_TOKEN}"

# Chat completion
curl -X POST "${LITELLM_ENDPOINT}/v1/chat/completions" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${AWS_ACCESS_TOKEN}" \
  -d '{
    "model": "claude-3-5-sonnet",
    "messages": [
      {"role": "user", "content": "Hello, how are you?"}
    ],
    "temperature": 0.7,
    "max_tokens": 1000
  }'
```

### Lambda Function Integration

Use the provided utility functions in your Lambda functions:

```typescript
import { createLiteLLMClient, simpleChatCompletion } from './utils/litellmApi';

// Simple usage
const response = await simpleChatCompletion(
  "What is the capital of Japan?",
  "claude-3-5-sonnet"
);

// Advanced usage
const client = createLiteLLMClient(process.env.LITELLM_ENDPOINT);
const completion = await client.createChatCompletion({
  model: "claude-3-5-sonnet",
  messages: [
    { role: "user", content: "Explain quantum computing" }
  ],
  temperature: 0.7,
  max_tokens: 2000
});
```

## Deployment

### Enable in CDK Configuration

Add the following to your CDK context or parameter configuration:

```json
{
  "litellmProxyEnabled": true,
  "litellmProxyMasterKeySecretName": "optional-custom-secret-name"
}
```

### Deploy

```bash
cd packages/cdk
npm run cdk deploy
```

### Verify Deployment

After deployment, check the CloudFormation outputs for:

- `LitellmProxyEnabled`: Should be `true`
- `LitellmProxyEndpoint`: The Function URL endpoint

Test the health endpoint:

```bash
curl -X GET "${LITELLM_ENDPOINT}/health"
```

## Security Considerations

1. **IAM Authentication**: The Function URL uses IAM authentication, ensuring only authorized services can access it
2. **Secrets Manager**: API keys and sensitive configuration are stored securely
3. **VPC**: Consider deploying in a VPC for additional network isolation
4. **CORS**: Configure CORS policies according to your security requirements
5. **Access Logging**: Enable CloudWatch logging for audit trails

## Monitoring and Troubleshooting

### CloudWatch Logs

Monitor the Lambda function logs in CloudWatch:

- Function execution logs
- LiteLLM proxy application logs
- AWS Lambda Web Adapter logs

### Health Check

The proxy includes a health check endpoint at `/health`:

```bash
curl -X GET "${LITELLM_ENDPOINT}/health"
```

### Common Issues

1. **Cold Start Delays**: The first request may take longer due to container initialization
2. **Memory Issues**: Increase memory allocation if experiencing out-of-memory errors
3. **Timeout Issues**: Adjust Lambda timeout for long-running model calls
4. **Permission Issues**: Ensure the Lambda execution role has proper Bedrock permissions

## Customization

### Adding New Models

Modify `config.yaml` to add support for additional models:

```yaml
model_list:
  - model_name: my-custom-model
    litellm_params:
      model: bedrock/my-custom-model-id
      aws_region_name: us-east-1
```

### External Model Providers

Add API keys to Secrets Manager and update the configuration:

```yaml
model_list:
  - model_name: gpt-4
    litellm_params:
      model: gpt-4
      api_key: ${OPENAI_API_KEY}
```

## Cost Optimization

1. **Reserved Concurrency**: Set reserved concurrency to control costs
2. **Memory Allocation**: Optimize memory allocation based on usage patterns
3. **Provisioned Concurrency**: Consider for high-traffic scenarios
4. **Timeout Configuration**: Set appropriate timeout values to avoid unnecessary charges

## Support and Maintenance

- **LiteLLM Version**: Currently using v1.55.6
- **Lambda Web Adapter**: Using v0.9.1
- **Python Runtime**: Python 3.11 slim base image
- **Update Strategy**: Regular updates should be tested in non-production environments first