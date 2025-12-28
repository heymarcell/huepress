---
description: how to deploy HuePress to production
---

# HuePress Deployment Workflow

## Prerequisites

Before deploying, ensure you have:

1. Cloudflare account with Pages and Workers enabled
2. Wrangler CLI authenticated (`pnpm exec wrangler login`)
3. Environment secrets configured

## Step 1: Set Production Secrets

// turbo

```bash
# Required secrets for the API worker
pnpm exec wrangler secret put CLERK_SECRET_KEY
pnpm exec wrangler secret put STRIPE_SECRET_KEY
pnpm exec wrangler secret put STRIPE_WEBHOOK_SECRET
```

## Step 2: Create R2 Buckets (if not exists)

```bash
# Private bucket for subscriber PDFs
pnpm exec wrangler r2 bucket create huepress-assets-private

# Public bucket for watermarked previews
pnpm exec wrangler r2 bucket create huepress-assets-public
```

## Step 3: Run Database Migration

// turbo

```bash
pnpm run db:migrate:prod
```

## Step 4: Build the Frontend

// turbo

```bash
pnpm run build
```

## Step 5: Deploy Pages (Frontend)

// turbo

```bash
pnpm run deploy:pages
```

## Step 6: Deploy Worker (API)

// turbo

```bash
pnpm run deploy:worker
```

**Note**: This command also deploys and updates the Processing Container defined in `wrangler.toml`.

## Step 7: Configure Cloudflare Analytics

1. Go to Cloudflare Dashboard → Analytics → Web Analytics
2. Add site: `huepress.co` (or your domain)
3. Copy the beacon token
4. Update `index.html` with the token in `data-cf-beacon`

## Post-Deployment Verification

- [ ] Homepage loads correctly
- [ ] Vault page displays assets
- [ ] Pricing page shows plans
- [ ] Stripe checkout works
- [ ] Downloads work for subscribers
- [ ] Analytics tracking in dashboard

## Rollback

If issues occur:

```bash
# Rollback Pages to previous deployment
pnpm exec wrangler pages rollback huepress

# Rollback Worker
pnpm exec wrangler rollback
```
