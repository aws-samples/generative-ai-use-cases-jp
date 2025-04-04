import React from 'react';

interface MaterialFormulaProps {
  formula: string;
}

export const MaterialFormula: React.FC<MaterialFormulaProps> = ({ formula }) => {
  // 化学式のフォーマットを行う関数
  const formatFormula = (input: string): React.ReactNode => {
    if (!input) return null;

    // 正規表現でパターンを検出
    // 数字を下付き文字として処理
    const parts = input.split(/([0-9]+)/g);
    
    return parts.map((part, index) => {
      // 数字の場合は下付き文字として表示
      if (/^[0-9]+$/.test(part)) {
        return <sub key={index}>{part}</sub>;
      }
      return part;
    });
  };

  return (
    <div className="flex items-center space-x-2 rounded-md bg-indigo-50 px-3 py-1 text-lg font-medium text-indigo-800">
      {formatFormula(formula)}
    </div>
  );
};