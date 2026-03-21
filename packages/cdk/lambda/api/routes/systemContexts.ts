import { Router, Request } from 'express';
import { handler as createSystemContextHandler } from '../../createSystemContext';
import { handler as listSystemContextsHandler } from '../../listSystemContexts';
import { handler as deleteSystemContextHandler } from '../../deleteSystemContext';
import { handler as updateSystemContextTitleHandler } from '../../updateSystemContextTitle';
import { wrapHandler } from './helpers';

export const router = Router();

const scId = (req: Request) => ({
  systemContextId: req.params.systemContextId,
});

router.post('/', wrapHandler(createSystemContextHandler));
router.get('/', wrapHandler(listSystemContextsHandler));
router.delete(
  '/:systemContextId',
  wrapHandler(deleteSystemContextHandler, scId)
);
router.put(
  '/:systemContextId/title',
  wrapHandler(updateSystemContextTitleHandler, scId)
);
