import React, { useMemo } from 'react';
import { BaseProps } from '../@types/common';
import { default as ReactMarkdown } from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';
import ButtonCopy from './ButtonCopy';
import useRagFile from '../hooks/useRagFile';
import { PiSpinnerGap } from 'react-icons/pi';

type Props = BaseProps & {
  children: string;
  prefix?: string;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const LinkRenderer = (props: any) => {
  // 現状、S3 からのファイルダウンロード機能は RAG チャットしか利用しない
  const { downloadDoc, isS3Url, downloading } = useRagFile();
  const isS3 = useMemo(() => {
    return isS3Url(props.href);
  }, [isS3Url, props.href]);

  return (
    <>
      {isS3 ? (
        <a
          id={props.id}
          onClick={() => {
            if (!downloading) {
              downloadDoc(props.href);
            }
          }}
          className={`cursor-pointer ${downloading ? 'text-gray-400' : ''}`}>
          {props.children}
          {downloading && (
            <PiSpinnerGap className="mx-2 inline-block animate-spin" />
          )}
        </a>
      ) : (
        <a
          id={props.id}
          href={props.href}
          target={props.href.startsWith('#') ? '_self' : '_blank'}
          rel="noreferrer">
          {props.children}
        </a>
      )}
    </>
  );
};

const Markdown: React.FC<Props> = ({ className, prefix, children }) => {
  return (
    <ReactMarkdown
      className={`${
        className ?? ''
      } prose prose-code:w-1/5 max-w-full break-all`}
      children={children}
      remarkPlugins={[remarkGfm, remarkBreaks]}
      remarkRehypeOptions={{ clobberPrefix: prefix }}
      components={{
        a: LinkRenderer,
        sup: ({ children }) => (
          <sup className="m-0.5 rounded-full bg-gray-200 px-1">{children}</sup>
        ),
        code({ className, children }) {
          const language = /language-(\w+)/.exec(className || '')?.[1];
          const isCodeBlock = !!language;
          const codeText = String(children).replace(/\n$/, '');

          return (
            <>
              {isCodeBlock ? (
                <>
                  <div className="flex">
                    <span className="flex-auto">{language} </span>
                    <ButtonCopy
                      className="mr-2 justify-end text-gray-400"
                      text={codeText} // クリップボードにコピーする対象として、SyntaxHighlighter に渡すソースコード部分を指定
                    />
                  </div>
                  <SyntaxHighlighter
                    children={codeText}
                    style={vscDarkPlus}
                    language={isCodeBlock ? language : 'plaintext'}
                  />
                </>
              ) : (
                <span className="bg-aws-squid-ink/10 border-aws-squid-ink/30 inline rounded-md border px-1 py-0.5">
                  {codeText}
                </span>
              )}
            </>
          );
        },
      }}
    />
  );
};

export default Markdown;
