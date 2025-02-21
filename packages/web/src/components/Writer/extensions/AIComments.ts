import { Editor } from '@tiptap/react';
import { DocumentComment } from 'generative-ai-use-cases-jp';
import { create } from 'zustand';
import useWriter from '../../../hooks/useWriter';
import { removeAIHighlight } from 'novel';
import { toast } from 'sonner';

const REGEX_BRACKET = /\{(?:[^{}])*\}/g;
const REGEX_ZENKAKU =
  /[Ａ-Ｚａ-ｚ０-９！＂＃＄％＆＇（）＊＋，－．／：；＜＝＞？＠［＼］＾＿｀｛｜｝]/g;
const highlightColor = '#fdebeb';

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

    // 正規表現のエスケープ処理
    const escapedSearchText = searchText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    // 改行、空白を柔軟にマッチングできるようにする
    const searchRegex = new RegExp(
      escapedSearchText
        .replace(/\n/g, '[\\s\\n]*') // 改行を任意の空白または改行にマッチ
        .replace(/\s+/g, '[\\s\\n]*'), // 空白を任意の空白または改行にマッチ
      'g'
    );

    // テキストと位置情報を収集
    let fullText = '';
    const positions: number[] = [];

    doc.descendants((node, pos) => {
      if (node.isText && node.text) {
        fullText += node.text;
        for (let i = 0; i < node.text.length; i++) {
          positions.push(pos + i);
        }
      } else if (
        node.type.name === 'paragraph' ||
        node.type.name === 'hardBreak'
      ) {
        // 段落やハードブレークは改行として扱う
        fullText += '\n';
        positions.push(pos);
      }
    });

    // 正規表現で検索を実行
    let match;
    while ((match = searchRegex.exec(fullText)) !== null) {
      const start = match.index;
      const end = start + match[0].length;

      // 実際のドキュメント内の位置を取得
      if (positions[start] !== undefined && positions[end - 1] !== undefined) {
        matches.push({
          from: positions[start],
          to: positions[end - 1] + 1,
        });
      }
    }

    return matches;
  }

  // コメントのフィルタリング
  private updateFilteredComments() {
    const { comments, commentState } = useCommentStore.getState();
    const filteredComments = comments.filter(
      (x) =>
        x.excerpt &&
        commentState[x.excerpt] === undefined &&
        x.excerpt !== x.replace
    );
    useCommentStore.getState().setFilteredComments(filteredComments);
  }

  // コメントをクリア
  clearComments() {
    useCommentStore.getState().clearAll();
    removeAIHighlight(this.editor);
  }

  // コメントを削除
  removeComment(comment: DocumentComment) {
    // コメントの状態を更新
    useCommentStore.getState().addCommentState(comment.excerpt);
    this.updateFilteredComments();

    // ハイライト更新: 全削除して最新状態を反映
    removeAIHighlight(this.editor);
    const filteredComments = useCommentStore.getState().filteredComments;
    const chain = this.editor.chain();
    filteredComments.forEach((comment) => {
      const matches = this.findTextPosition(comment.excerpt);
      if (matches.length === 0) return;
      for (const { from, to } of matches) {
        chain
          .setTextSelection({ from, to })
          .setAIHighlight({ color: highlightColor });
      }
    });
    chain.run();

    // コメントがない場合はコメントをクリア (ハイライトが残っている場合があるため)
    if (useCommentStore.getState().filteredComments.length === 0) {
      this.clearComments();
    }
  }

  // コメントで指摘された修正を実行
  replaceSentence(comment: DocumentComment) {
    const matches = this.findTextPosition(comment.excerpt);
    if (matches.length === 0 || !comment.replace) return;
    const chain = this.editor.chain();
    for (const { from, to } of matches) {
      chain
        .setTextSelection({ from, to })
        .unsetAIHighlight()
        .insertContentAt({ from, to }, comment.replace);
    }
    chain.run();
    this.removeComment(comment);
  }

  // クリック時にコメント部位にフォーカス
  focusComment(comment: DocumentComment) {
    const matches = this.findTextPosition(comment.excerpt);
    if (matches.length === 0) return;
    const { from, to } = matches[0];
    this.editor.chain().setTextSelection({ from, to }).focus().run();
  }

  // ハイライトを追加
  private addHighlight(comment: DocumentComment) {
    if (!comment.excerpt) return;
    const matches = this.findTextPosition(comment.excerpt);
    if (matches.length === 0) return;
    for (const { from, to } of matches) {
      this.editor
        .chain()
        .setTextSelection({ from, to })
        .setAIHighlight({ color: highlightColor })
        .run();
    }
  }

  // コメントの更新時にリアルタイムで JSON 部分を抽出してコメントに変換
  private handleResponse(response: string) {
    const currentComments = useCommentStore.getState().comments;
    const newComments = [...response.matchAll(REGEX_BRACKET)]
      .map((x) => {
        try {
          return JSON.parse(x[0]) as DocumentComment;
        } catch (error) {
          console.error(error, x[0]);
          return { excerpt: '', type: 'error' } as DocumentComment;
        }
      })
      .filter((comment) => comment.excerpt);

    if (newComments.length !== currentComments.length) {
      useCommentStore.getState().setComments(newComments);
      this.updateFilteredComments();
      newComments.slice(currentComments.length).forEach((comment) => {
        this.addHighlight(comment);
      });
    }
  }

  // 構成を実行
  async execAnnotation() {
    if (useCommentStore.getState().loading) return;

    // 全角を半角に変換
    const cleanedMarkdown = this.editor.storage.markdown
      .getMarkdown()
      .replace(REGEX_ZENKAKU, (s: string) => {
        return String.fromCharCode(s.charCodeAt(0) - 0xfee0);
      })
      .replace(/[‐－―]/g, '-')
      .replace(/[～〜]/g, '~')
      .replace(/["”]/g, "'") // replace double quote since Claude does not escape double quote inside json
      // eslint-disable-next-line no-irregular-whitespace
      .replace(/　/g, ' ');
    this.editor.commands.setContent(cleanedMarkdown);

    // コメントをクリア
    this.clearComments();
    useCommentStore.getState().setLoading(true);

    // コメントを取得
    const text = this.editor.getText();
    try {
      let buffer = '';
      for await (const chunk of this.write(text, 'comment')) {
        buffer += chunk.text;
        this.handleResponse(buffer);
      }
    } finally {
      useCommentStore.getState().setLoading(false);
      if (useCommentStore.getState().comments.length === 0) {
        toast.error('指摘事項がありませんでした。');
      } else {
        toast.success('校閲が完了しました');
      }
    }
  }
}

export const useComments = () => {
  const comments = useCommentStore((state) => state.comments);
  const commentState = useCommentStore((state) => state.commentState);
  const filteredComments = useCommentStore((state) => state.filteredComments);
  const loading = useCommentStore((state) => state.loading);

  return {
    comments,
    commentState,
    filteredComments,
    loading,
  };
};
