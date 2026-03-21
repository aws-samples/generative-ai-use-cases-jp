import { Router } from 'express';
import { handler as predictHandler } from '../../predict';
import { handler as predictTitleHandler } from '../../predictTitle';
import { wrapHandler } from './helpers';

export const router = Router();

router.post('/', wrapHandler(predictHandler));
router.post('/title', wrapHandler(predictTitleHandler));
