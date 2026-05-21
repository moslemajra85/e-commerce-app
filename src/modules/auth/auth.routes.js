import { Router } from 'express';
import { createAuthController } from './auth.controllers.js';

export function createAuthRouter(prisma) {
  const router = Router();
  const authController = createAuthController(prisma);

  router.post('/register', authController.register);
  router.post('/login', authController.login);

  return router;
}
