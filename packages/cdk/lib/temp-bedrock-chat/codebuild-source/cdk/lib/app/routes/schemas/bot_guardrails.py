from decimal import Decimal
from app.routes.schemas.base import BaseSchema
from app.repositories.models.common import Float


class BedrockGuardrailsInput(BaseSchema):
    is_guardrail_enabled: bool
    hate_threshold: int
    insults_threshold: int
    sexual_threshold: int
    violence_threshold: int
    misconduct_threshold: int
    grounding_threshold: Float
    relevance_threshold: Float
    guardrail_arn: str
    guardrail_version: str


class BedrockGuardrailsOutput(BaseSchema):
    is_guardrail_enabled: bool
    hate_threshold: int
    insults_threshold: int
    sexual_threshold: int
    violence_threshold: int
    misconduct_threshold: int
    grounding_threshold: Float
    relevance_threshold: Float
    guardrail_arn: str
    guardrail_version: str
