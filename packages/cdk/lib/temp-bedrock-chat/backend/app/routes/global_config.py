from fastapi import APIRouter

from app.usecases.global_config import get_global_available_models

router = APIRouter(tags=["config"])


@router.get("/config/global")
def get_global_config():
    """Get global configuration including available models."""
    global_models = get_global_available_models()
    return {"globalAvailableModels": global_models}
