import React, { useEffect, useRef } from 'react';
import Reveal from 'reveal.js';
import Markdown from 'reveal.js/plugin/markdown/markdown.esm.js';
import 'reveal.js/dist/reveal.css';
import 'reveal.js/dist/theme/black.css';

interface SlidePreviewProps {
  markdown: string;
  className?: string;
  onSlideReady?: (container: HTMLDivElement) => void;
}

const SlidePreview: React.FC<SlidePreviewProps> = ({
  markdown,
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

    // マークダウンをスライドごとに分割
    const slides = markdown.split('---').map((slide) => slide.trim());

    // スライドのコンテナを更新
    const slidesContainer = container.querySelector('.slides');
    if (!slidesContainer) return;

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

    // Reveal.jsの初期化
    const initialize = async () => {
      try {
        const deck = new Reveal(container, {
          embedded: true,
          plugins: [Markdown],
          width: 960,
          height: 700,
          margin: 0.04,
          hash: false,
          transition: 'slide',
          // mouseWheel: true,
          slideNumber: true,
          showSlideNumber: 'all',
          controlsLayout: 'bottom-right',
          controlsBackArrows: 'visible',
          overview: true,
          // Activate the scroll view
          // view: 'scroll',
          // Force the scrollbar to remain visible
          scrollProgress: true,
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
  }, [markdown, onSlideReady]);

  return (
    <div className={`slide-container ${className}`}>
      <div ref={containerRef} style={{ height: '100%' }}>
        <div className="reveal">
          <div className="slides"></div>
        </div>
      </div>
    </div>
  );
};

export default SlidePreview;
