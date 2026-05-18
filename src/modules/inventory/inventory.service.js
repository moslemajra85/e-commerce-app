import { HttpError } from '../../shared/errors.js';

// Missing inventory records are treated as zero available stock, which is safer
// than accidentally selling an untracked variant.
export function getAvailableQuantity(store, variantId) {
  return store.inventory.get(variantId)?.quantityAvailable ?? 0;
}

// Read-only stock guard used by cart operations before the cart is mutated.
export function assertStockAvailable(store, variantId, quantity) {
  if (getAvailableQuantity(store, variantId) < quantity) {
    throw new HttpError(409, 'Not enough stock available');
  }
}

// Mutating stock guard used during checkout. It repeats the availability check
// because cart contents may be stale by the time the customer checks out.
export function decrementStock(store, variantId, quantity) {
  const inventory = store.inventory.get(variantId);
  if (!inventory || inventory.quantityAvailable < quantity) {
    throw new HttpError(409, 'Not enough stock available');
  }

  inventory.quantityAvailable -= quantity;
}
