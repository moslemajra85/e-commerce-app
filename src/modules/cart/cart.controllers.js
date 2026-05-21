import {
  addCartItem,
  getCart,
  removeCartItem,
  updateCartItem,
} from './cart.service.js';
import { requireUser } from '../auth/auth.middleware.js';

export function createCartController(prisma) {
  return {
    async getCart(req, res) {
      const user = await requireUser(prisma, req);
      res.status(200).json(await getCart(prisma, user));
    },

    async addItem(req, res) {
      const user = await requireUser(prisma, req);
      res.status(200).json(await addCartItem(prisma, user, req.body));
    },

    async updateItem(req, res) {
      const user = await requireUser(prisma, req);
      res.status(200).json(await updateCartItem(prisma, user, req.params.itemId, req.body));
    },

    async removeItem(req, res) {
      const user = await requireUser(prisma, req);
      res.status(200).json(await removeCartItem(prisma, user, req.params.itemId));
    },
  };
}
