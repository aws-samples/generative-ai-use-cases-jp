import React, { useState } from 'react';

type Props = {
  onSubmit: (reasons: string[], feedback: string) => void;
  onCancel: () => void;
};

const FeedbackForm: React.FC<Props> = ({ onSubmit, onCancel }) => {
  const [selectedReasons, setSelectedReasons] = useState<string[]>([]);
  const [feedback, setFeedback] = useState<string>('');
  const [error, setError] = useState<string>('');

  const reasons = ['不正確', '時期遅れ', '有害または攻撃的', 'その他'];

  const handleReasonChange = (reason: string) => {
    setSelectedReasons(prev => 
      prev.includes(reason) 
        ? prev.filter(r => r !== reason) 
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
    <div className="mt-2 bg-white p-4 border rounded-lg shadow-sm">
      <h3 className="text-base font-medium mb-3">この回答を評価した理由をお聞かせください。</h3>
      <div className="mb-3 flex flex-wrap gap-2">
        {reasons.map((reason) => (
          <button
            key={reason}
            onClick={() => handleReasonChange(reason)}
            className={`px-3 py-1 text-sm rounded-full border ${
              selectedReasons.includes(reason)
                ? 'bg-blue-100 border-blue-500 text-blue-700'
                : 'bg-white border-gray-300 text-gray-700'
            }`}
          >
            {reason}
          </button>
        ))}
      </div>
      {error && <p className="text-red-500 text-sm mb-2">{error}</p>}
      <textarea
        className="w-full p-2 text-sm border rounded-md mb-1"
        placeholder="他にフィードバックがありましたら、入力してください。(optional)"
        value={feedback}
        onChange={(e) => setFeedback(e.target.value)}
        rows={3}
      />
      <div className="flex justify-end gap-2">
        <button
          className="px-4 py-2 text-sm text-gray-600 rounded-md hover:bg-gray-100"
          onClick={onCancel}
        >
          キャンセル
        </button>
        <button
          className="px-4 py-2 text-sm bg-blue-500 text-white rounded-md hover:bg-blue-600"
          onClick={handleSubmit}
        >
          送信
        </button>
      </div>
    </div>
  );
};

export default FeedbackForm;