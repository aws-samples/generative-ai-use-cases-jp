import { useState } from 'react';
import useRagApi from './useRagApi';

const useRagFile = () => {
  const { getDocDownloadSignedUrl } = useRagApi();
  const [downloading, setDownloading] = useState(false);

  return {
    isS3Url: (url: string) => {
      return /^https:\/\/(|[\w\\-]+\.)s3(|(\.|-)[\w\\-]+).amazonaws.com\//.test(
        url
      )
        ? true
        : false;
    },
    downloadDoc: async (url: string) => {
      setDownloading(true);

      try {
        // S3 データソースの設定項目である S3 field mapping の s3_document_id のチェック有無で、
        // Document_URI が異なるためそれぞれの URI に対応できるようにする
        let result =
          /^https:\/\/s3.[\w\\-]+.amazonaws.com\/(?<bucketName>.+?)\/(?<prefix>.+)$/.exec(
            url
          );
        if (!result) {
          result =
            /^https:\/\/(?<bucketName>.+?).s3(|(\.|-)[\w\\-]+).amazonaws.com\/(?<prefix>.+)$/.exec(
              url
            );
        }
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
      } catch (e) {
        console.error(e);
      } finally {
        setDownloading(false);
      }
    },
    downloading,
  };
};

export default useRagFile;
