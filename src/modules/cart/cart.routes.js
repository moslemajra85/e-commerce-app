import { Router } from 'express';
import { createCartController } from './cart.controllers.js';

export function createCartRouter(prisma) {
  const router = Router();
  const cartController = createCartController(prisma);

  router.get('/', cartController.getCart);
  router.post('/items', cartController.addItem);
  router.patch('/items/:itemId', cartController.updateItem);
  router.delete('/items/:itemId', cartController.removeItem);

  return router;
}
