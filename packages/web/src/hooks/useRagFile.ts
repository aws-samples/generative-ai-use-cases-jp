import useRagApi from './useRagApi';

const useRagFile = () => {
  const { getDocDownloadSignedUrl } = useRagApi();

  return {
    isS3Url: (url: string) => {
      return /^https:\/\/s3.[\w\\-]+.amazonaws.com\//.test(url) ? true : false;
    },
    downloadDoc: async (url: string) => {
      const result =
        /^https:\/\/s3.[\w\\-]+.amazonaws.com\/(?<bucketName>.+?)\/(?<prefix>.+)$/.exec(
          url
        );
      const groups = result?.groups as {
        bucketName: string;
        prefix: string;
      };

      const [filePrefix, anchorLink] = groups.prefix.split('#');
      const signedUrl = await getDocDownloadSignedUrl(
        groups.bucketName,
        // 日本語ファイル名の場合は URI エンコードされたファイル名が URL に設定されているため、
        // デコードしてから署名付き URL を取得する（二重で URI エンコードされるのを防止する）
        decodeURIComponent(filePrefix)
      );
      window.open(
        `${signedUrl}${anchorLink ? `#${anchorLink}` : ''}`,
        '_blank',
        'noopener,noreferrer'
      );
    },
  };
};

export default useRagFile;
