import http from 'node:http';
import test from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../src/app/app.js';
import { createPrismaClient } from '../src/db/prisma.js';
import { verifyPassword } from '../src/modules/auth/password.js';
import { verifyAuthToken } from '../src/modules/auth/tokens.js';

const prisma = createPrismaClient();
const CUSTOMER_PASSWORD_HASH =
  '$argon2id$v=19$m=65536,t=3,p=4$Elju2B1RagJyGVZhDioFQg$Jq2AESiY7ZaznhYkGeGkxTMFrHlWtXf6W9RQXyxxf+Y';

test.after(async () => {
  await prisma.$disconnect();
});

test('customer can register and receives a login session', async (t) => {
  await resetUsers();
  const client = await startTestServer(t);

  const response = await client.request('POST', '/auth/register', {
    email: 'New.Customer@Example.com',
    password: 'secure123',
  });

  assert.equal(response.status, 201);
  const payload = await verifyAuthToken(response.body.token);
  assert.equal(payload.sub, response.body.user.id);
  assert.deepEqual(response.body.user, {
    id: response.body.user.id,
    email: 'new.customer@example.com',
    role: 'customer',
  });

  const createdUser = await prisma.user.findUnique({
    where: { email: 'new.customer@example.com' },
  });
  assert.ok(createdUser);
  assert.equal(createdUser.password, undefined);
  assert.notEqual(createdUser.passwordHash, 'secure123');
  assert.equal(await verifyPassword('secure123', createdUser.passwordHash), true);
});

test('registered customer can login with normalized email', async (t) => {
  await resetUsers();
  const client = await startTestServer(t);

  await client.request('POST', '/auth/register', {
    email: 'shopper@example.com',
    password: 'secure123',
  });

  const response = await client.request('POST', '/auth/login', {
    email: ' SHOPPER@example.com ',
    password: 'secure123',
  });

  assert.equal(response.status, 200);
  assert.equal((await verifyAuthToken(response.body.token)).sub, response.body.user.id);
  assert.equal(response.body.user.email, 'shopper@example.com');
});

test('registration rejects duplicate emails', async (t) => {
  await resetUsers();
  const client = await startTestServer(t);

  const response = await client.request('POST', '/auth/register', {
    email: 'CUSTOMER@example.com',
    password: 'password123',
  });

  assert.equal(response.status, 409);
  assert.equal(response.body.error, 'Email is already registered');
});

test('registration validates email and password strength', async (t) => {
  await resetUsers();
  const client = await startTestServer(t);

  const invalidEmail = await client.request('POST', '/auth/register', {
    email: 'not-an-email',
    password: 'secure123',
  });

  assert.equal(invalidEmail.status, 400);
  assert.equal(invalidEmail.body.error, 'Email must be valid');

  const shortPassword = await client.request('POST', '/auth/register', {
    email: 'valid@example.com',
    password: 'abc123',
  });

  assert.equal(shortPassword.status, 400);
  assert.equal(shortPassword.body.error, 'Password must be at least 8 characters');

  const weakPassword = await client.request('POST', '/auth/register', {
    email: 'valid@example.com',
    password: 'abcdefgh',
  });

  assert.equal(weakPassword.status, 400);
  assert.equal(weakPassword.body.error, 'Password must contain at least one letter and one number');
});

test('login rejects invalid credentials without exposing which field failed', async (t) => {
  await resetUsers();
  const client = await startTestServer(t);

  const wrongPassword = await client.request('POST', '/auth/login', {
    email: 'customer@example.com',
    password: 'wrong-password',
  });

  assert.equal(wrongPassword.status, 401);
  assert.equal(wrongPassword.body.error, 'Invalid email or password');

  const missingUser = await client.request('POST', '/auth/login', {
    email: 'missing@example.com',
    password: 'password123',
  });

  assert.equal(missingUser.status, 401);
  assert.equal(missingUser.body.error, 'Invalid email or password');
});

test('invalid JSON request bodies return a client error', async (t) => {
  await resetUsers();
  const client = await startTestServer(t);

  const response = await client.rawRequest('POST', '/auth/login', '{bad-json', {
    'content-type': 'application/json',
  });

  assert.equal(response.status, 400);
  assert.equal(response.body.error, 'Request body must be valid JSON');
});

test('unknown routes return not found', async (t) => {
  await resetUsers();
  const client = await startTestServer(t);

  const response = await client.request('GET', '/unknown-route');

  assert.equal(response.status, 404);
  assert.equal(response.body.error, 'Route not found');
});

async function resetUsers() {
  await prisma.cartItem.deleteMany();
  await prisma.cart.deleteMany();
  await prisma.user.deleteMany();
  await prisma.user.create({
    data: {
      id: 'user_customer_1',
      email: 'customer@example.com',
      passwordHash: CUSTOMER_PASSWORD_HASH,
      role: 'customer',
      status: 'active',
    },
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
