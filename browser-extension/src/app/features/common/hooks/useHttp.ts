import { fetchAuthSession } from 'aws-amplify/auth';
import axios from 'axios';
import useSWR, { SWRConfiguration } from 'swr';
import useSettings from '../../settings/useSettings';
import { useCallback } from 'react';

const api = axios.create();

api.interceptors.request.use(async (config) => {
  const session = await fetchAuthSession();
  const token = session.tokens?.idToken?.toString();
  if (token) {
    config.headers['Authorization'] = token;
  }
  config.headers['Content-Type'] = 'application/json';

  return config;
});

const fetcher = (url: string) => {
  return api.get(url).then((res) => res.data);
};

const useHttp = () => {
  const { settings } = useSettings();

  const getUrl = useCallback(
    (url: string) => {
      if (settings) {
        return `${settings.apiEndpoint}${url}`;
      } else {
        return null;
      }
    },
    [settings],
  );

  return {
    /**
     * GET Request
     * Implemented with SWR
     * @param url
     * @returns
     */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    get: <Data = any, Error = any>(url: string | null, config?: SWRConfiguration) => {
      // eslint-disable-next-line react-hooks/rules-of-hooks
      return useSWR<Data, Error>(url ? getUrl(url) : null, fetcher, config);
    },
  };
};

export default useHttp;
