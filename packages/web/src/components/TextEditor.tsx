import React from 'react';
import { DocumentComment } from 'generative-ai-use-cases-jp';
import { RowItemProps } from './RowItem';
import Card from './Card';
import Button from './Button';
import ButtonIcon from './ButtonIcon';
import { ErrorBoundary } from './ErrorBoundary';
import { PiTrash } from 'react-icons/pi';
import HighlightWithinTextarea from 'react-highlight-within-textarea';
import 'draft-js/dist/Draft.css';
import ButtonCopy from './ButtonCopy';

type Props = RowItemProps & {
  value: string;
  loading?: boolean;
  comments?: DocumentComment[];
  placeholder?: string;
  optional?: boolean;
  noBorder?: boolean;
  onChange: (value: string) => void;
  replaceSentence: (comment: DocumentComment) => void;
  removeComment: (comment: DocumentComment) => void;
};

const Texteditor: React.FC<Props> = (props) => {
  return (
    <div className="flex flex-col lg:flex-row">
      <div
        className={`${
          props.className ?? ''
        } mb-2 w-full resize-none overflow-y-auto rounded p-1.5 outline-none ${
          props.noBorder ? 'border-0 focus:ring-0 ' : 'border border-black/30'
        } `}>
        <ErrorBoundary>
          {/* 
          draft.js の不具合でクラッシュすることがあるためエラーが発生した際に再レンダリングを行う。
          https://github.com/facebookarchive/draft-js/issues/1320#issuecomment-472776784
           */}
          <HighlightWithinTextarea
            placeholder={props.placeholder}
            value={props.value}
            highlight={props.comments?.map((comment) => {
              return {
                highlight: comment.excerpt,
                className: 'text-aws-smile bg-inherit',
              };
            })}
            onChange={(value) => {
              props.onChange(value);
            }}
          />
          <div className="flex w-full justify-end">
            <ButtonCopy text={props.value} />
          </div>
        </ErrorBoundary>
      </div>
      <div className="mb-2 rounded border border-black/30 p-1.5 outline-none lg:ml-2">
        {props.comments &&
          props.comments.map(
            (comment, idx) =>
              comment.excerpt && (
                <Card key={`${comment.excerpt}-${idx}`} className="mb-2 w-80">
                  <div className="mb-5">
                    <span className="line-through">{comment.excerpt}</span>
                    {comment.replace && (
                      <>
                        <span className="mx-2">→</span>
                        <Button onClick={() => props.replaceSentence(comment)}>
                          {comment.replace}
                        </Button>
                      </>
                    )}
                  </div>

                  <div className="mb-2 text-sm">{comment.comment}</div>
                  <ButtonIcon onClick={() => props.removeComment(comment)}>
                    <PiTrash />
                  </ButtonIcon>
                </Card>
              )
          )}
        {!props.loading && props.comments && props.comments.length === 0 && (
          <div className="mb-2 ml-2 w-80">指摘事項はありません</div>
        )}
        {props.loading && (
          <div className="mb-2 ml-2 flex w-80 justify-center">
            <div className="border-aws-sky h-10 w-10 animate-spin rounded-full border-4 border-t-transparent"></div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Texteditor;
