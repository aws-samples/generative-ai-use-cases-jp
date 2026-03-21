import { Router } from 'express';
import { handler as generateImageHandler } from '../../generateImage';
import { wrapHandler } from './helpers';

export const router = Router();

router.post('/generate', wrapHandler(generateImageHandler));
