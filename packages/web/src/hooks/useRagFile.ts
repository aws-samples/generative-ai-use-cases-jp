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
        filePrefix
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
