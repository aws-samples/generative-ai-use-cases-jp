import axios, { AxiosResponse } from 'axios';
import useSWR from 'swr';

const version = import.meta.env.VITE_APP_VERSION || 'unknown';
const PACKAGE_JSON_URL =
  'https://raw.githubusercontent.com/aws-samples/generative-ai-use-cases-jp/main/package.json';

interface PackageJson {
  version: string;
}

const versionFetcher = axios.create();

const useRemoteVersion = () => {
  return {
    getLocalVersion: () => {
      return version;
    },
    fetchRemoteVersion: () => {
      // eslint-disable-next-line react-hooks/rules-of-hooks
      return useSWR<AxiosResponse<PackageJson>>(
        PACKAGE_JSON_URL,
        versionFetcher
      );
    },
    getHasUpdate: () => {
      // eslint-disable-next-line react-hooks/rules-of-hooks
      const { data: packageJson } = useSWR<AxiosResponse<PackageJson>>(
        PACKAGE_JSON_URL,
        versionFetcher
      );
      if (!packageJson) {
        return false;
      } else {
        return version !== packageJson.data.version;
      }
    },
  };
};

export default useRemoteVersion;
