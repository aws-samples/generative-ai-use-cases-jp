import logging
import os
from typing import Optional

from app.repositories.common import get_opensearch_client
from app.repositories.models.conversation_search import ConversationSearchModel
from app.user import User
from opensearchpy import OpenSearch

env_prefix = os.environ.get("ENV_PREFIX", "")
INDEX_NAME = f"{env_prefix}conversation"

logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)


def find_conversations_by_query(
    query: str,
    user: User,
    limit: int = 20,
    client: OpenSearch | None = None,
) -> list[ConversationSearchModel]:
    """Search conversations by query string.
    This method searches through both the conversation title and message content.
    """
    client = client or get_opensearch_client(collection_type="conversation")

    logger.info(f"Searching conversations with query: {query} in index: {INDEX_NAME}")

    # Only search conversations belonging to the user
    # Combining both filtering conditions for more restrictive search
    filter_must = [
        {"term": {"PK.keyword": user.id}},
        {"prefix": {"SK.keyword": f"{user.id}#CONV#"}},
    ]

    search_body = {
        "query": {
            "bool": {
                "should": [
                    # Title search
                    {"match": {"Title": {"query": query, "boost": 3.0}}},
                    # Message content search (array field search)
                    {
                        "match": {
                            "messages.value.content.body": {
                                "query": query,
                                "boost": 2.0,
                            }
                        }
                    },
                    # Message content phrase search (array field search)
                    {
                        "match_phrase": {
                            "messages.value.content.body": {
                                "query": query,
                                "boost": 5.0,
                            }
                        }
                    },
                    # Exact match search
                    {
                        "query_string": {
                            "query": f'\\"{query}\\"',
                            "fields": ["Title^3.0"],
                            "type": "best_fields",
                            "default_operator": "AND",
                        }
                    },
                ],
                "minimum_should_match": 1,
                "filter": {"bool": {"must": filter_must}},
            }
        },
        "size": limit,
        "sort": [
            {"_score": {"order": "desc"}},  # 1. Primary sort by relevance score
            {
                "messages.value.create_time": {
                    "order": "desc",
                    "mode": "max",  # Sort by the most recent message time
                }
            },  # 2. Secondary sort by message recency
        ],
        "highlight": {
            "fields": {
                "Title": {
                    "pre_tags": ["<em>"],
                    "post_tags": ["</em>"],
                    "fragment_size": 150,
                    "number_of_fragments": 1,
                },
                "messages.value.content.body": {
                    "fragment_size": 150,
                    "number_of_fragments": 3,
                    "pre_tags": ["<em>"],
                    "post_tags": ["</em>"],
                    "highlight_query": {
                        "bool": {
                            "should": [
                                {"match": {"messages.value.content.body": query}},
                                {
                                    "match_phrase": {
                                        "messages.value.content.body": query
                                    }
                                },
                            ]
                        }
                    },
                },
            },
            "require_field_match": False,
            "order": "score",
        },
    }

    logger.debug(f"Search body: {search_body}")

    try:
        response = client.search(index=INDEX_NAME, body=search_body)
        logger.debug(f"Search response: {response}")

        conversations = []
        for hit in response["hits"]["hits"]:
            try:
                conversation_meta = ConversationSearchModel.from_opensearch_response(
                    hit
                )
                conversations.append(conversation_meta)
            except Exception as e:
                logger.error(f"Error processing hit: {e}, hit: {hit}")
                continue
        logger.info(f"Found {len(conversations)} conversations matching query: {query}")
        return conversations
    except Exception as e:
        logger.error(f"Error searching conversations: {e}")
        raise
