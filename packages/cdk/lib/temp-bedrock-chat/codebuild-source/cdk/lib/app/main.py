import logging
import os
import traceback
import json
from typing import Callable

from app.dependencies import get_current_user
from app.repositories.common import (
    RecordAccessNotAllowedError,
    RecordNotFoundError,
    ResourceConflictError,
)
from app.routes.admin import router as admin_router
from app.routes.api_publication import router as api_publication_router
from app.routes.bot import router as bot_router
from app.routes.bot_store import router as bot_store_router
from app.routes.conversation import router as conversation_router
from app.routes.global_config import router as global_config_router
from app.routes.published_api import router as published_api_router
from app.routes.user import router as user_router
from app.user import User
from app.utils import is_running_on_lambda
from fastapi import Depends, FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.security import HTTPAuthorizationCredentials
from pydantic import ValidationError
from starlette.requests import Request
from starlette.responses import Response
from starlette.types import ASGIApp, Message


CORS_ALLOW_ORIGINS = os.environ.get("CORS_ALLOW_ORIGINS", "*")
PUBLISHED_API_ID = os.environ.get("PUBLISHED_API_ID", None)

is_published_api = PUBLISHED_API_ID is not None

logging.basicConfig(level=logging.INFO, format="%(levelname)s:%(name)s - %(message)s")
logger = logging.getLogger(__name__)

if not is_published_api:
    openapi_tags = [
        {"name": "conversation", "description": "Conversation API"},
        {"name": "bot", "description": "Bot API"},
        {"name": "api_publication", "description": "API Publication API"},
        {"name": "admin", "description": "Admin API"},
        {"name": "user", "description": "User API (cognito)"},
        {"name": "bot_store", "description": "Bot Store API"},
        {"name": "config", "description": "Global Configuration API"},
    ]
    title = "Bedrock Chat"
else:
    openapi_tags = [{"name": "published_api", "description": "Published API"}]
    title = "Bedrock Chat Published API"


app = FastAPI(
    openapi_tags=openapi_tags,
    title=title,
)


if not is_published_api:
    app.include_router(conversation_router)
    app.include_router(bot_router)
    app.include_router(api_publication_router)
    app.include_router(admin_router)
    app.include_router(user_router)
    app.include_router(bot_store_router)
    app.include_router(global_config_router)
else:
    app.include_router(published_api_router)


app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ALLOW_ORIGINS.split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def error_handler_factory(status_code: int) -> Callable[[Request, Exception], Response]:
    def error_handler(request: Request, exc: Exception) -> JSONResponse:
        logger.error(f"[ERROR] Status Code: {status_code}")
        logger.error(f"[ERROR] Exception Type: {type(exc).__name__}")
        logger.error(f"[ERROR] Exception Message: {str(exc)}")
        logger.error(f"[ERROR] Request Path: {request.url.path}")
        logger.error(f"[ERROR] Request Method: {request.method}")
        
        # Log request body if available
        try:
            if hasattr(request, '_body'):
                body = request._body.decode('utf-8') if request._body else 'No body'
                logger.error(f"[ERROR] Request Body: {body[:500]}")
        except:
            pass
            
        # Log current user if available
        if hasattr(request.state, 'current_user') and request.state.current_user:
            logger.error(f"[ERROR] Current User ID: {request.state.current_user.id}")
            logger.error(f"[ERROR] Current User Name: {request.state.current_user.name}")
        
        logger.error(f"[ERROR] Full Traceback:\n{''.join(traceback.format_tb(exc.__traceback__))}")
        
        return JSONResponse({"errors": [str(exc)]}, status_code=status_code)

    return error_handler  # type: ignore


app.add_exception_handler(RecordNotFoundError, error_handler_factory(404))
app.add_exception_handler(FileNotFoundError, error_handler_factory(404))
app.add_exception_handler(RecordAccessNotAllowedError, error_handler_factory(403))
app.add_exception_handler(ValueError, error_handler_factory(400))
app.add_exception_handler(TypeError, error_handler_factory(400))
app.add_exception_handler(AssertionError, error_handler_factory(400))
app.add_exception_handler(PermissionError, error_handler_factory(403))
app.add_exception_handler(ValidationError, error_handler_factory(422))
app.add_exception_handler(ResourceConflictError, error_handler_factory(409))
app.add_exception_handler(Exception, error_handler_factory(500))


@app.middleware("http")
def add_current_user_to_request(request: Request, call_next: ASGIApp):
    if is_running_on_lambda():
        if not is_published_api:
            # Check if this is a proxy request with pre-validated user information
            is_proxy_validated = request.headers.get("X-Proxy-Validated") == "true"
            
            if is_proxy_validated:
                # Extract user information from custom headers set by the proxy
                user_id = request.headers.get("X-User-Id", "unknown")
                user_name = request.headers.get("X-User-Name", "unknown")
                user_email = request.headers.get("X-User-Email", "")
                user_groups_str = request.headers.get("X-User-Groups", "[]")
                
                try:
                    user_groups = json.loads(user_groups_str)
                except json.JSONDecodeError:
                    logger.warning(f"Failed to parse user groups: {user_groups_str}")
                    user_groups = []
                
                logger.info(f"Using proxy-validated user: {user_name} (ID: {user_id})")
                request.state.current_user = User(
                    id=user_id,
                    name=user_name,
                    email=user_email,
                    groups=user_groups
                )
            else:
                # Fallback to original Cognito authentication (shouldn't happen in tenant stack)
                authorization = request.headers.get("Authorization")
                if authorization:
                    token_str = authorization.split(" ")[1]
                    token = HTTPAuthorizationCredentials(
                        scheme="Bearer", credentials=token_str
                    )
                    request.state.current_user = get_current_user(token)
                else:
                    # No authentication provided
                    logger.warning("No authentication provided and not a proxy-validated request")
                    request.state.current_user = None
        else:
            assert PUBLISHED_API_ID is not None, "PUBLISHED_API_ID is not set."
            request.state.current_user = User.from_published_api_id(PUBLISHED_API_ID)
    else:
        # Local development mode
        # Check for proxy headers first
        is_proxy_validated = request.headers.get("X-Proxy-Validated") == "true"
        
        if is_proxy_validated:
            user_id = request.headers.get("X-User-Id", "test_user")
            user_name = request.headers.get("X-User-Name", "test_user")
            user_email = request.headers.get("X-User-Email", "user@example.com")
            user_groups_str = request.headers.get("X-User-Groups", "[]")
            
            try:
                user_groups = json.loads(user_groups_str)
            except json.JSONDecodeError:
                user_groups = []
            
            request.state.current_user = User(
                id=user_id,
                name=user_name,
                email=user_email,
                groups=user_groups
            )
        else:
            authorization = request.headers.get("Authorization")
            if authorization:
                token_str = authorization.split(" ")[1]
                token = HTTPAuthorizationCredentials(scheme="Bearer", credentials=token_str)
                request.state.current_user = get_current_user(token)
            else:
                request.state.current_user = User(
                    id="test_user", name="test_user", email="user@example.com", groups=[]
                )

    response = call_next(request)  # type: ignore
    return response


@app.middleware("http")
async def add_log_requests(request: Request, call_next: ASGIApp):
    logger.info(f"Request path: {request.url.path}")
    logger.info(f"Request method: {request.method}")
    logger.info(f"Request headers: {request.headers}")

    body = await request.body()
    logger.info(f"Request body: {body.decode('utf-8')[:100]}...")

    response = await call_next(request)  # type: ignore

    return response
