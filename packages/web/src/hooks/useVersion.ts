import axios, { AxiosResponse } from 'axios';
import useSWR from 'swr';

const version = import.meta.env.VITE_APP_VERSION;
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
    getHasUpdate: () => {
      // ローカルのバージョンが参照できない時はアップデートの表示はしない
      // (アップデートはないものとして扱う)
      if (!version) {
        return false;
      }
      // eslint-disable-next-line react-hooks/rules-of-hooks
      const { data: packageJson } = useSWR<AxiosResponse<PackageJson>>(
        PACKAGE_JSON_URL,
        versionFetcher
      );
      if (!packageJson) {
        return false;
      } else {
        // メジャーバージョンのみを比較する
        return version.split('.')[0] !== packageJson.data.version.split('.')[0];
      }
    },
  };
};

export default useRemoteVersion;
