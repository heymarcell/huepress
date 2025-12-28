# HuePress

huepress.co is a SaaS platform providing therapy-grade, high-quality printable coloring pages. It features a modern React frontend, a serverless API on Cloudflare Workers, and a dedicated container service for generating PDFs and OG images.

## Table of Contents

- [What this repo contains](#what-this-repo-contains)
- [Quickstart](#quickstart)
- [Configuration](#configuration)
- [Architecture overview](#architecture-overview)
- [API / Interfaces](#api--interfaces)
- [Data model](#data-model)
- [Observability](#observability)
- [Deployment](#deployment)
- [Security notes](#security-notes)
- [Troubleshooting](#troubleshooting)
- [Contributing](#contributing)
- [License](#license)
- [Appendix: Repo map](#appendix-repo-map)

## What this repo contains

This repository is a **monorepo** containing the full stack application:

- **Frontend**: Single Page Application (SPA) built with **React 19**, **Vite**, and **Tailwind CSS**. Deployed to **Cloudflare Pages**.
- **Backend API**: Serverless API built with **Hono** running on **Cloudflare Workers**.
- **Processing Service**: A **Cloudflare Container** (Node.js) handling resource-intensive tasks like PDF generation (Puppeteer/pdf-lib) and Image processing (Sharp).
- **Database**: **Cloudflare D1** (SQLite) for structured data and **R2** for asset storage.

## Quickstart

### Prerequisites

- **Node.js**: v20+
- **npm**: v10+
- **Wrangler**: `npm install -g wrangler` (for Cloudflare local dev)
- **Docker**: (Optional) For building/testing the container locally

### Setup steps

1. **Clone and Install**

   ```bash
   git clone <repo-url>
   cd huepress
   npm install
   ```

2. **Environment Setup**
   Copy the example environment file:

   ```bash
   cp .env.example .env.local
   ```

   Fill in the required keys in `.env.local` (Clerk, Stripe keys).

3. **Database Migration (Local)**
   Initialize the local D1 database:

   ```bash
   npm run db:migrate
   ```

4. **Run Locally**
   Start both the frontend and the API worker locally:

   ```bash
   npm run dev
   ```

   - Frontend: `http://localhost:3000`
   - API Proxy: `http://localhost:8787`

5. **Run Tests**
   ```bash
   npm run test      # Watch mode
   npm run test:run  # Single run with coverage
   ```

### Common Commands

- `npm run build`: Build frontend and backend types.
- `npm run lint`: Lint code with ESLint.

## Configuration

### Environment Variables

Managed via `wrangler.toml` (vars) and Secrets.

| Variable            | Description             | Default/Example           |
| ------------------- | ----------------------- | ------------------------- |
| `ENVIRONMENT`       | Deployment environment  | `production`              |
| `API_URL`           | Public API Base URL     | `https://api.huepress.co` |
| `CLERK_SECRET_KEY`  | Clerk Auth Secret       | _Secret_                  |
| `STRIPE_SECRET_KEY` | Stripe API Key          | _Secret_                  |
| `GA4_API_SECRET`    | Google Analytics Secret | _Secret_                  |

### Config Files

- `wrangler.toml`: Cloudflare Workers & Pages config, D1 bindings, and Container defs.
- `vite.config.ts`: Frontend build config, proxy rules for `/api`.
- `container/Dockerfile`: Definition for the processing service.

## Architecture overview

### Component Diagram

```mermaid
graph TD
    Client[Web Client (React)] -->|/api/*| Worker[Cloudflare Worker (Hono)]
    Client -->|Static Assets| Pages[Cloudflare Pages]

    Worker -->|Auth| Clerk[Clerk Auth]
    Worker -->|Data| D1[(D1 Database)]
    Worker -->|Files| R2[(R2 Storage)]

    Worker -->|HTTP/RPC| Container[Processing Container (Node.js)]

    Container -->|Gen Image| Sharp[Sharp Lib]
    Container -->|Gen PDF| Puppeteer[Puppeteer/PDFKit]
```

### Key Flows

1.  **User Login**: Frontend uses Clerk SDK -> Validates via `clerkMiddleware` on Worker.
2.  **Asset Generation**:
    - Admin uploads SVG to API (`POST /api/assets`).
    - Worker stores SVG in R2.
    - Worker triggers Container (`POST /generate-all`) to create Thumbnail, OG Image, and PDF.
    - Container uploads results back to R2 directly.
    - Worker records metadata in D1.

## API / Interfaces

### HTTP API

Base URL: `https://api.huepress.co` (Prod) or `/api` (Local Proxy).
Auth: `Authorization: Bearer <clerk_token>` (handled by Clerk SDK).

| Endpoint            | Method | Purpose                    | Auth Required |
| ------------------- | ------ | -------------------------- | ------------- |
| `/api/assets`       | GET    | List all coloring pages    | No            |
| `/api/download/:id` | POST   | Record download & get link | Yes           |
| `/api/requests`     | POST   | Submit design request      | Yes           |
| `/api/reviews`      | POST   | Submit a review            | Yes           |

### Processing Service (Internal)

The container exposes an internal HTTP API on port 4000, not accessible publicly.

- `POST /pdf`: Generates PDF from SVG.
- `POST /og-image`: Generates social share image.
- `POST /generate-all`: Orchestrates full asset suite generation.

## Data model

The project uses **Cloudflare D1** (SQLite).

### Schema Overview (`migrations/001_init.sql`)

- **`assets`**: Stores metadata for coloring pages (title, R2 keys, status).
- **`users`**: Synced from Clerk; stores subscription status (Stripe).
- **`downloads`**: Tracks user download history.

### Migrations

Migrations are stored in `migrations/`.

- **Run Locally**: `npm run db:migrate`
- **Run in Prod**: `npm run db:migrate:prod`

## Observability

- **Logs**: Cloudflare Workers logs are streamed to the dashboard. `[observability] enabled = true` in `wrangler.toml`.
- **Containers**: specific container logs are visible in the Cloudflare Container dashboard.

## Deployment

The project is deployed to the Cloudflare ecosystem.

1. **Frontend**:

   ```bash
   npm run deploy:pages
   ```

   Deploys `dist/` to Cloudflare Pages.

2. **Backend**:

   ```bash
   npm run deploy:worker
   ```

   Deploys the Hono worker.

3. **Container**:
   Managed via `wrangler deploy` (implicitly updates container if defined in `wrangler.toml`).
   To force an update of the container image only:
   ```bash
   npm run deploy:worker -- --force
   ```

## Security notes

- **Authentication**: All protected routes require a Clerk session token.
- **Storage**:
  - `ASSETS_PRIVATE` (R2): Not public. Only accessible via signed URLs or Worker proxy.
  - `ASSETS_PUBLIC` (R2): Publicly readable for watermarked previews.
- **Secrets**: Do **not** commit keys. Use `wrangler secret put <KEY>` for production.

## Troubleshooting

- **`wrangler` command not found**: Run `npm install` or use `npx wrangler`.
- **Local Database errors**: Ensure you ran `npm run db:migrate`.
- **Api Network Errors**: Verify `npm run dev` is running and `vite.config.ts` proxy is pointing to port 8787.
- **Container failures**: Check `container/server.js` logs. Updates to the container code are deployed via `npm run deploy:worker`.

## Contributing

1.  Create a feature branch.
2.  Ensure linting passes: `npm run lint`.
3.  Add database migrations if schema changes.
4.  Open a PR.

## License

No license file found.

## Appendix: Repo map

```
.
├── container/              # Processing service (Docker)
│   ├── Dockerfile          # Node.js 20 environment
│   └── server.js           # Express app for PDF/Image gen
├── migrations/             # SQL migrations for D1
├── public/                 # Static assets
├── src/
│   ├── api/                # Backend Application
│   │   ├── index.ts        # Entry point (Hono)
│   │   └── routes/         # API Route handlers
│   ├── components/         # React UI components
│   ├── lib/                # Shared utilities
│   │   └── processing-container.ts # Container client
│   ├── pages/              # React Views (Pages)
│   ├── App.tsx             # Main React Layout
│   └── main.tsx            # Frontend Entry point
├── package.json            # Deps and Scripts
├── vite.config.ts          # Vite Configuration
└── wrangler.toml           # Cloudflare Configuration
```

## Appendix: Evidence index

- **Tech Stack**: `package.json` (React, Vite, Hono, Tailwind).
- **API Routes**: `src/api/index.ts` -> `routes/*.ts`.
- **Container Logic**: `container/server.js` (Express app), `src/lib/processing-container.ts` (Client).
- **Database**: `migrations/001_init.sql`, `wrangler.toml` (`[[d1_databases]]`).
- **Scripts**: `package.json` (`scripts` section).

## Coverage & confidence

- **Verified**:
  - Frontend/Backend split and tech stack.
  - API routing structure and key endpoints.
  - Database schema from migrations.
  - Container purpose (PDF/Image gen) and interface.
- **Inferred**:
  - "Production" deployment details (assumed standard Cloudflare flow based on `npm run deploy` scripts).
  - Exact internal workflow of `ProcessingContainer` orchestration (inferred from `processing-container.ts`).
