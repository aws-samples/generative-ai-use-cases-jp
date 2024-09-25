import React, { useState } from 'react';
import Button from './Button';

type Props = {
  onSubmit: (reasons: string[], feedback: string) => void;
  onCancel: () => void;
};

const FeedbackForm: React.FC<Props> = ({ onSubmit, onCancel }) => {
  const [selectedReasons, setSelectedReasons] = useState<string[]>([]);
  const [feedback, setFeedback] = useState<string>('');
  const [error, setError] = useState<string>('');

  const reasons = ['不正確', '情報が古い', '有害または攻撃的', 'その他'];

  const handleReasonChange = (reason: string) => {
    setSelectedReasons((prev) =>
      prev.includes(reason)
        ? prev.filter((r) => r !== reason)
        : [...prev, reason]
    );
    setError('');
  };

  const handleSubmit = () => {
    if (selectedReasons.length === 0) {
      setError('理由を選択してください。');
      return;
    }
    onSubmit(selectedReasons, feedback);
  };

  return (
    <div className="mt-2 rounded-lg border bg-white p-4 shadow-sm">
      <h3 className="mb-3 text-base font-medium">
        この回答を評価した理由をお聞かせください。
      </h3>
      <div className="mb-3 flex flex-wrap gap-2">
        {reasons.map((reason) => (
          <button
            key={reason}
            onClick={() => handleReasonChange(reason)}
            className={`rounded-full border px-3 py-1 text-sm ${
              selectedReasons.includes(reason)
                ? 'border-blue-500 bg-blue-100 text-blue-700'
                : 'border-gray-300 bg-white text-gray-700'
            }`}>
            {reason}
          </button>
        ))}
      </div>
      {error && <p className="mb-2 text-sm text-red-500">{error}</p>}
      <textarea
        className="mb-1 w-full rounded-md border p-2 text-sm"
        placeholder="他にフィードバックがありましたら、入力してください。(optional)"
        value={feedback}
        onChange={(e) => setFeedback(e.target.value)}
        rows={3}
      />
      <div className="flex justify-end gap-2">
        <Button onClick={onCancel} outlined={true}>
          キャンセル
        </Button>
        <Button onClick={handleSubmit} outlined={false}>
          送信
        </Button>
      </div>
    </div>
  );
};

export default FeedbackForm;
