import React from 'react';
import { BaseProps } from '../@types/common';
import { ReactMarkdown } from 'react-markdown/lib/react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';

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
      className={`${className ?? ''} prose max-w-full break-all`}
      children={children}
      remarkPlugins={[remarkGfm, remarkBreaks]}
      remarkRehypeOptions={{ clobberPrefix: prefix }}
      components={{
        a: LinkRenderer,
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        code({ node, inline, className, children, ...props }) {
          const match = /language-(\w+)/.exec(className || '');
          return !inline && match ? (
            <SyntaxHighlighter
              {...props}
              children={String(children).replace(/\n$/, '')}
              style={vscDarkPlus}
              language={match[1]}
              PreTag="div"
            />
          ) : (
            <code {...props} className={className}>
              {children}
            </code>
          );
        },
      }}
    />
  );
};

export default Markdown;
