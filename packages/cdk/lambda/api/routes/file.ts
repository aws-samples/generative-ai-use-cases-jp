import { Router } from 'express';
import { handler as getSignedUrlHandler } from '../../getFileUploadSignedUrl';
import { handler as getFileDownloadSignedUrlHandler } from '../../getFileDownloadSignedUrl';
import { handler as deleteFileHandler } from '../../deleteFile';
import { wrapHandler } from './helpers';

export const router = Router();

router.post('/url', wrapHandler(getSignedUrlHandler));
router.get('/url', wrapHandler(getFileDownloadSignedUrlHandler));
router.delete(
  '/:fileName',
  wrapHandler(deleteFileHandler, (req) => ({ fileName: req.params.fileName }))
);
