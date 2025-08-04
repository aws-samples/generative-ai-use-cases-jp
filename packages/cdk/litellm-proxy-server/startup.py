#!/usr/bin/env python3

import os
import asyncio
import uvicorn
from fastapi import FastAPI
from fastapi.responses import JSONResponse


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
    
    # Set environment variables for LiteLLM
    os.environ["LITELLM_LOG"] = os.environ.get("LITELLM_LOG", "INFO")
    
    # Start the proxy server
    port = int(os.environ.get("AWS_LWA_PORT", 8000))
    host = os.environ.get("HOST", "0.0.0.0")
    
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
