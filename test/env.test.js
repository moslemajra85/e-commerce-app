import test from 'node:test';
import assert from 'node:assert/strict';
import { getEnvConfig } from '../src/config/env.js';

test('environment config reads values from env variables', () => {
  const config = getEnvConfig({
    APP_NAME: 'Test Shop API',
    DATABASE_URL: 'postgresql://test:test@localhost:15432/test_shop',
    NODE_ENV: 'test',
    PORT: '4321',
    REDIS_URL: 'redis://localhost:16379',
  });

  assert.deepEqual(config, {
    appName: 'Test Shop API',
    databaseUrl: 'postgresql://test:test@localhost:15432/test_shop',
    nodeEnv: 'test',
    port: 4321,
    redisUrl: 'redis://localhost:16379',
  });
});

test('environment config provides safe defaults', () => {
  const config = getEnvConfig({});

  assert.equal(config.appName, 'E-commerce API');
  assert.equal(config.databaseUrl, 'postgresql://ecommerce_user:ecommerce_password@localhost:5432/ecommerce');
  assert.equal(config.nodeEnv, 'development');
  assert.equal(config.port, 3000);
  assert.equal(config.redisUrl, 'redis://localhost:6379');
});

test('environment config rejects invalid ports', () => {
  assert.throws(
    () => getEnvConfig({ PORT: 'not-a-number' }),
    /PORT must be an integer between 1 and 65535/,
  );

  assert.throws(
    () => getEnvConfig({ PORT: '70000' }),
    /PORT must be an integer between 1 and 65535/,
  );
});
