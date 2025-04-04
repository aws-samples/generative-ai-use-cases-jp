import React, { useState } from 'react';
import { FaSearch, FaMicrophone, FaSpinner } from 'react-icons/fa';

interface MaterialSearchInputProps {
  onSearch: (query: string) => void;
  placeholder?: string;
  isLoading?: boolean;
}

export const MaterialSearchInput: React.FC<MaterialSearchInputProps> = ({
  onSearch,
  placeholder = '材料名、組成式、または特性を検索...',
  isLoading = false,
}) => {
  const [query, setQuery] = useState('');
  const [isListening, setIsListening] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim() && !isLoading) {
      onSearch(query.trim());
    }
  };

  const handleVoiceInput = () => {
    // 音声入力を実装する場合のプレースホルダー
    setIsListening(true);
    
    // Web Speech APIを使う場合の例
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.webkitSpeechRecognition || window.SpeechRecognition;
      const recognition = new SpeechRecognition();
      
      recognition.lang = 'ja-JP';
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;
      
      recognition.start();
      
      recognition.onresult = (event) => {
        const speechResult = event.results[0][0].transcript;
        setQuery(speechResult);
        setIsListening(false);
      };
      
      recognition.onerror = () => {
        setIsListening(false);
      };
      
      recognition.onend = () => {
        setIsListening(false);
      };
    } else {
      // ブラウザが音声認識をサポートしていない場合
      setIsListening(false);
      alert('このブラウザは音声認識をサポートしていません。');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="w-full">
      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={placeholder}
          className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 pr-20 text-base focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
          disabled={isLoading}
        />
        <div className="absolute inset-y-0 right-0 flex items-center pr-3">
          {isLoading ? (
            <FaSpinner className="h-5 w-5 animate-spin text-gray-400" />
          ) : (
            <>
              <button
                type="button"
                onClick={handleVoiceInput}
                className={`mr-2 rounded-full p-1.5 ${
                  isListening 
                    ? 'bg-red-500 text-white' 
                    : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                }`}
              >
                <FaMicrophone className="h-4 w-4" />
              </button>
              <button
                type="submit"
                className="rounded-full bg-blue-500 p-1.5 text-white hover:bg-blue-600"
              >
                <FaSearch className="h-4 w-4" />
              </button>
            </>
          )}
        </div>
      </div>
    </form>
  );
};