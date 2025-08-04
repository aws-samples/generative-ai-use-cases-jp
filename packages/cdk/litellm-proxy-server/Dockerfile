FROM public.ecr.aws/docker/library/python:3.11-slim

WORKDIR /var/task

# Install Lambda Web Adapter
COPY --from=public.ecr.aws/awsguru/aws-lambda-adapter:0.9.1 /lambda-adapter /opt/extensions/lambda-adapter

# Set environment variables for Lambda Web Adapter
ENV AWS_LWA_PORT=8000
ENV AWS_LWA_READINESS_CHECK_PATH=/health
ENV AWS_LWA_INVOKE_MODE=RESPONSE_STREAM

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    g++ \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install litellm and required dependencies
RUN pip install --no-cache-dir \
    litellm[proxy]==1.74.8

# Copy configuration and startup script
COPY config.yaml ./
COPY startup.py ./

# Create a simple health check endpoint
RUN echo 'from fastapi import FastAPI; from fastapi.responses import JSONResponse; app = FastAPI(); @app.get("/health"); def health(): return JSONResponse({"status": "healthy"})' > health_check.py

# Expose port
EXPOSE 8000

# Start the litellm proxy server
CMD ["python", "startup.py"]
