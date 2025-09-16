import os

import requests
from jose import jwt

REGION = os.environ.get("REGION", "ap-northeast-1")
USER_POOL_ID = os.environ.get("USER_POOL_ID", "")
CLIENT_ID = os.environ.get("CLIENT_ID", "")


def verify_token(token: str) -> dict:
    # Verify JWT token
    url = f"https://cognito-idp.{REGION}.amazonaws.com/{USER_POOL_ID}/.well-known/jwks.json"
    response = requests.get(url)
    keys = response.json()["keys"]
    header = jwt.get_unverified_header(token)
    key = [k for k in keys if k["kid"] == header["kid"]][0]
    # The JWT returned from the Identity Provider may contain an at_hash
    # jose jwt.decode verifies id_token with access_token by default if it contains at_hash
    # See : https://github.com/mpdavis/python-jose/blob/4b0701b46a8d00988afcc5168c2b3a1fd60d15d8/jose/jwt.py#L59
    # Since we are not using an access token in the app, skipping the verification of the at_hash.
    # so we will disable the verify_at_hash check.
    decoded = jwt.decode(
        token,
        key,
        algorithms=["RS256"],
        options={"verify_at_hash": False},
        audience=CLIENT_ID,
    )
    return decoded
