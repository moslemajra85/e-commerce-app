import express from 'express';
import { login } from '../modules/auth/auth.service.js';
import { requireUser } from '../modules/auth/auth.middleware.js';
import { addCartItem, getCart, removeCartItem, updateCartItem } from '../modules/cart/cart.service.js';
import { checkout } from '../modules/checkout/checkout.service.js';
import { getProduct, listProducts } from '../modules/catalog/catalog.service.js';
import { listOrdersForUser } from '../modules/orders/orders.service.js';
import { HttpError } from '../shared/errors.js';

// Builds the Express application around an injected store. Passing the store in
// keeps routing deterministic in tests and avoids hidden global state.
export function createServer(store) {
  const app = express();

  app.disable('x-powered-by');
  app.use(express.json());

  // Express leaves req.body undefined when there is no JSON body. Normalizing to
  // an object keeps service validation behavior consistent with the old server.
  app.use((req, res, next) => {
    req.body ??= {};
    next();
  });

  // Public health check used by humans, scripts, and future deployment probes
  // to confirm the process can accept requests.
  app.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok' });
  });

  // Public authentication route. It creates an in-memory bearer session token
  // that protected routes validate through requireUser().
  app.post('/auth/login', (req, res) => {
    res.status(200).json(login(store, req.body));
  });

  // Public catalog routes expose only active products and active variants.
  app.get('/products', (req, res) => {
    res.status(200).json({ products: listProducts(store) });
  });

  app.get('/products/:productId', (req, res) => {
    res.status(200).json({ product: getProduct(store, req.params.productId) });
  });

  // Cart routes are customer-owned, so every cart operation must resolve the
  // bearer token before reading or mutating cart state.
  app.get('/cart', (req, res) => {
    const user = requireUser(store, req);
    res.status(200).json({ cart: getCart(store, user.id) });
  });

  app.post('/cart/items', (req, res) => {
    const user = requireUser(store, req);
    res.status(201).json({ cart: addCartItem(store, user.id, req.body) });
  });

  app.patch('/cart/items/:cartItemId', (req, res) => {
    const user = requireUser(store, req);
    res.status(200).json({ cart: updateCartItem(store, user.id, req.params.cartItemId, req.body) });
  });

  app.delete('/cart/items/:cartItemId', (req, res) => {
    const user = requireUser(store, req);
    res.status(200).json({ cart: removeCartItem(store, user.id, req.params.cartItemId) });
  });

  app.post('/checkout', (req, res) => {
    const user = requireUser(store, req);
    res.status(201).json({ order: checkout(store, user.id, req.body) });
  });

  app.get('/orders', (req, res) => {
    const user = requireUser(store, req);
    res.status(200).json({ orders: listOrdersForUser(store, user.id) });
  });

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
