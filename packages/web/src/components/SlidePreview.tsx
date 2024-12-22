import React, { useEffect, useRef, useCallback, memo } from 'react';
import Reveal from 'reveal.js';
import Markdown from 'reveal.js/plugin/markdown/markdown.esm.js';
import Math from 'reveal.js/plugin/math/math.esm.js';
import 'reveal.js/dist/reveal.css';
import 'reveal.js/dist/theme/simple.css';

interface RevealOptions {
  embedded?: boolean;
  plugins?: any[];
  hash?: boolean;
  transition?: 'none' | 'fade' | 'slide' | 'convex' | 'concave' | 'zoom';
  controls?: boolean;
  controlsTutorial?: boolean;
  slideNumber?:
    | boolean
    | 'h.v'
    | 'h/v'
    | 'c'
    | 'c/t'
    | ((slideObject: any) => [string] | [string, string, string]);
  keyboard?: boolean;
  controlsLayout?: 'edges' | 'bottom-right';
  progress?: boolean;
  overview?: boolean;
  mouseWheel?: boolean;
}

interface SlidePreviewProps {
  text: string;
  mode: 'markdown' | 'html';
  className?: string;
  onSlideReady?: (container: HTMLDivElement) => void;
  onError?: (error: Error) => void;
  config?: Partial<RevealOptions>;
  onSlideChange?: (currentSlide: number) => void;
}

// reveal.jsの初期設定
const DEFAULT_REVEAL_CONFIG: RevealOptions = {
  embedded: true,
  plugins: [Markdown, Math.KaTeX],
  hash: false,
  transition: 'slide',
  controls: true,
  controlsTutorial: false,
  slideNumber: 'c/t',
  keyboard: true,
  controlsLayout: 'edges',
  progress: false,
  overview: true,
  mouseWheel: false,
};

// スライドコンテンツのパース処理
const parseSlideContent = (text: string, mode: 'markdown' | 'html') => {
  if (mode === 'markdown') {
    return text
      .split('---')
      .map((slide) => slide.trim())
      .map(
        (slideContent) => `
        <section data-markdown>
          <textarea data-template>
  ${slideContent}
          </textarea>
        </section>
      `
      )
      .join('');
  }
  return text;
};

interface SlideIndices {
  h: number;
  v: number;
}

/**
 * Revealインスタンスの管理用カスタムフック
 * @param config
 * @param onError
 * @returns
 */
const useRevealInstance = (
  config: Partial<RevealOptions>,
  onError?: (error: Error) => void
) => {
  const deckRef = useRef<Reveal.Api | null>(null);
  const currentIndicesRef = useRef<SlideIndices | null>(null);

  const cleanupReveal = useCallback(() => {
    if (deckRef.current) {
      // ２ページ目以降のテキストを編集している際に、再度レンダリングが走ると１ページ目を表示してしまうため、現在のスライド位置を保存しておき、再初期化時に復元する
      currentIndicesRef.current = deckRef.current.getIndices();
      deckRef.current.destroy();
      deckRef.current = null;
    }
  }, []);

  const initReveal = useCallback(
    async (container: HTMLElement) => {
      try {
        const deck = new Reveal(container, {
          ...DEFAULT_REVEAL_CONFIG,
          ...config,
        });

        // スライド位置の復元が必要な場合は、initialize前に要素を非表示にする
        if (currentIndicesRef.current) {
          container.style.visibility = 'hidden';
        }

        await deck.initialize();
        deckRef.current = deck;

        // 保存していたスライド位置を復元
        if (currentIndicesRef.current) {
          const { h, v } = currentIndicesRef.current;
          deck.slide(h, v);
          // 位置の復元が完了したら要素を表示
          container.style.visibility = 'visible';
        }

        return deck;
      } catch (error) {
        cleanupReveal();
        onError?.(
          error instanceof Error
            ? error
            : new Error('Failed to initialize Reveal.js')
        );
      }
    },
    [config, onError, cleanupReveal]
  );

  return { deckRef, initReveal, cleanupReveal };
};

// SlidePreviewコンポーネント
const SlidePreview: React.FC<SlidePreviewProps> = memo(
  ({
    text,
    mode = 'markdown',
    className = '',
    onSlideReady,
    onError,
    config = {},
    onSlideChange,
  }) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const { deckRef, initReveal, cleanupReveal } = useRevealInstance(
      config,
      onError
    );
    const contentRef = useRef(text);
    const isInitializedRef = useRef(false);

    // スライドコンテンツの更新処理
    const updateSlideContent = useCallback(async () => {
      const container = containerRef.current;
      const slidesContainer = container?.querySelector('.slides');
      if (!container || !slidesContainer) return;

      // 初期化されていないか、テキストが変更された場合に更新
      if (!isInitializedRef.current || contentRef.current !== text) {
        contentRef.current = text;

        // 既存のインスタンスをクリーンアップ
        cleanupReveal();

        // 新しいコンテンツを設定
        slidesContainer.innerHTML = parseSlideContent(text, mode);

        // Reveal.jsを再初期化
        const deck = await initReveal(container);
        if (deck && onSlideReady) {
          onSlideReady(container);
        }

        isInitializedRef.current = true;
      }
    }, [text, mode, initReveal, cleanupReveal, onSlideReady]);

    // スライド変更イベントの監視
    useEffect(() => {
      if (!deckRef.current || !onSlideChange) return;

      const handleSlideChange = () => {
        const indices = deckRef.current?.getIndices();
        if (indices) {
          onSlideChange(indices.h);
        }
      };

      deckRef.current.on('slidechanged', handleSlideChange);

      return () => {
        deckRef.current?.off('slidechanged', handleSlideChange);
      };
    }, [onSlideChange]);

    // コンテンツ更新のeffect
    useEffect(() => {
      updateSlideContent();
    }, [updateSlideContent]);

    // クリーンアップ用effect
    useEffect(() => {
      return () => {
        cleanupReveal();
        isInitializedRef.current = false;
      };
    }, [cleanupReveal]);

    return (
      <div className="flex flex-col gap-2">
        <div className={`relative ${className}`}>
          <div className="reveal" ref={containerRef}>
            <div className="slides" />
          </div>
        </div>
      </div>
    );
  }
);

export default SlidePreview;
