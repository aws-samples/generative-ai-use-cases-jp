import React, { useMemo } from 'react';
import { BaseProps } from '../@types/common';
import { ReactMarkdown } from 'react-markdown/lib/react-markdown';
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

const LinkRenderer: React.FC<
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  any
> = (props) => {
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
      } prose prose-code:w-1/5 max-w-sm break-all sm:max-w-md md:max-w-2xl lg:max-w-screen-md`}
      children={children}
      remarkPlugins={[remarkGfm, remarkBreaks]}
      remarkRehypeOptions={{ clobberPrefix: prefix }}
      components={{
        a: LinkRenderer,
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        code({ node, inline, className, children, ...props }) {
          const language = /language-(\w+)/.exec(className || '')?.[1];
          const isCodeBlock = !inline && language;
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
                    {...props}
                    children={codeText}
                    style={vscDarkPlus}
                    language={isCodeBlock ? language : 'plaintext'}
                  />
                </>
              ) : (
                <div className="bg-aws-squid-ink/10 border-aws-squid-ink/30 inline rounded-md border px-1 py-0.5">
                  {codeText}
                </div>
              )}
            </>
          );
        },
      }}
    />
  );
};

export default Markdown;
