import { Router } from 'express';
import { handler as minutesCustomPromptHandler } from '../../meetingMinutes/minutesCustomPrompt';
import { wrapHandler } from './helpers';

export const router = Router();

router.get('/custom-prompts', wrapHandler(minutesCustomPromptHandler));
router.post('/custom-prompts', wrapHandler(minutesCustomPromptHandler));
router.put(
  '/custom-prompts/:id',
  wrapHandler(minutesCustomPromptHandler, (req) => ({ id: req.params.id }))
);
router.delete(
  '/custom-prompts/:id',
  wrapHandler(minutesCustomPromptHandler, (req) => ({ id: req.params.id }))
);
