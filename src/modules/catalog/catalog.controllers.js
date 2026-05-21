import { getProductBySlug, listProducts } from './catalog.service.js';

export function createCatalogController(prisma) {
  return {
    async listProducts(req, res) {
      res.status(200).json(await listProducts(prisma, req.query));
    },

    async getProduct(req, res) {
      res.status(200).json(await getProductBySlug(prisma, req.params.slug));
    },
  };
}
