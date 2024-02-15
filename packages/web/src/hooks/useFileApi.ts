import {
  GetFileUploadSignedUrlRequest,
  GetFileUploadSignedUrlResponse,
  RecognizeFileRequest,
  RecognizeFileResponse,
  UploadFileRequest,
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
  };
};

export default useFileApi;
