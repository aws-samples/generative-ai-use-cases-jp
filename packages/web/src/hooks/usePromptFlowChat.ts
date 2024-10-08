import { useState, useCallback } from 'react';
import { create } from 'zustand';
import { v4 as uuid } from 'uuid';
import usePromptFlowApi from './usePromptFlowApi';
import { PromptFlow, ShownMessage } from 'generative-ai-use-cases-jp';
import { MODELS } from './useModel';

type PromptFlowState = {
  messages: ShownMessage[];
  loading: boolean;
  error: string | null;
  flow: PromptFlow | null;
  setMessages: (messages: ShownMessage[]) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setFlow: (flow: PromptFlow) => void;
  clear: () => void;
};

const usePromptFlowStore = create<PromptFlowState>((set) => ({
  messages: [],
  loading: false,
  error: null,
  flow: null,
  setMessages: (messages: ShownMessage[]) =>
    set(() => ({
      messages: messages,
    })),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
  setFlow: (flow) => set({ flow }),
  clear: () => set({ messages: [], error: null }),
}));

function parse(content: string) {
  let document;
  try {
    document = JSON.parse(content);
  } catch (e) {
    document = content;
  }
  return document;
}

const usePromptFlowChat = () => {
  const { invokePromptFlowStream } = usePromptFlowApi();
  const {
    messages,
    loading,
    error,
    flow,
    setMessages,
    setLoading,
    setError,
    setFlow,
    clear,
  } = usePromptFlowStore();
  const { promptFlows } = MODELS;
  const [availableFlows] = useState<PromptFlow[]>(promptFlows);

  const sendMessage = useCallback(
    async (content: string) => {
      const msgs = messages;

      if (!flow) {
        setError('No Prompt Flow selected');
        return;
      }

      msgs.push({ id: uuid(), role: 'user', content });
      setMessages(msgs);
      setLoading(true);
      setError(null);

      try {
        const stream = invokePromptFlowStream({
          flowIdentifier: flow.flowId,
          flowAliasIdentifier: flow.aliasId,
          document: parse(content),
        });

        let assistantResponse = '';
        const id = uuid();
        setMessages([
          ...msgs,
          { id, role: 'assistant', content: assistantResponse },
        ]);
        for await (const chunk of stream) {
          assistantResponse += chunk;
          setMessages([
            ...msgs,
            { id, role: 'assistant', content: assistantResponse },
          ]);
        }
      } catch (err) {
        setError('Error invoking Prompt Flow');
        console.error(err);
      } finally {
        setLoading(false);
      }
    },
    [setLoading, setError, invokePromptFlowStream, messages, setMessages, flow]
  );

  return {
    messages,
    loading,
    error,
    flow,
    availableFlows,
    sendMessage,
    setFlow,
    clear,
  };
};

export default usePromptFlowChat;
