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
    
    if 'Item' in item_response and 'summary' in item_response['Item']:
        summary = eval(json.loads(json.dumps(item_response['Item']['summary']["S"])))['plot']
        response = {
            "isFinished": True,
            "summary": summary
        }
    
    return {
        'statusCode': 200,
        'body': json.dumps(response, ensure_ascii=False),
        'headers': {
            "Access-Control-Allow-Headers": "Content-Type,Authorization",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "OPTIONS,POST,GET",
        }
    }