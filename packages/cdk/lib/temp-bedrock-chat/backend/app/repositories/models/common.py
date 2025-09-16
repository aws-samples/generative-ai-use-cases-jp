import base64
from decimal import Decimal
from typing import Annotated, Any, Dict, List, Type, get_args

from pydantic import BaseModel, ConfigDict
from pydantic.functional_serializers import PlainSerializer
from pydantic.functional_validators import PlainValidator

# Declare customized float type
Float = Annotated[
    # Note: Before decimalization, apply str() to keep the precision
    float,
    PlainSerializer(lambda v: Decimal(str(v)), return_type=Decimal),
]


def decode_base64_string(value: Any) -> bytes:
    if type(value) == bytes:
        return value

    elif type(value) == str:
        return base64.b64decode(value)

    else:
        raise ValueError(f"Invalid value type: {type(value)}")


Base64EncodedBytes = Annotated[
    bytes,
    PlainValidator(
        func=decode_base64_string,
        json_schema_input_type=str,
    ),
    PlainSerializer(
        func=lambda v: base64.b64encode(v).decode().strip(),
        return_type=str,
    ),
]

# Ensure that the value is set to empty when serializing.
# When deserializing, need to care to fetch the value from the secret store
# such as Secrets Manager.
SecureString = Annotated[
    str,
    PlainSerializer(lambda v: "", return_type=str),
]


class DynamicBaseModel(BaseModel):
    model_config = ConfigDict(extra="allow")
