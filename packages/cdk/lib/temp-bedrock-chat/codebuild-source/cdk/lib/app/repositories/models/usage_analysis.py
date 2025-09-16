from typing import Literal

from app.repositories.custom_bot import type_shared_scope
from pydantic import BaseModel


class UsagePerBot(BaseModel):
    id: str  # bot_id
    title: str
    description: str
    published_api_stack_name: str | None
    published_api_datetime: int | None
    owner_user_id: str
    total_price: float
    shared_scope: type_shared_scope
    shared_status: str


class UsagePerUser(BaseModel):
    id: str  # user_id
    email: str
    total_price: float
