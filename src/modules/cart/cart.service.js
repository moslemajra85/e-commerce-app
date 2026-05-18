import { findVariant } from '../catalog/catalog.service.js';
import { assertStockAvailable, getAvailableQuantity } from '../inventory/inventory.service.js';
import { HttpError } from '../../shared/errors.js';

// Returns the active cart in API response shape, including product snapshots
// and totals derived from current catalog prices.
export function getCart(store, userId) {
  const cart = getActiveCart(store, userId);
  return presentCart(store, cart);
}

// Adds a variant to the active cart or increments the existing line. Stock is
// checked against the final line quantity, not just the amount being added.
export function addCartItem(store, userId, input) {
  const quantity = parseQuantity(input.quantity);
  const { variant } = findVariant(store, input.variantId);
  const cart = getActiveCart(store, userId);
  const existingItem = cart.items.find((item) => item.variantId === variant.id);
  const nextQuantity = (existingItem?.quantity ?? 0) + quantity;

  assertStockAvailable(store, variant.id, nextQuantity);

  if (existingItem) {
    existingItem.quantity = nextQuantity;
  } else {
    cart.items.push({
      id: `cart_item_${store.nextCartItemNumber++}`,
      variantId: variant.id,
      quantity,
    });
  }

  return presentCart(store, cart);
}

// Replaces a cart line quantity. A quantity of zero is intentionally rejected;
// clients should use DELETE when they mean "remove this item".
export function updateCartItem(store, userId, cartItemId, input) {
  const quantity = parseQuantity(input.quantity);
  const cart = getActiveCart(store, userId);
  const item = cart.items.find((candidate) => candidate.id === cartItemId);

  if (!item) {
    throw new HttpError(404, 'Cart item not found');
  }

  assertStockAvailable(store, item.variantId, quantity);
  item.quantity = quantity;

  return presentCart(store, cart);
}

// Removes a cart item and reports 404 when the client references another or
// nonexistent line item.
export function removeCartItem(store, userId, cartItemId) {
  const cart = getActiveCart(store, userId);
  const originalLength = cart.items.length;
  cart.items = cart.items.filter((item) => item.id !== cartItemId);

  if (cart.items.length === originalLength) {
    throw new HttpError(404, 'Cart item not found');
  }

  return presentCart(store, cart);
}

// Checkout calls this only after a successful order is created, keeping the
// customer's cart available if validation fails earlier.
export function clearCart(store, userId) {
  const cart = getActiveCart(store, userId);
  cart.items = [];
}

// Lazily creates a cart so new customers can start shopping without a separate
// "create cart" API call.
function getActiveCart(store, userId) {
  let cart = store.carts.get(userId);

  if (!cart || cart.status !== 'active') {
    cart = { id: `cart_${userId}`, userId, status: 'active', items: [] };
    store.carts.set(userId, cart);
  }

  return cart;
}

// Converts compact cart storage rows into the richer response contract expected
// by clients. This keeps stored cart items small and recalculates totals.
function presentCart(store, cart) {
  const items = cart.items.map((item) => {
    const { product, variant } = findVariant(store, item.variantId);
    const lineTotalCents = variant.priceCents * item.quantity;

    return {
      id: item.id,
      variantId: variant.id,
      productId: product.id,
      productName: product.name,
      variantName: variant.name,
      sku: variant.sku,
      unitPriceCents: variant.priceCents,
      currency: variant.currency,
      quantity: item.quantity,
      availableQuantity: getAvailableQuantity(store, variant.id),
      lineTotalCents,
    };
  });

  return {
    id: cart.id,
    status: cart.status,
    items,
    totalCents: items.reduce((sum, item) => sum + item.lineTotalCents, 0),
    currency: items[0]?.currency ?? 'USD',
  };
}

// Centralizes cart quantity validation so add and update enforce the same rule.
function parseQuantity(quantity) {
  if (!Number.isInteger(quantity) || quantity < 1) {
    throw new HttpError(400, 'Quantity must be a positive integer');
  }

  return quantity;
}
