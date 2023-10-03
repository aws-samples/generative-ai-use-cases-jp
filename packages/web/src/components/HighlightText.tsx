import React, { useMemo } from 'react';
import { TextWithHighlights, Highlight } from '@aws-sdk/client-kendra';

type Props = {
  textWithHighlights: TextWithHighlights;
};

const HighlightText: React.FC<Props> = (props) => {
  const highlightText = useMemo(() => {
    const baseText: string = props.textWithHighlights.Text || '';
    const highlights: Highlight[] = props.textWithHighlights.Highlights || [];

    if (highlights.length === 0) {
      return <>{baseText}</>;
    }

    const nodes: React.ReactNode[] = [];
    for (let i = 0; i < highlights.length; i++) {
      // start 〜 mid がハイライトしない文字列（1つ前の End と Begin の間）
      // mid 〜 end がハイライトする文字列（Begin と End の間）
      const start = highlights[i - 1]?.EndOffset ?? 0;
      const mid = highlights[i]?.BeginOffset ?? baseText.length;
      const end = highlights[i]?.EndOffset ?? baseText.length;

      nodes.push(
        <React.Fragment key={`${i}-1`}>
          {baseText.substring(start, mid)}{' '}
        </React.Fragment>,
        <span key={`${i}-2`} className="font-bold text-gray-700">
          {baseText.substring(mid, end)}
        </span>
      );
      // すべてのハイライトを処理したら、残りの文字列をまとめて設定
      if (i === highlights.length - 1) {
        nodes.push(
          <React.Fragment key={`${i}-3`}>
            {baseText.substring(end)}
          </React.Fragment>
        );
      }
    }

    return <div className="text-gray-600">{nodes}</div>;
  }, [props]);

  return highlightText;
};

export default HighlightText;
