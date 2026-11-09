# HeadshotPro — Backend

API for **HeadshotPro**, an AI headshot generator. Users upload a photo, buy
credits, and generate professional headshots in multiple styles. Built on
**Bun + Express + TypeScript**, with Stripe payments, a durable background
queue, and AI image generation.

## Features

- **Auth** — register, email verification, login, JWT access/refresh tokens
  (httpOnly cookies), logout, role-based access (`USER` / `ADMIN`)
- **Credits & Payments** — credit packages, Stripe Checkout, and a verified
  Stripe webhook that grants credits
- **Headshot generation** — OpenAI image editing (`gpt-image-1-mini`) across 5
  styles (Professional, Casual, Creative, Executive, LinkedIn)
- **Storage** — generated images stored on Cloudinary
- **Background jobs** — Inngest durable queue for generation and payment flows
- **Admin** — manage users (roles, credits, delete) and view orders
- **Hardening** — Helmet security headers, rate limiting, gzip compression, CORS

## Tech stack

Bun · Express 5 · TypeScript · MongoDB (Mongoose) · Zod · JWT · Nodemailer ·
Stripe · OpenAI SDK · Cloudinary · Inngest · Upstash Redis · Winston

## Prerequisites

- [Bun](https://bun.com) v1.4+
- MongoDB (local or Atlas)
- Accounts/keys: Stripe, OpenAI, Cloudinary, Upstash Redis, and an SMTP sender
- For local payment/queue testing: the [Stripe CLI](https://stripe.com/docs/stripe-cli)
  and [Inngest CLI](https://www.inngest.com/docs/dev-server)

## Environment variables

Create a `.env` file in the project root:

```env
NODE_ENV=development
PORT=8000
FRONTEND_URL=http://localhost:3000

# Database
DATABASE_URL=mongodb://localhost:27017/headshotpro

# Email (SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=you@gmail.com
SMTP_PASSWORD=your-app-password
EMAIL_FROM=HeadshotPro <you@gmail.com>

# JWT
JWT_SECRET=replace-me
JWT_EXPIRES_IN=15m
JWT_REFRESH_SECRET=replace-me-too
JWT_REFRESH_EXPIRES_IN=7d

# Stripe
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# OpenAI (image generation)
OPENAI_API_KEY=sk-...

# Cloudinary (image storage)
CLOUDINARY_CLOUD_NAME=your-cloud
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...

# Upstash Redis
UPSTASH_REDIS_REST_URL=https://...
UPSTASH_REDIS_REST_TOKEN=...
```

> `.env` is gitignored — never commit real secrets.

## Getting started

```bash
bun install          # install dependencies
bun run seed:packages # seed the credit packages (one time)
bun run dev          # start the dev server (http://localhost:8000)
```

Other scripts:

```bash
bun run start        # run without watch
bun run build        # type-check (tsc --noEmit)
```

### Local payments & background jobs

Stripe cannot reach `localhost` directly, so during local testing run these in
separate terminals alongside the dev server:

```bash
# Forward Stripe webhooks to the backend
stripe listen --all-snapshot --forward-to localhost:8000/api/v1/payment/webhook/stripe

# Inngest dev server (runs the background queue)
npx inngest-cli@latest dev -u http://localhost:8000/api/inngest
```

## API overview

Base path: `/api/v1`

| Area      | Base route        |
| --------- | ----------------- |
| Auth      | `/auth`           |
| Payments  | `/payment`        |
| Headshots | `/headshots`      |
| Admin     | `/admin/users`, `/admin/orders` |

Other endpoints: `GET /health`, Inngest at `/api/inngest`, Stripe webhook at
`/api/v1/payment/webhook/stripe`.

## Project structure

```
src/
  config/        # env-driven configuration
  controllers/   # request handlers
  middleware/    # auth, validation, rate limit, errors
  models/        # Mongoose models (User, Headshot, Order, CreditPackage)
  routes/v1/     # route definitions
  services/      # auth, headshot, payment, orders, storage, queue, redis, email
  util/          # logger, errors, response helpers
  validators/    # Zod schemas
  scripts/       # seed scripts
```
