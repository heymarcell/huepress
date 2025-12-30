# HuePress Canonical Event Dictionary

This document defines the authoritative event taxonomy for HuePress analytics across all platforms.

## Event Naming Conventions

| Platform  | Case Style | Example                                    |
| --------- | ---------- | ------------------------------------------ |
| GA4       | snake_case | `purchase`, `sign_up`, `page_view`         |
| Meta      | PascalCase | `Purchase`, `CompleteRegistration`, `Lead` |
| Pinterest | snake_case | `checkout`, `signup`, `lead`               |

---

## Core Events

### Page View

| Platform  | Event Name         | Trigger     | Dedup Key |
| --------- | ------------------ | ----------- | --------- |
| GA4       | `page_view` (auto) | Page load   | —         |
| Meta      | `PageView`         | GTM trigger | —         |
| Pinterest | `pagevisit`        | GTM trigger | —         |

**Key Parameters:** `page_location`, `page_title`, `page_referrer`

---

### Sign Up / Registration

| Platform  | Event Name             | Trigger                      | Dedup Key |
| --------- | ---------------------- | ---------------------------- | --------- |
| GA4       | `sign_up`              | Clerk `user.created` webhook | —         |
| Meta      | `CompleteRegistration` | Clerk webhook                | —         |
| Pinterest | `signup`               | Clerk webhook                | —         |

**Key Parameters:**

- `user_id` / `external_id` — Clerk user ID (hashed for Meta/Pinterest)
- `email` — User email (hashed for Meta/Pinterest)
- `method` — Registration method (`email`, `google`, etc.)

---

### Begin Checkout

| Platform  | Event Name         | Trigger               | Dedup Key  |
| --------- | ------------------ | --------------------- | ---------- |
| GA4       | `begin_checkout`   | Checkout button click | `event_id` |
| Meta      | `InitiateCheckout` | GTM dataLayer         | `eventID`  |
| Pinterest | `checkout`         | GTM dataLayer         | `event_id` |

**Key Parameters:**

- `event_id` / `eventID` — UUID generated client-side (passed to server)
- `value` — Checkout value (5 or 45)
- `currency` — `USD`
- `items` — Array of items

---

### Purchase

| Platform  | Event Name | Trigger                                     | Dedup Key        |
| --------- | ---------- | ------------------------------------------- | ---------------- |
| GA4       | `purchase` | Stripe `checkout.session.completed` webhook | `transaction_id` |
| Meta      | `Purchase` | Stripe webhook                              | `event_id`       |
| Pinterest | `checkout` | Stripe webhook                              | `event_id`       |

**Key Parameters:**
| Parameter | GA4 | Meta CAPI | Pinterest CAPI |
|-----------|-----|-----------|----------------|
| Transaction ID | `transaction_id` | `order_id` | `order_id` |
| Value | `value` (number) | `value` (number) | `value` (string) |
| Currency | `currency` | `currency` | `currency` |
| Event ID | — | `event_id` | `event_id` |
| User ID | `user_id` | `external_id` (hashed) | `external_id` (hashed) |
| Email | — | `em` (hashed) | `em` (hashed array) |
| Client ID | `client_id` | — | — |
| FBP | — | `fbp` | — |
| FBC | — | `fbc` | — |
| IP | — | `client_ip_address` | `client_ip_address` |
| UA | — | `client_user_agent` | `client_user_agent` |

---

### Subscribe (Meta only)

| Platform | Event Name  | Trigger        | Dedup Key  |
| -------- | ----------- | -------------- | ---------- |
| Meta     | `Subscribe` | Stripe webhook | `event_id` |

**Key Parameters:** Same as Purchase

---

### Lead

| Platform  | Event Name      | Trigger            | Dedup Key |
| --------- | --------------- | ------------------ | --------- |
| GA4       | `generate_lead` | Email capture form | —         |
| Meta      | `Lead`          | Server-side        | —         |
| Pinterest | `lead`          | Server-side        | —         |

**Key Parameters:** `lead_source`, `value`, `email` (hashed)

---

### File Download

| Platform | Event Name      | Trigger        | Dedup Key |
| -------- | --------------- | -------------- | --------- |
| GA4      | `file_download` | Download click | —         |

**Key Parameters:** `file_name`, `file_extension`, `link_url`

---

## Event ID Flow (Deduplication)

```
┌─────────────────────────────────────────────────────────────────┐
│                         BROWSER                                  │
├─────────────────────────────────────────────────────────────────┤
│  1. User clicks checkout                                         │
│  2. Generate event_id = crypto.randomUUID()                      │
│  3. Push to dataLayer: { event: 'begin_checkout', eventID: ... } │
│  4. GTM fires Meta Pixel with eventID                            │
│  5. GTM fires Pinterest Tag with event_id                        │
│  6. POST /api/checkout with eventId in body                      │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    CLOUDFLARE WORKER                             │
├─────────────────────────────────────────────────────────────────┤
│  7. Store eventId in Stripe Checkout Session metadata            │
│  8. Stripe processes payment                                     │
│  9. Webhook: checkout.session.completed                          │
│  10. Extract eventId from session.metadata                       │
│  11. Call Meta CAPI with event_id = eventId                      │
│  12. Call Pinterest CAPI with event_id = eventId                 │
│  13. Meta/Pinterest deduplicate: browser event + server event    │
└─────────────────────────────────────────────────────────────────┘
```

---

## Governance

- **Owner:** Analytics Engineering
- **Review Cadence:** Quarterly
- **Change Process:** Update this document, update code, deploy, validate in Events Managers
