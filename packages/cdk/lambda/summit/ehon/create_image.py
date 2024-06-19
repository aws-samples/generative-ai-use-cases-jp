import json
import boto3
import os

s3 = boto3.client('s3')
ddb = boto3.client('dynamodb')
bedrock_runtime = boto3.client(service_name='bedrock-runtime', region_name="us-east-1")

def lambda_handler(event, context):
    prompt_draw_image = '''
    絵本の挿絵を作りたいです。そのために画像生成モデル向けのプロンプトを考える必要があります。
    挿絵として、色鉛筆を使った絵を採用したいと思います。
    Humanが物語全体のあらすじを<Plot>タグで、該当のシーンを<Scene>タグで明示します。与えられたシーンでの情景を表すような文章を簡潔に英語で1文程度で生成してください。プロンプトを作る上で、以下の点に注意してください。
    * 写っている物体や人物を明確に指示する。
    * Please do not use the word "young" when you translate.
    * 各物体がどのような形なのか明確に提示する。
    * 人物はどのような服を着ていて何をしようとしているのか提示する。
    * 以下の中から、関連しそうな Finishing Touch をピックアップして追加する。Highly-detailed, surrealism, trending on artstation, triadic color scheme, smooth, sharp focus, matte, elegant, illustration, digital paint, dark, gloomy, octane render, 8k, 4k, washed-out colors, sharp, dramatic lighting, beautiful, post-processing, picture of the day, ambient lighting, epic composition
    * コンプライアンスに必ず注意する
    また、出力するプロンプトはjson形式で、prompt要素内に書き出すようにしてください。
    Exampleタグで適切な出力の例を示します。
    <Example>
    {{
    "prompt": "a panda by Leonardo da Vinci and Frederic Edwin Church, highly-detailed, dramatic lighting"
    }}
    </Example>
    <Example>
    {{
    "prompt": "A professional color photograph of a bearded man on the sidewalk" 
    }}
    </Example>
    
    \n\nHuman: 
    <Plot>
    {plot}
    </Plot>
    <Scene>
    {scene}
    </Scene>
    
    \n\nAssistant: {{
    '''

    item_response = ddb.get_item(
        TableName=os.environ['TABLE_NAME'],
        Key={
            'id': {'S': event['id']}
        }
    )
    summary = eval(json.loads(json.dumps(item_response['Item']['summary']["S"])))['plot']
    style_image = 'a color pencil painting'
    scene = event['scene']
    index = event['index']
    prompt = prompt_draw_image.format(plot=str(summary), scene=scene)
    claude_result = invoke_claude(prompt).replace('young', '')
    prompt_for_sdxl = json.loads('{' + claude_result.replace('\n', ''))['prompt']
    response = invoke_sdxl(f'{style_image}, {prompt_for_sdxl}')
    key = f'{event['id']}/{int(index)}.png'
    s3.upload_fileobj(response['body'], os.environ['BUCKET_NAME'], key, ExtraArgs={'ContentType': 'image/png'})    
          
    return {
        'statusCode': 200,
        'body': json.dumps('Hello from Lambda!')
    }


def invoke_claude(prompt: str, max_tokens_to_sample:int=3000) -> str:
    body = json.dumps({
        "prompt": prompt,
        "max_tokens_to_sample": max_tokens_to_sample,
        "temperature": 0,
        "top_k": 250,
        "top_p": 1,
    })
    modelId = 'anthropic.claude-v2:1'
    accept = 'application/json'
    contentType = 'application/json'
    
    response = bedrock_runtime.invoke_model(body=body, modelId=modelId, accept=accept, contentType=contentType)
    
    response_body = json.loads(response.get('body').read())
    text = response_body.get('completion')
    return text
    
def invoke_sdxl(prompt: str, seed:int=0):
    body = json.dumps({
        "text_prompts": [{"text": prompt}],
        "cfg_scale": 10,
        "seed": seed,
        "steps": 50
    })
    modelId = "stability.stable-diffusion-xl-v1"
    accept= "image/png"
    contentType = "application/json"
    
    response = bedrock_runtime.invoke_model(body=body, modelId=modelId, accept=accept, contentType=contentType)
    return response