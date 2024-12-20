import React from 'react';

export const GenerateSlidePage: React.FC = () => {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="mb-4 text-2xl font-bold">スライド生成</h1>
      <p className="mb-8 text-gray-600">
        チャット形式でスライド資料を作成します。LLM
        によって構造化されたテキストを生成し、スライド資料として画面に描画します。
      </p>
      {/* スライド生成機能の実装はこちらに追加予定 */}
    </div>
  );
};

export default GenerateSlidePage;
