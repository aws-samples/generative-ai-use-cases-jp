import os
from datetime import datetime, timedelta

import boto3

TABLE_ARN = os.environ["TABLE_ARN"]
BUCKET_NAME = os.environ["BUCKET_NAME"]

client = boto3.client("dynamodb")


def handler(event, context):
    """Export the dynamodb table to S3 for the last hour to analyze the usage for admin."""
    print(event)

    execution_time = datetime.strptime(event["time"], "%Y-%m-%dT%H:%M:%SZ")

    last_hour = (execution_time - timedelta(hours=1)).replace(
        minute=0, second=0, microsecond=0
    )
    current_hour = execution_time.replace(minute=0, second=0, microsecond=0)

    s3_prefix = current_hour.strftime("%Y/%m/%d/%H")

    print(f"TABLE_ARN: {TABLE_ARN}")
    print(f"BUCKET_NAME: {BUCKET_NAME}")
    print(f"last_hour: {last_hour}")
    print(f"current_hour: {current_hour}")
    print(f"s3_prefix: {s3_prefix}")

    response = client.export_table_to_point_in_time(
        TableArn=TABLE_ARN,
        # ClientToken="string",
        S3Bucket=BUCKET_NAME,
        S3Prefix=s3_prefix,
        ExportType="INCREMENTAL_EXPORT",
        IncrementalExportSpecification={
            # NOTE: The export period's start time is inclusive and the end time is exclusive.
            # Ref: https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/S3DataExport_Requesting.html#S3DataExport_Requesting_Console
            "ExportFromTime": last_hour,
            "ExportToTime": current_hour,
            "ExportViewType": "NEW_AND_OLD_IMAGES",
        },
    )
