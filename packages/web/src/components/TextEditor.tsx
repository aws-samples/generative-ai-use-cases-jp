import React from 'react';
import { RowItemProps } from './RowItem';
import { DocumentComment } from 'generative-ai-use-cases-jp';
import Card from '../components/Card';
import { PiTrash } from 'react-icons/pi';
import HighlightWithinTextarea from 'react-highlight-within-textarea';

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
        key="HighlightWithinTextarea"
        className={`${
          props.className ?? ''
        } mb-2 w-full resize-none overflow-y-auto rounded p-1.5 outline-none ${
          props.noBorder ? 'border-0 focus:ring-0 ' : 'border border-black/30'
        } `}>
        <HighlightWithinTextarea
          placeholder=""
          value={props.value}
          highlight={props.comments?.map((comment) => comment.excerpt)}
          onChange={(value) => {
            props.onChange(value);
          }}
        />
      </div>
      <div className="mb-2 rounded border border-black/30 p-1.5 outline-none lg:ml-2">
        {props.comments &&
          props.comments.map(
            (comment) =>
              comment.excerpt && (
                <Card key={comment.excerpt} className="mb-2 w-80">
                  <div className="mb-5">
                    <span className="line-through">{comment.excerpt}</span>
                    {comment.replace && (
                      <>
                        &nbsp;→&nbsp;
                        <span
                          className="cursor-pointer rounded bg-orange-500 p-1.5 text-neutral-50 hover:bg-orange-400"
                          onClick={() => props.replaceSentence(comment)}>
                          {comment.replace}
                        </span>
                      </>
                    )}
                  </div>

                  <div className="mb-2 text-sm">{comment.comment}</div>
                  <div
                    className="flex cursor-pointer flex-row justify-end"
                    onClick={() => props.removeComment(comment)}>
                    <PiTrash />
                  </div>
                </Card>
              )
          )}
        {!props.loading && props.comments && props.comments.length === 0 && (
          <div className="mb-2 ml-2 w-80">指摘事項はありません</div>
        )}
        {props.loading && (
          <div className="mb-2 ml-2 flex w-80 justify-center">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-500 border-t-transparent"></div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Texteditor;
