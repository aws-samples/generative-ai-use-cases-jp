import { useState, useCallback } from 'react';
import { create } from 'zustand';
import { v4 as uuid } from 'uuid';
import useFlowApi from './useFlowApi';
import { Flow, ShownMessage } from 'generative-ai-use-cases';
import { MODELS } from './useModel';

type FlowState = {
  messages: ShownMessage[];
  loading: boolean;
  error: string | null;
  flow: Flow | null;
  setMessages: (messages: ShownMessage[]) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setFlow: (flow: Flow) => void;
  clear: () => void;
};

const useFlowStore = create<FlowState>((set) => ({
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

const useFlowChat = () => {
  const { invokeFlowStream } = useFlowApi();
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
  } = useFlowStore();
  const { flows } = MODELS;
  const [availableFlows] = useState<Flow[]>(flows);

  const sendMessage = useCallback(
    async (content: string) => {
      const msgs = messages;

      if (!flow) {
        setError('No Flow selected');
        return;
      }

      msgs.push({ id: uuid(), role: 'user', content });
      setMessages(msgs);
      setLoading(true);
      setError(null);

      try {
        const stream = invokeFlowStream({
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
        setError('Error invoking Flow');
        console.error(err);
      } finally {
        setLoading(false);
      }
    },
    [setLoading, setError, invokeFlowStream, messages, setMessages, flow]
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

export default useFlowChat;
