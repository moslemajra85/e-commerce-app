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
- Start with a clear auth module, then add catalog, cart, checkout, orders, inventory, payments, and admin one module at a time.
- Add queues, caching, search engines, or microservices only when a real requirement appears.

## Current Milestone

Customers can register and login. Passwords are hashed with Argon2id, and successful auth returns a signed JWT bearer token.

The public catalog API can list active products and show product details with variants, prices, images, and available stock.

Authenticated customers can also manage a persistent cart. Cart totals are recalculated server-side from current variant prices.

## Run The Current Milestone

Requirements:

- Node.js 20 or newer.
- Docker for the local Postgres container.

Environment:

- Copy `.env.example` to `.env` for local development.
- `NODE_ENV`: runtime environment name. Defaults to `development`.
- `PORT`: HTTP port for the API. Defaults to `3000`.
- `APP_NAME`: name used in the startup log. Defaults to `E-commerce API`.
- `JWT_SECRET`: secret used to sign and verify bearer JWTs. Required in production.
- `DATABASE_URL`: Postgres connection string for app data.
- `REDIS_URL`: Redis connection string for cache data.
- `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_PORT`: local Postgres container settings.
- `REDIS_PORT`: local Redis container port.

Commands:

```bash
npm run db:start
npm run db:health
npm run db:migrate
npm run db:seed
npm test
npm run dev
```

Useful database scripts:

- `npm run db:generate`: regenerate Prisma Client after schema changes.
- `npm run db:migrate -- --name <migration_name>`: create and apply a local migration.
- `npm run db:migrate:deploy`: apply committed migrations in production-like environments.
- `npm run db:reset`: reset the local database and rerun migrations.
- `npm run db:seed`: seed the default auth customer.
- `npm run db:studio`: open Prisma Studio.

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
- `POST /auth/register`
- `POST /auth/login`
- `GET /catalog/products`
- `GET /catalog/products/:slug`
- `GET /cart`
- `POST /cart/items`
- `PATCH /cart/items/:itemId`
- `DELETE /cart/items/:itemId`

Future authenticated endpoints will require:

```text
Authorization: Bearer <token>
```
