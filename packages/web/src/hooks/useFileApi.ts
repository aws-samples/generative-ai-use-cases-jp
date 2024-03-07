import {
  GetFileUploadSignedUrlRequest,
  GetFileUploadSignedUrlResponse,
  RecognizeFileRequest,
  RecognizeFileResponse,
  UploadFileRequest,
  GetDocDownloadSignedUrlRequest,
  GetDocDownloadSignedUrlResponse,
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
    getDocDownloadSignedUrl: async (s3Url: string) => {
      // Signed URL を取得
      const bucketName = s3Url.split('/')[2].split('.')[0];
      const filePrefix = s3Url.split('/').slice(3).join('/');
      const params: GetDocDownloadSignedUrlRequest = {
        bucketName,
        filePrefix,
      };
      const { data: url } = await http.api.get<GetDocDownloadSignedUrlResponse>(
        '/file/url',
        {
          params,
        }
      );
      return url;
    },
  };
};

export default useFileApi;
