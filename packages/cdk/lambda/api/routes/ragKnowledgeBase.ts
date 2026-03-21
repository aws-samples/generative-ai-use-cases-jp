import { Router } from 'express';
import { handler as retrieveKnowledgeBaseHandler } from '../../retrieveKnowledgeBase';
import { wrapHandler } from './helpers';

export const router = Router();

router.post('/retrieve', wrapHandler(retrieveKnowledgeBaseHandler));
