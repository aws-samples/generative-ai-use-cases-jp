import { RetrieveResultItem } from '@aws-sdk/client-kendra';
import { I18n } from 'aws-amplify';


const systemContexts: { [key: string]: string } = {
  '/chat': I18n.get("prompts_chat"),
  '/summarize':
    I18n.get("prompts_summarize"),
  '/editorial': I18n.get("prompts_editor"),
  '/generate': I18n.get("prompts_generator"),
  '/translate': I18n.get("prompts_translator"),
  '/rag': '',
  '/image': I18n.get("prompts_image_generator"),
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
  return `${I18n.get("prompts_summarizer_pt1")}}
    ${params.sentence}
    ${I18n.get("prompts_summarizer_pt2")}

    ${
      !params.context
        ? I18n.get("prompts_summarizer_pt3")
        : `${I18n.get("prompts_summarizer_pt4")}
        ${params.context}
        ${I18n.get("prompts_summarizer_pt5")}`
    }
    ${I18n.get("prompts_summarizer_pt6")}
  `;
}

export type EditorialParams = {
  sentence: string;
  context?: string;
};

export function editorialPrompt(params: EditorialParams) {
  return `${I18n.get("prompts_editor_template_pt1")}
${params.sentence}
${I18n.get("prompts_editor_template_pt2")}
${
  params.context
    ? I18n.get("prompts_editor_template_pt3") +
      params.context +
      I18n.get("prompts_editor_template_pt4")
    : ''
}
${I18n.get("prompts_editor_template_pt5")}
${[/*{excerpt: string, replace?: string, comment?: string}*/]}
${I18n.get("prompts_editor_template_pt6")}
`;
}

export type GenerateTextParams = {
  information: string;
  context: string;
};

export function generateTextPrompt(params: GenerateTextParams) {
  return `${I18n.get("prompts_text_gen_pt1")}
    ${params.information}
    ${I18n.get("prompts_text_gen_pt2")}
    ${params.context}
    ${I18n.get("prompts_text_gen_pt3")} 
  `
}

export type TranslateParams = {
  sentence: string;
  language: string;
  context?: string;
};

export function translatePrompt(params: TranslateParams) {
  return `${I18n.get("prompts_translation_pt1")} ${
    params.language
  } ${I18n.get("prompts_translation_pt2")}
${params.sentence}
</input>
${
  !params.context
    ? ''
    : I18n.get("prompts_translation_pt3")
}
${I18n.get("prompts_translation_pt4")}
`;
}

export type RagParams = {
  promptType: 'RETRIEVE' | 'SYSTEM_CONTEXT';
  retrieveQueries?: string[];
  referenceItems?: RetrieveResultItem[];
};

export function ragPrompt(params: RagParams) {
  if (params.promptType === 'RETRIEVE') {
    return `${I18n.get("prompts_rag_pt1")}
${params.retrieveQueries!.map((q) => `* ${q}`).join('\n')}
${I18n.get("prompts_rag_pt2")}
`;
  } else {
    return `${I18n.get("prompts_rag_pt3")}
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
${I18n.get("prompts_rag_pt4")}
`;
  }
}
