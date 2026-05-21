import { getEnvConfig } from '../config/env.js';
import { prisma } from '../db/prisma.js';
import { createApp } from './app.js';

// Runtime entry point for local development. App construction is kept separate
// so tests can create isolated Express apps with their own dependencies.
const config = getEnvConfig();
const app = createApp(prisma);

app.listen(config.port, () => {
  console.log(`${config.appName} listening on http://localhost:${config.port}`);
});
