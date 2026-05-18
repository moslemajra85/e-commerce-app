import { getEnvConfig } from '../config/env.js';
import { createSeededStore } from '../db/store.js';
import { createServer } from './createServer.js';

// Runtime entry point for local development. The application factory is kept
// separate in createServer.js so tests can create isolated servers and stores.
const config = getEnvConfig();
const store = createSeededStore();
const app = createServer(store);

app.listen(config.port, () => {
  console.log(`${config.appName} listening on http://localhost:${config.port}`);
});
