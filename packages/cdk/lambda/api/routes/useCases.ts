import { Router, Request } from 'express';
import { handler as listUseCasesHandler } from '../../useCaseBuilder/listUseCases';
import { handler as listFavoriteUseCasesHandler } from '../../useCaseBuilder/listFavoriteUseCases';
import { handler as getUseCaseHandler } from '../../useCaseBuilder/getUseCase';
import { handler as createUseCaseHandler } from '../../useCaseBuilder/createUseCase';
import { handler as updateUseCaseHandler } from '../../useCaseBuilder/updateUseCase';
import { handler as deleteUseCaseHandler } from '../../useCaseBuilder/deleteUseCase';
import { handler as toggleFavoriteHandler } from '../../useCaseBuilder/toggleFavorite';
import { handler as toggleSharedHandler } from '../../useCaseBuilder/toggleShared';
import { handler as listRecentlyUsedUseCasesHandler } from '../../useCaseBuilder/listRecentlyUsedUseCases';
import { handler as updateRecentlyUsedUseCaseHandler } from '../../useCaseBuilder/updateRecentlyUsedUseCase';
import { wrapHandler } from './helpers';

export const router = Router();

const ucId = (req: Request) => ({
  useCaseId: req.params.useCaseId,
});

router.get('/', wrapHandler(listUseCasesHandler));
router.get('/favorite', wrapHandler(listFavoriteUseCasesHandler));
router.get('/recent', wrapHandler(listRecentlyUsedUseCasesHandler));
router.put(
  '/recent/:useCaseId',
  wrapHandler(updateRecentlyUsedUseCaseHandler, ucId)
);
router.get('/:useCaseId', wrapHandler(getUseCaseHandler, ucId));
router.post('/', wrapHandler(createUseCaseHandler));
router.put('/:useCaseId', wrapHandler(updateUseCaseHandler, ucId));
router.delete('/:useCaseId', wrapHandler(deleteUseCaseHandler, ucId));
router.put('/:useCaseId/favorite', wrapHandler(toggleFavoriteHandler, ucId));
router.put('/:useCaseId/shared', wrapHandler(toggleSharedHandler, ucId));
