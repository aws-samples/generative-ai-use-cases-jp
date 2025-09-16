import json
import logging
from typing import Callable, TypedDict, TypeGuard

from app.agents.tools.agent_tool import AgentTool
from app.bedrock import (
    BedrockThrottlingException,
    calculate_price,
    compose_args_for_converse_api,
)
from app.repositories.models.conversation import (
    ContentModel,
    MessageModel,
    ReasoningContentModel,
    SimpleMessageModel,
    TextContentModel,
    ToolUseContentModel,
    ToolUseContentModelBody,
)
from app.repositories.models.custom_bot import GenerationParamsModel
from app.repositories.models.custom_bot_guardrails import BedrockGuardrailsModel
from app.routes.schemas.conversation import type_model_name
from app.utils import get_bedrock_runtime_client, get_current_time
from botocore.exceptions import ClientError
from mypy_boto3_bedrock_runtime.literals import ConversationRoleType, StopReasonType
from mypy_boto3_bedrock_runtime.type_defs import GuardrailConverseContentBlockTypeDef
from pydantic import JsonValue
from reretry import retry

logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)


class OnStopInput(TypedDict):
    message: MessageModel
    stop_reason: StopReasonType
    input_token_count: int
    output_token_count: int
    cache_read_input_count: int
    cache_write_input_count: int
    price: float


class OnThinking(TypedDict):
    tool_use_id: str
    name: str
    input: dict[str, JsonValue]


class _PartialTextContent(TypedDict):
    text: str


class _PartialToolUseContentBody(TypedDict):
    tool_use_id: str
    name: str
    input: str


class _PartialToolUseContent(TypedDict):
    tool_use: _PartialToolUseContentBody


class _PartialReasoningContent(TypedDict):
    text: str
    signature: str
    redacted_content: bytes


class _PartialMessage(TypedDict):
    role: ConversationRoleType
    contents: dict[
        int, _PartialTextContent | _PartialToolUseContent | _PartialReasoningContent
    ]


def _is_text_content(
    content: _PartialTextContent | _PartialToolUseContent | _PartialReasoningContent,
) -> TypeGuard[_PartialTextContent]:
    return "text" in content and (
        "signature" not in content and "redacted_content" not in content
    )


def _is_tool_use_content(
    content: _PartialTextContent | _PartialToolUseContent | _PartialReasoningContent,
) -> TypeGuard[_PartialToolUseContent]:
    return "tool_use" in content


def _is_reasoning_content(
    content: _PartialTextContent | _PartialToolUseContent | _PartialReasoningContent,
) -> TypeGuard[_PartialReasoningContent]:
    return "signature" in content or "redacted_content" in content


def _content_model_from_partial_content(
    content: _PartialTextContent | _PartialToolUseContent,
) -> ContentModel:
    if _is_text_content(content=content):
        return TextContentModel(
            content_type="text",
            body=content["text"].rstrip(),
        )

    elif _is_tool_use_content(content=content):
        return ToolUseContentModel(
            content_type="toolUse",
            body=ToolUseContentModelBody(
                tool_use_id=content["tool_use"]["tool_use_id"],
                name=content["tool_use"]["name"],
                input=json.loads(content["tool_use"]["input"] or "{}"),
            ),
        )

    elif _is_reasoning_content(content=content):
        return ReasoningContentModel(
            content_type="reasoning",
            text=content["text"],
            signature=content["signature"],
            redacted_content=content["redacted_content"],
        )

    else:
        raise ValueError(f"Unknown content type")


def _content_model_to_partial_content(
    content: ContentModel,
) -> _PartialTextContent | _PartialToolUseContent | _PartialReasoningContent:
    if isinstance(content, TextContentModel):
        return {
            "text": content.body,
        }

    elif isinstance(content, ToolUseContentModel):
        return {
            "tool_use": {
                "tool_use_id": content.body.tool_use_id,
                "name": content.body.name,
                "input": json.dumps(content.body.input),
            },
        }
    elif isinstance(content, ReasoningContentModel):
        return {
            "text": content.text,
            "signature": content.signature,
            "redacted_content": content.redacted_content,
        }

    else:
        raise ValueError(f"Unknown content type")


class ConverseApiStreamHandler:
    """Stream handler using Converse API.
    Ref: https://docs.aws.amazon.com/bedrock/latest/userguide/conversation-inference.html
    """

    def __init__(
        self,
        model: type_model_name,
        instructions: list[str] = [],
        generation_params: GenerationParamsModel | None = None,
        guardrail: BedrockGuardrailsModel | None = None,
        tools: dict[str, AgentTool] | None = None,
        on_stream: Callable[[str], None] | None = None,
        on_thinking: Callable[[OnThinking], None] | None = None,
        on_reasoning: Callable[[str], None] | None = None,
    ):
        """Base class for stream handlers.
        :param model: Model name.
        :param on_stream: Callback function for streaming.
        :param on_stop: Callback function for stopping the stream.
        """
        self.model: type_model_name = model
        self.instructions = instructions
        self.generation_params = generation_params
        self.guardrail = guardrail
        self.tools = tools
        self.on_stream = on_stream
        self.on_thinking = on_thinking
        self.on_reasoning = on_reasoning

    @retry(
        exceptions=(BedrockThrottlingException,),
        tries=3,
        delay=60,
        backoff=2,
        jitter=(0, 2),
        logger=logger,
    )
    def run(
        self,
        messages: list[SimpleMessageModel],
        grounding_source: GuardrailConverseContentBlockTypeDef | None = None,
        message_for_continue_generate: SimpleMessageModel | None = None,
        enable_reasoning: bool = False,
        prompt_caching_enabled: bool = False,
    ) -> OnStopInput:
        try:
            # Create payload to invoke Bedrock
            args = compose_args_for_converse_api(
                messages=messages,
                model=self.model,
                instructions=self.instructions,
                generation_params=self.generation_params,
                guardrail=self.guardrail,
                grounding_source=grounding_source,
                tools=self.tools,
                enable_reasoning=enable_reasoning,
                prompt_caching_enabled=prompt_caching_enabled,
            )
            logger.info(f"args for converse_stream: {args}")

            client = get_bedrock_runtime_client()
            try:
                response = client.converse_stream(**args)
            except ClientError as e:
                if e.response["Error"]["Code"] == "ThrottlingException":
                    raise BedrockThrottlingException(
                        "Bedrock API is throttling requests"
                    ) from e
                raise

            current_message = _PartialMessage(
                role="assistant",
                contents=(
                    {
                        index: _content_model_to_partial_content(content=content)
                        for index, content in enumerate(
                            message_for_continue_generate.content
                        )
                    }
                    if message_for_continue_generate is not None
                    else {}
                ),
            )
            current_errors: list[Exception] = []
            stop_reason: StopReasonType = "end_turn"
            input_token_count = 0
            output_token_count = 0
            cache_read_input_count = 0
            cache_write_input_count = 0
            for event in response["stream"]:
                logger.debug(f"event: {event}")
                if "messageStart" in event:
                    message_start = event["messageStart"]
                    current_message["role"] = message_start["role"]

                elif "contentBlockStart" in event:
                    content_block_start = event["contentBlockStart"]
                    index = content_block_start["contentBlockIndex"]
                    start = content_block_start.get("start", {})
                    tool_use = start.get("toolUse")
                    if tool_use is not None:
                        tool_use_id = tool_use["toolUseId"]
                        tool_name = tool_use["name"]

                        tool_use_content: _PartialToolUseContent = {
                            "tool_use": {
                                "tool_use_id": tool_use_id,
                                "name": tool_name,
                                "input": "",
                            }
                        }
                        current_message["contents"][index] = tool_use_content

                elif "contentBlockDelta" in event:
                    content_block_delta = event["contentBlockDelta"]
                    index = content_block_delta["contentBlockIndex"]
                    delta = content_block_delta["delta"]

                    if "reasoningContent" in delta:
                        reasoning = delta["reasoningContent"]
                        if index in current_message["contents"]:
                            content = current_message["contents"][index]
                            if _is_reasoning_content(content=content):
                                content["text"] += reasoning.get("text", "")
                                if "signature" in reasoning:
                                    content["signature"] = reasoning["signature"]
                                if "redactedContent" in reasoning:
                                    content["redacted_content"] = reasoning[
                                        "redactedContent"
                                    ]
                            else:
                                # Should not happen
                                logger.warning(
                                    f"Unexpected reasoning content: {content}"
                                )
                        else:
                            # If the block is not started, create a new block
                            current_message["contents"][index] = {
                                "text": reasoning.get("text", ""),
                                "signature": reasoning.get("signature", ""),
                                "redacted_content": reasoning.get(
                                    "redactedContent", b""
                                ),
                            }
                        if self.on_reasoning:
                            # Only text is streamed
                            self.on_reasoning(reasoning.get("text", ""))

                    elif "toolUse" in delta:
                        input = delta["toolUse"]["input"]
                        if index in current_message["contents"]:
                            content = current_message["contents"][index]
                            if _is_tool_use_content(content=content):
                                content["tool_use"]["input"] += input

                    elif "text" in delta:
                        text = delta["text"]
                        if index in current_message["contents"]:
                            content = current_message["contents"][index]
                            if _is_text_content(content=content):
                                content["text"] += text

                        else:
                            text_content: _PartialTextContent = {
                                "text": text,
                            }
                            current_message["contents"][index] = text_content

                        if self.on_stream:
                            self.on_stream(text)

                elif "contentBlockStop" in event:
                    content_block_stop = event["contentBlockStop"]
                    index = content_block_stop["contentBlockIndex"]
                    content = current_message["contents"][index]
                    if _is_tool_use_content(content=content):
                        tool_use = content["tool_use"]
                        tool_use_id = tool_use["tool_use_id"]
                        tool_name = tool_use["name"]
                        input = json.loads(tool_use["input"] or "{}")

                        if self.on_thinking:
                            self.on_thinking(
                                {
                                    "tool_use_id": tool_use_id,
                                    "name": tool_name,
                                    "input": input,
                                }
                            )

                elif "messageStop" in event:
                    stop_reason = event["messageStop"]["stopReason"]

                elif "metadata" in event:
                    metadata = event["metadata"]
                    usage = metadata["usage"]
                    input_token_count = usage["inputTokens"]
                    output_token_count = usage["outputTokens"]
                    cache_read_input_count = usage.get("cacheReadInputTokens") or 0
                    cache_write_input_count = usage.get("cacheWriteInputTokens") or 0

                elif "modelStreamErrorException" in event:
                    exception = event["modelStreamErrorException"]
                    message = exception.get("message")
                    original_status_code = exception.get("originalStatusCode")
                    original_message = exception.get("originalMessage")
                    current_errors.append(
                        client.exceptions.ModelStreamErrorException(
                            error_response={
                                "Error": {
                                    "Code": "ModelStreamErrorException",
                                    "Message": message,
                                    "OriginalStatusCode": original_status_code,
                                    "OriginalMessage": original_message,
                                },
                            },
                            operation_name="ConverseStream",
                        )
                    )

                elif "throttlingException" in event:
                    exception = event["throttlingException"]
                    message = exception.get("message")
                    current_errors.append(
                        client.exceptions.ThrottlingException(
                            error_response={
                                "Error": {
                                    "Code": "ThrottlingException",
                                    "Message": message,
                                },
                            },
                            operation_name="ConverseStream",
                        )
                    )

                elif "internalServerException" in event:
                    exception = event["internalServerException"]
                    message = exception.get("message")
                    current_errors.append(
                        client.exceptions.InternalServerException(
                            error_response={
                                "Error": {
                                    "Code": "InternalServerException",
                                    "Message": message,
                                },
                            },
                            operation_name="ConverseStream",
                        )
                    )

                elif "serviceUnavailableException" in event:
                    exception = event["serviceUnavailableException"]
                    message = exception.get("message")
                    current_errors.append(
                        client.exceptions.ServiceUnavailableException(
                            error_response={
                                "Error": {
                                    "Code": "ServiceUnavailableException",
                                    "Message": message,
                                },
                            },
                            operation_name="ConverseStream",
                        )
                    )

                elif "validationException" in event:
                    exception = event["validationException"]
                    message = exception.get("message")
                    current_errors.append(
                        client.exceptions.ValidationException(
                            error_response={
                                "Error": {
                                    "Code": "ValidationException",
                                    "Message": message,
                                },
                            },
                            operation_name="ConverseStream",
                        )
                    )

            if len(current_errors) > 0:
                if len(current_errors) == 1:
                    raise current_errors[0]

                else:
                    raise ExceptionGroup("Exceptions in ConverseStream", current_errors)

            # Append entire completion as the last message
            message = MessageModel(
                role="assistant",
                content=[
                    _content_model_from_partial_content(content=content)
                    for _, content in sorted(current_message["contents"].items())
                ],
                model=self.model,
                children=[],
                parent=None,
                create_time=get_current_time(),
                feedback=None,
                used_chunks=None,
                thinking_log=None,
            )

            price = calculate_price(
                model=self.model,
                input_tokens=input_token_count,
                output_tokens=output_token_count,
                cache_read_input_tokens=cache_read_input_count,
                cache_write_input_tokens=cache_write_input_count,
            )
            logger.info(
                f"token count: {json.dumps({
                    'input': input_token_count,
                    'output': output_token_count,
                    'cache_read_input': cache_read_input_count,
                    'cache_write_input': cache_write_input_count
                })}"
            )
            logger.info(f"price: {price}")

            result = OnStopInput(
                message=message,
                stop_reason=stop_reason,
                input_token_count=input_token_count,
                output_token_count=output_token_count,
                cache_read_input_count=cache_read_input_count,
                cache_write_input_count=cache_write_input_count,
                price=price,
            )
            return result

        except Exception as e:
            logger.error(f"Error: {e}")
            raise e
