# E-Commerce App

This repository is starting from the product and architecture foundation.

Read these documents first:

- [Product requirements](docs/product-requirements.md)
- [User stories](docs/user-stories.md)
- [System design](docs/system-design.md)
- [Database design](docs/database-design.md)
- [Implementation roadmap](docs/implementation-roadmap.md)

## Recommended First Architecture

Use a modular monolith:

- One Express backend application.
- One relational database.
- Clear modules for auth, catalog, cart, checkout, orders, inventory, payments, and admin.
- Add queues, caching, search engines, or microservices only when a real requirement appears.

## First Milestone

A logged-in customer can browse seeded products, add one variant to a cart, checkout with mocked payment, and see the created order in order history.

## Run The First Milestone

Requirements:

- Node.js 20 or newer.

Environment:

- Copy `.env.example` to `.env` for local development.
- `NODE_ENV`: runtime environment name. Defaults to `development`.
- `PORT`: HTTP port for the API. Defaults to `3000`.
- `APP_NAME`: name used in the startup log. Defaults to `E-commerce API`.
- `DATABASE_URL`: Postgres connection string for app data.
- `REDIS_URL`: Redis connection string for cache data.
- `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_PORT`: local Postgres container settings.
- `REDIS_PORT`: local Redis container port.

Commands:

```bash
npm run db:start
npm run db:health
npm test
npm run dev
```

The API starts on:

```text
http://localhost:3000
```

Seeded customer:

```text
email: customer@example.com
password: password123
```

Implemented endpoints:

- `GET /health`
- `POST /auth/login`
- `GET /products`
- `GET /products/:id`
- `GET /cart`
- `POST /cart/items`
- `PATCH /cart/items/:id`
- `DELETE /cart/items/:id`
- `POST /checkout`
- `GET /orders`

Authenticated endpoints require:

```text
Authorization: Bearer <token>
```
