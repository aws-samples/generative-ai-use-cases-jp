from app.auth import verify_token
from app.user import User
from fastapi import Depends, HTTPException, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError
from typing import Optional

security = HTTPBearer(auto_error=False)  # Don't auto-error to allow proxy validation


def get_current_user(request: Request, token: Optional[HTTPAuthorizationCredentials] = Depends(security)):
    # First check if the user is already set by the middleware (proxy-validated)
    if hasattr(request.state, 'current_user') and request.state.current_user:
        return request.state.current_user
    
    # If not proxy-validated, try to validate the token (fallback for non-proxy requests)
    if token:
        try:
            decoded = verify_token(token.credentials)
            # Return user information
            return User(
                id=decoded["sub"],
                name=decoded["cognito:username"],
                email=decoded["email"],
                groups=decoded.get("cognito:groups", []),
            )
        except (IndexError, JWTError):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Could not validate credentials",
                headers={"WWW-Authenticate": "Bearer"},
            )
    
    # No valid authentication method found
    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="Authentication required",
        headers={"WWW-Authenticate": "Bearer"},
    )


def check_admin(request: Request, user: User = Depends(get_current_user)):
    if not user.is_admin():
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admin can access this API.",
        )


def check_creating_bot_allowed(request: Request, user: User = Depends(get_current_user)):
    if not user.is_creating_bot_allowed():
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User is not allowed to create bot.",
        )


def check_publish_allowed(request: Request, user: User = Depends(get_current_user)):
    if not user.is_publish_allowed():
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User is not allowed to publish bot.",
        )
