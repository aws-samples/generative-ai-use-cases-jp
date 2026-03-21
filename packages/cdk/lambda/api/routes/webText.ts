import { Router } from 'express';
import { handler as getWebTextHandler } from '../../getWebText';
import { wrapHandler } from './helpers';

export const router = Router();

router.get('/', wrapHandler(getWebTextHandler));
