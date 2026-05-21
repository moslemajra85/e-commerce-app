import express from 'express';
import { createAuthRouter } from '../modules/auth/auth.routes.js';
import { createCartRouter } from '../modules/cart/cart.routes.js';
import { createCatalogRouter } from '../modules/catalog/catalog.routes.js';
import { HttpError } from '../shared/errors.js';

// Builds the Express application around injected dependencies. Passing Prisma
// in keeps routing deterministic in tests and avoids hidden global state.
export function createApp(prisma) {
  const app = express();

  app.disable('x-powered-by');
  app.use(express.json());

  // Express leaves req.body undefined when there is no JSON body. Normalizing to
  // an object keeps service validation behavior consistent.
  app.use((req, res, next) => {
    req.body ??= {};
    next();
  });

  // Public health check used by humans, scripts, and future deployment probes
  // to confirm the process can accept requests.
  app.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok' });
  });

  app.use('/auth', createAuthRouter(prisma));
  app.use('/catalog', createCatalogRouter(prisma));
  app.use('/cart', createCartRouter(prisma));

  app.use((req, res, next) => {
    next(new HttpError(404, 'Route not found'));
  });

  app.use((error, req, res, next) => {
    // Services throw HttpError for expected client problems. Everything else is
    // treated as an internal error so implementation details are not leaked.
    const status = getErrorStatus(error);
    const message = getErrorMessage(error, status);
    res.status(status).json({ error: message });
  });

  return app;
}

function getErrorStatus(error) {
  if (error instanceof HttpError) {
    return error.status;
  }

  if (error?.type === 'entity.parse.failed') {
    return 400;
  }

  return 500;
}

function getErrorMessage(error, status) {
  if (error?.type === 'entity.parse.failed') {
    return 'Request body must be valid JSON';
  }

  return status === 500 ? 'Internal server error' : error.message;
}
