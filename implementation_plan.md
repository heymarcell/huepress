# Implementation Plan - Add Rights Waiver Checkbox

We will update the backend API to inject a mandatory "Right of Withdrawal" waiver checkbox into the Stripe Checkout flow. This ensures EU compliance by effectively forcing the user to agree to immediate delivery and loss of refund rights before paying.

## Proposed Changes

### [Backend] `src/api/index.ts`

We will modify the `/api/checkout` endpoint.

#### [MODIFY] `src/api/index.ts`

- Update the Stripe Checkout Session creation payload.
- Add `custom_fields` parameter with a required checkbox.
- **Label:** "I consent to immediate access to this digital content and acknowledge that I hereby lose my right of withdrawal."
- **Key:** `withdrawal_waiver`

```typescript
const payload: Record<string, string> = {
  // ... existing params
  "custom_fields[0][key]": "withdrawal_waiver",
  "custom_fields[0][type]": "boolean", // Checkbox
  "custom_fields[0][label][type]": "custom",
  "custom_fields[0][label][custom]":
    "I consent to immediate access and acknowledge that I lose my right of withdrawal.",
  "custom_fields[0][optional]": "false", // Mandatory
};
```

## Verification Plan

### Manual Verification

1.  **User Action:** Go to `/pricing` and click "Join for $5/mo".
2.  **Expected Result:** Redirect to Stripe Checkout.
3.  **Check:** Verify a checkbox appears above the "Pay" button with the text: "I consent to immediate access..."
4.  **Enforcement:** Try to pay _without_ checking it (Stripe should block you).
