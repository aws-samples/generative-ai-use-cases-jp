import { I18n } from 'aws-amplify';
import { i18nStrings } from '../@types/i18n';

export const langStrings: i18nStrings = {
    'en': {
        "additional_context": "Additional context",
        "additional_context_placeholder": "You can enter additional points you'd like to point out.", //this needs better translation
        "ai_service": "AI Service",
        "audio_transcription": "Audio Transcription",
        "audio_transcription_results": "Transcription results",
        "chats_overview": "You can interact with LLM in a chat format. We can respond quickly to detailed use cases and new use cases. It is also effective as a verification environment for prompt engineering.", //translation needs improvement
        "changing_settings_not_here": "Changing settings not on this screen.",  //needs better translation
        "delete_confirmation": "Are you sure you'd like to delete?",
        "be_specific": "Be sure to give specific and detailed instructions. It's important to express it accurately, using adjectives and adverbs.",
        "bedrock_security_example_q": "Please tell me about Bedrock's security. Please explain so you can understand why Bedrock is safe to use.",
        "bedrock_security_example_a": "Amazon Bedrock is a fully managed service that allows you to select high-performance infrastructure models (FM) provided by major AI companies such as AI21 Labs, Anthropic, Cohere, Meta, Stability AI, and Amazon with a single API. It also has a wide range of features needed to build generative AI applications, so development can be simplified while maintaining privacy and security. Using Amazon Bedrock's comprehensive functionality, you can easily experiment with different top FMs, privately customize using data using techniques such as fine tuning and search extension generation (RAG), and create managed agents to perform complex business tasks from processing travel reservations and insurance claims to creating ad campaigns and managing inventory. You can do all of this without writing any code. Amazon Bedrock is serverless, so there's no infrastructure to manage. You can also use familiar AWS services to securely integrate and deploy generative AI functionality into your applications.",
        "bedrock_security_example_c": "For presentation, set up chapters in markdown format and explain each in a nutshell.",
        "bedrock_summary_example_q": "Amazon Bedrock is a fully managed service that makes it possible to use infrastructure models (FM) provided by Amazon and major AI startups through APIs. So you can choose from a variety of FMs to find the model that best fits your use case. Amazon Bedrock's serverless experience allows you to get started with FM right away, easily experiment with FM, privately customize FM using your own data, and seamlessly integrate and deploy FM into your application using AWS tools and features. Amazon Bedrock's agent is a fully managed feature that makes it easy for developers to create generative AI applications that provide up-to-date answers based on unique knowledge sources and can complete tasks for a wide range of use cases. Bedrock's serverless experience allows you to start using it right away without managing infrastructure, privately customize FM using your own data, and easily integrate and deploy FM into your application using familiar AWS tools and features (experiments to test different models, pipelines for managing FM at scale, etc. Includes integration with Amazon SageMaker's ML functionality).",
        "cancel": "Cancel",
        "cancelled": "Cancelled",
        "cfg_scale": "Configure scale",
        "cfg_scale_help": "Higher values will produce images more strongly influenced by the prompt.",
        "chat": "Chat",
        "chats": "Chats",
        "chinese": "Chinese",
        "clear": "Clear",
        "click_each_use_case": "Click each use case to try it.",
        "click_here": "click here.", 
        "completions": "Completions",
        "conversational_style_example": "LLM: Since it takes into account the flow of conversation, you can also give instructions in a conversational style, such as “after all, make it a cat, not a dog.",  //this needs a better example than the raw translation from JP.
        "could_not_be_retrieved_error": "Could not be retrieved due to an error.",
        "cut_confirmation": "Cut confirmation", //I'm sure this is wrong
        "delete": "Delete",
        "demos": "Demos",
        "dogs_playing_example": "Instead of “dogs playing,” let's give specific instructions, such as “Shiba Inus running around happily in the grassland.",
        "editor": "Editor",
        "editor_desc": "LLM not only checks for typographical errors, but can also suggest improvements from a more objective point of view that takes into account the flow and content of sentences. You can expect the effect of improving quality by having LLM objectively check points you weren't aware of before showing them to others.",
        "editor_initial_greeting": "Good evening. I'm the perfect AI assistant to help with proofreading. Please enter a sentence of your choice.",
        "editor_sentences_to_edit": "Sentences you want to edit.",
        "english": "English",
        "errors": "Errors",
        "exclusion_example": "You can also indicate which elements you want to exclude. “Don't output...” (a list of undesirable behaviors or outputs)",
        "execute": "Execute",
        "executions": "Executions", //might mean job runs. update this.
        "fibonacci_example": "Write a Python function that returns Fibonacci numbers. Make sure that the arguments are terms and the processing is written recursively.", // might need better translation about the terms part.
        "file_upload": "File upload",
        "french": "French",
        "gen_ai": "Generative AI",
        "gen_ai_on_aws": "Generative AI on AWS",
        "generating_images": "Generating images...",
        "generating_texts": "Generating text...",
        "german": "German",
        "image_gen_chat": "Generate images in chat",
        "here": "here",
        "home": "Home",
        "image_gen": "Image Generation",
        "image_gen_desc": "Image generation AI can generate new images based on text and images. Ideas can be immediately visualized, and efficiency in design work etc. can be expected to improve. With this feature, you can get LLM to help you create prompts.",
        "image_gen_initial_greeting": "Please output a design proposal for a smartphone ad. Cute, stylish, easy to use, pop culture, friendly, for young people, music, photos, trendy smartphones, city backgrounds",
        "image_gen_iterations_help": "The number of iterations in image generation. The higher the number of steps, the more refined the image, but it takes longer to generate.",
        "image_gen_model_name": "Image generation model name",
        "image_gen_num_images": "Number of images generated",
        "image_gen_num_image_help": "While randomly setting seed, a specified number of images are simultaneously generated.",
        "image_gen_prompt": "Please enter a list of words to generate an image.",
        "image_gen_prompt_advice": "If the prompt doesn't generate the intended image, try changing the prompt or the parameters.",
        "image_gen_strength": "Image strength",
        "image_gen_strength_help": "An image closer to 1 is generated closer to the “initial image”, and closer to 0, an image different from the “initial image” is generated.",        "initial_image": "Initial image",
        "initial_image_help": "You can set the image that is the initial state for image generation. By setting the initial image, you can guide the generation of an image close to the initial image.",
        "initial_image_settings": "Initial image settings",
        "initial_image_settings_help": "It is used as an initial state for image generation. An image close to the specified image will be generated.",
        "it_can_be_executed_by": "It can be executed by", //translate this one better.
        "it_will_be_done_at": "It will be done at As for the method", //needs better translation
        "japanese": "Japanese",
        "kendra_alert": "Amazon Kendra when a message is entered search for documents in, and LLM based on the documents you've searched will generate an answer.",  //definitely needs better translation
        "kendra_fetch": "Retrieving reference documents from Kendra...",
        "kendra_if_you_only_want": "If you only want to perform an Amazon Kendra search",
        "kendra_rag_no_llm": "Semantic search with no LLM",
        "kendra_search": "Kendra Search",
        "kendra_search_desc": "Search Kendra with",
        "korean": "Korean",
        "llm_model_name": "LLM model name",
        "llm_model_regions": "LLM & image generation model regions.",
        "llm_model_type": "LLM model type",
        "llm_prompt_template": "LLM prompt template",
        "loading": "Loading",
        "lets_experience_gen_ai": "Let's experience generative AI",
        "meeting_resume": "Meeting Resume",
        "negative_prompt": "Negative prompt",
        "negative_prompt_help": "Please list the elements you don't want to generate and the elements you want to eliminate. It is not written in sentences, but in a list of words.",
        "no_indications": "There are no indications", // this one seems like it needs better translation
        "no_sentences_needed_example": "If writing in sentences is difficult, there is no need to write in sentences. Let's list the characteristics and give instructions, such as “doing well, playing ball, jumping.",
        "not_set": "Not set.",
        "please_enter": "Please enter text",
        "please_enter_search": "Please enter a search term",
        "please_refer_to_jp_pt1": "Please refer to",
        "please_refer_to_jp_pt2": "for more information",
        "prompts": "Prompts",
        "prompts_chat": "You are an AI assistant that assists users via chat.",
        "prompts_editor": "You're a strict reviewer who carefully points out even the smallest details.",
        "prompts_editor_template_pt1": `Please present a correction plan for typographical errors and omissions in input sentences, and specifically point out the parts where evidence or data are lacking.
            <input>
        `,
        "prompts_editor_template_pt2": "</input>",
        "prompts_editor_template_pt3": `However, please consider that corrections and suggestions were surrounded by the following xml tags <other things I want you to point out></other things I want you to point out>. 
        <other things I want you to point out>`,
        "prompts_editor_template_pt4": '</other things I want you to point out>',
        "prompts_editor_template_pt5": `The output should only be a JSON array in output-format format, surrounded by tags.<output></output>
        <output-format>`,
        "prompts_editor_template_pt6": `</output-format>
        If there are no notes, output an empty array. There is no need for output such as “there are no pointed out matters” or “there are no typos or omissions.”
        `,
        "prompts_gen": "Prompts are automatically generated and set in a chat format, and images are generated.", //needs less awkward translation
        "prompts_gen_error": "An error occurred while generating.",
        "prompts_generator": "You're a writer who creates sentences according to instructions.",
        "prompts_image_generator": `
            You're an AI assistant that generates prompts for Stable Diffusion.
            Follow the steps below to generate a StableDiffusion prompt.

            <step>
            * Please understand the rules. Please make sure to follow the rules. There are no exceptions.
            * Users indicate the requirements for the images they want generated via chat. Make sure you understand all of the chat conversations.
            * Please correctly recognize the characteristics of the image you want to generate from chat exchanges.
            * Please output the important elements in image generation to the prompt in order starting from the beginning. Do not output anything other than the words specified in the rules. There are no exceptions.</step>

            <rule>
            * Please output the prompt in JSON format according to output-format. Do not output any strings other than JSON. It is prohibited to output JSON before or after.
            * Outputting text other than JSON format is prohibited at all. Greetings, small talk, explanation of rules, etc. are prohibited at all.
            * If there are no prompts to output, leave prompt and negativePrompt empty and state the reason in the comments.
            * Prompts should be output word by word and separated by commas. Please do not output long sentences. Be sure to print the prompts in English.
            * The prompt must include the following elements:
            * Image quality, subject information, clothing, hairstyles, facial expressions, accessories, etc., information on painting style, background information, composition information, information on lighting and filters
            * For elements you don't want included in the image, output them as negativePrompt. Note that negativePrompt must be output.
            * Do not output inappropriate elements to be filtered.
            * Please output comments as per comment-rule.
            * Please output the recommendedStylePreset according to the recommended-style-preset-rule</rule>.

            <comment-rule>
            * Always “An image has been generated. By continuing the conversation, you can bring the image closer to the ideal one. The following is an improvement plan.” Please write the phrase “” at the beginning.
            * Please suggest improvements to the 3 images in bullet points.
            * Please output\\nfor line breaks</comment-rule>.

            <recommended-style-preset-rule>
            * Please suggest 3 StylePresets that you think are compatible with the generated images. Be sure to set it in an array.
            * StylePresets are available in the following types. Be sure to suggest the following:
            * 3d-model, analog-film, animation, cinematic, comic-book, digital-art, enhance, fantasy-art, isometric, line-art, low-poly, modeling-compound, neon-punk, origami, photographic, pixel-art, tile-texture
            </recommended-style-preset-rule>

            <output-format>
            {
            prompt: string,
            negativePrompt: string,
            comment: string
            recommendedStylePreset: string []
            </output-format>}
        `,
        "prompts_rag_pt1": `You are an AI assistant that generates queries for use in document searches.
        Follow the steps below to generate a query.
        
        <procedure for generating a query>
        * Please make sure you understand all of the following <query history></query history>. The history is arranged in oldest order, with the most recent Queries at the bottom.
        * Ignore all queries that aren't “Summarize” or the like
        * “What is ~?” “What is...?” For questions that ask for an overview such as “explain ~”, please replace it with “overview of ~.”
        * What users want to know most is the content of the newest Queries. Generate a query within 30 tokens, based on the content of the most recent query.
        * If there is no subject in the output query, add a subject. Never replace the subject.
        * When complementing the subject or background, please supplement it based on the content of “# Query History”.
        * Never use endings such as “about ~,” “please tell me about ~,” or “I'll teach you about ~” in Query
        * If there is no query to output, output “No Query”
        * Please output only the generated query. Do not output any other strings. There are no exceptions. </procedure for generating a query>
        
        <query history>`,
        "prompts_rag_pt2": `</query history>`,
        "prompts_rag_pt3": `You are an AI assistant that answers user questions.
        Please follow the steps below to answer the user's questions. Never do anything other than the steps.
        
        <response procedure>
        * Documents that serve as reference for answers are set in “# reference documents”, so please understand all of them. Note that this “# reference document” is set in the “# reference document JSON format” format.
        * Please understand the “# answer rule.” Please abide by this rule at all costs. Don't do anything other than the rules. There are no exceptions.
        * Since questions are entered from users in the chat, please answer according to the “# answer rules” based on the contents of “# reference documents.” 
        </response procedure>
        
        <reference_document_json_format>
        {
        “documentId”: “An ID that uniquely identifies a document.” ,
        “documentTitle”: “The title of the document.” ,
        “documentURI”: “The URI where the document is stored.” ,
        “Content”: “This is the content of the document. Please use this as a basis for your answers.” ,
        } [] </reference_document_json_format>
        
        <reference_documents>
        [`,
        "prompts_rag_pt4": `</reference_documents>]

        <answer_rules>
        * Please do not respond to small talk or greetings. “I can't chat. Please use the normal chat function.” Please output just that. Do not output any other words. There are no exceptions.
        <reference_documents>* Please be sure to base your answers. Never answer anything you<reference_documents> can't read from.
        * At the end of the answer, please output the “# reference document” that you used as a reference for your answer. Please output the heading “---\n#### Reference documentation for answers” and output DocumentTitle and DocumentURI in hyperlink format.
        If you are unable to answer based on*, “The information required to answer was not found. <reference_documents>” Please output just that. There are no exceptions.
        * If your question isn't specific and you can't answer it, please give advice on how to ask the question.
        * Please do not output any strings other than the answer text. Please output your answers in text, not in JSON format. There is no need for headings, titles, etc </answer_rules>.
        `,
        "prompts_summarize": "You're an AI assistant who summarizes sentences. Summarization instructions will be given in the first chat, so please improve the summary results in subsequent chats.",
        "prompts_summarizer_pt1": `
            Please summarize the sentences surrounded <sentences to be summarized></sentences to be summarized> by xml tags below.

            <sentences to be summarized>
        `,
        "prompts_summarizer_pt2": "</sentences to be summarized>",
        "prompts_summarizer_pt3": "",
        "prompts_summarizer_pt4": `When summarizing, please consider the content surrounded by the following xml tags. <things I want you to consider when summarizing></things I want you to consider when summarizing>

            <things I want you to consider when summarizing>
        `,
        "prompts_summarizer_pt5": "</things I want you to consider summarizing>",
        "prompts_summarizer_pt6": `Please output only summarized sentences. Please do not output any other sentences.
            For output, please surround the summary content with xml tags.<output></output> There are no exceptions.
        `,
        "prompts_text_gen_pt1": `<input>Please create a sentence according to the instructions from the information. Please output only sentences in the format indicated. Do not output any other words. There are no exceptions.
        Surround the output<output></output> with xml tags.
        <input>`,
        "prompts_text_gen_pt2": `</input>
        <format of sentences to be created>
        `,
        "prompts_text_gen_pt3": "</format of sentences to be created>",
        "prompts_translation_pt1": "<input></input>Sentences surrounded by xml tags",
        "prompts_translation_pt2": `Please translate it to
        Please output only translated sentences. Do not output any other sentences.
        <input>`,
        "prompts_translation_pt3": `However, please take into account<things I want you to consider></things I want you to consider> the content surrounded by xml tags when translating. <things I want you to consider>`,
        "prompts_translation_pt4": `As for the output, please surround only the translation results<output></output> with xml tags.
        Do not output any other sentences. There are no exceptions.`,
        "prompts_translator": "You are a translator who captures the intent of sentences and translates them appropriately.",
        "prompt_gen_complete": "Prompt generation complete.",
        "rag_chat": "RAG Chat",
        "rag_alert": "RAG (Retrieval Augmented Generation) You can do method chats.",  // needs better translation
        "rag_desc": "RAG (Retrieval Augmented Generation) is a method that combines information retrieval and LLM sentence generation, so effective information access can be achieved. Since LLM generates answers based on reference documents obtained from Amazon Kendra, it is possible to easily implement an “LLM chat compatible with internal information.”",
        "rag_enabled": "Rag enabled",
        "rerun": "Re-run",
        "seed_help": "The seed value for random numbers. If the same seed value is specified, the same image will be generated.",
        "seed_button_text": "Set random seed",
        "settings": "Settings",
        "sign_out": "Sign Out",
        "spanish": "Spanish",
        "start_over": "Start over",
        "step": "Step",
        "summarize": "Summarize",
        "summarize_desc": "LLM excels at the task of summarizing large amounts of sentences. When summarizing, you can give context such as “in one line” or “in words that even children can understand.”",
        "summarize_sentences": "Sentences to summarize",
        "summarized_sentences": "Summarized sentences",
        "text_gen": "Text Generation",
        "text_gen_desc": "Generating sentences in every context is one of the tasks LLM excels at. It supports all kinds of contexts, such as articles, reports, emails, etc.",
        "text_gen_display_label": "Generated text",
        "text_gen_format": "Please indicate the format of the text. (markdown, blogs, business emails, etc.)",
        "text_gen_source": "Information that is the source of the text", // this needs better translation
        "tips": "Tips",
        "tool": "Tool",
        "translation": "Translation",
        "translation_autodetect": "Autodetect languages",
        "translation_desc": "LLM learned in multiple languages can also be translated. Also, in addition to simply translating, it is possible to reflect various specified context information such as casuality and target groups in the translation.",
        "translation_initial_greeting": "Hello. I'm an AI assistant that helps with translations. Please enter a sentence of your choice.",
        "translation_sentences": "Sentences to translate",
        "upload_image": "Upload an image",
        "use_case": "Use Case",
        "use_case_list": "List of use cases",
        "use_case_if_error_pt1": "If you get an error when running a use case, be sure to enable",
        "use_case_if_error_pt3": "(LLM) and",
        "use_case_if_error_pt4": "(image generation) For more information on how to enable it, please refer to ",
        "use_case_if_error_pt5": "",
    },
    'jp': {
        "additional_context": "追加コンテキスト",
        "additional_context_placeholder": "追加で指摘してほしい点を入力することができます",
        "ai_service": "AIサービス",
        "appointment": "要約",
        "audio_transcription": "音声認識",
        "audio_transcription_results": "音声認識結果がここに表示されます",
        "be_specific": "具体的かつ詳細な指示を出すようにしましょう。形容詞や副詞を使って、正確に表現することが重要です。",
        "bedrock_security_example_q": "Bedrock のセキュリティについて、教えてください。なぜ Bedrock が安全に利用できるのかわかるように説明してください。",
        "bedrock_security_example_a": "Amazon Bedrock は、AI21 Labs、Anthropic、Cohere、Meta、Stability AI、Amazon などの大手 AI 企業が提供する高性能な基盤モデル (FM) を単一の API で選択できるフルマネージド型サービスです。また、生成系 AI アプリケーションの構築に必要な幅広い機能も備えているため、プライバシーとセキュリティを維持しながら開発を簡素化できます。Amazon Bedrock の包括的な機能を使用すると、さまざまなトップ FM を簡単に試したり、微調整や検索拡張生成 (RAG) などの手法を使用してデータを使用してプライベートにカスタマイズしたり、旅行の予約や保険金請求の処理から広告キャンペーンの作成や在庫管理まで、複雑なビジネスタスクを実行するマネージドエージェントを作成したりできます。これらはすべて、コードを記述することなく行えます。Amazon Bedrock はサーバーレスであるため、インフラストラクチャを管理する必要がありません。また、使い慣れた AWS サービスを使用して、生成系 AI 機能をアプリケーションに安全に統合してデプロイできます。",
        "bedrock_security_example_c": "プレゼンテーションのために、マークダウン形式で章立てして、それぞれ端的に説明を",
        "bedrock_summary_example_q": "Amazon Bedrock は、Amazon や主要な AI スタートアップ企業が提供する基盤モデル (FM) を API を通じて利用できるようにする完全マネージド型サービスです。そのため、さまざまな FM から選択して、ユースケースに最も適したモデルを見つけることができます。Amazon Bedrock のサーバーレスエクスペリエンスにより、すぐに FM を開始したり、FM を簡単に試したり、独自のデータを使用して FM をプライベートにカスタマイズしたり、AWS のツールや機能を使用して FM をアプリケーションにシームレスに統合してデプロイしたりできます。Amazon Bedrock のエージェントは、開発者が独自の知識源に基づいて最新の回答を提供し、幅広いユースケースのタスクを完了できるジェネレーティブ AI アプリケーションを開発者が簡単に作成できるようにする完全マネージド機能です。Bedrock のサーバーレスエクスペリエンスにより、インフラストラクチャを管理することなく、すぐに使用を開始し、独自のデータを使用して FM をプライベートにカスタマイズし、使い慣れた AWS ツールや機能を使用してそれらをアプリケーションに簡単に統合してデプロイできます (さまざまなモデルをテストするための実験や FM を大規模に管理するためのパイプラインなどの Amazon SageMaker の ML 機能との統合を含みます)。",        
        "cancel": "[キャンセル]",  //this one was English in the original code and Translate provided the Japanese. Please confirm this one.
        "cancelled": "キャンセル",
        "cfg_scale": "CFG スケール",
        "changing_settings_not_here": "設定の変更はこの画面ではなく",
        "chats_overview": "LLM とチャット形式で対話することができます。細かいユースケースや新しいユースケースに迅速に対応することができます。プロンプトエンジニアリングの検証用環境としても有効です。", //I'm not sure on this. needs checking.
        "click_each_use_case": "をクリックすることで、各ユースケースを体験できます。",
        "cfg_scale_help": "この値が高いほどプロンプトに対して忠実な画像を生成します。",
        "chat": 'チャット',
        "chats": 'チャット',
        "chinese": "中国語",
        "clear": "クリア",
        "click_here": "のページに遷移してください。",
        "completions": "完了",
        "conversational_style_example": "LLM  が会話の流れを考慮してくれるので、「やっぱり犬じゃなくて猫にして」などの会話形式の指示もできます。",
        "could_not_be_retrieved_error": "エラーで取得できませんでした",
        "cut_confirmation": "削除確認", //i'm sure this is wrong, but waiting to find it in the UI before fixing it.
        "delete": "削除",
        "delete_confirmation": "を削除しますか？",
        "demos": "デモ",
        "dogs_playing_example": "「犬が遊んでいる」ではなく、「柴犬が草原で楽しそうに走り回っている」のように具体的に指示をしましょう",
        "editor": "校正",  // Amazon Translate translated this as "corrects" but the path is /editor. Not sure what to call this.
        "editor_desc": "LLM は、誤字脱字のチェックだけでなく、文章の流れや内容を考慮したより客観的な視点から改善点を提案できます。人に見せる前に LLM に自分では気づかなかった点を客観的にチェックしてもらいクオリティを上げる効果が期待できます。",
        "editor_initial_greeting": "こんちは。私は校正を支援する完璧な AI アシスタントです。お好きな文章を入力してくさい。",
        "editor_sentences_to_edit": "校正したい文章", //this one should be fixed to match what the editor string gets updated to.
        "english": "英語",
        "errors": "エラー",
        "execute": "実行",
        "exclusion_example": "除外して欲しい要素も指示することができます。「人間は出力しない」など。",
        "executions": "実行",
        "fibonacci_example": "フィボナッチ数を返す Python の関数を書いてください。引数が項で、処理は再帰で書くようにしてください。",
        "file_upload": "ファイルアップロード",
        "french": "フランス語",
        "gen_ai": "生成系AI",
        "gen_ai_on_aws": "AWS でのジェネレーティブ AI",  //Amazon translate came up with this one. Please confirm.
        "generating_images": "画像生成中",
        "generating_text": "プロンプト生成中",
        "german": "ドイツ語",
        "image_gen_chat": "チャット形式で画像生成",
        "here": "こちら",
        "home": "ホーム",
        "image_gen": "画像生成",
        "image_gen_desc": "画像生成 AI は、テキストや画像を元に新しい画像を生成できます。アイデアを即座に可視化することができ、デザイン作業などの効率化を期待できます。こちらの機能では、プロンプトの作成を LLM に支援してもらうことができます。",
        "image_gen_initial_greeting": "スマホ広告のデザイン案を出力してください。可愛い、おしゃれ、使いやすい、POPカルチャー、親しみやすい、若者向け、音楽、写真、流行のスマホ、背景が街",
        "image_gen_iterations_help": "画像生成の反復回数です。Step 数が多いほど画像が洗練されますが、生成に時間がかかります。", 
        "image_gen_model_name": "画像生成 モデル名",
        "image_gen_num_images": "画像生成数",
        "image_gen_num_images_help": "Seed をランダム設定しながら画像を指定の数だけ同時に生成します。",
        "image_gen_prompt": "生成したい画像の説明を記載してください。文章ではなく、単語の羅列で記載します。",
        "image_gen_prompt_advice": "プロンプトで意図した画像が生成できない場合は、初期画像の設定やパラメータの変更を試してみましょう。",
        "image_gen_strength": "画像強度",
        "image_gen_strength_help": "1に近いほど「初期画像」に近い画像が生成され、0に近いほど「初期画像」とは異なる画像が生成されます。",
        "initial_image": "初期画像",
        "inital_image_help": "画像生成の初期状態となる画像を設定できます。初期画像を設定することで、初期画像に近い画像を生成するように誘導できます。",
        "initial_image_settings": "初期画像の設定",
        "initial_image_settings_help": "画像生成の初期状態として使われます。指定した画像に近い画像が生成されます。",
        "it_can_be_executed_by": "で実行できます。",  //this one might need better translation
        "it_will_be_done_at": "で行います。方法については",
        "japanese": "日本語",
        "kendra_alert": "メッセージが入力されると Amazon Kendra でドキュメントを検索し、検索したドキュメントをもとに LLM が回答を生成します。",
        "kendra_fetch": "Kendra から参照ドキュメントを取得中",
        "kendra_if_you_only_want": "Amazon Kendra の検索のみを実行する場合は",
        "kendra_rag_no_llm": "生成系 AI は利用していません。RAG は",
        "kendra_search": "Kendra 検索",
        "kendra_search_desc": "この機能は、Amazon Kendra の標準機能である Query API で検索を行います。",
        "korean": "韓国語",
        "lets_experience_gen_ai": "生成系 AI を体験してみましょう。",
        "llm_model_name": "LLM モデル名",
        "llm_model_regions": "LLM & 画像生成 モデルリージョン",
        "llm_model_type": "LLM モデルタイプ",
        "llm_prompt_template": "LLM プロンプトテンプレート",
        "loading": "読み込み中",
        "meeting_resume": "会話履歴",  // might need fixing
        "negative_prompt": "ネガティブプロンプト",
        "negative_prompt_help": "生成したくない要素、排除したい要素を記載してください。文章ではなく、単語の羅列で記載します。",
        "no_indications": "指摘事項はありません",
        "no_sentences_needed_example": "文章で書くことが難しい場合は、文章で書く必要はありません。「元気、ボール遊び、ジャンプしている」のように、特徴を羅列して指示をしましょう。",
        "not_set": "未設定",
        "please_enter": "入力してください",
        "please_enter_search": "検索ワードを入力してください",
        "please_refer_to_jp_pt1": "で行います。方法については",
        "please_refer_to_jp_pt2": "をご参照ください。",
        "prompts": "プロンプト",
        "prompts_chat": "あなたはチャットでユーザを支援するAIアシスタントです。",
        "prompts_editor": "あなたは丁寧に細かいところまで指摘する厳しい校閲担当者です。",
        "prompts_editor_template_pt1": `inputの文章において誤字脱字は修正案を提示し、根拠やデータが不足している部分は具体的に指摘してください。
            <input>
        `,
        "prompts_editor_template_pt2": "</input>",
        "prompts_editor_template_pt3": "ただし、修正案や指摘は以下の <その他指摘してほしいこと></その他指摘してほしいこと>の xml タグで囲われたことを考慮してください。 <その他指摘してほしいこと>",
        "prompts_editor_template_pt4": '</その他指摘してほしいこと>',
        "prompts_editor_template_pt5": `出力は output-format 形式の JSON Array だけを <output></output> タグで囲って出力してください。
        <output-format>
        `,
        "prompts_editor_template_pt6": `</output-format>
            指摘事項がない場合は空配列を出力してください。「指摘事項はありません」「誤字脱字はありません」などの出力は一切不要です。
        `,
        "prompts_gen": "チャット形式でプロンプトの生成と設定、画像生成を自動で行います。",
        "prompts_generator": "あなたは指示に従って文章を作成するライターです。",
        "prompts_gen_error": "プロンプト生成中にエラーが発生しました。",
        "prompts_image_generator": `あなたはStable Diffusionのプロンプトを生成するAIアシスタントです。
            以下の step でStableDiffusionのプロンプトを生成してください。
            
            <step>
            * rule を理解してください。ルールは必ず守ってください。例外はありません。
            * ユーザは生成して欲しい画像の要件をチャットで指示します。チャットのやり取りを全て理解してください。
            * チャットのやり取りから、生成して欲しい画像の特徴を正しく認識してください。
            * 画像生成において重要な要素をから順にプロンプトに出力してください。ルールで指定された文言以外は一切出力してはいけません。例外はありません。
            </step>
            
            <rule>
            * プロンプトは output-format の通りに、JSON形式で出力してください。JSON以外の文字列は一切出力しないでください。JSONの前にも後にも出力禁止です。
            * JSON形式以外の文言を出力することは一切禁止されています。挨拶、雑談、ルールの説明など一切禁止です。
            * 出力するプロンプトがない場合は、promptとnegativePromptを空文字にして、commentにその理由を記載してください。
            * プロンプトは単語単位で、カンマ区切りで出力してください。長文で出力しないでください。プロンプトは必ず英語で出力してください。
            * プロンプトには以下の要素を含めてください。
            * 画像のクオリティ、被写体の情報、衣装・ヘアスタイル・表情・アクセサリーなどの情報、画風に関する情報、背景に関する情報、構図に関する情報、ライティングやフィルタに関する情報
            * 画像に含めたくない要素については、negativePromptとして出力してください。なお、negativePromptは必ず出力してください。
            * フィルタリング対象になる不適切な要素は出力しないでください。
            * comment は comment-rule の通りに出力してください。
            * recommendedStylePreset は recommended-style-preset-rule の通りに出力してください。
            </rule>
            
            <comment-rule>
            * 必ず「画像を生成しました。続けて会話することで、画像を理想に近づけていくことができます。以下が改善案です。」という文言を先頭に記載してください。
            * 箇条書きで3つ画像の改善案を提案してください。
            * 改行は\\nを出力してください。
            </comment-rule>
            
            <recommended-style-preset-rule>
            * 生成した画像と相性の良いと思われるStylePresetを3つ提案してください。必ず配列で設定してください。
            * StylePresetは、以下の種類があります。必ず以下のものを提案してください。
            * 3d-model,analog-film,anime,cinematic,comic-book,digital-art,enhance,fantasy-art,isometric,line-art,low-poly,modeling-compound,neon-punk,origami,photographic,pixel-art,tile-texture
            </recommended-style-preset-rule>
            
            <output-format>
            {
            prompt: string,
            negativePrompt: string,
            comment: string
            recommendedStylePreset: string[]
            }
            </output-format>
        `,
        "prompts_rag_pt1": `あなたは、文書検索で利用するQueryを生成するAIアシスタントです。
        以下の手順通りにQueryを生成してください。
        
        <Query生成の手順>
        * 以下の<Query履歴>の内容を全て理解してください。履歴は古い順に並んでおり、一番下が最新のQueryです。
        * 「要約して」などの質問ではないQueryは全て無視してください
        * 「〜って何？」「〜とは？」「〜を説明して」というような概要を聞く質問については、「〜の概要」と読み替えてください。
        * ユーザが最も知りたいことは、最も新しいQueryの内容です。最も新しいQueryの内容を元に、30トークン以内でQueryを生成してください。
        * 出力したQueryに主語がない場合は、主語をつけてください。主語の置き換えは絶対にしないでください。
        * 主語や背景を補完する場合は、「# Query履歴」の内容を元に補完してください。
        * Queryは「〜について」「〜を教えてください」「〜について教えます」などの語尾は絶対に使わないでください
        * 出力するQueryがない場合は、「No Query」と出力してください
        * 出力は生成したQueryだけにしてください。他の文字列は一切出力してはいけません。例外はありません。
        </Query生成の手順>
        
        <Query履歴>`,
        "prompts_rag_pt2": "</Query履歴>",
        "prompts_rag_pt3": `あなたはユーザの質問に答えるAIアシスタントです。
        以下の手順でユーザの質問に答えてください。手順以外のことは絶対にしないでください。
        
        <回答手順>
        * 「# 参考ドキュメント」に回答の参考となるドキュメントを設定しているので、それを全て理解してください。なお、この「# 参考ドキュメント」は「# 参考ドキュメントのJSON形式」のフォーマットで設定されています。
        * 「# 回答のルール」を理解してください。このルールは絶対に守ってください。ルール以外のことは一切してはいけません。例外は一切ありません。
        * チャットでユーザから質問が入力されるので、あなたは「# 参考ドキュメント」の内容をもとに「# 回答のルール」に従って回答を行なってください。
        </回答手順>
        
        <参考ドキュメントのJSON形式>
        {
        "DocumentId": "ドキュメントを一意に特定するIDです。",
        "DocumentTitle": "ドキュメントのタイトルです。",
        "DocumentURI": "ドキュメントが格納されているURIです。",
        "Content": "ドキュメントの内容です。こちらをもとに回答してください。",
        }[]
        </参考ドキュメントのJSON形式>
        
        <参考ドキュメント>
        [`,
        "prompts_rag_pt4": `]
        </参考ドキュメント>
        
        <回答のルール>
        * 雑談や挨拶には応じないでください。「私は雑談はできません。通常のチャット機能をご利用ください。」とだけ出力してください。他の文言は一切出力しないでください。例外はありません。
        * 必ず<参考ドキュメント>をもとに回答してください。<参考ドキュメント>から読み取れないことは、絶対に回答しないでください。
        * 回答の最後に、回答の参考にした「# 参考ドキュメント」を出力してください。「---\n#### 回答の参考ドキュメント」と見出しを出力して、ハイパーリンク形式でDocumentTitleとDocumentURIを出力してください。
        * <参考ドキュメント>をもとに回答できない場合は、「回答に必要な情報が見つかりませんでした。」とだけ出力してください。例外はありません。
        * 質問に具体性がなく回答できない場合は、質問の仕方をアドバイスしてください。
        * 回答文以外の文字列は一切出力しないでください。回答はJSON形式ではなく、テキストで出力してください。見出しやタイトル等も必要ありません。
        </回答のルール>`,
        "prompts_summarize": "あなたは文章を要約するAIアシスタントです。最初のチャットで要約の指示を出すので、その後のチャットで要約結果の改善を行なってください。",
        "prompts_summarizer_pt1": `
            以下の <要約対象の文章></要約対象の文章> の xml タグで囲われた文章を要約してください。
            <要約対象の文章>
        `,
        "prompts_summarizer_pt2": "</要約対象の文章>",
        "prompts_summarizer_pt3": "",
        "prompts_summarizer_pt4": `要約する際、以下の <要約時に考慮して欲しいこと></要約時に考慮して欲しいこと> の xml タグで囲われた内容を考慮してください。
                <要約時に考慮して欲しいこと>
        `,
        "prompts_summarizer_pt5": "</要約時に考慮して欲しいこと>",
        "prompts_summarizer_pt6":  `要約した文章だけを出力してください。それ以外の文章は一切出力しないでください。
            出力は要約内容を <output></output> の xml タグで囲って出力してください。例外はありません。
        `,
        "prompts_text_gen_pt1": `<input>の情報から指示に従って文章を作成してください。指示された形式の文章のみを出力してください。それ以外の文言は一切出力してはいけません。例外はありません。
        出力は<output></output>のxmlタグで囲んでください。
        <input>`,
        "prompts_text_gen_pt2": `</input>
        <作成する文章の形式>
        `,
        "prompts_text_gen_pt3":"</作成する文章の形式>",
        "prompts_translation_pt1": "<input></input>の xml タグで囲われた文章を",
        "prompts_translation_pt2": `に翻訳してください。
        翻訳した文章だけを出力してください。それ以外の文章は一切出力してはいけません。
        <input>`,
        "prompts_translation_pt3": "ただし、翻訳時に<考慮して欲しいこと></考慮して欲しいこと> の xml タグで囲われた内容を考慮してください。<考慮して欲しいこと>",
        "prompts_translation_pt4": `出力は翻訳結果だけを <output></output> の xml タグで囲って出力してください。
        それ以外の文章は一切出力してはいけません。例外はありません。`,
        "prompts_translator": "あなたは文章の意図を汲み取り適切な翻訳を行う翻訳者です。",
        "prompt_gen_complete": "プロンプト生成完了",
        "rag_chat": "RAG チャット",
        "rag_alert": "RAG (Retrieval Augmented Generation) 手法のチャットを行うことができます。",  // might need better translation
        "rag_desc": "RAG (Retrieval Augmented Generation) は、情報の検索と LLM の文章生成を組み合わせる手法のことで、効果的な情報アクセスを実現できます。Amazon Kendra から取得した参考ドキュメントをベースに LLM が回答を生成してくれるため、「社内情報に対応した LLM チャット」を簡単に実現することが可能です。",
        "rag_enabled": "RAG 有効",
        "rerun": "再実行",
        "seed_help": "乱数のシード値です。同じシード値を指定すると同じ画像が生成されます。",
        "seed_button_text": "Seed をランダム設定",
        "start_over": "最初からやり直す",
        "settings": "設定情報",
        "spanish": "スペイン語",
        "step": "ステップ",
        "sign_out": "サインアウト",
        "summarize": "要約",
        "summarize_desc": "LLM は、大量の文章を要約するタスクを得意としています。要約する際に「1行で」や「子供でもわかる言葉で」などコンテキストを与えることができます。",
        "summarize_sentences": "要約したい文章",
        "summarized_sentences": "要約された文章がここに表示されます",
        "text_gen": "文章生成",
        "text_gen_desc": "あらゆるコンテキストで文章を生成することは LLM が最も得意とするタスクの 1 つです。記事・レポート・メールなど、あらゆるコンテキストに対応します。",
        "text_gen_display_label": "生成された文章がここに表示されます",
        "text_gen_format": "文章の形式を指示してください。(マークダウン、ブログ、ビジネスメールなど)",
        "text_gen_source": "入力してください",
        "tips": "ヒント",
        "tool": "ツール",  // this might need fixing.
        "translation": "翻訳",
        "translation_autodetect": "言語を自動検出",
        "translation_desc": "多言語で学習した LLM は、翻訳を行うことも可能です。また、ただ翻訳するだけではなく、カジュアルさ・対象層など様々な指定されたコンテキスト情報を翻訳に反映させることが可能です。",
        "translation_initial_greeting": "こんにちは。私は翻訳を支援する AI アシスタントです。お好きな文章を入力してください。",
        "translation_sentences": "翻訳したい文章",
        "upload_image": "画像をアップロード",
        "use_case": "ユースケース", 
        "use_case_list": "ユースケース一覧",
        "use_case_if_error_pt1": "ユースケース実行時にエラーになる場合は、必ず",
        "use_case_if_error_pt2": "にて",
        "use_case_if_error_pt3": "(LLM) と",
        "use_case_if_error_pt4": "(画像生成) を有効化しているか確認してください。有効化する方法については",
        "use_case_if_error_pt5": "をご参照ください。"
    }
}
