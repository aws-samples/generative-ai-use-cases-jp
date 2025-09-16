from app.repositories.user import (
    find_group_by_name_prefix,
    find_user_by_id,
    find_users_by_email_prefix,
)
from app.user import UserGroup, UserWithoutGroups


def search_user_by_email_prefix(
    prefix: str, limit: int = 10
) -> list[UserWithoutGroups]:
    return find_users_by_email_prefix(prefix=prefix, limit=limit)


def search_group_by_name_prefix(prefix: str) -> list[UserGroup]:
    return find_group_by_name_prefix(prefix=prefix)


def get_user_by_id(id: str) -> UserWithoutGroups | None:
    return find_user_by_id(id=id)
