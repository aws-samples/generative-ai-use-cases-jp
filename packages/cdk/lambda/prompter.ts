import { UnrecordedMessage } from "generative-ai-use-cases-jp";

type PromptTemplate = {
    prefix: string;
    suffix: string;
    join: string;
    user: string;
    assistant: string;
    system: string;
}

export const messages_to_prompt = (messages: UnrecordedMessage[], prompt_template: string = "") => {
    let pt: PromptTemplate = JSON.parse(prompt_template);
    let prompt = pt.prefix + messages.map((message, index) => {
        if (message.role == 'user') {
            return pt.user.replace("{}", message.content)
        } else if (message.role == 'assistant') {
            return pt.assistant.replace("{}", message.content)
        } else if (message.role === 'system') {
            return pt.system.replace("{}", message.content)
        } else {
            throw new Error(`Invalid message role: ${message.role}`)
        }
    }).join(pt.join) + pt.suffix;
    return prompt
}