import http from 'node:http';
import test from 'node:test';
import assert from 'node:assert/strict';
import { createSeededStore } from '../src/db/store.js';
import { createServer } from '../src/app/createServer.js';

// This file tests the customer-facing API through real HTTP requests. That
// keeps the tests close to how a browser or mobile app would use the backend.
test('customer can login, add a product to cart, checkout, and view order history', async (t) => {
  const client = await startTestServer(t);

  const login = await client.request('POST', '/auth/login', {
    email: 'customer@example.com',
    password: 'password123',
  });

  assert.equal(login.status, 200);
  const token = login.body.token;

  const products = await client.request('GET', '/products');
  assert.equal(products.status, 200);
  assert.equal(products.body.products.length, 2);

  const variantId = products.body.products[0].variants[0].id;
  const cart = await client.request('POST', '/cart/items', { variantId, quantity: 2 }, token);

  assert.equal(cart.status, 201);
  assert.equal(cart.body.cart.items.length, 1);
  assert.equal(cart.body.cart.totalCents, 17800);

  const checkout = await client.request(
    'POST',
    '/checkout',
    {
      shippingAddress: {
        line1: '1 Main Street',
        city: 'Seattle',
        country: 'US',
      },
    },
    token,
  );

  assert.equal(checkout.status, 201);
  assert.equal(checkout.body.order.paymentStatus, 'paid');
  assert.equal(checkout.body.order.fulfillmentStatus, 'pending');
  assert.equal(checkout.body.order.items[0].productNameSnapshot, 'Everyday Backpack');

  const orders = await client.request('GET', '/orders', undefined, token);
  assert.equal(orders.status, 200);
  assert.equal(orders.body.orders.length, 1);
  assert.equal(orders.body.orders[0].totalCents, 17800);

  const emptyCart = await client.request('GET', '/cart', undefined, token);
  assert.equal(emptyCart.status, 200);
  assert.equal(emptyCart.body.cart.items.length, 0);
});

test('checkout decrements inventory after a successful order', async (t) => {
  const store = createSeededStore();
  const client = await startTestServer(t, store);
  const login = await loginCustomer(client);

  await client.request('POST', '/cart/items', { variantId: 'var_backpack_green', quantity: 2 }, login.body.token);

  const checkout = await client.request(
    'POST',
    '/checkout',
    {
      shippingAddress: {
        line1: '1 Main Street',
        city: 'Seattle',
        country: 'US',
      },
    },
    login.body.token,
  );

  assert.equal(checkout.status, 201);
  assert.equal(store.inventory.get('var_backpack_green').quantityAvailable, 0);
});

test('cart rejects quantities above available stock', async (t) => {
  const client = await startTestServer(t);

  const login = await loginCustomer(client);

  const response = await client.request(
    'POST',
    '/cart/items',
    { variantId: 'var_sneaker_42', quantity: 2 },
    login.body.token,
  );

  assert.equal(response.status, 409);
  assert.equal(response.body.error, 'Not enough stock available');
});

test('protected routes require a valid bearer token', async (t) => {
  const client = await startTestServer(t);

  const missingToken = await client.request('GET', '/cart');
  assert.equal(missingToken.status, 401);
  assert.equal(missingToken.body.error, 'Missing bearer token');

  const invalidToken = await client.request('GET', '/orders', undefined, 'not-a-real-token');
  assert.equal(invalidToken.status, 401);
  assert.equal(invalidToken.body.error, 'Invalid bearer token');
});

test('invalid JSON request bodies return a client error', async (t) => {
  const client = await startTestServer(t);

  const response = await client.rawRequest('POST', '/auth/login', '{bad-json', {
    'content-type': 'application/json',
  });

  assert.equal(response.status, 400);
  assert.equal(response.body.error, 'Request body must be valid JSON');
});

test('checkout validates required shipping address fields', async (t) => {
  const client = await startTestServer(t);
  const login = await loginCustomer(client);

  await client.request('POST', '/cart/items', { variantId: 'var_backpack_black', quantity: 1 }, login.body.token);

  const response = await client.request(
    'POST',
    '/checkout',
    {
      shippingAddress: {
        line1: '1 Main Street',
        country: 'US',
      },
    },
    login.body.token,
  );

  assert.equal(response.status, 400);
  assert.equal(response.body.error, 'Shipping address requires line1, city, and country');
});

async function loginCustomer(client) {
  return client.request('POST', '/auth/login', {
    email: 'customer@example.com',
    password: 'password123',
  });
}

async function startTestServer(t, store = createSeededStore()) {
  const server = http.createServer(createServer(store));

  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  t.after(() => server.close());

  const { port } = server.address();

  return {
    async request(method, path, body, token) {
      const headers = {
        ...(body ? { 'content-type': 'application/json' } : {}),
        ...(token ? { authorization: `Bearer ${token}` } : {}),
      };

      return this.rawRequest(method, path, body ? JSON.stringify(body) : undefined, headers);
    },

    async rawRequest(method, path, body, headers = {}) {
      const response = await fetch(`http://127.0.0.1:${port}${path}`, {
        method,
        headers,
        body,
      });

      return {
        status: response.status,
        body: await response.json(),
      };
    },
  };
}
