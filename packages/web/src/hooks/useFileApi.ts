import {
  GetFileUploadSignedUrlRequest,
  GetFileUploadSignedUrlResponse,
  RecognizeFileRequest,
  RecognizeFileResponse,
  UploadFileRequest,
  GetDocDownloadSignedUrlRequest,
  GetDocDownloadSignedUrlResponse,
  DeleteFileResponse,
} from 'generative-ai-use-cases-jp';
import useHttp from './useHttp';
import axios from 'axios';

const useFileApi = () => {
  const http = useHttp();
  return {
    getSignedUrl: (req: GetFileUploadSignedUrlRequest) => {
      return http.post<GetFileUploadSignedUrlResponse>('file/url', req);
    },
    recognizeFile: (req: RecognizeFileRequest) => {
      return http.post<RecognizeFileResponse>('file/recognize', req);
    },
    uploadFile: (url: string, req: UploadFileRequest) => {
      return axios({
        method: 'PUT',
        url: url,
        headers: { 'Content-Type': 'file/*' },
        data: req.file,
      });
    },
    getDocDownloadSignedUrl: async (s3Uri: string) => {
      let result = /^s3:\/\/(?<bucketName>.+?)\/(?<prefix>.+)/.exec(s3Uri);

      if (!result) {
        result =
          /^https:\/\/s3.(?<region>.+?).amazonaws.com\/(?<bucketName>.+?)\/(?<prefix>.+)$/.exec(
            s3Uri
          );

        if (!result) {
          result =
            /^https:\/\/(?<bucketName>.+?).s3(|(\.|-)(?<region>.+?)).amazonaws.com\/(?<prefix>.+)$/.exec(
              s3Uri
            );
        }
      }

      const groups = result?.groups as {
        bucketName: string;
        prefix: string;
        region?: string;
      };

      const [filePrefix, anchorLink] = groups.prefix.split('#');

      // Signed URL を取得
      const params: GetDocDownloadSignedUrlRequest = {
        bucketName: groups.bucketName,
        filePrefix: decodeURIComponent(filePrefix),
        region: groups.region,
      };
      const { data: url } = await http.api.get<GetDocDownloadSignedUrlResponse>(
        '/file/url',
        {
          params,
        }
      );
      return `${url}${anchorLink ? `#${anchorLink}` : ''}`;
    },
    deleteUploadedFile: async (fileName: string) => {
      return http.delete<DeleteFileResponse>(`file/${fileName}`);
    },
  };
};

export default useFileApi;
