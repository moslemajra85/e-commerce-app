import crypto from 'node:crypto';

const CUSTOMER_ID = 'user_customer_1';

// Creates a fresh in-memory database for the API. This is intentionally simple
// for the current prototype; every test gets a new copy so state cannot leak.
export function createSeededStore() {
  const products = [
    {
      id: 'prod_backpack',
      name: 'Everyday Backpack',
      slug: 'everyday-backpack',
      description: 'Durable 20L backpack for work and travel.',
      status: 'active',
      variants: [
        {
          id: 'var_backpack_black',
          sku: 'BAG-BLK-20L',
          name: 'Black / 20L',
          priceCents: 8900,
          currency: 'USD',
          active: true,
        },
        {
          id: 'var_backpack_green',
          sku: 'BAG-GRN-20L',
          name: 'Green / 20L',
          priceCents: 8900,
          currency: 'USD',
          active: true,
        },
      ],
    },
    {
      id: 'prod_sneakers',
      name: 'Daily Runner Sneakers',
      slug: 'daily-runner-sneakers',
      description: 'Lightweight sneakers for daily use.',
      status: 'active',
      variants: [
        {
          id: 'var_sneaker_42',
          sku: 'SHOE-RUN-42',
          name: 'Size 42',
          priceCents: 12900,
          currency: 'USD',
          active: true,
        },
      ],
    },
  ];

  return {
    users: [
      {
        id: CUSTOMER_ID,
        email: 'customer@example.com',
        password: 'password123',
        role: 'customer',
      },
    ],
    sessions: new Map(),
    products,
    inventory: new Map([
      ['var_backpack_black', { variantId: 'var_backpack_black', quantityAvailable: 5 }],
      ['var_backpack_green', { variantId: 'var_backpack_green', quantityAvailable: 2 }],
      ['var_sneaker_42', { variantId: 'var_sneaker_42', quantityAvailable: 1 }],
    ]),
    carts: new Map([[CUSTOMER_ID, { id: 'cart_customer_1', userId: CUSTOMER_ID, status: 'active', items: [] }]]),
    orders: [],
    nextCartItemNumber: 1,
    nextOrderNumber: 1001,
  };
}

// Prefixing IDs makes test output and manual debugging easier because the type
// of record can be seen without looking it up.
export function createId(prefix) {
  return `${prefix}_${crypto.randomUUID()}`;
}
