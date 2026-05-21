import { HttpError } from '../../shared/errors.js';

export function parseAddCartItemInput(input) {
  return {
    variantId: parseId(input.variantId, 'variantId'),
    quantity: parseQuantity(input.quantity ?? 1),
  };
}

export function parseUpdateCartItemInput(input) {
  return {
    quantity: parseQuantity(input.quantity),
  };
}

export function parseCartItemId(itemId) {
  return parseId(itemId, 'cart item id');
}

function parseId(value, fieldName) {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new HttpError(400, `${fieldName} is required`);
  }

  return value.trim();
}

function parseQuantity(value) {
  const quantity = Number(value);
  if (!Number.isInteger(quantity) || quantity < 1) {
    throw new HttpError(400, 'Quantity must be a positive integer');
  }

  return quantity;
}
