import { Router } from 'express';
import { handler as findShareIdHandler } from '../../findShareId';
import { handler as createShareIdHandler } from '../../createShareId';
import { handler as getSharedChatHandler } from '../../getSharedChat';
import { handler as deleteShareIdHandler } from '../../deleteShareId';
import { wrapHandler } from './helpers';

export const router = Router();

router.get(
  '/chat/:chatId',
  wrapHandler(findShareIdHandler, (req) => ({ chatId: req.params.chatId }))
);
router.post(
  '/chat/:chatId',
  wrapHandler(createShareIdHandler, (req) => ({ chatId: req.params.chatId }))
);
router.get(
  '/share/:shareId',
  wrapHandler(getSharedChatHandler, (req) => ({ shareId: req.params.shareId }))
);
router.delete(
  '/share/:shareId',
  wrapHandler(deleteShareIdHandler, (req) => ({ shareId: req.params.shareId }))
);
