import crypto from 'node:crypto';
import { HttpError } from '../../shared/errors.js';
import {
  parseAddCartItemInput,
  parseCartItemId,
  parseUpdateCartItemInput,
} from './cart.validation.js';

const ACTIVE_CART_STATUS = 'active';
const ACTIVE_PRODUCT_STATUS = 'active';

export async function getCart(prisma, user) {
  const cart = await findOrCreateActiveCart(prisma, user.id);
  return toCartResponse(cart);
}

export async function addCartItem(prisma, user, input) {
  const { variantId, quantity } = parseAddCartItemInput(input);
  const cart = await findOrCreateActiveCart(prisma, user.id);
  const existingItem = cart.items.find((item) => item.variantId === variantId);
  const nextQuantity = (existingItem?.quantity ?? 0) + quantity;

  await assertVariantCanBePurchased(prisma, variantId, nextQuantity);

  if (existingItem) {
    await prisma.cartItem.update({
      where: { id: existingItem.id },
      data: { quantity: nextQuantity },
    });
  } else {
    await prisma.cartItem.create({
      data: {
        id: createId('cart_item'),
        cartId: cart.id,
        variantId,
        quantity,
      },
    });
  }

  return toCartResponse(await findOrCreateActiveCart(prisma, user.id));
}

export async function updateCartItem(prisma, user, itemId, input) {
  const parsedItemId = parseCartItemId(itemId);
  const { quantity } = parseUpdateCartItemInput(input);
  const cart = await findOrCreateActiveCart(prisma, user.id);
  const item = cart.items.find((cartItem) => cartItem.id === parsedItemId);

  if (!item) {
    throw new HttpError(404, 'Cart item not found');
  }

  await assertVariantCanBePurchased(prisma, item.variantId, quantity);
  await prisma.cartItem.update({
    where: { id: item.id },
    data: { quantity },
  });

  return toCartResponse(await findOrCreateActiveCart(prisma, user.id));
}

export async function removeCartItem(prisma, user, itemId) {
  const parsedItemId = parseCartItemId(itemId);
  const cart = await findOrCreateActiveCart(prisma, user.id);
  const item = cart.items.find((cartItem) => cartItem.id === parsedItemId);

  if (!item) {
    throw new HttpError(404, 'Cart item not found');
  }

  await prisma.cartItem.delete({
    where: { id: item.id },
  });

  return toCartResponse(await findOrCreateActiveCart(prisma, user.id));
}

async function findOrCreateActiveCart(prisma, userId) {
  const cart = await prisma.cart.findFirst({
    where: {
      userId,
      status: ACTIVE_CART_STATUS,
    },
    orderBy: { createdAt: 'desc' },
    include: cartInclude(),
  });

  if (cart) {
    return cart;
  }

  return prisma.cart.create({
    data: {
      id: createId('cart'),
      userId,
      status: ACTIVE_CART_STATUS,
    },
    include: cartInclude(),
  });
}

async function assertVariantCanBePurchased(prisma, variantId, quantity) {
  const variant = await prisma.productVariant.findUnique({
    where: { id: variantId },
    include: {
      inventory: true,
      product: true,
    },
  });

  if (!variant || !variant.active || variant.product.status !== ACTIVE_PRODUCT_STATUS) {
    throw new HttpError(400, 'Variant is not available for purchase');
  }

  const availableQuantity = variant.inventory?.quantityAvailable ?? 0;
  if (quantity > availableQuantity) {
    throw new HttpError(400, 'Requested quantity exceeds available stock');
  }
}

function cartInclude() {
  return {
    items: {
      orderBy: { createdAt: 'asc' },
      include: {
        variant: {
          include: {
            inventory: true,
            product: {
              include: {
                category: true,
                images: {
                  orderBy: { position: 'asc' },
                  take: 1,
                },
              },
            },
          },
        },
      },
    },
  };
}

function toCartResponse(cart) {
  const items = cart.items.map(toCartItemResponse);
  const subtotalCents = items.reduce(
    (sum, item) => sum + item.unitPriceCents * item.quantity,
    0,
  );
  const currency = items[0]?.currency ?? 'USD';

  return {
    id: cart.id,
    status: cart.status,
    items,
    summary: {
      itemCount: items.reduce((sum, item) => sum + item.quantity, 0),
      subtotalCents,
      currency,
    },
  };
}

function toCartItemResponse(item) {
  const product = item.variant.product;
  const image = product.images[0];

  return {
    id: item.id,
    variantId: item.variantId,
    quantity: item.quantity,
    unitPriceCents: item.variant.priceCents,
    lineTotalCents: item.variant.priceCents * item.quantity,
    currency: item.variant.currency,
    availableQuantity: item.variant.inventory?.quantityAvailable ?? 0,
    variant: {
      id: item.variant.id,
      sku: item.variant.sku,
      name: item.variant.name,
    },
    product: {
      id: product.id,
      name: product.name,
      slug: product.slug,
      category: {
        id: product.category.id,
        name: product.category.name,
        slug: product.category.slug,
      },
      image: image
        ? {
            id: image.id,
            url: image.url,
            altText: image.altText,
          }
        : null,
    },
  };
}

function createId(prefix) {
  return `${prefix}_${crypto.randomUUID()}`;
}
