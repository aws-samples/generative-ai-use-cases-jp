import { Router } from 'express';
import { handler as startSpeechToSpeechSessionHandler } from '../../startSpeechToSpeechSession';
import { wrapHandler } from './helpers';

export const router = Router();

router.post('/', wrapHandler(startSpeechToSpeechSessionHandler));
