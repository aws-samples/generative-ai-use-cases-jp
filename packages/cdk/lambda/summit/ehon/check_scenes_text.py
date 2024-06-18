import json
import boto3
import os
ddb = boto3.client('dynamodb')

def lambda_handler(event, context):
    response = {
        "isFinished": False
    }
    
    item_response = ddb.get_item(
        TableName=os.environ['TABLE_NAME'],
        Key={
            'id': {'S': event['queryStringParameters']['id']}
        }
    )
    
    if 'Item' in item_response and 'scenes' in item_response['Item']:
        scenes = json.loads(json.dumps(item_response['Item']['scenes']["L"]))
        scenes_count = int(item_response['Item']['scenes_count']["N"])
        response = {
            "isFinished": True,
            "scenes": scenes,
            "scenes_count": scenes_count
        }
    
    return {
        'statusCode': 200,
        'body': json.dumps(response, ensure_ascii=False),
        'headers': {
            "Access-Control-Allow-Headers": "Content-Type,Authorization",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "OPTIONS,POST,GET"   
        }
    }