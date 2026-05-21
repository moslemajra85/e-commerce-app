import http from 'node:http';
import test from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../src/app/app.js';
import { createPrismaClient } from '../src/db/prisma.js';

const prisma = createPrismaClient();
const CUSTOMER_PASSWORD_HASH =
  '$argon2id$v=19$m=65536,t=3,p=4$Elju2B1RagJyGVZhDioFQg$Jq2AESiY7ZaznhYkGeGkxTMFrHlWtXf6W9RQXyxxf+Y';

test.after(async () => {
  await prisma.$disconnect();
});

test('authenticated customer can add, update, and remove a cart item', async (t) => {
  await resetCartFixtures();
  const client = await startTestServer(t);
  const token = await loginCustomer(client);

  const addResponse = await client.request(
    'POST',
    '/cart/items',
    {
      variantId: 'var_active_tee_black',
      quantity: 2,
    },
    token,
  );

  assert.equal(addResponse.status, 200);
  assert.equal(addResponse.body.summary.itemCount, 2);
  assert.equal(addResponse.body.summary.subtotalCents, 5000);
  assert.equal(addResponse.body.items[0].product.name, 'Active Tee');

  const updateResponse = await client.request(
    'PATCH',
    `/cart/items/${addResponse.body.items[0].id}`,
    { quantity: 3 },
    token,
  );

  assert.equal(updateResponse.status, 200);
  assert.equal(updateResponse.body.summary.itemCount, 3);
  assert.equal(updateResponse.body.summary.subtotalCents, 7500);

  const removeResponse = await client.request(
    'DELETE',
    `/cart/items/${addResponse.body.items[0].id}`,
    undefined,
    token,
  );

  assert.equal(removeResponse.status, 200);
  assert.equal(removeResponse.body.items.length, 0);
  assert.equal(removeResponse.body.summary.itemCount, 0);
});

test('adding the same variant increments quantity', async (t) => {
  await resetCartFixtures();
  const client = await startTestServer(t);
  const token = await loginCustomer(client);

  await client.request('POST', '/cart/items', { variantId: 'var_active_tee_black', quantity: 2 }, token);
  const response = await client.request(
    'POST',
    '/cart/items',
    { variantId: 'var_active_tee_black', quantity: 1 },
    token,
  );

  assert.equal(response.status, 200);
  assert.equal(response.body.items.length, 1);
  assert.equal(response.body.items[0].quantity, 3);
});

test('cart rejects unauthenticated requests', async (t) => {
  await resetCartFixtures();
  const client = await startTestServer(t);

  const response = await client.request('GET', '/cart');

  assert.equal(response.status, 401);
  assert.equal(response.body.error, 'Missing bearer token');
});

test('cart validates quantity and stock', async (t) => {
  await resetCartFixtures();
  const client = await startTestServer(t);
  const token = await loginCustomer(client);

  const invalidQuantity = await client.request(
    'POST',
    '/cart/items',
    { variantId: 'var_active_tee_black', quantity: 0 },
    token,
  );

  assert.equal(invalidQuantity.status, 400);
  assert.equal(invalidQuantity.body.error, 'Quantity must be a positive integer');

  const tooMany = await client.request(
    'POST',
    '/cart/items',
    { variantId: 'var_active_tee_black', quantity: 8 },
    token,
  );

  assert.equal(tooMany.status, 400);
  assert.equal(tooMany.body.error, 'Requested quantity exceeds available stock');
});

test('cart rejects inactive variants and draft products', async (t) => {
  await resetCartFixtures();
  const client = await startTestServer(t);
  const token = await loginCustomer(client);

  const inactiveVariant = await client.request(
    'POST',
    '/cart/items',
    { variantId: 'var_inactive_tee_white', quantity: 1 },
    token,
  );

  assert.equal(inactiveVariant.status, 400);
  assert.equal(inactiveVariant.body.error, 'Variant is not available for purchase');

  const draftProductVariant = await client.request(
    'POST',
    '/cart/items',
    { variantId: 'var_draft_sneaker', quantity: 1 },
    token,
  );

  assert.equal(draftProductVariant.status, 400);
  assert.equal(draftProductVariant.body.error, 'Variant is not available for purchase');
});

async function loginCustomer(client) {
  const response = await client.request('POST', '/auth/login', {
    email: 'customer@example.com',
    password: 'password123',
  });

  assert.equal(response.status, 200);
  return response.body.token;
}

async function resetCartFixtures() {
  await prisma.cartItem.deleteMany();
  await prisma.cart.deleteMany();
  await prisma.user.deleteMany();
  await prisma.inventory.deleteMany();
  await prisma.productImage.deleteMany();
  await prisma.productVariant.deleteMany();
  await prisma.product.deleteMany();
  await prisma.category.deleteMany();

  await prisma.user.create({
    data: {
      id: 'user_customer_1',
      email: 'customer@example.com',
      passwordHash: CUSTOMER_PASSWORD_HASH,
      role: 'customer',
      status: 'active',
    },
  });

  await prisma.category.create({
    data: {
      id: 'cat_apparel',
      name: 'Apparel',
      slug: 'apparel',
    },
  });

  await prisma.product.createMany({
    data: [
      {
        id: 'prod_active_tee',
        categoryId: 'cat_apparel',
        name: 'Active Tee',
        slug: 'active-tee',
        description: 'A visible product.',
        status: 'active',
      },
      {
        id: 'prod_draft_sneaker',
        categoryId: 'cat_apparel',
        name: 'Draft Sneaker',
        slug: 'draft-sneaker',
        description: 'A hidden product.',
        status: 'draft',
      },
    ],
  });

  await prisma.productImage.create({
    data: {
      id: 'img_active_tee',
      productId: 'prod_active_tee',
      url: 'https://example.com/active-tee.jpg',
      altText: 'Active tee',
      position: 0,
    },
  });

  await prisma.productVariant.createMany({
    data: [
      {
        id: 'var_active_tee_black',
        productId: 'prod_active_tee',
        sku: 'TEE-BLK-M',
        name: 'Black / Medium',
        priceCents: 2500,
        currency: 'USD',
        active: true,
      },
      {
        id: 'var_inactive_tee_white',
        productId: 'prod_active_tee',
        sku: 'TEE-WHT-M',
        name: 'White / Medium',
        priceCents: 2500,
        currency: 'USD',
        active: false,
      },
      {
        id: 'var_draft_sneaker',
        productId: 'prod_draft_sneaker',
        sku: 'SNK-DRAFT',
        name: 'Draft Variant',
        priceCents: 5000,
        currency: 'USD',
        active: true,
      },
    ],
  });

  await prisma.inventory.createMany({
    data: [
      {
        variantId: 'var_active_tee_black',
        quantityAvailable: 7,
        quantityReserved: 0,
      },
      {
        variantId: 'var_inactive_tee_white',
        quantityAvailable: 7,
        quantityReserved: 0,
      },
      {
        variantId: 'var_draft_sneaker',
        quantityAvailable: 7,
        quantityReserved: 0,
      },
    ],
  });
}

async function startTestServer(t) {
  const server = http.createServer(createApp(prisma));

  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  t.after(() => server.close());

  const { port } = server.address();

  return {
    async request(method, path, body, token) {
      const headers = {
        ...(body ? { 'content-type': 'application/json' } : {}),
        ...(token ? { authorization: `Bearer ${token}` } : {}),
      };

      const response = await fetch(`http://127.0.0.1:${port}${path}`, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
      });

      return {
        status: response.status,
        body: await response.json(),
      };
    },
  };
}
