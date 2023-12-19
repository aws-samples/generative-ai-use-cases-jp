import React from 'react';
import { BaseProps } from '../@types/common';
import { default as ReactMarkdown } from 'react-markdown';
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
      remarkPlugins={[remarkGfm, remarkBreaks]}
      remarkRehypeOptions={{ clobberPrefix: prefix }}
      components={{
        a(props) {
          const {children} = props;
          return (<LinkRenderer>{children}</LinkRenderer>);
        },
        code(props) {
          const {children, className, node, ref, ...rest} = props;
          const match = /language-(\w+)/.exec(className || '');
          return match ? (
            <SyntaxHighlighter
              {...rest}
              PreTag="div"
              children={String(children).replace(/\n$/, '')}
              language={match[1]}
              style={vscDarkPlus}
            />
          ) : (
            <code {...rest} className={className}>
              {children}
            </code>
          )
        },
      }}
    >
    {children}
    </ReactMarkdown>
  );
};

export default Markdown;
