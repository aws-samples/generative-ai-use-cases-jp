import { Router } from 'express';
import { handler as getTokenUsageHandler } from '../../getTokenUsage';
import { wrapHandler } from './helpers';

export const router = Router();

// eslint-disable-next-line @typescript-eslint/no-explicit-any
router.get('/', wrapHandler(getTokenUsageHandler as any));
