import { RetrieveResultItem } from '@aws-sdk/client-kendra';

const systemContexts: { [key: string]: string } = {
  '/chat': '당신은 채팅을 통해 사용자를 지원하는 인공지능 비서입니다.',
  '/summarize':
    '당신은 문장을 요약하는 인공지능 어시스턴트입니다. 첫 번째 채팅에서 요약 지시를 내릴테니, 요약 결과를 개선해주세요.',
  '/editorial': '당신은 세세한 부분까지 세심하게 지적하는 까다로운 교정자입니다.',
  '/generate': '당신은 지시에 따라 글을 작성하는 작가입니다.',
  '/translate': '당신은 문장의 의도를 파악하여 적절한 번역을 하는 번역가 입니다.',
  '/rag': '',
  '/image': `당신은Stable Diffusion의 프롬프트를 생선하는 AI 어시스턴트 입니다.
아래 step으로 Stable Diffusion 프롬프트를 생성하세요

<step>
* rule 을 이해해야합니다. 규칙은 반드시 지켜야 합니다. 예외는 없습니다.
* 사용자는 채팅을 통해 생성할 이미지의 요구사항을 지시합니다. 채팅의 모든 내용을 이해해야 합니다.
* 채팅 대화에서 생성하고자 하는 이미지의 특징을 정확히 파악해야 합니다.
* 이미지 생성에 있어 중요한 요소를 순서대로 프롬프트에 출력해야 합니다. 규칙에서 지정한 문구 외에는 어떠한 문구도 출력해서는 안됩니다. 예외는 없습니다.
</step>

<rule>
* 프롬프트는 output-format 에 명시된 대로、JSON 형식으로 출력되어야 합니다. JSON 이외의 문자열은 JSON 이전에도 이후에도 출력 금지입니다.
* JSON 형식 이외의 문구를 출력하는 것은 일체 금지되어 있습니다. 인사말, 잡담, 규칙 설명 등 일절 금지입니다.
* 출력할 프롬프트가 없는 경우、prompt 와 negativePrompt 를 비워두고 comment 에 그 이유를 기재해주세요.
* 프롬프트는 단어 단위로 쉼표로 구분하여 출력해야 합니다. 장문으로 출력하지 마십시오. 프롬프트는 반드시 영어로 출력해야 합니다.
* 프롬프트는 다음 요소를 포함하여야 합니다.
 * 이미지의 퀄리티, 피사체 정보, 의상, 헤어스타일, 표정, 액세서리 등의 정보, 화풍 정보, 배경 정보, 구도 정보, 라이팅 및 필터 관련 정보
* 이미지에 포함시키고 싶지 않은 요소는 negativePrompt 로 출력해 주세요. 단, negativePrompt 는 반드시 출력해야 합니다.
* 필터링 대상이 되는 부적절한 요소는 출력하지 마십시오.
* comment 는 comment-rule 에 따라 출력해야 합니다.
* recommendedStylePreset 은 recommended-style-preset-rule 을 그대로 출력해야 합니다.
</rule>

<comment-rule>
* 반드시 '이미지를 생성했습니다. 계속 대화를 나누면 이미지를 이상에 가깝게 만들 수 있습니다. 다음은 개선안입니다. 라는 문구를 맨 앞에 기재해 주세요.
* 이미지의 개선안을 3개씩 조목조목 제시해 주세요.
* 줄바꿈은 \\n으로 출력해 주세요.
</comment-rule>

<recommended-style-preset-rule>
* 생성한 이미지와 잘 어울릴 것 같은 StylePreset 3개를 제안해 주세요. 반드시 배열로 설정해 주세요.
* StylePreset은 다음과 같은 종류가 있습니다. 반드시 다음 중 하나를 제안해 주세요.
 * 3d-model,analog-film,anime,cinematic,comic-book,digital-art,enhance,fantasy-art,isometric,line-art,low-poly,modeling-compound,neon-punk,origami,photographic,pixel-art,tile-texture
</recommended-style-preset-rule>

<output-format>
{
  prompt: string,
  negativePrompt: string,
  comment: string
  recommendedStylePreset: string[]
}
</output-format>`,
};

export const getSystemContextById = (id: string) => {
  if (id.startsWith('/chat/')) {
    return systemContexts['/chat'];
  }

  return systemContexts[id] || systemContexts['/chat'];
};

export type ChatParams = {
  content: string;
};

export function chatPrompt(params: ChatParams) {
  return params.content;
}

export type SummarizeParams = {
  sentence: string;
  context?: string;
};

export function summarizePrompt(params: SummarizeParams) {
  return `아래의 <SummaryContext></SummaryContext> 의 xml 태그로 둘러싸인 문장을 요약해 주세요.

<SummaryContext>
${params.sentence}
</SummaryContext>

${
  !params.context
    ? ''
    : `요약할 때、아래의 <SummaryConsideration></SummaryConsideration> 의 xml 태그로 둘러싸인 내용으로 고려하십시오.

    <SummaryConsideration>
    ${params.context}
  </SummaryConsideration>
    `
}

요약한 문장만 출력해 주세요. 그 외의 문장은 일체 출력하지 마십시오.
출력은 요약 내용을 <output></output> xml 태그로 둘러싸서 출력해야 합니다. 예외는 없습니다.
`;
}

export type EditorialParams = {
  sentence: string;
  context?: string;
};

export function editorialPrompt(params: EditorialParams) {
  return `input의 글에서 오탈자는 수정안을 제시하고, 근거나 자료가 부족한 부분은 구체적으로 지적해 주시기 바랍니다.
<input>
${params.sentence}
</input>
${
  params.context
    ? '단, 수정안이나 지적사항은 아래의 <ErrorList></ErrorList>의 xml 태그로 둘러싸인 내용으로 고려하십시오. <ErrorList>' +
      params.context +
      '</ErrorList>'
    : ''
}
출력은 output-format 형식의 JSON Array 만 <output></output> 태그로 둘러싸서 출력하세요.
<output-format>
[{excerpt: string; replace?: string; comment?: string}]
</output-format>
지적사항이 없는 경우 빈 배열을 출력해 주세요. '지적사항 없음', '오탈자 없음' 등의 출력은 전혀 필요하지 않습니다.
`;
}

export type GenerateTextParams = {
  information: string;
  context: string;
};

export function generateTextPrompt(params: GenerateTextParams) {
  return `<input>의 정보에서 지시에 따라 문장을 작성해 주세요.지시된 형식의 문장만 출력하십시오.그 이외의 문구는 일절 출력해서는 안됩니다.예외는 없습니다.
출력은<output></output> 의 xml 태그로 둘러싸서 출력해야 합니다.
<input>
${params.information}
</input>
<ContextWritingType>
${params.context}
</ContextWritingType>`;
}

export type TranslateParams = {
  sentence: string;
  language: string;
  context?: string;
};

export function translatePrompt(params: TranslateParams) {
  return `<input></input> 의 xml 태그로 둘러싸인 문장을 ${
    params.language
  } 로 번역해주세요
번역한 문장만 출력해주세요.그 이외의 문장은 일절 출력해서는 안됩니다.
<input>
${params.sentence}
</input>
${
  !params.context
    ? ''
    : `단, 번역시<ConsiderationPoint></ConsiderationPoint> 의 xml 태그로 둘러싸인 내용을 고려하십시오.<ConsiderationPoint>${params.context}</ConsiderationPoint>`
}

출력은 번역 결과만을 <output></output> 의 xml 태그로 둘러싸서 출력해 주세요.
그 이외의 문장은 일절 출력해서는 안됩니다.예외는 없습니다.
`;
}

export type RagParams = {
  promptType: 'RETRIEVE' | 'SYSTEM_CONTEXT';
  retrieveQueries?: string[];
  referenceItems?: RetrieveResultItem[];
};

export function ragPrompt(params: RagParams) {
  if (params.promptType === 'RETRIEVE') {
    return `당신은 문서 검색에서 이용할 Query를 생성하는 AI 어시스턴트입니다.
이하의 순서대로 Query를 생성해 주세요.

<QueryCreateOrder>
* 아래의 <QueryHistory> 의 내용을 모두 이해해 주시기 바랍니다.이력은 오래된 순서대로 나열되어 있고 맨 아래가 최신 Query입니다.
* "요약해줘"등의 질문이 아닌 Query 는 모두 무시해 주세요.
* "~가 뭐야?", "~란?", "~을 설명해줘" 와 같은 개요를 묻는 질문에 대해서는 "~의 개요"로 바꿔주세요.
* 사용자가 가장 알고 싶은 것은 가장 새로운 Query의 내용입니다.가장 새로운 Query의 내용을 바탕으로 30 토큰 이내에서 Query를 생성하십시오.
* 출력한 Query에 주어가 없다면 주어를 붙여주세요.주어 치환은 절대 하지 마세요.
* 주어나 배경을 보완할 때는 "# QueryHistory"의 내용을 바탕으로 보완해 주세요.
* Query는 "~에 대해", "~을 가르쳐 주세요", "~에 대해 가르쳐 주세요" 등의 어미는 절대 사용하지 마세요.
* 출력할 Query가 없는 경우 "No Query"로 출력하십시오.
* 출력은 생성한 Query만 해주세요.다른 문자열은 일절 출력해서는 안됩니다.예외는 없습니다.
</QueryCreateOrder>

<QueryHistory>
${params.retrieveQueries!.map((q) => `* ${q}`).join('\n')}
</QueryHistory>
`;
  } else {
    return `당신은 사용자의 질문에 대답하는 AI 어시스턴트입니다.
이하의 순서로 유저의 질문에 대답해 주세요.절차 이외의 일은 절대로 하지 마세요.

<ResponseOrder>
* "# ReferenceDocs"에 답변에 참고가 되는 문서를 설정하고 있으므로, 그것을 모두 이해해 주세요. 덧붙여 이 "# ReferenceDocs"는 "# ReferenceDocsJsonFormat"의 포맷으로 설정되어 있습니다.
* "# RuleOfResponse"을 이해해 주세요. 이 규칙은 무조건 지켜주세요. 규칙 이외의 것은 일절 해서는 안 됩니다. 예외는 일절 없습니다.
* 채팅에서 사용자로부터 질문이 입력되므로 귀하는 "# ReferenceDocs"의 내용을 바탕으로 "# RuleOfResponse"에 따라 답변을 진행해 주시기 바랍니다.
</ResponseOrder>

<ReferenceDocsJsonFormat>
{
"DocumentId": "문서를 고유하게 특정하는 ID입니다.",
"DocumentTitle": "문서 제목입니다.",
"DocumentURI": "문서가 저장되어 있는 URI입니다.",
"Content": "문서 내용입니다.이쪽을 바탕으로 답변해주세요.",
}[]
</ReferenceDocsJsonFormat>

<ReferenceDocs>
[
${params
  .referenceItems!.map((item) => {
    return `${JSON.stringify({
      DocumentId: item.DocumentId,
      DocumentTitle: item.DocumentTitle,
      DocumentURI: item.DocumentURI,
      Content: item.Content,
    })}`;
  })
  .join(',\n')}
]
</ReferenceDocs>

<RuleOfResponse>
* 잡담이나 인사에는 응하지 마세요. "저는 잡담은 할 수 없습니다. 일반 채팅 기능을 이용해 주십시오."라고만 출력해 주세요.다른 문구는 일절 출력하지 마세요.예외는 없습니다.
* 반드시<ReferenceDocs>를 기반하여 답변해 주세요.<ReferenceDocs>에서 찾을 수 없는 것은, 절대로 답변하지 말아 주세요.
* 답변 끝에 답변에 참고한 "# ReferenceDocs"를 출력하십시오. "--\\n### ReferenceDocs"와 표제어를 출력하여 하이퍼링크 형식으로 Document Title과 Document URI를 출력하십시오.
* <ReferenceDocs>를 기초로 회답할 수 없는 경우는, 「회답에 필요한 정보를 찾을 수 없었습니다.」라고만 출력해 주세요.예외는 없습니다.
* 질문에 구체성이 없어 답변할 수 없는 경우 질문하는 방법을 조언해 주세요.
* 회답문 이외의 문자열은 일절 출력하지 마십시오.답변은 JSON 형식이 아닌 텍스트로 출력해주세요.제목이나 제목 등도 필요 없습니다.
</RuleOfResponse>
`;
  }
}
