# LiteLLM Proxy Server for AWS Lambda

This directory contains the implementation of a LiteLLM proxy server that runs on AWS Lambda using the Lambda Web Adapter. The proxy provides a unified OpenAI-compatible API interface for various AI models.

## Overview

The LiteLLM proxy server is deployed as a Docker container on AWS Lambda with the following features:

- **Lambda Web Adapter**: Enables FastAPI application to run on Lambda
- **Function URL with IAM Authentication**: Provides secure internal service access
- **Multi-Provider Support**: Supports AWS Bedrock, OpenAI, Azure OpenAI, Google Vertex AI, Anthropic, Cohere, and more
- **OpenAI-Compatible API**: Standard chat completions endpoint for easy integration
- **Configuration-Based Setup**: All models and settings managed through config.yaml

## Files

- `Dockerfile`: Container configuration with Lambda Web Adapter
- `config.yaml`: Central configuration file for all LiteLLM settings and model definitions
- `startup.py`: Simple Python startup script that launches the proxy
- `README.md`: This documentation file

## Configuration

### Environment Variables

The following environment variables are set by the CDK deployment:

- `AWS_LWA_PORT=8000`: Port for Lambda Web Adapter
- `AWS_LWA_READINESS_CHECK_PATH=/health`: Health check endpoint
- `AWS_LWA_INVOKE_MODE=RESPONSE_STREAM`: Enable streaming responses
- `BEDROCK_REGION`: AWS region for Bedrock access (default: us-east-1)
- `LITELLM_LOG=INFO`: Logging level

### Model Configuration (config.yaml)

All model configurations are managed in the `config.yaml` file. The configuration supports multiple providers:

#### AWS Bedrock (Default)

```yaml
- model_name: claude-3-5-sonnet
  litellm_params:
    model: bedrock/anthropic.claude-3-5-sonnet-20241022-v2:0
    aws_region_name: us-east-1
    aws_access_key_id: null # Uses IAM role
    aws_secret_access_key: null # Uses IAM role
```

#### OpenAI

```yaml
- model_name: gpt-4
  litellm_params:
    model: gpt-4
    api_key: sk-your-openai-api-key-here
```

#### Azure OpenAI

```yaml
- model_name: azure-gpt-4
  litellm_params:
    model: azure/your-deployment-name
    api_base: https://your-resource.openai.azure.com
    api_key: your-azure-api-key
    api_version: 2023-05-15
```

#### Google Vertex AI

```yaml
- model_name: gemini-pro
  litellm_params:
    model: vertex_ai/gemini-pro
    vertex_project: your-gcp-project-id
    vertex_location: us-central1
    vertex_credentials: |
      {
        "type": "service_account",
        "project_id": "your-project-id",
        ...
      }
```

### Master Key Configuration

The master key for admin access is configured in `config.yaml`:

```yaml
general_settings:
  master_key: sk-litellm-master-key # Change this to your secure key
```

## Usage

### Direct API Access

The proxy provides OpenAI-compatible endpoints:

```bash
# Get available models
curl -X GET "${LITELLM_ENDPOINT}/v1/models" \
  -H "Authorization: Bearer ${MASTER_KEY}"

# Chat completion
curl -X POST "${LITELLM_ENDPOINT}/v1/chat/completions" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${MASTER_KEY}" \
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

When integrating with other Lambda functions, use IAM authentication to access the Function URL. The Lambda execution role will need the `lambda:InvokeFunctionUrl` permission.

## Deployment

### Enable in CDK Configuration

Add the following to your CDK context or parameter configuration:

```json
{
  "litellmProxyEnabled": true
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

## Adding New Models

To add support for additional models, simply edit the `config.yaml` file:

1. Add your model configuration to the `model_list` section
2. Include any required API keys or credentials
3. Redeploy the stack to apply changes

Example:

```yaml
model_list:
  # Your existing models...

  # Add a new model
  - model_name: mixtral-8x7b
    litellm_params:
      model: together_ai/mistralai/Mixtral-8x7B-Instruct-v0.1
      api_key: your-together-ai-key
```

## Advanced Configuration

### Load Balancing

Configure router settings for load balancing across multiple models:

```yaml
router_settings:
  routing_strategy: simple-shuffle # Options: simple-shuffle, least-busy, usage-based-routing
  cooldown_time: 60 # Time in seconds to cooldown a model if it fails
  num_retries: 2 # Number of retries for failed requests
  allowed_fails: 3 # Number of allowed fails before cooldown
```

### Model Aliases

Create aliases to redirect requests:

```yaml
model_alias:
  'gpt-4': 'claude-3-5-sonnet' # Redirect gpt-4 requests to Claude
```

### Spend Tracking

Enable budget controls:

```yaml
litellm_settings:
  max_budget: 100 # Maximum budget in USD
  budget_duration: 30d # Budget duration (e.g., 30d, 1m, 1y)
```

## Security Considerations

1. **Master Key**: Always use a strong, unique master key in production
2. **API Keys**: Store sensitive API keys securely and rotate them regularly
3. **IAM Authentication**: The Function URL uses IAM authentication for internal service access
4. **Network Isolation**: Consider deploying in a VPC for additional security
5. **Access Logging**: Monitor CloudWatch logs for security auditing

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
4. **Permission Issues**: Ensure the Lambda execution role has proper permissions for the services you're using

## Cost Optimization

1. **Reserved Concurrency**: Set reserved concurrency to control costs
2. **Memory Allocation**: Optimize memory allocation based on usage patterns
3. **Provisioned Concurrency**: Consider for high-traffic scenarios
4. **Timeout Configuration**: Set appropriate timeout values to avoid unnecessary charges

## Support and Maintenance

- **LiteLLM Version**: Currently using v1.55.6
- **Lambda Web Adapter**: Using v0.9.1
- **Python Runtime**: Python 3.11 slim base image
- **Configuration Updates**: Simply modify config.yaml and redeploy to update settings
