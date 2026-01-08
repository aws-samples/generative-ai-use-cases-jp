import { BraveSearchResult, TavilySearchResult } from 'generative-ai-use-cases';

export type SearchResult = {
  title: string;
  content: string;
  url: string;
  extraSnippets?: string[];
};

/**
 * Brave Search APIを使用してWeb検索を実行する
 * @param keyword - 検索キーワード
 * @returns 検索結果の配列（最大3件）
 * @throws APIキー未設定、認証エラー、レート制限、その他APIエラー時
 */
export const searchUsingBrave = async (
  keyword: string
): Promise<SearchResult[]> => {
  // https://api-dashboard.search.brave.com/app/documentation/web-search/get-started
  const searchApiKey = process.env.SEARCH_API_KEY;
  if (!searchApiKey) {
    throw new Error('SEARCH_API_KEY environment variable is not configured');
  }

  const searchUrl = `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(keyword)}&count=3&text_decorations=0`;

  const response = await fetch(searchUrl, {
    headers: {
      'X-Subscription-Token': searchApiKey,
    },
  });

  if (!response.ok) {
    const errorBody = await response
      .text()
      .catch(() => 'Unable to read error body');
    console.error(
      `Brave Search API error: ${response.status} ${response.statusText}`,
      {
        statusCode: response.status,
        errorBody,
        keyword,
      }
    );

    if (response.status === 401 || response.status === 403) {
      throw new Error(
        'Search API authentication failed. Please check your API key.'
      );
    }
    if (response.status === 429) {
      throw new Error(
        'Search API rate limit exceeded. Please try again later.'
      );
    }
    throw new Error(
      `Search API error: ${response.status} ${response.statusText}`
    );
  }

  const data = await response.json();

  if (!data?.web?.results || !Array.isArray(data.web.results)) {
    console.error('Unexpected Brave Search response structure:', {
      hasData: !!data,
      hasWeb: !!data?.web,
      hasResults: !!data?.web?.results,
    });
    throw new Error('Unexpected response format from Brave Search API');
  }

  return data.web.results.map(
    (result: BraveSearchResult): SearchResult => ({
      title: result.title,
      content: result.description,
      url: result.url,
      extraSnippets: result.extra_snippets,
    })
  );
};

/**
 * Tavily Search APIを使用してWeb検索を実行する
 * @param keyword - 検索キーワード
 * @returns 検索結果の配列（最大3件）
 * @throws APIキー未設定、認証エラー、レート制限、その他APIエラー時
 */
export const searchUsingTavily = async (
  keyword: string
): Promise<SearchResult[]> => {
  // https://docs.tavily.com/documentation/api-reference/endpoint/search
  const searchApiKey = process.env.SEARCH_API_KEY;
  if (!searchApiKey) {
    throw new Error('SEARCH_API_KEY environment variable is not configured');
  }

  const searchUrl = 'https://api.tavily.com/search';

  const response = await fetch(searchUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${searchApiKey}`,
    },
    body: JSON.stringify({
      query: keyword,
      search_depth: 'basic',
      include_answer: false,
      include_images: false,
      include_raw_content: true,
      max_results: 3,
    }),
  });

  if (!response.ok) {
    const errorBody = await response
      .text()
      .catch(() => 'Unable to read error body');
    console.error(
      `Tavily Search API error: ${response.status} ${response.statusText}`,
      {
        statusCode: response.status,
        errorBody,
        keyword,
      }
    );

    if (response.status === 401 || response.status === 403) {
      throw new Error(
        'Search API authentication failed. Please check your API key.'
      );
    }
    if (response.status === 429) {
      throw new Error(
        'Search API rate limit exceeded. Please try again later.'
      );
    }
    throw new Error(
      `Search API error: ${response.status} ${response.statusText}`
    );
  }

  const data = await response.json();

  if (!data?.results || !Array.isArray(data.results)) {
    console.error('Unexpected Tavily Search response structure:', {
      hasData: !!data,
      hasResults: !!data?.results,
    });
    throw new Error('Unexpected response format from Tavily Search API');
  }

  return data.results.map((result: TavilySearchResult) => ({
    title: result.title,
    content: result.raw_content ?? result.content,
    url: result.url,
  }));
};

export const search = async (
  keyword: string,
  engine: 'Brave' | 'Tavily'
): Promise<SearchResult[]> => {
  if (engine === 'Brave') {
    return searchUsingBrave(keyword);
  } else {
    return searchUsingTavily(keyword);
  }
};
