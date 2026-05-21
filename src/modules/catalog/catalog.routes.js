import { Router } from 'express';
import { createCatalogController } from './catalog.controllers.js';

export function createCatalogRouter(prisma) {
  const router = Router();
  const catalogController = createCatalogController(prisma);

  router.get('/products', catalogController.listProducts);
  router.get('/products/:slug', catalogController.getProduct);

  return router;
}
