import logging
import os
import random
import time

from app.repositories.common import get_opensearch_client
from app.repositories.models.custom_bot import BotMeta
from app.user import User
from opensearchpy import OpenSearch

env_prefix = os.environ.get("ENV_PREFIX", "")
INDEX_NAME = f"{env_prefix}bot"

logger = logging.getLogger(__name__)
logger.setLevel(logging.DEBUG)


def find_bots_by_query(
    query: str,
    user: User,
    limit: int = 20,
    client: OpenSearch | None = None,
) -> list[BotMeta]:
    """Search bots by query string.
    This method is used for bot-store functionality.

    Query Structure Explanation:

    1. Main Search (must clause):
    - Uses multi_match for flexible text searching
    - Searches across multiple fields (Description, Title, Instruction)
    - Implements fuzzy matching for typo tolerance
    - Requires 30% of search terms to match

    2. Access Control (filter clause):
    The filter implements three access levels:
    a) Public Bots (`SharedScope = "all"`):
        - Available to all users

    b) Partial Shared Bots (`SharedScope = "partial"`):
        - Admins can see all of them
        - Non-admins can see them if they are listed in `AllowedCognitoUsers`
          or belong to `AllowedCognitoGroups`

    c) Private Bots (no `SharedScope` field):
        - Only accessible to the owner (`PK.keyword = user.id`)
        - Admins can see their own private bots (`PK.keyword = admin-user`)
    """
    client = client or get_opensearch_client()
    logger.info(f"Searching bots with query: {query}")

    # Include only BOT items
    filter_must = [{"prefix": {"SK.keyword": "BOT"}}]
    # Condition for bots that can be acquired
    filter_should = [
        {"term": {"SharedScope.keyword": "all"}},  # Everyone can get
        # Owner AND (no SharedScope i.e. private OR SharedScope = "partial")
        {
            "bool": {
                "must": [
                    {"term": {"PK.keyword": user.id}},
                    {
                        "bool": {
                            "should": [
                                {
                                    "bool": {
                                        "must_not": {"exists": {"field": "SharedScope"}}
                                    }
                                },
                                {"term": {"SharedScope.keyword": "partial"}},
                            ],
                            "minimum_should_match": 1,
                        }
                    },
                ]
            }
        },
    ]

    if user.is_admin():
        # Administrator can get all partial shared bots
        filter_should.append({"term": {"SharedScope.keyword": "partial"}})
    else:
        # For non-admin users, check the permissions of partial shared bots
        filter_should.append(
            {
                "bool": {
                    "must": [
                        {"term": {"SharedScope.keyword": "partial"}},
                        {
                            "bool": {
                                "should": [
                                    {"term": {"AllowedCognitoUsers.keyword": user.id}},
                                    {
                                        "script": {
                                            "script": {
                                                "source": (
                                                    "for (group in doc['AllowedCognitoGroups.keyword']) { "
                                                    "if (params.user_groups.contains(group)) { return true; } } "
                                                    "return false;"
                                                ),
                                                "params": {"user_groups": user.groups},
                                                "lang": "painless",
                                            }
                                        }
                                    },
                                ],
                                "minimum_should_match": 1,
                            }
                        },
                    ]
                }
            }
        )

    search_body = {
        "query": {
            "bool": {
                "must": [
                    {
                        "multi_match": {
                            "query": query,
                            "fields": ["Description", "Title", "Instruction"],
                            "type": "best_fields",
                            "operator": "or",
                            "minimum_should_match": "30%",
                            "fuzziness": "AUTO",
                        }
                    }
                ],
                "filter": {
                    "bool": {
                        "must": filter_must,
                        "should": filter_should,
                        "minimum_should_match": 1,
                    }
                },
            }
        },
        "size": limit,
    }
    logger.debug(f"Entire search body: {search_body}")

    try:
        response = client.search(index=INDEX_NAME, body=search_body)
        logger.debug(f"Search response: {response}")

        bots = [
            BotMeta.from_opensearch_response(hit, user.id)
            for hit in response["hits"]["hits"]
        ]
        logger.info(f"Found {len(bots)} bots matching query: {query}")
        return bots

    except Exception as e:
        logger.error(f"Error searching bots: {e}")
        raise


def find_bots_sorted_by_usage_count(
    user: User,
    limit: int = 20,
    client: OpenSearch | None = None,
) -> list[BotMeta]:
    """Search bots sorted by usage count while considering access control."""
    client = client or get_opensearch_client()
    logger.info(f"Searching bots sorted by usage count")

    filter_must = [{"prefix": {"SK.keyword": "BOT"}}]
    filter_should = [
        {"term": {"SharedScope.keyword": "all"}},  # Public bots
        # Owner's bots (private or partial)
        {
            "bool": {
                "must": [
                    {"term": {"PK.keyword": user.id}},
                    {
                        "bool": {
                            "should": [
                                {
                                    "bool": {
                                        "must_not": {"exists": {"field": "SharedScope"}}
                                    }
                                },
                                {"term": {"SharedScope.keyword": "partial"}},
                            ],
                            "minimum_should_match": 1,
                        }
                    },
                ]
            }
        },
        # Partial shared bots with access permission
        {
            "bool": {
                "must": [
                    {"term": {"SharedScope.keyword": "partial"}},
                    {
                        "bool": {
                            "should": [
                                {"term": {"AllowedCognitoUsers.keyword": user.id}},
                                {
                                    "script": {
                                        "script": {
                                            "source": (
                                                "for (group in doc['AllowedCognitoGroups.keyword']) { "
                                                "if (params.user_groups.contains(group)) { return true; } } "
                                                "return false;"
                                            ),
                                            "params": {"user_groups": user.groups},
                                            "lang": "painless",
                                        }
                                    }
                                },
                            ],
                            "minimum_should_match": 1,
                        }
                    },
                ]
            }
        },
    ]

    search_body = {
        "query": {
            "bool": {
                "filter": {
                    "bool": {
                        "must": filter_must,
                        "should": filter_should,
                        "minimum_should_match": 1,
                    }
                }
            }
        },
        "sort": [{"UsageStats.usage_count": {"order": "desc"}}],
        "size": limit,
    }

    logger.debug(f"Search body: {search_body}")

    try:
        response = client.search(index=INDEX_NAME, body=search_body)
        logger.debug(f"Search response: {response}")

        bots = [
            BotMeta.from_opensearch_response(hit, user.id)
            for hit in response["hits"]["hits"]
        ]
        logger.info(f"Found {len(bots)} bots sorted by usage count")
        return bots

    except Exception as e:
        logger.error(f"Error searching bots: {e}")
        raise


def find_random_bots(
    user: User,
    limit: int = 20,
    client: OpenSearch | None = None,
) -> list[BotMeta]:
    """Find random bots while considering access control."""
    client = client or get_opensearch_client()
    logger.info(f"Searching random bots")

    filter_must = [{"prefix": {"SK.keyword": "BOT"}}]
    filter_should = [
        {"term": {"SharedScope.keyword": "all"}},  # Public bots
        # Owner's bots (private or partial)
        {
            "bool": {
                "must": [
                    {"term": {"PK.keyword": user.id}},
                    {
                        "bool": {
                            "should": [
                                {
                                    "bool": {
                                        "must_not": {"exists": {"field": "SharedScope"}}
                                    }
                                },
                                {"term": {"SharedScope.keyword": "partial"}},
                            ],
                            "minimum_should_match": 1,
                        }
                    },
                ]
            }
        },
        # Partial shared bots with access permission
        {
            "bool": {
                "must": [
                    {"term": {"SharedScope.keyword": "partial"}},
                    {
                        "bool": {
                            "should": [
                                {"term": {"AllowedCognitoUsers.keyword": user.id}},
                                {
                                    "script": {
                                        "script": {
                                            "source": (
                                                "for (group in doc['AllowedCognitoGroups.keyword']) { "
                                                "if (params.user_groups.contains(group)) { return true; } } "
                                                "return false;"
                                            ),
                                            "params": {"user_groups": user.groups},
                                            "lang": "painless",
                                        }
                                    }
                                },
                            ],
                            "minimum_should_match": 1,
                        }
                    },
                ]
            }
        },
    ]

    seed = int(time.time()) + random.randint(0, 10000)
    search_body = {
        "query": {
            "function_score": {
                "query": {
                    "bool": {
                        "filter": {
                            "bool": {
                                "must": filter_must,
                                "should": filter_should,
                                "minimum_should_match": 1,
                            }
                        }
                    }
                },
                "random_score": {"seed": seed},
            }
        },
        "size": limit,
    }

    logger.debug(f"Search body: {search_body}")

    try:
        response = client.search(index=INDEX_NAME, body=search_body)
        logger.debug(f"Search response: {response}")

        bots = [
            BotMeta.from_opensearch_response(hit, user.id)
            for hit in response["hits"]["hits"]
        ]
        logger.info(f"Found {len(bots)} random bots")
        return bots

    except Exception as e:
        logger.error(f"Error searching bots: {e}")
        raise
