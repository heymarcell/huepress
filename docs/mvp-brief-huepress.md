# MVP Brief: HuePress

## 1) One-liner

- **For:** "Aesthetic Millennial Moms" (Primary) and Pediatric Therapists (Secondary).
- **Problem:** Current printable sites are chaotic, ad-riddled, and offer low-quality "ugly" clip art that frustrates design-conscious parents.
- **Outcome:** A "fridge-worthy" library of bold, therapeutic coloring pages that can be found, downloaded, and printed in under 60 seconds without visual clutter.

## 2) Constraints & Assumptions

- **Status:** **LIVE (MVP Deployed)**
- **Team:** 1 Solo Fullstack Developer (Founder).
- **Platform:** **Vite (React) + Cloudflare Workers (Hono).**
- **Budget:** Minimal fixed costs (Cloudflare Free Tier/Bundle).
- **Assumptions:**

  - Users will pay $5/mo for _curation_ and _convenience_ (validated by "Therapy-Grade" positioning).
  - "Bold & Easy" aesthetic is the core differentiator (evidenced by "Lifestyle Proof" hero).

## 3) Target User & Core Job-to-be-Done

- **Primary Persona: "The Aesthetic Mom"** (30–45). Values "Dopamine Decor," manages household activities, owns a printer, hates wasting ink on full-color pages.
- **JTBD:** "When I need a quiet activity for my kids, I want to instantly find and print a cute, bold coloring page without navigating ads, so I can get 30 minutes of peace while they create something beautiful."

## 4) Core Journey (Happy Path)

1.  **Discovery:** User lands on the home page, sees "Therapist Approved" badge and lifestyle photography.
2.  **Filter:** User clicks "Animals" or uses **Search**; grid updates instantly (Client-side).
3.  **Gate:** Non-subscribers see "Free Sample Pack" lead magnet and "Locked" assets.
4.  **Conversion:** User clicks "Join the Club," sees "3 Months Free" (Annual) or "Cancel Anytime" (Monthly). Signs up via Clerk + Stripe.
5.  **Fulfillment:** User lands back in Vault. "Free Sample Pack" disappears. Locks disappear. "Download PDF" button becomes active.

## 5) Riskiest Assumptions (Top 3)

| **Assumption**               | **Why risky**                                  | **How MVP tests it**                                 | **Pass/Fail signal**                          |
| ---------------------------- | ---------------------------------------------- | ---------------------------------------------------- | --------------------------------------------- |
| **Willingness to Pay (WTP)** | Competitors (Crayola, SuperColoring) are free. | Hard paywall on high-res downloads. No ads.          | **Pass:** >1.5% conversion (Visitor to Paid). |
| **Ease of Use**              | Complexity increases churn.                    | "See Details" -> "Download" flow is 2 clicks.        | **Pass:** High return rate.                   |
| **Churn/Retention**          | Content exhaustion.                            | "New Drops Sunday" promise + "Cancel Anytime" trust. | **Pass:** <15% Churn in Month 1.              |

## 6) MVP Scope (MoSCoW) - **Implemented**

### Must-have (MVP) - ✅ DONE

- **"The Vault" (Gallery):** Responsive grid with client-side Filtering & Search.
- **Resource Detail Page:** Hover preview stats ("See Details") + Subscriber visibility logic.
- **Auth & Payments:** Clerk (Auth) + Stripe (Subscription/Portal) integration.
- **Secure Download API:** Hono endpoint verifying Clerk session before streaming from R2 visibility.
- **Admin Dashboard:** `/admin` route for uploading assets to R2/D1 (Whitelisted email access).
- **Brand Trust:** "About Us" page + "Therapy-Grade" messaging + Lifestyle imagery.
- **Accessibility:** WCAG AA Contrast compliance.

### Should-have (Implemented)

- **Search:** Quick client-side search by title/tag. 🔍
- **Free Lead Magnet:** "Free Sample Pack" capture card in Vault (automatically hidden for subscribers). 🎁

### Won’t-do (explicit non-goals)

- **Physical Merch:** Digital only.
- **Ad Support:** Strictly ad-free.

## 7) Implementation Technical Detail

### Feature A: "The Factory" (Content Pipeline)

- **Implementation:** Manual/Scripted generation -> Upload via Admin Panel.
- **Tech:** Admin Form uploads Thumbnail (Public R2) + PDF (Private R2) -> Updates D1 Database.

### Feature B: The Vault & Detail View

- **Implementation:** React (Vite) SPA.
- **Performance:** Images served via Cloudflare CDN. Filtering is instant (Client-side state).
- **UX:** "Free Sample" card integrated directly into grid.

### Feature C: Secure Download Endpoint

- **Endpoint:** `GET /api/download/:id` (Cloudflare Worker).
- **Logic:**
  1.  Verify Clerk Session.
  2.  Check D1 for Asset ID.
  3.  Check `is_subscriber` status.
  4.  Stream from R2 Bucket (`ASSETS_PRIVATE`).

## 8) Data, Integrations, and Ops (Realized)

- **Tech Stack:** **Vite** (Frontend) + **Cloudflare Workers** (Backend).
- **Database:** **Cloudflare D1** (SQLite).
  - _Schema:_ `assets` (id, title, r2_key, etc.), `users` (synced via Webhook).
- **Storage:** **Cloudflare R2** (S3 Compatible).
  - `assets-public` (Thumbnails).
  - `assets-private` (PDFs).
- **Integrations:**
  - **Auth:** Clerk (React SDK + Backend Middleware).
  - **Payments:** Stripe (Checkout + Billing Portal).
  - **Styles:** Tailwind CSS (Custom "Therapy" Theme).

## 9) Measurement Plan

### Success metrics (MVP)

- **Conversion Rate:** Visitor -> Paid Subscriber.
- **Retention:** "Cancel Anytime" usage rate.

### Instrumentation

- **Stripe:** Revenue & Churn tracking.
- **Clerk:** Active User tracking.
- **Cloudflare Analytics:** Bandwidth & Requests.

## 10) Delivery Plan

- **Milestone 1: The Skeleton:** ✅ Vite + Tailwind + Layouts.
- **Milestone 2: The Logic:** ✅ Clerk + Stripe + Hono API + D1.
- **Milestone 3: The Content:** ✅ R2 Integration + Admin Panel.
- **Milestone 4: Strategic Polish:** ✅ Lifestyle Brand + SEO + Copy + Accessibility.
- **Status:** **READY FOR LAUNCH.** 🚀
