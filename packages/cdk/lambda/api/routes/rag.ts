import { Router } from 'express';
import { handler as queryKendraHandler } from '../../queryKendra';
import { handler as retrieveKendraHandler } from '../../retrieveKendra';
import { wrapHandler } from './helpers';

export const router = Router();

router.post('/query', wrapHandler(queryKendraHandler));
router.post('/retrieve', wrapHandler(retrieveKendraHandler));
