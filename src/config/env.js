import 'dotenv/config';

const DEFAULT_PORT = 3000;
const DEFAULT_APP_NAME = 'E-commerce API';
const DEFAULT_NODE_ENV = 'development';
const DEFAULT_DATABASE_URL = 'postgresql://ecommerce_user:ecommerce_password@localhost:5432/ecommerce';
const DEFAULT_REDIS_URL = 'redis://localhost:6379';

// Centralizes environment access so validation and defaults live in one place.
// Other modules should import this config instead of reading process.env directly.
export function getEnvConfig(env = process.env) {
  return {
    appName: env.APP_NAME ?? DEFAULT_APP_NAME,
    databaseUrl: env.DATABASE_URL ?? DEFAULT_DATABASE_URL,
    nodeEnv: env.NODE_ENV ?? DEFAULT_NODE_ENV,
    port: parsePort(env.PORT),
    redisUrl: env.REDIS_URL ?? DEFAULT_REDIS_URL,
  };
}

function parsePort(value) {
  if (value === undefined || value === '') {
    return DEFAULT_PORT;
  }

  const port = Number(value);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('PORT must be an integer between 1 and 65535');
  }

  return port;
}
