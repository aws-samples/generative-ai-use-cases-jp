import json

from app.routes.schemas.conversation import ChatInput
from app.usecases.chat import chat, chat_output_from_message
from app.user import User


def handler(event, context):
    """SQS consumer.
    This is used for async invocation for published api.
    """
    for record in event["Records"]:
        message_body = json.loads(record["body"])
        chat_input = ChatInput(**message_body)

        assert chat_input.bot_id is not None, "bot_id is required for published api"

        user = User.from_published_api_id(chat_input.bot_id)

        conversation, message = chat(user=user, chat_input=chat_input)
        chat_result = chat_output_from_message(
            conversation=conversation,
            message=message,
        )
        print(chat_result)

    return {"statusCode": 200, "body": json.dumps("Processing completed")}
