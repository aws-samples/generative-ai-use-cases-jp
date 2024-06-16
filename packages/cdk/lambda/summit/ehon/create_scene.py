import json
import boto3
bedrock_runtime = boto3.client(service_name='bedrock-runtime')

def lambda_handler(event, context):
    prompt_make_story = '''
    あなたはセンスに溢れた気鋭に溢れる情熱的な作家です。子ども向けに読み聞かせできるような物語を描いてください。
    Humanが物語のテーマを<Theme></Theme>タグの中で、物語の流れを端的に示したあらすじを<Plot></Plot>タグの中で与えます。全体あらすじの情報を踏まえつつ、<Scene></Scene>タグで示すシーンのあらすじをもとに、情景や背景、登場人物の心情やセリフを記述することで、読み手に伝わりやすいような臨場感のある文章を考えてください。ただし、物語の文章のみを出力し、その他の文字列は出力しないでください。また、指定されたシーンの部分のみ描画してください。各シーンに"少年"や"少女"という言葉は含めないでください。文章はですます調で出力してください。
    また、出来上がった文章はjson形式で、Scene要素の中にダブルクォーテーションで囲んで出力してください。
    <Example>タグに生成したい文章の例を示します。
    
    <Example>
    {{
        "Scene": "むかしむかし、あるところにちっちゃな、かわいい女の子がおりました。その子は、ちょっと見ただけで、どんな人でもかわいくなってしまうような子でしたが、だれよりもいちばんかわいがっていたのは、この子のおばあさんでした。おばあさんは、この子の顔を見ると、なんでもやりたくなってしまって、いったいなにをやったらいいのか、わからなくなってしまうほどでした。
     あるとき、おばあさんはこの子に、赤いビロードでかわいいずきんをこしらえてやりました。すると、それがまたこの子にとってもよくにあいましたので、それからは、もうほかのものはちっともかぶらなくなってしまいました。それで、この子は、みんなに「赤ずきんちゃん」「赤ずきんちゃん」とよばれるようになりました。"
    }}
    </Example>
    <Example>
    {{
    "Scene": "そこで、寝床のところへいって、カーテンをあけてみました。すると、そこにはおばあさんが横になっていましたが、ずきんをすっぽりと顔までかぶっていて、いつもとちがった、へんなかっこうをしています。
    「ああら、おばあさん、おばあさんのお耳は大きいのねえ。」
    「おまえのいうことが、よくきこえるようにさ。」
    「ああら、おばあさん、おばあさんのお目めは大きいのねえ。」
    「おまえがよく見えるようにさ。」
    「ああら、おばあさん、おばあさんのお手ては大きいのねえ。」
    「おまえがよくつかめるようにさ。」
    「でも、おばあさん、おばあさんのお口はこわいほど大きいのねえ。」
    「おまえがよく食べられるようにさ。」
     オオカミはこういいおわるかおわらないうちに、いきなり寝床からとびだして、かわいそうな赤ずきんちゃんを、ぱっくりとひとのみにしてしまいました。"
    }}
    </Example>
    
    
    \n\nHuman: 
    <Theme>
    {instruction}
    </Theme>
    <Plot>
    {plot}
    </Plot>
    <Scene>
    {scene}
    </Scene>
    
    \n\nAssistant: {{
    '''
    
    prompt_update = '''
    {prev_output}
    
    \n\nHuman: 
    <Scene>
    {scene}
    </Scene>
    
    \n\nAssistant: {{
    '''

    scenes = []
    prompt_next = ''
    invoke_result = ''
    
    summary = json.loads(event['summary'])['plot']
    for scene in summary:
        if prompt_next == '':
            prompt_next = prompt_make_story.format(instruction=event['theme'], plot=str(summary), scene=scene)
        else:
            prompt_next += prompt_update.format(prev_output=invoke_result, scene=scene)
        
        invoke_result = invoke_claude(prompt_next)
        
        print(invoke_result)
        result = json.loads('{' + invoke_result.replace('\n', ''))
        scenes.append(result['Scene'])

    return {
        'statusCode': 200,
        'scenes': scenes,
        'scenes_count': str(len(scenes)),
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