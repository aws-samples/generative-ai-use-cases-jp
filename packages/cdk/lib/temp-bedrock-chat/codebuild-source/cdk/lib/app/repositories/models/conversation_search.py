from __future__ import annotations

import json
import logging
from typing import Self

from app.repositories.common import decompose_conv_id
from pydantic import BaseModel, Field

logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)


class SearchHighlightModel(BaseModel):
    """Model representing highlight information for search results"""

    field_name: str  # "Title" or "MessageMap"
    fragments: list[str]  # Text fragments containing the search term


class ConversationSearchModel(BaseModel):
    """Model representing conversation metadata with search results"""

    id: str
    title: str
    bot_id: str | None
    last_updated_time: float = Field(default=0.0)
    highlights: list[SearchHighlightModel] | None = None

    @classmethod
    def from_opensearch_response(cls, hit: dict) -> Self:
        """Create a ConversationSearchModel instance from OpenSearch response"""
        source = hit["_source"]

        # Extract conversation ID from SK (e.g. "{user_id}#CONV#{conversation_id}" -> "{conversation_id}")
        sk = source.get("SK", "")
        conversation_id = decompose_conv_id(sk)

        # Get last updated time from source with fallback logic
        last_updated_time = 0.0

        # 1. Try to get from the latest message's create_time
        if source.get("messages") and isinstance(source.get("messages"), list):
            messages = source.get("messages", [])
            message_times = [
                msg.get("value", {}).get("create_time", 0)
                for msg in messages
                if isinstance(msg.get("value"), dict)
            ]
            if message_times:
                last_updated_time = float(max(message_times))

        # Create conversation meta instance
        conversation = cls(
            id=conversation_id,
            title=source.get("Title", "Untitled conversation"),
            bot_id=source.get("BotId"),
            last_updated_time=last_updated_time,
        )

        # Add highlight information if available
        if "highlight" in hit:
            highlights = []

            for field, fragments in hit["highlight"].items():
                if field == "extractedContent":
                    highlights.append(
                        SearchHighlightModel(
                            field_name="MessageBody", fragments=fragments
                        )
                    )
                elif field == "Title":
                    highlights.append(
                        SearchHighlightModel(field_name=field, fragments=fragments)
                    )
                elif field == "messages.value.content.body":
                    highlights.append(
                        SearchHighlightModel(
                            field_name="MessageBody", fragments=fragments
                        )
                    )

            if highlights:
                conversation.highlights = highlights

        return conversation
