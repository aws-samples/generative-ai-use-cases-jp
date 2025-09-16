from typing import Optional, Self

from pydantic import BaseModel


class UserWithoutGroups(BaseModel):
    id: str
    name: str
    email: str

    @classmethod
    def from_cognito_idp_response(cls, user: dict) -> Self:
        return cls(
            id=user["Username"],
            name=user["Username"],
            # The Response for ListUsers is set to Attributes, but the Response for AdminGetUser is set to UserAttributes.
            email=next(
                attr["Value"]
                for attr in user.get("Attributes", user.get("UserAttributes", []))
                if attr["Name"] == "email"
            ),
        )


class User(UserWithoutGroups):
    groups: list[str]

    def is_admin(self) -> bool:
        return "Admin" in self.groups

    def is_creating_bot_allowed(self) -> bool:
        return True

    def is_publish_allowed(self) -> bool:
        return self.is_admin() or "PublishAllowed" in self.groups

    @classmethod
    def from_decoded_token(cls, token: dict) -> Self:
        return cls(
            id=token["sub"],
            name=token["cognito:username"],
            email=token["email"],
            groups=token.get("cognito:groups", []),
        )

    @classmethod
    def from_published_api_id(cls, bot_id: str) -> Self:
        api_bot_id = f"PUBLISHED_API#{bot_id}"
        return cls(
            id=api_bot_id,
            name=api_bot_id,
            email=api_bot_id,  # dummy email
            # Note: Publish API is allowed to access all bot resources.
            # It should be refactored to have a more fine-grained permission.
            groups=["Admin"],
        )


class UserGroup(BaseModel):
    name: str
    description: str

    @classmethod
    def from_cognito_idp_response(cls, group: dict) -> Self:
        return cls(
            name=group["GroupName"],
            description=group.get("Description", ""),
        )
