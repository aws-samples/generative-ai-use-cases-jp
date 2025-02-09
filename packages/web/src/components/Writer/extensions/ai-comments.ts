import { Editor } from '@tiptap/react';
import { DocumentComment } from 'generative-ai-use-cases-jp';
import { create } from 'zustand';
import useWriter from '../../../hooks/useWriter';

const REGEX_BRACKET = /\{(?:[^{}])*\}/g;
const REGEX_ZENKAKU =
  /[Ａ-Ｚａ-ｚ０-９！＂＃＄％＆＇（）＊＋，－．／：；＜＝＞？＠［＼］＾＿｀｛｜｝]/g;

type CommentState = {
  comments: DocumentComment[];
  commentState: { [name: string]: boolean };
  filteredComments: DocumentComment[];
  loading: boolean;
  setComments: (comments: DocumentComment[]) => void;
  setCommentState: (state: { [name: string]: boolean }) => void;
  addCommentState: (excerpt: string) => void;
  setFilteredComments: (filteredComments: DocumentComment[]) => void;
  setLoading: (loading: boolean) => void;
  clearAll: () => void;
};

const useCommentStore = create<CommentState>((set) => ({
  comments: [],
  commentState: {},
  filteredComments: [],
  loading: false,
  setComments: (comments) => set({ comments }),
  setCommentState: (commentState) => set({ commentState }),
  addCommentState: (excerpt) =>
    set((state) => ({
      commentState: { ...state.commentState, [excerpt]: true },
    })),
  setFilteredComments: (filteredComments) => set({ filteredComments }),
  setLoading: (loading) => set({ loading }),
  clearAll: () =>
    set({
      comments: [],
      commentState: {},
      filteredComments: [],
      loading: false,
    }),
}));

export class AICommentManager {
  private editor: Editor;
  private write: ReturnType<typeof useWriter>['write'];

  constructor(editor: Editor, write: ReturnType<typeof useWriter>['write']) {
    this.editor = editor;
    this.write = write;
  }

  // テキストの位置を検索する
  findTextPosition(searchText: string): { from: number; to: number }[] {
    const doc = this.editor.state.doc;
    const matches: { from: number; to: number }[] = [];

    // 全テキストを連結して検索する
    let fullText = '';
    const positions: number[] = [];

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    doc.descendants((node: any, pos: number) => {
      if (node.isText) {
        fullText += node.text;
        // 各文字の位置を記録
        for (let i = 0; i < node.text.length; i++) {
          positions.push(pos + i);
        }
      }
    });

    // 全てのマッチを検索
    let index = 0;
    while ((index = fullText.indexOf(searchText, index)) !== -1) {
      matches.push({
        from: positions[index],
        to: positions[index + searchText.length - 1] + 1,
      });
      index += searchText.length;
    }

    return matches;
  }

  // コメントのフィルタリング
  filterComments(): DocumentComment[] {
    const { comments, commentState } = useCommentStore.getState();
    const filteredComments = comments.filter(
      (x) =>
        x.excerpt &&
        commentState[x.excerpt] === undefined &&
        x.excerpt !== x.replace
    );
    console.log('filteredComments', filteredComments);
    useCommentStore.getState().setFilteredComments(filteredComments);
    return filteredComments;
  }

  // コメントを削除
  removeComment(comment: DocumentComment) {
    console.log('removeComment', comment);

    // コメントの状態を更新
    useCommentStore.getState().addCommentState(comment.excerpt);
    this.filterComments();
    // 全てのマッチのハイライトを削除
    const matches = this.findTextPosition(comment.excerpt);
    if (matches.length === 0) return;
    for (const { from, to } of matches) {
      this.editor
        .chain()
        .focus()
        .setTextSelection({ from, to })
        .unsetAIHighlight()
        .run();
    }
  }

  // コメントで指摘された修正を実行
  replaceSentence(comment: DocumentComment) {
    const matches = this.findTextPosition(comment.excerpt);
    if (matches.length === 0 || !comment.replace) return;
    for (const { from, to } of matches) {
      this.editor
        .chain()
        .focus()
        .setTextSelection({ from, to })
        .unsetAIHighlight()
        .insertContentAt({ from, to }, comment.replace)
        .run();
    }
    this.removeComment(comment);
  }

  // コメントの更新時にリアルタイムで JSON 部分を抽出してコメントに変換
  handleResponse(response: string) {
    const newComments = [...response.matchAll(REGEX_BRACKET)].map((x) => {
      try {
        return JSON.parse(x[0]) as DocumentComment;
      } catch (error) {
        console.error(error);
        return { excerpt: '' };
      }
    });
    if (newComments.length !== useCommentStore.getState().comments.length) {
      useCommentStore.getState().setComments(newComments);
      this.filterComments();
      this.updateHighlights();
    }
  }

  // コメントをクリア
  clearComments() {
    useCommentStore.getState().clearAll();
    this.editor
      .chain()
      .setTextSelection({ from: 0, to: 0 })
      .unsetAIHighlight()
      .run();
  }

  // ハイライトを更新
  private updateHighlights() {
    // 既存のハイライトをクリア
    this.editor
      .chain()
      .setTextSelection({ from: 0, to: 0 })
      .unsetAIHighlight()
      .run();

    // 新しいハイライトを適用
    const { comments } = useCommentStore.getState();
    comments.forEach((comment) => {
      if (!comment.excerpt) return;

      const matches = this.findTextPosition(comment.excerpt);
      if (matches.length === 0) return;

      for (const { from, to } of matches) {
        this.editor
          .chain()
          .setTextSelection({ from, to })
          .setAIHighlight({ color: '#fdebeb' })
          .run();
      }
    });

    // 選択を解除
    this.editor.commands.setTextSelection({ from: 0, to: 0 });
  }

  // LLM にリクエスト送信
  async execAnnotation() {
    if (useCommentStore.getState().loading) return;

    const text = this.editor
      .getText()
      .replace(REGEX_ZENKAKU, (s: string) => {
        return String.fromCharCode(s.charCodeAt(0) - 0xfee0);
      })
      .replace(/[‐－―]/g, '-')
      .replace(/[～〜]/g, '~')
      // eslint-disable-next-line no-irregular-whitespace
      .replace(/　/g, ' ');

    this.clearComments();
    useCommentStore.getState().setLoading(true);

    try {
      let buffer = '';
      for await (const chunk of this.write(text, 'comment')) {
        buffer += chunk;
        this.handleResponse(buffer);
      }
    } finally {
      useCommentStore.getState().setLoading(false);
    }
  }
}

export const useComments = () => {
  const filteredComments = useCommentStore((state) => state.filteredComments);
  const loading = useCommentStore((state) => state.loading);

  return {
    filteredComments,
    loading,
  };
};
