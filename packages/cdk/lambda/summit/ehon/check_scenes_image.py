import json
import boto3
import os
s3 = boto3.client('s3')

def lambda_handler(event, context):
    response = {
        "isFinished": False
    }
    s3_presigned_urls = []
    try:
        for i in range(int(event['queryStringParameters']['count'])):
            key = f'{event['queryStringParameters']['id']}/{str(i)}.png'
            s3.head_object(Bucket=os.environ['BUCKET_NAME'], Key=key)
            url = s3.generate_presigned_url(
                ClientMethod='get_object', 
                Params={'Bucket': os.environ['BUCKET_NAME'], 'Key': key},
                ExpiresIn=7200
            )   
            s3_presigned_urls.append(url)
        response = {
            "isFinished": True,
            "s3_presigned_urls": s3_presigned_urls
        }        
    except s3.exceptions.ClientError as e:
        print('Error')
    return {
        'statusCode': 200,
        'body': json.dumps(response, ensure_ascii=False),
        'headers': {
            "Access-Control-Allow-Headers": "Content-Type,Authorization",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "OPTIONS,POST,GET"   
        }
    }