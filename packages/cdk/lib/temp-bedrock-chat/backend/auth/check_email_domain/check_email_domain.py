import os
import json
from typing import Dict

ALLOWED_SIGN_UP_EMAIL_DOMAINS_STR = os.environ.get("ALLOWED_SIGN_UP_EMAIL_DOMAINS_STR")
ALLOWED_SIGN_UP_EMAIL_DOMAINS = (
    json.loads(ALLOWED_SIGN_UP_EMAIL_DOMAINS_STR)
    if ALLOWED_SIGN_UP_EMAIL_DOMAINS_STR
    else []
)


def check_email_domain(email: str) -> bool:
    # Determine whether to allow the email domain
    # Always disallow if the number of '@' in the email is not exactly one
    if email.count("@") != 1:
        return False

    # Allow if the domain part of the email matches any of the allowed domains
    # Otherwise, disallow
    # (Always disallow if ALLOWED_SIGN_UP_EMAIL_DOMAINS is empty)
    domain = email.split("@")[1]
    return domain in ALLOWED_SIGN_UP_EMAIL_DOMAINS


def handler(event: Dict, context: Dict) -> Dict:
    """
    Cognito Pre Sign-up Lambda Trigger.

    :param event: The event from Cognito.
    :param context: The Lambda execution context.
    :return: The response to Cognito.
    """
    try:
        print("Received event:", json.dumps(event, indent=2))
        email = event["request"]["userAttributes"]["email"]
        is_allowed = check_email_domain(email)
        if is_allowed:
            # Return the event object as is on success
            return event
        else:
            # Raise an exception with an error message on failure
            raise Exception("Invalid email domain")
    except Exception as e:
        print("Error occurred:", e)
        # Raise the exception with an appropriate error message
        raise e
