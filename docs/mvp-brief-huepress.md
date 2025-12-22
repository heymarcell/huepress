# MVP Brief: HuePress

## 1) One-liner

-   **For:** "Aesthetic Millennial Moms" (Primary) and Pediatric Therapists (Secondary).
    
-   **Problem:** Current printable sites are chaotic, ad-riddled, and offer low-quality "ugly" clip art that frustrates design-conscious parents.
    
-   **Outcome:** A "fridge-worthy" library of bold, therapeutic coloring pages that can be found, downloaded, and printed in under 60 seconds without visual clutter.
    

## 2) Constraints & Assumptions

-   **Timebox:** 4 Weeks (Launch MVP).
    
-   **Team:** 1 Solo Fullstack Developer (Founder).
    
-   **Platform:** Web (Next.js / Node.js).
    
-   **Budget:** Minimal fixed costs (pay-per-usage).
    
-   **Assumptions:**
    
    -   Users will pay $5/mo for _curation_ and _convenience_ despite free alternatives.
        
    -   The "Bold & Easy" AI-generated aesthetic (via Gemini) meets "therapy-grade" standards with minimal human intervention.
        
    -   Google Gemini 1.5 Pro/Flash + Vectorizer.ai can produce SVG paths clean enough for print.
        

## 3) Target User & Core Job-to-be-Done

-   **Primary Persona: "The Aesthetic Mom"** (30–45). Values "Dopamine Decor," manages household activities, owns a printer, hates wasting ink on full-color pages.
    
-   **JTBD:** "When I need a quiet activity for my kids, I want to instantly find and print a cute, bold coloring page without navigating ads, so I can get 30 minutes of peace while they create something beautiful."
    

## 4) Core Journey (Happy Path)

1.  **Discovery:** User lands on the home page (The Vault) and sees a clean grid of "Bold & Easy" art.
    
2.  **Filter:** User clicks "Animals" tag; grid updates instantly.
    
3.  **Preview:** User clicks a thumbnail. Sees a high-res, watermarked preview.
    
4.  **Action:** User clicks "Download."
    
5.  **Gate:** Since user is not logged in, a "Join the Club" modal appears ($5/mo).
    
6.  **Conversion:** User signs up via Clerk + pays via Stripe.
    
7.  **Fulfillment:** User is redirected back, watermark disappears, "Download" button serves the vector PDF.
    

## 5) Riskiest Assumptions (Top 3)

| **Assumption** | **Why risky** | **How MVP tests it** | **Pass/Fail signal** |
| --- | --- | --- | --- |
| **Willingness to Pay (WTP)** | Competitors (Crayola, SuperColoring) are free. | Hard paywall on high-res downloads. No ads. | **Pass:** >1.5% conversion (Visitor to Paid). |
| **AI Quality Reliability** | AI struggles with "closed paths" and "consistent lines." | Automated "Inspector" agent (Gemini Vision) in the generation loop. | **Pass:** <10% of generated images require manual fix. |
| **Churn/Retention** | Users might "raid" the library in 1 month and cancel. | Subscription model + "New Drops" UI indicator. | **Pass:** <15% Churn in Month 1. |

## 6) MVP Scope (MoSCoW)

### Must-have (MVP)

-   **"The Vault" (Gallery):** Responsive grid with filtering (Category, Skill).
    
-   **Resource Detail Page:** Watermarked preview logic vs. Unlocked view.
    
-   **Auth & Payments:** Clerk (Auth) + Stripe (Subscription) integration.
    
-   **Secure Download API:** Node.js stream from Backblaze B2 (Private) to Client.
    
-   **"The Factory" (Ops):** Node.js script using Google Gemini + Vectorizer.ai to generate assets.
    
-   **Admin Dashboard (Basic):** Interface to approve/reject "Factory" outputs and publish to live DB.
    

### Should-have (if time remains)

-   **Search:** Full-text search (algolia/meilisearch) - _Scope cut: relying on filters for MVP._
    
-   **Favorites:** Ability to "Heart" items.
    

### Could-have (nice-to-have)

-   **Bundle Builder:** Create custom PDF packs.
    
-   **Free Lead Magnet:** Exchange email for 1 free PDF.
    

### Won’t-do (explicit non-goals)

-   **Physical Merch:** No print-on-demand books.
    
-   **Community:** No comments or user uploads.
    
-   **Ad Support:** No free ad-supported tier.
    

## 7) Feature List with User Stories & Acceptance Criteria

### Feature A: "The Factory" (Content Generation)

-   **User Story:** "As the Admin, I want to generate 10 'Space' themed pages automatically so I can populate the vault."
    
-   **Acceptance Criteria:**
    
    -   Script accepts a `theme` argument.
        
    -   Script calls Gemini Nano Banana Pro (or 1.5 Pro) for generation.
        
    -   Script calls Vectorizer.ai to convert to SVG.
        
    -   Script packages PDF (Private Bucket) and JPG (Public Watermarked Bucket).
        
    -   Script saves metadata to Database with status `Draft`.
        
-   **Dependencies:** Google GenAI SDK, Vectorizer.ai API, Backblaze B2.
    

### Feature B: The Vault & Detail View

-   **User Story:** "As a user, I want to browse images quickly without page reloads."
    
-   **Acceptance Criteria:**
    
    -   Next.js page fetching data from DB.
        
    -   Lazy loading for images (blur-up effect).
        
    -   Watermark overlay is burned into the public JPG (not just CSS hidden).
        
    -   "Download" button state changes based on Clerk user role (`subscriber`).
        

### Feature C: Secure Download Endpoint

-   **User Story:** "As a subscriber, I want to download the PDF without exposing the source URL to others."
    
-   **Acceptance Criteria:**
    
    -   API Route `/api/download/:id`.
        
    -   Checks Clerk session for `is_paid` status.
        
    -   Fetches object from B2 Private Bucket.
        
    -   Streams binary data to response with `Content-Disposition: attachment`.
        
-   **Edge Cases:** User subscription expired (return 403 + Redirect to pricing).
    

## 8) Data, Integrations, and Ops (MVP-level)

-   **Tech Stack:** Next.js (App Router), Node.js, Vercel/Railway.
    
-   **Database:** Turso (SQLite) or Neon (Postgres).
    
    -   _Schema:_ `Assets` (id, title, status, b2\_key\_private, b2\_key\_public, tags), `Users` (managed by Clerk + local sync).
        
-   **Storage:** Backblaze B2 (S3 Compatible).
    
-   **Integrations:**
    
    -   **Auth:** Clerk.
        
    -   **Payments:** Stripe Checkout.
        
    -   **AI:** Google Vertex AI / GenAI SDK.
        
-   **Ops:** Run "Factory" script locally or via cron to replenish content.
    

## 9) Measurement Plan

### Success metrics (MVP)

-   **Conversion Rate:** Visitor -> Paid Subscriber (Target: >1.5%).
    
-   **Content Efficiency:** Time to produce 1 pack (Target: <5 mins manual work per 10 assets).
    
-   **Engagement:** Downloads per active user (Target: >3 in first week).
    

### Instrumentation (Events)

| **Event** | **Trigger** | **Properties** | **Why it matters** |
| --- | --- | --- | --- |
| `view_gallery` | Page Load | `filter_tag` | What themes are popular? |
| `click_preview` | Click Thumbnail | `asset_id` | Interest signal. |
| `click_download_gate` | Click Download (Free User) | `source_asset` | Paywall effectiveness. |
| `subscription_started` | Stripe Webhook | `plan_id` | **Revenue.** |
| `asset_downloaded` | API Success | `asset_id` | Consumption/Value. |

## 10) Experiment Plan (2–4 experiments)

| **Experiment** | **Hypothesis** | **Method** | **Decision rule** |
| --- | --- | --- | --- |
| **Pricing Anchor** | Annual plan ($45) makes Monthly ($5) feel like a "no-brainer." | Default toggle to "Annual" on pricing modal. | If Annual mix > 10%, keep default. |
| **"Printer Friendly"** | Users care more about saving ink than "cuteness." | Headline A/B Test: "Cute Art" vs. "Save Ink." | Winner gets 80% traffic. |

## 11) Delivery Plan

-   **Milestone 0: The Factory (Week 1):** Build Node.js script. Generate first 50 assets. Verify SVG quality.
    
-   **Milestone 1: The Skeleton (Week 2):** Next.js setup, Clerk Auth, DB Schema, Gallery UI (Read-only).
    
-   **Milestone 2: The Business Logic (Week 3):** Stripe integration, Secure Download API, Watermarking logic.
    
-   **Milestone 3: Launch (Week 4):** DNS propagation, SEO metadata, 50-Pin Pinterest blast.
    

## 12) Risks & Mitigations

| **Risk** | **Impact** | **Likelihood** | **Mitigation** | **Early warning signal** |
| --- | --- | --- | --- | --- |
| **AI Hallucinations** | "Broken hands" or "Extra fingers" in coloring pages. | Med | Automated "Inspector" (Gemini Vision) step in Factory script. | High rejection rate in Admin dashboard. |
| **Stripe Testing** | Webhooks failing in prod. | Low | Use Stripe CLI for local webhook testing during Dev. | "Customer created" but no database update. |
| **B2 Latency** | Slow downloads. | Low | Cache public thumbnails heavily (CDN); PDFs are small vectors (<1MB). | Slow gallery loading. |

## 13) Scope Cutline (what we cut to ship fast)

-   **Search Bar:** Users can find 50 items via Filters easily. Search engine infra (Algolia) is overkill for MVP.
    
-   **Physical Print:** Too much ops complexity. Digital-only proves the content value first.
    
-   **User Profiles/History:** "My Downloads" page is nice but not blocking revenue.
    
-   **Free Tier:** Ad integration requires traffic volume we don't have yet. Clean paid model is faster to validate.