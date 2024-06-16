import json
import boto3
import os
polly = boto3.client('polly')
s3 = boto3.client('s3')

def lambda_handler(event, context):
    scenes = event['scenes']['scenes']
    for index, scene in enumerate(scenes):
        response = polly.synthesize_speech(
            Engine="neural",
            VoiceId='Kazuha',  
            OutputFormat='mp3',
            Text = scene)
        key = f'{event['id']}/{index}.mp3'
        s3.put_object(Key=key, Body=response["AudioStream"].read(), Bucket=os.environ['BUCKET_NAME'])        
        
    return {
        'statusCode': 200,
        'body': json.dumps('Hello from Lambda!')
    }


