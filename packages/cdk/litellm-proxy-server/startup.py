#!/usr/bin/env python3

import os
import json
import boto3
import yaml
import asyncio
from typing import Dict, Any
import uvicorn
from litellm import proxy
from fastapi import FastAPI
from fastapi.responses import JSONResponse


def get_secret_value(secret_name: str, region: str = None) -> Dict[str, Any]:
    """Retrieve secret from AWS Secrets Manager"""
    if region is None:
        region = os.environ.get('AWS_REGION', 'us-east-1')
    
    session = boto3.session.Session()
    client = session.client('secretsmanager', region_name=region)
    
    try:
        response = client.get_secret_value(SecretId=secret_name)
        secret_string = response['SecretString']
        return json.loads(secret_string)
    except Exception as e:
        print(f"Error retrieving secret {secret_name}: {e}")
        return {}


def update_config_with_secrets():
    """Update configuration with secrets from AWS Secrets Manager"""
    config_file = '/var/task/config.yaml'
    
    # Load existing config
    with open(config_file, 'r') as f:
        config = yaml.safe_load(f)
    
    # Get secret name from environment variable
    secret_name = os.environ.get('LITELLM_SECRET_NAME')
    if secret_name:
        secrets = get_secret_value(secret_name)
        
        # Update master key
        if 'master_key' in secrets:
            config['general_settings']['master_key'] = secrets['master_key']
        
        # Update any API keys for external models
        if 'openai_api_key' in secrets:
            # Add OpenAI models if API key is available
            openai_models = [
                {
                    'model_name': 'gpt-4',
                    'litellm_params': {
                        'model': 'gpt-4',
                        'api_key': secrets['openai_api_key']
                    }
                },
                {
                    'model_name': 'gpt-3.5-turbo',
                    'litellm_params': {
                        'model': 'gpt-3.5-turbo',
                        'api_key': secrets['openai_api_key']
                    }
                }
            ]
            config['model_list'].extend(openai_models)
    
    # Update AWS region if specified
    aws_region = os.environ.get('AWS_REGION', 'us-east-1')
    for model in config['model_list']:
        if 'bedrock/' in model['litellm_params']['model']:
            model['litellm_params']['aws_region_name'] = aws_region
    
    # Write updated config back
    with open(config_file, 'w') as f:
        yaml.safe_dump(config, f, default_flow_style=False)
    
    return config


def create_health_check_app():
    """Create a simple health check endpoint"""
    app = FastAPI()
    
    @app.get("/health")
    async def health_check():
        return JSONResponse({
            "status": "healthy",
            "service": "litellm-proxy-server",
            "version": "1.0.0"
        })
    
    return app


async def main():
    """Main startup function"""
    print("Starting LiteLLM Proxy Server...")
    
    # Update configuration with secrets
    try:
        config = update_config_with_secrets()
        print("Configuration updated with secrets")
    except Exception as e:
        print(f"Warning: Could not update config with secrets: {e}")
        print("Proceeding with default configuration...")
    
    # Set environment variables for LiteLLM
    os.environ['LITELLM_LOG'] = 'INFO'
    
    # Start the proxy server
    port = int(os.environ.get('AWS_LWA_PORT', 8000))
    host = os.environ.get('HOST', '0.0.0.0')
    
    print(f"Starting server on {host}:{port}")
    print(f"Health check available at: http://{host}:{port}/health")
    
    # Configure uvicorn
    config = uvicorn.Config(
        "litellm:app",
        host=host,
        port=port,
        log_level="info",
        access_log=True,
        workers=1
    )
    
    server = uvicorn.Server(config)
    await server.serve()


if __name__ == "__main__":
    # Create health check endpoint
    health_app = create_health_check_app()
    
    # Run the main server
    asyncio.run(main())