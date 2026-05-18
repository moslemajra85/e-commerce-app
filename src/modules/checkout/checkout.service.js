import { clearCart, getCart } from '../cart/cart.service.js';
import { findVariant } from '../catalog/catalog.service.js';
import { decrementStock } from '../inventory/inventory.service.js';
import { createOrder } from '../orders/orders.service.js';
import { HttpError } from '../../shared/errors.js';

// Turns the active cart into an order. This prototype uses a mock paid payment
// result, but still preserves the shape of a real checkout flow: validate,
// snapshot prices, reserve stock, create order, then clear cart.
export function checkout(store, userId, input) {
  const shippingAddress = input.shippingAddress;
  if (!shippingAddress?.line1 || !shippingAddress?.city || !shippingAddress?.country) {
    throw new HttpError(400, 'Shipping address requires line1, city, and country');
  }

  const cart = getCart(store, userId);
  if (cart.items.length === 0) {
    throw new HttpError(400, 'Cannot checkout an empty cart');
  }

  const orderItems = cart.items.map((item) => {
    const { product, variant } = findVariant(store, item.variantId);
    return {
      variantId: variant.id,
      skuSnapshot: variant.sku,
      productNameSnapshot: product.name,
      variantNameSnapshot: variant.name,
      unitPriceCents: variant.priceCents,
      currency: variant.currency,
      quantity: item.quantity,
      lineTotalCents: variant.priceCents * item.quantity,
    };
  });

  // Stock is decremented immediately because this app has no separate payment
  // authorization or reservation table yet.
  for (const item of orderItems) {
    decrementStock(store, item.variantId, item.quantity);
  }

  const order = createOrder(store, {
    userId,
    shippingAddress,
    items: orderItems,
    payment: {
      provider: 'mock',
      status: 'paid',
    },
  });

  clearCart(store, userId);

  return order;
}
