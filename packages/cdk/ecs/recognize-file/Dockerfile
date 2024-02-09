FROM public.ecr.aws/docker/library/python:3.11.6-slim-bookworm

RUN apt-get update && apt-get install -y \
    build-essential cmake \
    # opencv package requirements
    libgl1 \
    libglib2.0-0 \
    # unstructured package requirements for file type detection
    libmagic-mgc libmagic1 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /backend

COPY requirements.txt .
RUN pip3 install -r requirements.txt --no-cache-dir

COPY ./app ./app

CMD ["uvicorn", "app.main:app", "--reload", "--host", "0.0.0.0", "--port", "80"]