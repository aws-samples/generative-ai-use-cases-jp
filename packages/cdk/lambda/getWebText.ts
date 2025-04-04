import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { parse } from 'node-html-parser';
import sanitizeHtml from 'sanitize-html';
import { URL } from 'url';
import dns from 'dns';
import { promisify } from 'util';

const dnsLookup = promisify(dns.lookup);

// IPアドレスがプライベートIPかどうかを確認する関数
function isPrivateIP(ip: string): boolean {
  // IPアドレスを数値に変換する関数
  const ipToLong = (ip: string) => {
    return ip.split('.').reduce((acc, octet) => (acc << 8) + parseInt(octet), 0) >>> 0;
  };
  
  // 禁止されているIPアドレス範囲を定義
  const blockedRanges = [
    // ループバックアドレス
    { start: '127.0.0.0', end: '127.255.255.255' },
    // リンクローカルアドレス
    { start: '169.254.0.0', end: '169.254.255.255' },
    // プライベートネットワークアドレス
    { start: '10.0.0.0', end: '10.255.255.255' },
    { start: '172.16.0.0', end: '172.31.255.255' },
    { start: '192.168.0.0', end: '192.168.255.255' },
    // AWSのメタデータサービスの特定アドレス
    { start: '169.254.169.254', end: '169.254.169.254' },
    // localhost
    { start: '0.0.0.0', end: '0.255.255.255' },
  ];
  
  const ipLong = ipToLong(ip);
  
  // いずれかの禁止範囲に含まれるかチェック
  return blockedRanges.some(range => {
    const startLong = ipToLong(range.start);
    const endLong = ipToLong(range.end);
    return ipLong >= startLong && ipLong <= endLong;
  });
}

// URLの安全性を検証する関数
async function validateUrl(urlString: string): Promise<{ valid: boolean; message?: string }> {
  try {
    // URLの形式をチェック
    const url = new URL(urlString);
    
    // 許可するスキームはhttpとhttpsのみ
    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      return { valid: false, message: '許可されていないURLスキームです。HTTPまたはHTTPSのみ使用できます。' };
    }
    
    // IPアドレスが直接指定されている場合の検証
    const ipv4Regex = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
    if (ipv4Regex.test(url.hostname)) {
      if (isPrivateIP(url.hostname)) {
        console.warn(`SSRF試行：プライベートIP ${url.hostname} へのアクセスがブロックされました`);
        return { valid: false, message: '内部ネットワークへのアクセスは許可されていません。' };
      }
    } else {
      // ドメイン名の場合、DNSルックアップを実行して解決されるIPをチェック
      try {
        const { address } = await dnsLookup(url.hostname);
        if (isPrivateIP(address)) {
          console.warn(`SSRF試行：ドメイン ${url.hostname} がプライベートIP ${address} に解決されました`);
          return { valid: false, message: '内部ネットワークに解決されるドメインへのアクセスは許可されていません。' };
        }
      } catch (error) {
        console.error(`DNSルックアップエラー: ${error}`);
        return { valid: false, message: '指定されたドメインの解決に失敗しました。' };
      }
    }
    
    // localhost関連のホスト名をブロック（DNS解決をすり抜けるケースに対応）
    const blockedHostnames = ['localhost', '127.0.0.1', 'loopback', 'internal'];
    const hostname = url.hostname.toLowerCase();
    if (blockedHostnames.some(blocked => hostname.includes(blocked))) {
      console.warn(`SSRF試行：ブロックされたホスト名 ${hostname} へのアクセスが検出されました`);
      return { valid: false, message: '内部ネットワークへのアクセスは許可されていません。' };
    }
    
    return { valid: true };
  } catch (error) {
    console.error(`URL検証エラー: ${error}`);
    return { valid: false, message: '無効なURL形式です。' };
  }
}

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    const url = event?.queryStringParameters?.url;

    if (!url) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({ message: 'url is missing' }),
      };
    }

    // URLの安全性を検証
    const validation = await validateUrl(url);
    if (!validation.valid) {
      return {
        statusCode: 403,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({ message: validation.message || 'アクセスが拒否されました' }),
      };
    }

    // 安全なURLと確認できたらリクエストを実行
    const res = await fetch(url);
    const html = await res.text();
    // Fix invalid tags
    const cleanHtml = sanitizeHtml(html, {
      // body and html are removed by default, so this option prevents that
      allowedTags: [...sanitizeHtml.defaults.allowedTags, 'body', 'html'],
    });
    const root = parse(cleanHtml, {
      comment: false,
      blockTextElements: {
        script: false,
        noScript: false,
        style: false,
        pre: false,
      },
    });
    const text = root?.querySelector('body')?.removeWhitespace().text;

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({ text }),
    };
  } catch (error) {
    console.log(error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({ message: 'Internal Server Error' }),
    };
  }
};
