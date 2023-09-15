import { UnrecordedMessage } from "generative-ai-use-cases-jp";

export const messages_to_prompt = (messages: UnrecordedMessage[], prompt_type="llama2") => {
    let prompt = ""
    if (prompt_type === "llama2") {
        // Llama2
        prompt = "[INST] " + messages.map((message, index) => {
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
    } else if (prompt_type === "rinna") {
        // Rinna
        prompt = messages.map((message, index) => {
            if (message.role == 'user') {
                return `ユーザー: ${message.content.trim().replace("\n", "<NL>")}`
            } else if (message.role == 'assistant' || message.role == 'system') {
                return `システム: ${message.content.trim().replace("\n", "<NL>")}`
            } else {
                throw new Error(`Invalid message role: ${message.role}`)
            }
        }).join("<NL>");
    } else {
        // Bilingual Rinna
        prompt = messages.map((message, index) => {
            if (message.role == 'user') {
                return `ユーザー: ${message.content.trim()}`
            } else if (message.role == 'assistant' || message.role == 'system') {
                return `システム: ${message.content.trim()}`
            } else {
                throw new Error(`Invalid message role: ${message.role}`)
            }
        }).join("\n");
    }
    return prompt
}