# WebiCast-API

Read-only REST API for the public WebinarTV catalog.

## Stack

- Node.js
- TypeScript
- Fastify
- TypeBox
- Swagger / OpenAPI
- Vitest

## Getting Started

```bash
npm install
npm run dev
```

The server starts on `http://localhost:3000` by default.

## Scripts

```bash
npm run dev
npm run build
npm run start
npm run typecheck
npm run lint
npm run test
```

## Environment Variables

- `HOST`
- `PORT`
- `SOURCE_URL`
- `CACHE_TTL_MS`
- `STALE_IF_ERROR_MS`
- `LOG_LEVEL`
- `RATE_LIMIT_MAX`

## Routes

- `GET /healthz`
- `GET /openapi.json`
- `GET /docs/`
- `GET /v1/meta`
- `GET /v1/categories`
- `GET /v1/webinars`
- `GET /v1/webinars/:id`

## Query Parameters

`GET /v1/webinars` supports:

- `page`
- `limit`
- `category`
- `status=all|upcoming|past`
- `q`
- `sort=trending|start_time|score|topic`
- `order=asc|desc`

## Source Model

The API pulls from the public WebinarTV catalog JSON at:

`https://storage.googleapis.com/webinartv-200-webinars/webinars-200.json`

At the time this project was implemented, the observed source shape normalized from:

- `400` raw rows
- `200` unique webinars
- each webinar appearing once in `trending` and once in a single category bucket
