#!/usr/bin/env python3

import os
import subprocess
import sys


def main():
    """Main startup function"""
    print("Starting LiteLLM Proxy Server...")
    
    # Set environment variables for LiteLLM
    os.environ["LITELLM_LOG"] = os.environ.get("LITELLM_LOG", "INFO")
    
    # Get port from Lambda Web Adapter
    port = os.environ.get("AWS_LWA_PORT", "8000")
    host = os.environ.get("HOST", "0.0.0.0")
    
    print(f"Starting LiteLLM server on {host}:{port}")
    print(f"Using config file: ./config.yaml")
    
    # Start LiteLLM proxy server using the CLI command
    cmd = [
        "litellm",
        "--port", port,
        "--host", host,
        "--config", "./config.yaml"
    ]
    
    print(f"Running command: {' '.join(cmd)}")
    
    # Run the command
    try:
        subprocess.run(cmd, check=True)
    except subprocess.CalledProcessError as e:
        print(f"Error starting LiteLLM proxy server: {e}")
        sys.exit(1)
    except Exception as e:
        print(f"Unexpected error: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
