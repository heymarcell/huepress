# GTM Configuration for Event ID Deduplication

This guide configures Google Tag Manager to pass `event_id` to Meta Pixel and Pinterest Tag for browser/server event deduplication.

## Prerequisites

- GTM Container ID: `GTM-K9KM3953`
- Meta Pixel ID: `1588901548777498`
- Pinterest Tag ID: `2613563536774`

---

## Step 1: Create Event ID Variable

1. Go to **Variables** → **User-Defined Variables** → **New**
2. Configure:
   - **Name:** `DLV - Event ID`
   - **Variable Type:** Data Layer Variable
   - **Data Layer Variable Name:** `eventID`
   - **Data Layer Version:** Version 2
3. **Save**

---

## Step 2: Create Fallback Event ID Variable

1. Go to **Variables** → **User-Defined Variables** → **New**
2. Configure:
   - **Name:** `DLV - Event ID Snake`
   - **Variable Type:** Data Layer Variable
   - **Data Layer Variable Name:** `event_id`
   - **Data Layer Version:** Version 2
3. **Save**

---

## Step 3: Create Combined Event ID Variable (with fallback)

1. Go to **Variables** → **User-Defined Variables** → **New**
2. Configure:
   - **Name:** `Event ID Combined`
   - **Variable Type:** Custom JavaScript
   - **Custom JavaScript:**
     ```javascript
     function() {
       return {{DLV - Event ID}} || {{DLV - Event ID Snake}} || '';
     }
     ```
3. **Save**

---

## Step 4: Update Meta Pixel Purchase Tag

1. Go to **Tags** → Find your **Meta Pixel - Purchase** tag (or create one)
2. In the tag configuration, find **Event ID** or **Additional Parameters**
3. Add parameter:
   - **Parameter Name:** `eventID`
   - **Value:** `{{Event ID Combined}}`
4. **Save**

For custom HTML Meta Pixel implementation:

```html
<script>
  fbq('track', 'Purchase', {
    value: {{Ecommerce Value}},
    currency: 'USD',
    content_type: 'product'
  }, {eventID: '{{Event ID Combined}}'});
</script>
```

---

## Step 5: Update Pinterest Tag Checkout Event

1. Go to **Tags** → Find your **Pinterest - Checkout** tag
2. In the tag configuration, add:
   - **event_id:** `{{Event ID Combined}}`
3. **Save**

For custom HTML Pinterest Tag:

```html
<script>
  pintrk('track', 'checkout', {
    event_id: '{{Event ID Combined}}',
    value: {{Ecommerce Value}},
    currency: 'USD'
  });
</script>
```

---

## Step 6: Create Trigger for Begin Checkout

1. Go to **Triggers** → **New**
2. Configure:
   - **Name:** `CE - Begin Checkout`
   - **Trigger Type:** Custom Event
   - **Event name:** `begin_checkout`
   - **This trigger fires on:** All Custom Events
3. **Save**

---

## Step 7: Test in Preview Mode

1. Click **Preview** in GTM
2. Go to your site and initiate a checkout
3. In GTM Debug panel, verify:
   - `begin_checkout` event fires
   - `eventID` appears in Data Layer with UUID value
   - Meta Pixel tag includes `eventID` parameter
   - Pinterest tag includes `event_id` parameter

---

## Step 8: Publish Container

1. Click **Submit** in GTM
2. Add version name: `Add event_id for Meta/Pinterest deduplication`
3. **Publish**

---

## Validation

### Meta Events Manager

1. Go to [facebook.com/events_manager](https://facebook.com/events_manager)
2. Select your Pixel → **Test Events**
3. Make a test purchase
4. Look for events with **"Received and Deduplicated"** status

### Pinterest Ads Manager

1. Go to [ads.pinterest.com](https://ads.pinterest.com) → **Conversions**
2. Select Tag → **Event History**
3. Verify single `checkout` event per purchase (not duplicated)

---

## Troubleshooting

| Issue                            | Cause                | Fix                                                    |
| -------------------------------- | -------------------- | ------------------------------------------------------ |
| Events not deduplicating         | event_id mismatch    | Ensure browser eventID matches server event_id exactly |
| eventID undefined                | Variable not reading | Check Data Layer Variable name (case-sensitive)        |
| Pinterest not receiving event_id | Wrong parameter name | Pinterest uses snake_case `event_id`, not camelCase    |
