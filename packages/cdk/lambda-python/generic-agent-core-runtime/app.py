"""Main FastAPI application for Generic AgentCore Runtime."""

import json
import logging
import traceback

from fastapi import FastAPI, Request
from fastapi.responses import StreamingResponse

from src.agent import AgentManager
from src.utils import clean_ws_directory, create_error_response, create_ws_directory

# Configure root logger
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)


# Initialize FastAPI app
app = FastAPI(
    title="Generic AgentCore Runtime",
    description="AWS Bedrock AgentCore Runtime with Strands Agent and MCP support",
    version="1.0.0",
)

# Initialize agent manager
agent_manager = AgentManager()


@app.get("/ping")
async def ping():
    """Health check endpoint required by AgentCore"""
    return {"status": "healthy", "service": "generic-agent-core-runtime"}


@app.post("/invocations")
async def invocations(request: Request):
    """Main invocation endpoint required by AgentCore

    Expects request with messages, system_prompt, prompt, and model
    """
    # Get session info from headers
    headers = dict(request.headers)
    session_id = headers.get("x-amzn-bedrock-agentcore-runtime-session-id")
    trace_id = headers.get("x-amzn-trace-id")
    logger.info(f"New invocation: {session_id} {trace_id}")

    # Set session info in agent manager
    agent_manager.set_session_info(session_id, trace_id)

    # Ensure workspace directory exists
    create_ws_directory()

    try:
        # Read and parse request body
        body = await request.body()
        body_str = body.decode()
        request_data = json.loads(body_str)

        # Handle input field if present (AWS Lambda integration format)
        if "input" in request_data and isinstance(request_data["input"], dict):
            request_data = request_data["input"]

        # Extract required fields
        messages = request_data.get("messages", [])
        system_prompt = request_data.get("system_prompt")
        prompt = request_data.get("prompt", [])
        model_info = request_data.get("model", {})

        # Return streaming response
        async def generate():
            try:
                async for chunk in agent_manager.process_request_streaming(messages=messages, system_prompt=system_prompt, prompt=prompt, model_info=model_info):
                    yield chunk
            finally:
                clean_ws_directory()

        return StreamingResponse(generate(), media_type="text/event-stream")
    except Exception as e:
        logger.error(f"Error processing request: {e}")
        logger.error(traceback.format_exc())
        return create_error_response(str(e))
    finally:
        clean_ws_directory()


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8080, log_level="warning", access_log=False)
