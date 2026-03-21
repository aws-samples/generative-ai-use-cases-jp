import { Router } from 'express';
import { handler as startTranscriptionHandler } from '../../startTranscription';
import { handler as getTranscriptionHandler } from '../../getTranscription';
import { handler as getSignedUrlHandler } from '../../getFileUploadSignedUrl';
import { wrapHandler } from './helpers';

export const router = Router();

router.post('/start', wrapHandler(startTranscriptionHandler));
router.post('/url', wrapHandler(getSignedUrlHandler));
router.get(
  '/result/:jobName',
  wrapHandler(getTranscriptionHandler, (req) => ({
    jobName: req.params.jobName,
  }))
);
