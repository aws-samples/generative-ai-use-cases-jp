import { UnrecordedMessage } from "generative-ai-use-cases-jp";

export const messages_to_prompt = (messages: UnrecordedMessage[]) => {
    let prompt = "[INST] " + messages.map((message, index) => {
        if (message.role == 'user') {
            return message.content.trim()
        } else if (message.role == 'assistant') {
            return ` [/INST] ${message.content}</s><s>[INST] `
        } else if (message.role === 'system' && index === 0) {
            return `<<SYS>>\n${message.content}\n<</SYS>>\n\n`
        } else {
            throw new Error(`Invalid message role: ${message.role}`)
        }
    }).join("") + " [/INST]";
    return prompt
}