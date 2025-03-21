// src/i18n/config.ts

import i18n from 'i18next';
import HttpApi from 'i18next-http-backend';
import LanguageDetector from 'i18next-browser-languagedetector';
import { initReactI18next } from 'react-i18next';
import yaml from 'js-yaml';

/* eslint-disable i18nhelper/no-jp-string */

// サポートする言語をオブジェクトで定義しています。
// ユーザーが言語を手動で切り替える場合に使用するためのものです。
export const supportedLngs = {
  en: 'English',
  ja: '日本語',
  // zh: '中文',
  // ko: '한국어',
};

i18n
  .use(HttpApi)
  .use(LanguageDetector) // ユーザーの言語設定を検知するため
  .use(initReactI18next) // i18next インスタンスを初期化
  .init({
    backend: {
      loadPath: '/locales/{{ns}}/{{lng}}.yaml',
      parse: (data: string) => yaml.load(data),
    },
    defaultNS: 'translation',
    ns: ['translation', 'prompts'],
    fallbackLng: 'en', // フォールバック言語。指定された言語ファイルがない場合などにこの言語が使用される
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
