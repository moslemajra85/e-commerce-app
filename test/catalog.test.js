import http from 'node:http';
import test from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../src/app/app.js';
import { createPrismaClient } from '../src/db/prisma.js';

const prisma = createPrismaClient();

test.after(async () => {
  await prisma.$disconnect();
});

test('customer can list active products with pagination metadata', async (t) => {
  await resetCatalog();
  const client = await startTestServer(t);

  const response = await client.request('GET', '/catalog/products?page=1&pageSize=1');

  assert.equal(response.status, 200);
  assert.equal(response.body.data.length, 1);
  assert.deepEqual(response.body.pagination, {
    page: 1,
    pageSize: 1,
    total: 2,
    totalPages: 2,
  });
  assert.equal(response.body.data[0].slug, 'active-backpack');
  assert.equal(response.body.data[0].available, true);
  assert.deepEqual(response.body.data[0].priceRange, {
    minPriceCents: 6400,
    maxPriceCents: 6400,
    currency: 'USD',
  });
});

test('customer can view active product details with active variants only', async (t) => {
  await resetCatalog();
  const client = await startTestServer(t);

  const response = await client.request('GET', '/catalog/products/active-tee');

  assert.equal(response.status, 200);
  assert.equal(response.body.slug, 'active-tee');
  assert.equal(response.body.category.slug, 'apparel');
  assert.equal(response.body.images.length, 1);
  assert.deepEqual(
    response.body.variants.map((variant) => variant.sku),
    ['TEE-BLK-M'],
  );
  assert.equal(response.body.variants[0].availableQuantity, 7);
  assert.equal(response.body.variants[0].available, true);
});

test('catalog hides inactive products from list and detail pages', async (t) => {
  await resetCatalog();
  const client = await startTestServer(t);

  const listResponse = await client.request('GET', '/catalog/products?pageSize=20');
  assert.equal(listResponse.status, 200);
  assert.equal(
    listResponse.body.data.some((product) => product.slug === 'draft-sneaker'),
    false,
  );

  const detailResponse = await client.request('GET', '/catalog/products/draft-sneaker');
  assert.equal(detailResponse.status, 404);
  assert.equal(detailResponse.body.error, 'Product not found');
});

test('catalog validates pagination parameters', async (t) => {
  await resetCatalog();
  const client = await startTestServer(t);

  const invalidPage = await client.request('GET', '/catalog/products?page=0');
  assert.equal(invalidPage.status, 400);
  assert.equal(invalidPage.body.error, 'page must be a positive integer');

  const invalidPageSize = await client.request('GET', '/catalog/products?pageSize=100');
  assert.equal(invalidPageSize.status, 400);
  assert.equal(invalidPageSize.body.error, 'pageSize must be 50 or less');
});

test('database enforces unique product slugs and variant SKUs', async () => {
  await resetCatalog();

  await assert.rejects(
    prisma.product.create({
      data: {
        id: 'prod_duplicate_slug',
        categoryId: 'cat_apparel',
        name: 'Duplicate Slug',
        slug: 'active-tee',
        description: 'This should violate the product slug unique index.',
        status: 'active',
      },
    }),
  );

  await assert.rejects(
    prisma.productVariant.create({
      data: {
        id: 'var_duplicate_sku',
        productId: 'prod_active_tee',
        sku: 'TEE-BLK-M',
        name: 'Duplicate SKU',
        priceCents: 2500,
        currency: 'USD',
        active: true,
      },
    }),
  );
});

async function resetCatalog() {
  await prisma.cartItem.deleteMany();
  await prisma.cart.deleteMany();
  await prisma.inventory.deleteMany();
  await prisma.productImage.deleteMany();
  await prisma.productVariant.deleteMany();
  await prisma.product.deleteMany();
  await prisma.category.deleteMany();

  await prisma.category.createMany({
    data: [
      {
        id: 'cat_apparel',
        name: 'Apparel',
        slug: 'apparel',
      },
      {
        id: 'cat_accessories',
        name: 'Accessories',
        slug: 'accessories',
      },
    ],
  });

  await prisma.product.createMany({
    data: [
      {
        id: 'prod_active_tee',
        categoryId: 'cat_apparel',
        name: 'Active Tee',
        slug: 'active-tee',
        description: 'A visible product with one active variant.',
        status: 'active',
      },
      {
        id: 'prod_active_backpack',
        categoryId: 'cat_accessories',
        name: 'Active Backpack',
        slug: 'active-backpack',
        description: 'A visible product used to test pagination.',
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

  await prisma.productImage.createMany({
    data: [
      {
        id: 'img_active_tee',
        productId: 'prod_active_tee',
        url: 'https://example.com/active-tee.jpg',
        altText: 'Active tee',
        position: 0,
      },
      {
        id: 'img_active_backpack',
        productId: 'prod_active_backpack',
        url: 'https://example.com/active-backpack.jpg',
        altText: 'Active backpack',
        position: 0,
      },
    ],
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
        id: 'var_active_backpack',
        productId: 'prod_active_backpack',
        sku: 'BAG-CHARCOAL',
        name: 'Charcoal',
        priceCents: 6400,
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
        quantityAvailable: 10,
        quantityReserved: 0,
      },
      {
        variantId: 'var_active_backpack',
        quantityAvailable: 3,
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
    async request(method, path) {
      const response = await fetch(`http://127.0.0.1:${port}${path}`, {
        method,
      });

      return {
        status: response.status,
        body: await response.json(),
      };
    },
  };
}
