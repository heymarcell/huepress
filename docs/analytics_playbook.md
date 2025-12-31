# 📊 HuePress Analytics Playbook: Operating the Funnel

You now have a "State-of-the-Art" (SOTA) analytics engine. This guide explains how to read the dashboard and valid, actionable moves to make based on the data.

## 1. The Funnel Inspection 🕵️‍♂️

Your funnel is no longer a black box. Here are the specific events to watch in Google Analytics 4 (or Mixpanel):

| Stage | Event Name | What it Means | The "Health Check" Question |
| :--- | :--- | :--- | :--- |
| **1. Acquisition** | `session_start` | User arrived. | *Are my ads/SEO working?* |
| **2. Discovery** | `view_item` / [search](file:///Users/heymarcell/Documents/huepress/src/lib/analytics.ts#99-105) | They looked at a product or searched. | *Is my catalog interesting?* |
| **3. Intent** | `form_start` (Free Sample) | Started typing email but didn't finish. | *Is the form too intimidating?* |
| **4. Engagement** | `file_download` | They got value (Free/Paid). | *Are they actually using the product?* |
| **5. Consideration** | `select_content` (Pricing) | Clicked a specific plan card. | *Which price point is winning?* |
| **6. Checkout** | `begin_checkout` | Went to Stripe. | *Is the price shock too high?* |
| **7. Conversion** | [purchase](file:///Users/heymarcell/Documents/huepress/src/lib/analytics.ts#61-75) | Money in bank. | *ROI Positive?* |

---

## 2. Advanced "Radar" Signals 📡

We added hidden trackers that give you competitive advantages:

### A. The "Content Gap" Detector (`zero_results`)
*   **Where to look:** Filter events for `select_content` where `content_type = zero_results`.
*   **The Insight:** Users are searching for things you *don't have*.
*   **The Play:**
    *   If 50 people search "Christmas" and get 0 results -> **Make a Christmas Pack immediately.**
    *   If people search "Free", show them the free sample signup instead of an empty list.

### B. The "Friction" Detector (`form_error`)
*   **Where to look:** Event `view_item` with category `form_error`.
*   **The Insight:** Users are trying to subscribe but failing.
*   **The Play:**
    *   If high errors -> Your form validation might be too strict (e.g., rejecting ".co.uk" emails).
    *   Fixing this = Free revenue.

### C. The "Confusion" Detector (`faq_open`)
*   **Where to look:** Event `select_content` with `content_type = faq`.
*   **The Insight:** The specific question most people open is their #1 objection.
*   **The Play:**
    *   If everyone opens *"Can I cancel anytime?"* -> **Make "Cancel Anytime" huge text on the pricing card.**
    *   Stop hiding the answer; feature it.

---

## 3. Weekly Routine (The "CEO" Workflow) 🗓️

**Monday Morning Check:**
1.  **Drop-off Analysis:** Calculate `form_start` vs `generate_lead`.
    *   *Good:* >40% conversion.
    *   *Bad:* <10%. Action: Simplify the form.
2.  **Search Term Review:** Look at top `search_term`s.
    *   Action: Add those tags to your best assets to improve relevance.
3.  **Pricing Heatmap:** Look at `select_content` for `pricing_plan`.
    *   Are people clicking "Annual" but buying "Monthly"?
    *   Action: They want the deal but fear the commitment. Add a "30-day money-back guarantee" to the Annual card.

## 4. Debugging & Trust 🛠️

*   **"Is it working?"**: Open your site, add `?utm_source=test`, click around. Check **Realtime View** in GA4.
*   **"Why no data?"**: Remember `localhost` events might be filtered if we set up internal traffic filters (good practice). Test in Prod or staging mode.

---

> **The Golden Rule:** Data is useless without action. Don't just watch the numbers go up or down. If `zero_results` goes up, DRAW MORE PAGES. If `form_errors` goes up, FIX THE FORM.
