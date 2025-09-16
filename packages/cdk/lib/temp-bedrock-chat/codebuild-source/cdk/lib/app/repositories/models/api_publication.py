from typing import Literal

from pydantic import BaseModel


class ApiUsagePlanQuotaModel(BaseModel):
    limit: int | None
    offset: int | None
    period: Literal["DAY", "WEEK", "MONTH"] | None


class ApiUsagePlanThrottleModel(BaseModel):
    rate_limit: float | None
    burst_limit: int | None


class ApiUsagePlanModel(BaseModel):
    id: str
    name: str
    quota: ApiUsagePlanQuotaModel
    throttle: ApiUsagePlanThrottleModel
    key_ids: list[str]


class ApiKeyModel(BaseModel):
    id: str
    description: str
    value: str
    enabled: bool
    created_date: int


class PublishedApiStackModel(BaseModel):
    stack_id: str
    stack_name: str
    stack_status: str
    api_id: str | None
    api_name: str | None
    api_usage_plan_id: str | None
    api_allowed_origins: list[str] | None
    api_stage: str | None
    create_time: int
