import { login, register } from './auth.service.js';

export function createAuthController(prisma) {
  return {
    async register(req, res) {
      res.status(201).json(await register(prisma, req.body));
    },

    async login(req, res) {
      res.status(200).json(await login(prisma, req.body));
    },
  };
}
