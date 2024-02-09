import React, { useCallback, useEffect, useRef } from 'react';
import { PiMagnifyingGlass, PiSpinnerGap, PiX } from 'react-icons/pi';
import { Link } from 'react-router-dom';
import useRag from '../hooks/useSearch';
import HighlightText from '../components/HighlightText';
import ButtonIcon from '../components/ButtonIcon';
import useRagFile from '../hooks/useRagFile';

const KendraSearchPage: React.FC = () => {
  const { loading, resultItems, query, setQuery, search } = useRag();
  const { downloadDoc, isS3Url, downloading } = useRagFile();

  const searchKendra = useCallback(() => {
    search();
  }, [search]);

  const queryRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const listener = (e: DocumentEventMap['keypress']) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        searchKendra();
      }
    };

    const elem = queryRef.current;
    elem?.addEventListener('keypress', listener);

    return () => {
      elem?.removeEventListener('keypress', listener);
    };
  }, [searchKendra]);

  return (
    <div className="flex flex-col items-center">
      <div className="invisible my-0 flex h-0 items-center justify-center text-xl font-semibold lg:visible lg:my-5 lg:h-min print:visible print:my-5 print:h-min">
        Kendra 検索
      </div>
      <div className="text-sm text-gray-600">
        <div>
          この機能は、Amazon Kendra の標準機能である Query API
          で検索を行います。
          <span className="font-bold">
            生成 AI は利用していません。RAG は
            <Link className="text-aws-smile" to="/rag">
              こちら
            </Link>
            で実行できます。
          </span>
        </div>
      </div>
      <div className="relative mb-16 mt-6 flex w-2/3 justify-center">
        <PiMagnifyingGlass className="absolute left-3 top-3 z-50 text-lg" />
        <input
          ref={queryRef}
          className="absolute w-full rounded-full border-gray-400 pl-9"
          placeholder="検索ワードを入力してください"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <ButtonIcon
          className="absolute right-3 top-2"
          onClick={() => setQuery('')}>
          <PiX />
        </ButtonIcon>
      </div>
      {loading && (
        <PiSpinnerGap className="animate-spin text-3xl text-gray-400" />
      )}
      <div className="mb-12 grid w-3/4 gap-6">
        {resultItems.map((result) =>
          isS3Url(result.DocumentURI!) ? (
            <div key={result.Id}>
              <a
                className={`${
                  downloading ? 'text-gray-400' : 'text-aws-sky'
                } cursor-pointer font-semibold`}
                onClick={() => {
                  if (!downloading) {
                    downloadDoc(result.DocumentURI!);
                  }
                }}>
                {result.DocumentTitle?.Text}
                {downloading && (
                  <PiSpinnerGap className="ml-2 inline-block animate-spin" />
                )}
              </a>
              <div className="mb-2 text-xs">{result.DocumentURI}</div>
              <HighlightText
                textWithHighlights={
                  result.DocumentExcerpt ?? {
                    Text: '',
                    Highlights: [],
                  }
                }
              />
            </div>
          ) : (
            <div key={result.Id}>
              <Link
                className="text-aws-sky font-semibold"
                to={result.DocumentURI!}>
                {result.DocumentTitle?.Text}
              </Link>
              <div className="mb-2 text-xs">{result.DocumentURI}</div>
              <HighlightText
                textWithHighlights={
                  result.DocumentExcerpt ?? {
                    Text: '',
                    Highlights: [],
                  }
                }
              />
            </div>
          )
        )}
      </div>
    </div>
  );
};

export default KendraSearchPage;
