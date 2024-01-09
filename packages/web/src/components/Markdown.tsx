import React from 'react';
import { BaseProps } from '../@types/common';
import { ReactMarkdown } from 'react-markdown/lib/react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';
import ButtonCopy from './ButtonCopy';

type Props = BaseProps & {
  children: string;
  prefix?: string;
};

const LinkRenderer: React.FC<
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  any
> = (props) => {
  return (
    <a
      id={props.id}
      href={props.href}
      target={props.href.startsWith('#') ? '_self' : '_blank'}
      rel="noreferrer">
      {props.children}
    </a>
  );
};

const Markdown: React.FC<Props> = ({ className, prefix, children }) => {
  return (
    <ReactMarkdown
      className={`${className ?? ''} prose max-w-sm sm:max-w-md md:max-w-2xl lg:max-w-screen-md break-all prose-code:w-1/5`}
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
              <div className="flex">
                <span className="flex-auto">{isCodeBlock ? language : ''}</span>
                <ButtonCopy
                  className="mr-2 text-gray-400 justify-end"
                  text={codeText} // クリップボードにコピーする対象として、SyntaxHighlighter に渡すソースコード部分を指定
                />
              </div>
              <SyntaxHighlighter
                {...props}
                children={codeText}
                style={vscDarkPlus}
                language={isCodeBlock ? language : 'plaintext'}
                PreTag="div"
              />
            </>
          );
        },
      }}
    />
  );
};

export default Markdown;
