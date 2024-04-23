import { createSlice, PayloadAction } from '@reduxjs/toolkit';

import { AppThunk, RootState } from '../../store';
import { Message } from '../../../@types/chat';
import { produce } from 'immer';

// 複数画面で立ち上げることがあるのでタブごとに状態を管理
export type ChatState = {
  [tabId: number]: {
    messages: Message[];
  };
};

type TabId = {
  tabId: number;
};

const initialState: ChatState = {};

const setInitialStateIfNeeded = (state: ChatState, tabId: number) => {
  if (state[tabId]) {
    return;
  }
  state[tabId] = {
    messages: [],
  };
};

export const chatSlice = createSlice({
  name: 'chat',
  initialState,
  reducers: {
    setMessages: (state, action: PayloadAction<TabId & { messages: Message[] }>) => {
      setInitialStateIfNeeded(state, action.payload.tabId);
      state[action.payload.tabId].messages = action.payload.messages;
    },
    clearMessages: (state, action: PayloadAction<TabId>) => {
      setInitialStateIfNeeded(state, action.payload.tabId);
      state[action.payload.tabId].messages = [];
    },
  },
});

export const { setMessages, clearMessages } = chatSlice.actions;

export const chatMessages = (state: RootState, tabId: number) => {
  setInitialStateIfNeeded(state.chat, tabId);
  return state.chat[tabId].messages;
};

export const replaceMessages =
  (tabId: number, messages: Message[]): AppThunk =>
  (dispatch, getState) => {
    setInitialStateIfNeeded(getState().chat, tabId);
    dispatch(
      setMessages({
        tabId,
        messages,
      }),
    );
  };

export const pushMessages =
  (tabId: number, messages: Message[]): AppThunk =>
  (dispatch, getState) => {
    setInitialStateIfNeeded(getState().chat, tabId);
    const currentMessages = chatMessages(getState(), tabId);
    dispatch(
      setMessages({
        tabId,
        messages: produce(currentMessages, (draft) => {
          draft.push(...messages);
        }),
      }),
    );
  };

export const overwriteLatestMessage =
  (tabId: number, content: string): AppThunk =>
  (dispatch, getState) => {
    setInitialStateIfNeeded(getState().chat, tabId);
    const currentMessages = chatMessages(getState(), tabId);
    if (currentMessages.length === 0) {
      return;
    }
    dispatch(
      setMessages({
        tabId,
        messages: produce(currentMessages, (draft) => {
          draft[draft.length - 1].content = content.replace(/<([^>]+)>([\s\S]*?)<\/\1>/, '$2');
        }),
      }),
    );
  };

export default chatSlice.reducer;
