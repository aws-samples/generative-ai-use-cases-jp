import boto3
from fastapi import FastAPI, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import os
from pydantic import BaseModel, ConfigDict
from pydantic.alias_generators import to_camel
import tempfile
from unstructured.partition.auto import partition
from urllib.parse import urlparse

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=['*'],
    allow_methods=["*"],
    allow_headers=["*"],
)


s3 = boto3.client('s3')


def parse_s3_url(s3_url):
    # 仮想ホスト形式の URL から、bucket, key, suffix を抽出する
    # 例) https://bucket-name.s3.ap-northeast-1.amazonaws.com/key.txt
    # bucket -> bucket-name, key -> key.txt, suffix -> .txt
    url = urlparse(s3_url)

    bucket = url.netloc.split('.')[0]
    key = url.path.lstrip('/')
    suffix = os.path.splitext(key)[1]

    return bucket, key, suffix


class BaseSchema(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)


class ReadFileRequest(BaseSchema):
    file_url: str


@app.post("/")
def read_file(req: ReadFileRequest):
    bucket, key, suffix = parse_s3_url(req.file_url)

    text = ''

    with tempfile.NamedTemporaryFile(delete=True, suffix=suffix) as temp_file:
        temp_file_path = temp_file.name
        s3.download_file(bucket, key, temp_file_path)

        elements = partition(filename=temp_file_path)
        texts = [el.text for el in elements]
        text = ' '.join(texts)

    return JSONResponse(content={'text': text}, status_code=status.HTTP_200_OK)
