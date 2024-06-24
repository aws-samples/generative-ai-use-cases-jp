import json
import boto3
bedrock_runtime = boto3.client(service_name='bedrock-runtime', region_name="us-east-1")

def lambda_handler(event, context):
    prompt_make_plot = '''
    あなたはセンスに溢れた気鋭に溢れる情熱的な作家です。Humanがテーマを与えるので、膨らませて、物語のあらすじを考えてください。
    あらすじは物語を起承転結のシーンごとに分け、情景や描写を詳しく書くようにしてください。
    起の部分では、登場人物の人となりを説明し、読者が主人公たちに親近感を抱くような情景を描写してください。
    承の部分では、主人公は誤ちを犯しますが、途中でそのことに気づき、新たな視点で物事に取り組むようになります。
    転の部分では、承で培った経験をもとに、困難を乗り越えます。
    結の部分では、主人公がテーマを達成した様子を描写します。
    以上のような形であらすじを考案してください。シーンは4個生成してください。
    また、出来上がったあらすじはjson形式でexampleタグに示すような形式で、plot要素の中で各シーンをリスト形式で出力してください。リストの要素には、<example>タグやインデックス番号や空白を含めないでください。また、json形式以外の文字列は出力しないでください。
    <example>
        {{"plot": ["森の中でクマさんにであう","クマさんが追いかけてくる","実はクマさんは落とし物を拾っていた","笑顔で一緒に踊る"]}}
    </example>
    '''
    
    user_message = {"role": "user", "content": event['theme']}
    messages = [user_message]
    
    body = json.dumps({
        "anthropic_version": "bedrock-2023-05-31",
        "system": prompt_make_plot,
        "messages": messages,
        "max_tokens": 3000,
        "temperature": 0,
        "top_k": 250,
        "top_p": 1,
    })
    modelId = 'anthropic.claude-3-sonnet-20240229-v1:0'
    accept = 'application/json'
    contentType = 'application/json'
    
    response = bedrock_runtime.invoke_model(body=body, modelId=modelId, accept=accept, contentType=contentType)
    
    response_body = json.loads(response.get('body').read())
    return response_body['content'][0]['text']

