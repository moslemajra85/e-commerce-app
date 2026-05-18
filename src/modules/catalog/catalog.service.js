import { HttpError } from '../../shared/errors.js';

// Lists only sellable catalog data. Inactive products and variants stay hidden
// from customers but can still exist in the seed data for future admin flows.
export function listProducts(store) {
  return store.products
    .filter((product) => product.status === 'active')
    .map((product) => ({
      ...product,
      variants: product.variants.filter((variant) => variant.active),
    }));
}

// Fetches one active product by its stable product ID and hides inactive
// variants from the response.
export function getProduct(store, productId) {
  const product = store.products.find((candidate) => candidate.id === productId && candidate.status === 'active');

  if (!product) {
    throw new HttpError(404, 'Product not found');
  }

  return {
    ...product,
    variants: product.variants.filter((variant) => variant.active),
  };
}

// Finds a sellable variant and its parent product. Cart and checkout services
// use this to avoid duplicating active product/variant checks.
export function findVariant(store, variantId) {
  for (const product of store.products) {
    const variant = product.variants.find((candidate) => candidate.id === variantId);
    if (variant && product.status === 'active' && variant.active) {
      return { product, variant };
    }
  }

  throw new HttpError(404, 'Product variant not found');
}
