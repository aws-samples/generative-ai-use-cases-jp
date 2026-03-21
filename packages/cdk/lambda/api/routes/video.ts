import { Router } from 'express';
import { handler as generateVideoHandler } from '../../generateVideo';
import { handler as listVideoJobsHandler } from '../../listVideoJobs';
import { handler as deleteVideoJobHandler } from '../../deleteVideoJob';
import { wrapHandler } from './helpers';

export const router = Router();

router.post('/generate', wrapHandler(generateVideoHandler));
router.get('/generate', wrapHandler(listVideoJobsHandler));
router.delete(
  '/generate/:createdDate',
  wrapHandler(deleteVideoJobHandler, (req) => ({
    createdDate: req.params.createdDate,
  }))
);
