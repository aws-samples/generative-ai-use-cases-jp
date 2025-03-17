// src/i18n/config.ts

import i18n from 'i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import { initReactI18next } from 'react-i18next';

import translation_en from './locales/en.json';
import translation_ja from './locales/ja.json';

// サポートする言語をオブジェクトで定義しています。
// ユーザーが言語を手動で切り替える場合に使用するためのものです。
export const supportedLngs = {
  en: 'English',
  ja: '日本語',
  zh: '中文',
  ko: '한국어',
};

i18n
  .use(LanguageDetector) // ユーザーの言語設定を検知するため
  .use(initReactI18next) // i18next インスタンスを初期化
  .init({
    resources: {
      en: {
        translation: translation_en,
      },
      ja: {
        translation: translation_ja,
      },
    },
    fallbackLng: 'ja', // フォールバック言語。指定された言語ファイルがない場合などにこの言語が使用される
    returnEmptyString: false, // 空文字での定義を許可に
    supportedLngs: Object.keys(supportedLngs),
    debug: true, // true にすると開発コンソールに i18next が正しく初期化されたことを示す出力が表示される

    // デフォルトは`escapeValue: true`
    // 18next が翻訳メッセージ内のコードをエスケープし、XSS 攻撃から保護するためのもの
    // React がこのエスケープを行ってくれるので、今回はこれをオフにする
    interpolation: {
      escapeValue: false,
    },
  });

export default i18n;
