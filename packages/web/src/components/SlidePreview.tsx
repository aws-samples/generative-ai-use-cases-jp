import React, { useEffect, useRef } from 'react';

import Reveal from 'reveal.js';
import Markdown from 'reveal.js/plugin/markdown/markdown.esm.js';
import Math from 'reveal.js/plugin/math/math.esm.js';
import 'reveal.js/dist/reveal.css';
import 'reveal.js/dist/theme/simple.css';

interface SlidePreviewProps {
  text: string;
  mode: 'markdown' | 'html';
  className?: string;
  onSlideReady?: (container: HTMLDivElement) => void;
}

const SlidePreview: React.FC<SlidePreviewProps> = ({
  text,
  mode = 'markdown',
  className = '',
  onSlideReady,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const deckRef = useRef<Reveal.Api | null>(null);

  // Reveal.js の初期化
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // 既存のインスタンスがあれば破棄
    if (deckRef.current) {
      deckRef.current.destroy();
      deckRef.current = null;
    }

    // スライドのコンテナを更新
    const slidesContainer = container.querySelector('.slides');
    if (!slidesContainer) return;

    if (mode === 'markdown') {
      // マークダウンテキストをスライドごとに分割
      const slides = text.split('---').map((slide) => slide.trim());

      // 各スライドをセクションに変換
      const slidesHtml = slides
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

      slidesContainer.innerHTML = slidesHtml;
    }

    if (mode === 'html') {
      slidesContainer.innerHTML = text;
    }

    // Reveal.jsの初期化
    const initialize = async () => {
      try {
        const deck = new Reveal(container, {
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
        });

        await deck.initialize();
        deckRef.current = deck;

        // コンテナの準備ができたことを通知
        if (onSlideReady) {
          onSlideReady(container);
        }
      } catch (error) {
        console.error('Failed to initialize Reveal:', error);
      }
    };

    initialize();

    return () => {
      if (deckRef.current) {
        deckRef.current.destroy();
        deckRef.current = null;
      }
    };
  }, [text, onSlideReady]);

  return (
    <div className="flex flex-col">
      <div className={`${className}`}>
        <div className="reveal" ref={containerRef}>
          <div className="slides"></div>
        </div>
      </div>
    </div>
  );
};

export default SlidePreview;
